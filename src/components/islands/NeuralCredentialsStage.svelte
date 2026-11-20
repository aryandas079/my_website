<script lang="ts">
  import { onMount, tick } from 'svelte';
  import gsap from 'gsap';
  import * as THREE from 'three';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
  import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
  import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
  import {
    InstancedBinaryDustBatch,
    InstancedBinaryDustRenderer,
    detectDeviceGpuTier,
    detectSoftwareWebGL,
  } from '../../lib/three/InstancedBinaryDust';
  import {
    APPROACHES_LIST,
    CREDENTIALS_LIST,
    FOUNDATION_PROFILE,
    type ApproachId,
    type ApproachItem,
    type CredentialItem,
    type FoundationProfile,
  } from '../../lib/credentials/credentialsData';
  import {
    routeCorridorEdges3D,
    type CorridorObstacle,
    type EdgeRouteRequest,
  } from '../../lib/credentials/neuralPathfinder';
  import {
    solveNeuralForceLayout,
    type ForceLayoutBounds,
    type ForceLayoutEdgeInput,
    type ForceLayoutNodeInput,
    type ThematicCluster,
  } from '../../lib/credentials/neuralForceLayout';

  interface Props {
    buildProgress?: number;
    onNodeInteract?: (clientX: number, clientY: number) => void;
  }

  let { buildProgress = 1, onNodeInteract }: Props = $props();

  type SelectedTarget =
    | { kind: 'credential'; item: CredentialItem; nodeId: string }
    | { kind: 'approach'; item: ApproachItem; nodeId: string }
    | { kind: 'foundation'; item: FoundationProfile; nodeId: string }
    | null;

  interface HoverLabelState {
    id: string;
    title: string;
    subtitle: string;
    clusterTag: string;
    x: number;
    y: number;
    accentRed: boolean;
    isStructural: boolean;
  }

  interface ConnectedHoverLabel {
    id: string;
    label: string;
    x: number;
    y: number;
    accentRed: boolean;
  }

  let stageContainer = $state<HTMLDivElement | null>(null);
  let cardDustCanvasEl = $state<HTMLCanvasElement | null>(null);
  let detailPanelEl = $state<HTMLElement | null>(null);

  let activeCursor = $state<'default' | 'pointer' | 'grabbing'>('default');
  let activeFilter = $state<ApproachId | 'all'>('all');
  let selectedTarget = $state<SelectedTarget>(null);
  let hoverLabel = $state<HoverLabelState | null>(null);
  let connectedHoverLabels = $state<ConnectedHoverLabel[]>([]);
  let lightboxImageSrc = $state<string | null>(null);
  let lightboxImageTitle = $state<string>('');

  let externalSelectNode: ((nodeId: string | null) => void) | null = null;
  let externalSetFilter: ((filter: ApproachId | 'all') => void) | null = null;
  let externalGetNodeScreenPos: ((nodeId: string) => { x: number; y: number } | null) | null = null;
  let externalResetCameraView: (() => void) | null = null;
  let hasCustomCameraView = $state(false);
  let isClosingPanel = false;
  let cardEntryTl: gsap.core.Timeline | null = null;

  // Pre-allocated binary dust pools driven by the detail card GSAP timeline (zero per-frame GC)
  interface CardStreamDustBit {
    startX: number;
    startY: number;
    ctrlX: number;
    ctrlY: number;
    endX: number;
    endY: number;
    bit: '0' | '1';
    isRed: boolean;
    size: number;
    delay: number;
    flipSeed: number;
  }

  interface CardVeilDustBit {
    nx: number;
    ny: number;
    driftX: number;
    driftY: number;
    bit: '0' | '1';
    isRed: boolean;
    size: number;
    fadeOffset: number;
    flipSeed: number;
  }

  const CARD_STREAM_COUNT = 56;
  const CARD_VEIL_COUNT = 78;

  const cardStreamBits: CardStreamDustBit[] = Array.from({ length: CARD_STREAM_COUNT }, () => ({
    startX: 0,
    startY: 0,
    ctrlX: 0,
    ctrlY: 0,
    endX: 0,
    endY: 0,
    bit: '0',
    isRed: false,
    size: 10,
    delay: 0,
    flipSeed: 0,
  }));

  const cardVeilBits: CardVeilDustBit[] = Array.from({ length: CARD_VEIL_COUNT }, () => ({
    nx: 0.5,
    ny: 0.5,
    driftX: 0,
    driftY: 0,
    bit: '1',
    isRed: false,
    size: 11,
    fadeOffset: 0,
    flipSeed: 0,
  }));

  const cardDustState = {
    active: false,
    streamProgress: 0,
    streamAlpha: 0,
    veilAlpha: 0,
    veilDrift: 0,
    cardW: 360,
    cardH: 380,
    veilCleared: true,
  };

  let cardVeilScrimAlpha = $state(0);
  let cardGpuRenderer: InstancedBinaryDustRenderer | null = null;

  // Manage the transient GPU InstancedMesh renderer strictly for the lifetime of the open detail card
  $effect(() => {
    const canvas = cardDustCanvasEl;
    if (!canvas) {
      if (cardGpuRenderer) {
        cardGpuRenderer.dispose();
        cardGpuRenderer = null;
      }
      return;
    }

    const gpuTier = detectDeviceGpuTier();
    const w = Math.max(120, Math.round(canvas.clientWidth || cardDustState.cardW));
    const h = Math.max(120, Math.round(canvas.clientHeight || cardDustState.cardH));
    const rendererInstance = new InstancedBinaryDustRenderer({
      canvas,
      maxInstances: 160,
      width: w,
      height: h,
      maxDpr: gpuTier.recommendedMaxDpr,
    });
    cardGpuRenderer = rendererInstance;

    return () => {
      if (cardGpuRenderer === rendererInstance) {
        cardGpuRenderer = null;
      }
      rendererInstance.dispose();
    };
  });

  function seedCardDustPools(
    originX: number,
    originY: number,
    cardLeft: number,
    cardTop: number,
    cardW: number,
    cardH: number,
    accentRed: boolean,
    seedBase: number
  ): void {
    cardDustState.cardW = cardW;
    cardDustState.cardH = cardH;
    cardDustState.veilCleared = false;

    const midX = (originX + cardLeft + cardW * 0.5) * 0.5;
    const midY = (originY + cardTop + cardH * 0.5) * 0.5;

    for (let i = 0; i < CARD_STREAM_COUNT; i++) {
      const b = cardStreamBits[i];
      const h1 = seededHash(i, seedBase, 31.7);
      const h2 = seededHash(i, seedBase + 4.3, 57.1);
      const h3 = seededHash(i, seedBase + 9.1, 83.9);
      const h4 = seededHash(i, seedBase + 13.7, 19.3);

      const jitterR = 4 + h1 * 18;
      const jitterA = h2 * Math.PI * 2;
      b.startX = originX + Math.cos(jitterA) * jitterR;
      b.startY = originY + Math.sin(jitterA) * jitterR;
      b.endX = cardLeft + 18 + h3 * Math.max(40, cardW - 36);
      b.endY = cardTop + 18 + h4 * Math.max(40, cardH - 36);

      // Smooth organic arc curving outward from node -> card
      const arcSpread = (h1 - 0.5) * 140;
      const arcLift = (h2 - 0.55) * 110;
      b.ctrlX = midX + arcSpread;
      b.ctrlY = midY + arcLift;
      b.bit = (i + Math.floor(seedBase)) % 2 === 0 ? '1' : '0';
      b.isRed = accentRed ? h3 < 0.48 : h3 < 0.24;
      b.size = 9.5 + h4 * 3.5;
      b.delay = h1 * 0.22;
      b.flipSeed = Math.floor(h2 * 100);
    }

    for (let i = 0; i < CARD_VEIL_COUNT; i++) {
      const v = cardVeilBits[i];
      const h1 = seededHash(i, seedBase + 1.9, 41.3);
      const h2 = seededHash(i, seedBase + 6.7, 67.7);
      const h3 = seededHash(i, seedBase + 11.3, 23.1);
      const h4 = seededHash(i, seedBase + 17.5, 91.9);

      // Even stratified grid + organic jitter across the entire card text surface
      const cols = 10;
      const rows = Math.ceil(CARD_VEIL_COUNT / cols);
      const col = i % cols;
      const row = Math.floor(i / cols);
      v.nx = THREE.MathUtils.clamp((col + 0.15 + h1 * 0.7) / cols, 0.04, 0.96);
      v.ny = THREE.MathUtils.clamp((row + 0.15 + h2 * 0.7) / rows, 0.05, 0.95);

      // Gentle upward & radial dissipation vector as text materializes
      const radialX = v.nx - 0.5;
      const radialY = v.ny - 0.5;
      v.driftX = radialX * (34 + h3 * 28) + (h1 - 0.5) * 18;
      v.driftY = radialY * 18 - (16 + h4 * 34);
      v.bit = (i + Math.floor(seedBase * 3)) % 2 === 0 ? '0' : '1';
      v.isRed = accentRed ? h3 < 0.44 : h3 < 0.2;
      v.size = 9.5 + h4 * 3.2;
      // Top header clears slightly first so headline becomes legible right as dust dissolves
      v.fadeOffset = v.ny * 0.24 + h2 * 0.16;
      v.flipSeed = Math.floor(h1 * 100);
    }
  }

  function isTargetAccentRed(target: SelectedTarget): boolean {
    if (!target) return false;
    if (target.kind === 'foundation') return true;
    if (target.kind === 'approach') return target.item.accentTone === 'red';
    return target.item.nodeTone === 'red';
  }

  const approachById = new Map<ApproachId, ApproachItem>(
    APPROACHES_LIST.map((a) => [a.id, a])
  );

  function credentialsForApproach(approachId: ApproachId): CredentialItem[] {
    return CREDENTIALS_LIST.filter((c) => c.approaches.includes(approachId));
  }

  async function animateCardExpandFromNode(nodeId: string): Promise<void> {
    isClosingPanel = false;
    cardEntryTl?.kill();
    cardEntryTl = null;

    // Wait for Svelte DOM mount microtask before first paint so there is zero 1-frame flash
    await tick();
    if (!detailPanelEl || !stageContainer || isClosingPanel) return;

    const panel = detailPanelEl;
    gsap.killTweensOf(panel);
    const revealEls = Array.from(panel.querySelectorAll<HTMLElement>('[data-card-reveal]'));
    if (revealEls.length > 0) gsap.killTweensOf(revealEls);

    // Measure exact resting layout rect with identity transform
    gsap.set(panel, { x: 0, y: 0, scale: 1, opacity: 1 });
    const stageRect = stageContainer.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const cardLeft = panelRect.left - stageRect.left;
    const cardTop = panelRect.top - stageRect.top;
    const panelCenterX = cardLeft + panelRect.width * 0.5;
    const panelCenterY = cardTop + panelRect.height * 0.5;

    const nodePx = externalGetNodeScreenPos?.(nodeId);
    const originX = nodePx ? nodePx.x : panelCenterX + 42;
    const originY = nodePx ? nodePx.y : panelCenterY;
    const fromDx = originX - panelCenterX;
    const fromDy = originY - panelCenterY;

    let seedBase = 11;
    for (let i = 0; i < nodeId.length; i++) {
      seedBase += nodeId.charCodeAt(i) * (i + 1) * 0.13;
    }
    seedCardDustPools(
      originX,
      originY,
      cardLeft,
      cardTop,
      Math.max(240, panelRect.width),
      Math.max(200, panelRect.height),
      isTargetAccentRed(selectedTarget),
      seedBase
    );

    cardDustState.active = true;
    cardDustState.streamProgress = 0;
    cardDustState.streamAlpha = 1;
    cardDustState.veilAlpha = 1;
    cardDustState.veilDrift = 0;

    // Prime initial collapsed state anchored directly on the clicked 3D node's coordinates
    gsap.set(panel, {
      x: fromDx,
      y: fromDy,
      scale: 0.08,
      opacity: 0,
      transformOrigin: '50% 50%',
    });
    if (revealEls.length > 0) {
      gsap.set(revealEls, { opacity: 0, y: 8 });
    }

    // Master GSAP Timeline synchronizing:
    //   1. Card expansion from clicked node coordinates (0.00s -> 0.48s)
    //   2. Binary dust burst streaming from clicked node into the card (0.00s -> 0.44s)
    //   3. Binary dust veil dissipation across card face (0.24s -> 0.68s)
    //   4. Staggered text content fade-in locked to dust dissipation so copy lands 100% crisp & readable
    const tl = gsap.timeline({
      onComplete: () => {
        cardDustState.active = false;
        cardDustState.streamAlpha = 0;
        cardDustState.veilAlpha = 0;
      },
    });
    cardEntryTl = tl;

    tl.to(
      panel,
      {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 0.48,
        ease: 'expo.out',
        clearProps: 'transform',
      },
      0
    )
      .to(
        cardDustState,
        {
          streamProgress: 1,
          duration: 0.44,
          ease: 'power3.out',
        },
        0
      )
      .to(
        cardDustState,
        {
          streamAlpha: 0,
          duration: 0.28,
          ease: 'power2.out',
        },
        0.22
      )
      .to(
        cardDustState,
        {
          veilDrift: 1,
          duration: 0.46,
          ease: 'power2.out',
        },
        0.24
      )
      .to(
        cardDustState,
        {
          veilAlpha: 0,
          duration: 0.42,
          ease: 'power2.inOut',
        },
        0.25
      );

    if (revealEls.length > 0) {
      tl.to(
        revealEls,
        {
          opacity: 1,
          y: 0,
          duration: 0.36,
          stagger: 0.045,
          ease: 'power2.out',
          clearProps: 'transform',
        },
        0.28
      );
    }
  }

  function closeDetailPanel(): void {
    if (!selectedTarget || isClosingPanel) return;
    const closingNodeId = selectedTarget.nodeId;
    const accentRed = isTargetAccentRed(selectedTarget);
    externalSelectNode?.(null);

    cardEntryTl?.kill();
    cardEntryTl = null;

    if (!detailPanelEl || !stageContainer) {
      cardDustState.active = false;
      cardDustState.veilAlpha = 0;
      cardDustState.streamAlpha = 0;
      selectedTarget = null;
      return;
    }

    isClosingPanel = true;
    const panel = detailPanelEl;
    const revealEls = Array.from(panel.querySelectorAll<HTMLElement>('[data-card-reveal]'));

    const stageRect = stageContainer.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const cardLeft = panelRect.left - stageRect.left;
    const cardTop = panelRect.top - stageRect.top;
    const panelCenterX = cardLeft + panelRect.width * 0.5;
    const panelCenterY = cardTop + panelRect.height * 0.5;
    const nodePx = externalGetNodeScreenPos?.(closingNodeId);
    const destX = nodePx ? nodePx.x : panelCenterX + 36;
    const destY = nodePx ? nodePx.y : panelCenterY;
    const toDx = destX - panelCenterX;
    const toDy = destY - panelCenterY;

    seedCardDustPools(
      destX,
      destY,
      cardLeft,
      cardTop,
      Math.max(240, panelRect.width),
      Math.max(200, panelRect.height),
      accentRed,
      closingNodeId.length * 7.3
    );
    cardDustState.active = true;
    cardDustState.streamProgress = 1;
    cardDustState.streamAlpha = 0.72;
    cardDustState.veilAlpha = 0.52;
    cardDustState.veilDrift = 0.15;

    gsap.killTweensOf(panel);
    if (revealEls.length > 0) gsap.killTweensOf(revealEls);

    const tl = gsap.timeline({
      onComplete: () => {
        cardDustState.active = false;
        cardDustState.streamAlpha = 0;
        cardDustState.veilAlpha = 0;
        isClosingPanel = false;
        selectedTarget = null;
      },
    });
    cardEntryTl = tl;

    if (revealEls.length > 0) {
      tl.to(
        revealEls,
        {
          opacity: 0,
          duration: 0.12,
          ease: 'power2.in',
        },
        0
      );
    }

    tl.to(
      panel,
      {
        x: toDx,
        y: toDy,
        scale: 0.08,
        opacity: 0,
        duration: 0.26,
        ease: 'power3.in',
      },
      0.04
    )
      .to(
        cardDustState,
        {
          streamProgress: 0,
          streamAlpha: 0,
          veilAlpha: 0,
          duration: 0.28,
          ease: 'power2.in',
        },
        0.02
      );
  }

  function selectApproachFilter(filter: ApproachId | 'all'): void {
    activeFilter = activeFilter === filter && filter !== 'all' ? 'all' : filter;
    externalSetFilter?.(activeFilter);
    if (
      activeFilter !== 'all' &&
      selectedTarget?.kind === 'credential' &&
      !selectedTarget.item.approaches.includes(activeFilter)
    ) {
      closeDetailPanel();
    }
  }

  function jumpToCredential(cred: CredentialItem): void {
    const nodeId = `cred:${cred.id}`;
    selectedTarget = { kind: 'credential', item: cred, nodeId };
    externalSelectNode?.(nodeId);
    animateCardExpandFromNode(nodeId);
  }

  function jumpToApproach(appId: ApproachId): void {
    const app = approachById.get(appId);
    if (!app) return;
    const nodeId = `approach:${app.id}`;
    selectedTarget = { kind: 'approach', item: app, nodeId };
    externalSelectNode?.(nodeId);
    animateCardExpandFromNode(nodeId);
  }

  function seededHash(a: number, b: number, seed = 19.7): number {
    const s = Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function quinticEase(t: number): number {
    const c = Math.max(0, Math.min(1, t));
    return c * c * c * (c * (c * 6 - 15) + 10);
  }

  /**
   * Builds a clean chamfered/beveled 3D ceramic cube so every neuron catches crisp
   * Blender-style soft studio highlights on all edges.
   */
  function createBeveledCubeGeometry(size = 1, bevel = 0.14, bevelSegments = 3): THREE.BufferGeometry {
    const half = size * 0.5 - bevel;
    const shape = new THREE.Shape();
    const r = bevel * 0.85;
    shape.moveTo(-half + r, -half);
    shape.lineTo(half - r, -half);
    shape.quadraticCurveTo(half, -half, half, -half + r);
    shape.lineTo(half, half - r);
    shape.quadraticCurveTo(half, half, half - r, half);
    shape.lineTo(-half + r, half);
    shape.quadraticCurveTo(-half, half, -half, half - r);
    shape.lineTo(-half, -half + r);
    shape.quadraticCurveTo(-half, -half, -half + r, -half);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: size - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments,
      curveSegments: 4,
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Generates a silky soft crimson radial aura texture for alluring even certificate cubes.
   */
  function createCrimsonAuraTexture(): THREE.CanvasTexture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(
        size * 0.5,
        size * 0.5,
        size * 0.06,
        size * 0.5,
        size * 0.5,
        size * 0.5
      );
      grad.addColorStop(0.0, 'rgba(255, 42, 34, 0.42)');
      grad.addColorStop(0.32, 'rgba(255, 56, 46, 0.20)');
      grad.addColorStop(0.68, 'rgba(255, 86, 72, 0.05)');
      grad.addColorStop(1.0, 'rgba(255, 86, 72, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  onMount(() => {
    if (!stageContainer) return;
    const container = stageContainer;

    let width = Math.max(container.clientWidth, 320);
    let height = Math.max(container.clientHeight, 320);

    const gpuTier = detectDeviceGpuTier();
    const isSoftwareGl = gpuTier.isSoftwareGl || detectSoftwareWebGL();
    const isConstrainedMobile = gpuTier.isLowEndMobile;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && !isConstrainedMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    const dpr = isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, gpuTier.recommendedMaxDpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    // Prevent native pinch/drag cancellation so JS handles 1F orbit/scroll handoff + 2F pan/pinch-zoom cleanly
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f4f0);

    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 95);
    let currentCameraZ = 18.6;
    let currentCameraY = 1.04;
    let targetCameraZ = 18.6;
    let targetCameraY = 1.04;
    camera.position.set(0.15, currentCameraY, currentCameraZ);
    camera.lookAt(0, -0.1, 0);

    // Orthographic overlay scene rendered directly inside the same WebGL context
    // for zero-overhead HUD binary dust condensation & node-to-card Bezier streams
    const hudDustScene = new THREE.Scene();
    const hudDustCamera = new THREE.OrthographicCamera(0, width, 0, height, -100, 100);
    hudDustCamera.position.z = 10;
    const hudDustBatch = new InstancedBinaryDustBatch({
      maxInstances: 640,
      billboard3d: false,
      topDownOrtho: true,
      depthTest: false,
    });
    hudDustScene.add(hudDustBatch.mesh);

    // Subtle HDR Selective Bloom Post-Processing Pipeline (EffectComposer + UnrealBloomPass + OutputPass)
    // On low-end mobile GPUs, drop MSAA FBO resolve and run half-res bloom to preserve 60fps fill-rate budget.
    const composerSamples =
      isSoftwareGl || isConstrainedMobile ? 0 : gpuTier.isCoarsePointer ? 2 : 4;
    const composerTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      samples: composerSamples,
    });
    const composer = new EffectComposer(renderer, composerTarget);
    composer.setPixelRatio(dpr);
    composer.setSize(width, height);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomScale = isConstrainedMobile ? 0.5 : 1;
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.round(width * bloomScale), Math.round(height * bloomScale)),
      0.34, // subtle futuristic bloom strength
      0.56, // silky wide glow radius
      1.02 // HDR threshold cleanly above off-white background
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // Blender-style soft studio lighting giving crisp 3-plane shading on every beveled cube
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x7b7770, 0.98);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf2, 1.52);
    keyLight.position.set(-5.8, 9.2, 8.8);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf1f5ff, 0.56);
    fillLight.position.set(7.4, -2.8, 5.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.58);
    rimLight.position.set(1.2, 5.5, -8.5);
    scene.add(rimLight);

    const disposables: Array<() => void> = [];

    // =========================================================================
    // STRUCTURED 6-LAYER 3D DEEP NEURAL NETWORK ARCHITECTURE (Hourglass Grid)
    // Layer 0 (4×4): Foundation & Core Input
    // Layer 1 (3×3): Feature Encoding
    // Layer 2 (4×2): 4 Core Approaches (ML, Data Science, Full Stack, Software Dev)
    // Layer 3 (3×2): Latent Integration Bottleneck
    // Layer 4 (4×3): 7 Verified Credentials + Structural Companion Cubes
    // Layer 5 (3×3): Output Projection
    // =========================================================================
    type NodeKind = 'foundation' | 'approach' | 'credential' | 'structural';
    type NodeTone = 'red' | 'white' | 'grey';

    interface LayerNode {
      id: string;
      layerIdx: number;
      row: number;
      col: number;
      colsInLayer: number;
      kind: NodeKind;
      tone: NodeTone;
      cluster: ThematicCluster;
      isAlluringRedCert: boolean;
      label: string;
      foundationItem?: FoundationProfile;
      approachItem?: ApproachItem;
      credentialItem?: CredentialItem;
      anchorPos: THREE.Vector3;
      basePos: THREE.Vector3;
      targetBasePos: THREE.Vector3;
      currentPos: THREE.Vector3;
      cubeSize: number;
      floatPhase: number;
      pulseRed: boolean;
      pulsePhase: number;
      mesh: THREE.Mesh;
      mat: THREE.MeshPhysicalMaterial;
      auraSprite: THREE.Sprite | null;
      auraMat: THREE.SpriteMaterial | null;
      rimLines: THREE.LineSegments | null;
      rimMat: THREE.LineBasicMaterial | null;
      hitProxy: THREE.Mesh | null;
      baseColor: THREE.Color;
      dimColor: THREE.Color;
      highlightColor: THREE.Color;
      entranceScale: number;
      clickExpandBoost: number;
      currentScaleMul: number;
      currentHighlight: number;
      currentDim: number;
      approachLinks: Set<ApproachId>;
      connectedNodeIds: Set<string>;
    }

    interface LayerEdge {
      fromIdx: number;
      toIdx: number;
      fromLayer: number;
      priority: number;
      isSemantic: boolean;
      isCs50xPath: boolean;
      sharedApproaches: Set<ApproachId>;
      /** Active interpolated 3D A* pathfound smooth curve points [(subdiv+1) * 3] */
      basePoints: Float32Array;
      /** Target 3D A* curve points after viewport-adaptive force-directed re-layout */
      targetBasePoints: Float32Array;
      isMorphingRoute: boolean;
      /** Normalized arc parameter t in [0..1] per sample */
      tValues: Float32Array;
      drawStart: number;
      drawEnd: number;
      pulsePhase: number;
      pulseSpeed: number;
      currentHighlight: number;
      currentDim: number;
    }

    const networkRoot = new THREE.Group();
    scene.add(networkRoot);

    const beveledCubeGeo = createBeveledCubeGeometry(1, 0.13, 3);
    const alluringCubeGeo = createBeveledCubeGeometry(1, 0.16, 4);
    const rimBoxTmp = new THREE.BoxGeometry(1.06, 1.06, 1.06);
    const alluringRimGeo = new THREE.EdgesGeometry(rimBoxTmp);
    rimBoxTmp.dispose();
    const crimsonAuraTex = createCrimsonAuraTexture();
    const hitBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false,
    });
    disposables.push(
      () => beveledCubeGeo.dispose(),
      () => alluringCubeGeo.dispose(),
      () => alluringRimGeo.dispose(),
      () => crimsonAuraTex.dispose(),
      () => hitBoxGeo.dispose(),
      () => hitMat.dispose()
    );

    interface LayerSpec {
      x: number;
      rowOffsetsY: readonly number[];
      rowClusters: readonly ThematicCluster[];
      cols: number;
      spacingZ: number;
      stageRole: string;
    }

    // Proximity-grouped 6-layer topological anchors refined by our 3D cluster force-directed solver:
    //   Top Band    → Machine Learning (ml)
    //   Middle Band → Data Science (data-science)
    //   Bottom Band → Software (software: Full Stack & Software Development)
    const LAYER_SPECS: LayerSpec[] = [
      {
        x: -5.65,
        rowOffsetsY: [2.12, 1.34, 0.0, -1.34, -2.12],
        rowClusters: ['ml', 'ml', 'data-science', 'software', 'software'],
        cols: 3,
        spacingZ: 0.9,
        stageRole: 'Input',
      },
      {
        x: -3.42,
        rowOffsetsY: [1.74, 0.0, -1.74],
        rowClusters: ['ml', 'data-science', 'software'],
        cols: 3,
        spacingZ: 0.88,
        stageRole: 'Encoder',
      },
      {
        x: -1.16,
        rowOffsetsY: [1.76, 0.0, -1.3, -2.1],
        rowClusters: ['ml', 'data-science', 'software', 'software'],
        cols: 2,
        spacingZ: 1.06,
        stageRole: 'Approach',
      },
      {
        x: 1.1,
        rowOffsetsY: [1.66, 0.0, -1.66],
        rowClusters: ['ml', 'data-science', 'software'],
        cols: 2,
        spacingZ: 0.88,
        stageRole: 'Latent',
      },
      {
        x: 3.38,
        rowOffsetsY: [2.16, 1.34, 0.0, -1.34, -2.16],
        rowClusters: ['ml', 'ml', 'data-science', 'software', 'software'],
        cols: 3,
        spacingZ: 1.04,
        stageRole: 'Credential',
      },
      {
        x: 5.6,
        rowOffsetsY: [1.74, 0.0, -1.74],
        rowClusters: ['ml', 'data-science', 'software'],
        cols: 3,
        spacingZ: 0.88,
        stageRole: 'Output',
      },
    ];

    // Thematic proximity slots in Layer 4:
    //   ML Cluster (rows 0–1, top):          #1 ML Specialization, #5 AI Fluency, #6 GenAI Essentials (EVEN RED)
    //   Data Science Cluster (row 2, mid):   #2 Data Scientist Associate (EVEN RED)
    //   Software Cluster (rows 3–4, bottom): #3 Full Stack Dev, #4 Harvard CS50x (EVEN RED), #7 Gemini Certified
    const CREDENTIAL_GRID_SLOTS: ReadonlyArray<{ row: number; col: number }> = [
      { row: 0, col: 2 }, // #1 (odd)  — Machine Learning Specialization (ML cluster)
      { row: 2, col: 2 }, // #2 (EVEN) — Data Scientist Associate (Data Science cluster · Alluring Ruby Red)
      { row: 3, col: 2 }, // #3 (odd)  — Full Stack Development (Software cluster)
      { row: 4, col: 2 }, // #4 (EVEN) — Harvard CS50x (Software cluster · Alluring Ruby Red)
      { row: 0, col: 1 }, // #5 (odd)  — AI Fluency for Students (ML cluster)
      { row: 1, col: 2 }, // #6 (EVEN) — Generative AI Essentials (ML cluster · Alluring Ruby Red)
      { row: 3, col: 1 }, // #7 (odd)  — Gemini Certified Student (Software cluster)
    ];

    const CLUSTER_DISPLAY_NAME: Record<ThematicCluster, string> = {
      ml: 'ML',
      'data-science': 'Data Science',
      software: 'Software',
    };

    const CLUSTER_APPROACH_MAP: Record<ThematicCluster, ApproachId[]> = {
      ml: ['machine-learning'],
      'data-science': ['data-science'],
      software: ['full-stack', 'software-development'],
    };

    // Subtle architectural color variations per thematic cluster (warm ivory-rose, cool mist-slate, crisp stone)
    const CLUSTER_PALETTE: Record<
      ThematicCluster,
      { light: THREE.Color; mid: THREE.Color; dark: THREE.Color }
    > = {
      ml: {
        light: new THREE.Color(0xfcf3f0),
        mid: new THREE.Color(0xe6d7d2),
        dark: new THREE.Color(0x362827),
      },
      'data-science': {
        light: new THREE.Color(0xf0f6f8),
        mid: new THREE.Color(0xd0dce2),
        dark: new THREE.Color(0x212f38),
      },
      software: {
        light: new THREE.Color(0xf4f3ef),
        mid: new THREE.Color(0xd6d4cc),
        dark: new THREE.Color(0x242422),
      },
    };

    const nodes: LayerNode[] = [];
    const layerNodeIndices: number[][] = LAYER_SPECS.map(() => []);
    const nodeIndexById = new Map<string, number>();
    const interactiveHitTargets: THREE.Object3D[] = [];
    const structuralHitTargets: THREE.Object3D[] = [];
    const nodeByHitObj = new Map<THREE.Object3D, LayerNode>();

    const COLOR_GREY_MID = new THREE.Color(0x6c6962);
    const COLOR_RED = new THREE.Color(0xff3027);
    const COLOR_ALLURING_RUBY = new THREE.Color(0xf62119);
    const COLOR_ALLURING_SHEEN = new THREE.Color(0xff9a8f);
    const COLOR_DIM_BASE = new THREE.Color(0xd5d2ca);
    const COLOR_EMISSIVE_RED = new THREE.Color(0xff2c22);
    const COLOR_EMISSIVE_RUBY = new THREE.Color(0xe8140d);
    const COLOR_EMISSIVE_NONE = new THREE.Color(0x000000);

    for (let li = 0; li < LAYER_SPECS.length; li++) {
      const spec = LAYER_SPECS[li];
      for (let r = 0; r < spec.rowOffsetsY.length; r++) {
        const cluster = spec.rowClusters[r];
        const palette = CLUSTER_PALETTE[cluster];
        const py = spec.rowOffsetsY[r];

        for (let c = 0; c < spec.cols; c++) {
          const pz = (c - (spec.cols - 1) * 0.5) * spec.spacingZ;
          const px = spec.x;

          let id = `l${li}-r${r}-c${c}`;
          let kind: NodeKind = 'structural';
          let tone: NodeTone = (r + c + li) % 3 === 0 ? 'grey' : 'white';
          let isAlluringRedCert = false;
          let label = `${CLUSTER_DISPLAY_NAME[cluster]} · ${spec.stageRole}`;
          let cubeSize = 0.265;
          let pulseRed = false;
          let foundationItem: FoundationProfile | undefined;
          let approachItem: ApproachItem | undefined;
          let credentialItem: CredentialItem | undefined;
          let approachLinks: ApproachId[] = [...CLUSTER_APPROACH_MAP[cluster]];

          // Assign Foundation Core at Layer 0 center axis (row 2, front col) bridging all 3 clusters
          if (li === 0 && r === 2 && c === spec.cols - 1) {
            id = `foundation:${FOUNDATION_PROFILE.id}`;
            kind = 'foundation';
            tone = 'red';
            label = 'NIT Silchar';
            cubeSize = 0.4;
            pulseRed = true;
            foundationItem = FOUNDATION_PROFILE;
            approachLinks = ['machine-learning', 'data-science', 'full-stack', 'software-development'];
          }

          // Assign 4 Core Approach Hubs along Layer 2 front face grouped by thematic cluster
          if (li === 2 && c === 1 && r < APPROACHES_LIST.length) {
            const app = APPROACHES_LIST[r];
            id = `approach:${app.id}`;
            kind = 'approach';
            tone = app.accentTone === 'red' ? 'red' : 'grey';
            label = app.name;
            cubeSize = 0.415;
            pulseRed = app.accentTone === 'red';
            approachItem = app;
            approachLinks = [app.id];
          }

          // Assign all 7 Verified Credentials in Layer 4 inside their thematic clusters
          // Every EVEN certificate (#2, #4 CS50x, #6) glows as an alluring lacquered ruby-red focal block!
          if (li === 4) {
            const credIdx = CREDENTIAL_GRID_SLOTS.findIndex((s) => s.row === r && s.col === c);
            if (credIdx >= 0 && CREDENTIALS_LIST[credIdx]) {
              const cred = CREDENTIALS_LIST[credIdx];
              const isEvenCert = (credIdx + 1) % 2 === 0;
              id = `cred:${cred.id}`;
              kind = 'credential';
              tone = isEvenCert ? 'red' : cred.nodeTone === 'grey' ? 'grey' : 'white';
              isAlluringRedCert = isEvenCert;
              label = cred.shortTitle;
              cubeSize = isEvenCert ? 0.435 : 0.385;
              pulseRed = isEvenCert;
              credentialItem = cred;
              approachLinks = cred.approaches;
            }
          }

          // Layer 3 Data Science middle bottleneck relays cross-cluster bridges (e.g. CS50x <-> Data Science)
          if (kind === 'structural' && li === 3 && cluster === 'data-science') {
            approachLinks = ['data-science', 'machine-learning', 'software-development'];
          }

          const baseColor = isAlluringRedCert
            ? COLOR_ALLURING_RUBY.clone()
            : tone === 'red'
              ? COLOR_RED.clone()
              : kind === 'approach'
                ? palette.dark.clone()
                : kind === 'credential'
                  ? tone === 'grey'
                    ? palette.dark.clone()
                    : palette.light.clone()
                  : tone === 'grey'
                    ? palette.mid.clone()
                    : palette.light.clone();

          const dimColor = baseColor.clone().lerp(COLOR_DIM_BASE, isAlluringRedCert ? 0.55 : 0.66);
          const highlightColor = isAlluringRedCert
            ? COLOR_RED.clone()
            : tone === 'red'
              ? COLOR_RED.clone()
              : kind === 'structural'
                ? COLOR_GREY_MID.clone()
                : COLOR_RED.clone();

          const mat = new THREE.MeshPhysicalMaterial({
            color: baseColor.clone(),
            roughness: isAlluringRedCert
              ? 0.12
              : tone === 'red'
                ? 0.22
                : kind === 'structural'
                  ? 0.36
                  : 0.25,
            metalness: isAlluringRedCert
              ? 0.1
              : kind === 'approach' || (kind === 'credential' && tone === 'grey')
                ? 0.14
                : 0.04,
            clearcoat: isAlluringRedCert ? 1.0 : kind === 'structural' ? 0.32 : 0.68,
            clearcoatRoughness: isAlluringRedCert ? 0.05 : 0.18,
            ior: isAlluringRedCert ? 1.72 : 1.5,
            reflectivity: isAlluringRedCert ? 1.0 : 0.55,
            sheen: isAlluringRedCert ? 0.85 : 0,
            sheenColor: isAlluringRedCert ? COLOR_ALLURING_SHEEN.clone() : COLOR_EMISSIVE_NONE.clone(),
            sheenRoughness: 0.22,
            envMapIntensity: isAlluringRedCert ? 1.35 : 0.72,
            emissive: isAlluringRedCert
              ? COLOR_EMISSIVE_RUBY.clone()
              : tone === 'red'
                ? COLOR_EMISSIVE_RED.clone()
                : COLOR_EMISSIVE_NONE.clone(),
            emissiveIntensity: isAlluringRedCert ? 0.24 : tone === 'red' ? 0.1 : 0,
          });

          const mesh = new THREE.Mesh(isAlluringRedCert ? alluringCubeGeo : beveledCubeGeo, mat);
          mesh.position.set(px, py, pz);
          mesh.scale.setScalar(0.0001);
          networkRoot.add(mesh);
          disposables.push(() => mat.dispose());

          // Add luminous studio aura halo + fine rose-crimson contour frame to every alluring even certificate!
          let auraSprite: THREE.Sprite | null = null;
          let auraMat: THREE.SpriteMaterial | null = null;
          let rimLines: THREE.LineSegments | null = null;
          let rimMat: THREE.LineBasicMaterial | null = null;

          if (isAlluringRedCert) {
            auraMat = new THREE.SpriteMaterial({
              map: crimsonAuraTex,
              transparent: true,
              opacity: 0.68,
              depthWrite: false,
            });
            auraSprite = new THREE.Sprite(auraMat);
            auraSprite.position.set(px, py, pz);
            auraSprite.scale.setScalar(0.0001);
            auraSprite.renderOrder = -1;
            networkRoot.add(auraSprite);

            rimMat = new THREE.LineBasicMaterial({
              color: 0xff9f96,
              transparent: true,
              opacity: 0.52,
              depthWrite: false,
            });
            rimLines = new THREE.LineSegments(alluringRimGeo, rimMat);
            rimLines.position.set(px, py, pz);
            rimLines.scale.setScalar(0.0001);
            networkRoot.add(rimLines);

            disposables.push(
              () => auraMat?.dispose(),
              () => rimMat?.dispose()
            );
          }

          // Every node receives a clean hit proxy sized with zero neighbor overlap
          const hitProxy = new THREE.Mesh(hitBoxGeo, hitMat);
          hitProxy.scale.setScalar(cubeSize * (kind !== 'structural' ? 1.72 : 1.24));
          hitProxy.position.set(px, py, pz);
          networkRoot.add(hitProxy);
          if (kind !== 'structural') {
            interactiveHitTargets.push(hitProxy);
          } else {
            structuralHitTargets.push(hitProxy);
          }

          const node: LayerNode = {
            id,
            layerIdx: li,
            row: r,
            col: c,
            colsInLayer: spec.cols,
            kind,
            tone,
            cluster,
            isAlluringRedCert,
            label,
            foundationItem,
            approachItem,
            credentialItem,
            anchorPos: new THREE.Vector3(px, py, pz),
            basePos: new THREE.Vector3(px, py, pz),
            targetBasePos: new THREE.Vector3(px, py, pz),
            currentPos: new THREE.Vector3(px, py, pz),
            cubeSize,
            floatPhase: li * 0.72 + r * 0.48 + c * 0.63,
            pulseRed,
            pulsePhase: seededHash(li * 13 + r, c + 3.1) * Math.PI * 2,
            mesh,
            mat,
            auraSprite,
            auraMat,
            rimLines,
            rimMat,
            hitProxy,
            baseColor,
            dimColor,
            highlightColor,
            entranceScale: 0,
            clickExpandBoost: 0,
            currentScaleMul: 1,
            currentHighlight: 0,
            currentDim: 0,
            approachLinks: new Set<ApproachId>(approachLinks),
            connectedNodeIds: new Set<string>(),
          };

          const idx = nodes.length;
          nodes.push(node);
          layerNodeIndices[li].push(idx);
          nodeIndexById.set(id, idx);
          if (hitProxy) {
            nodeByHitObj.set(hitProxy, node);
          }
        }
      }
    }

    // =========================================================================
    // CURATED TOPOLOGY + FORCE-DIRECTED CLUSTER LAYOUT + 3D A* PATHFINDING
    // 1. Build clean semantic & architectural inter-layer topology
    // 2. Solve 3D cluster-separated force-directed layout (ML / Data Science / Software)
    //    preventing 3D and camera-space 2D overlaps across every viewport size
    // 3. Route every inter-layer wire via 3D A* corridor pathfinding
    // =========================================================================
    const EDGE_SUBDIV = 10;
    const edges: LayerEdge[] = [];
    const corridorEdgeIndices: number[][] = Array.from(
      { length: LAYER_SPECS.length - 1 },
      () => []
    );

    const cs50NodeIdx = nodeIndexById.get('cred:harvard-cs50x') ?? -1;

    for (let li = 0; li < LAYER_SPECS.length - 1; li++) {
      const fromList = layerNodeIndices[li];
      const toList = layerNodeIndices[li + 1];
      const pairKeys = new Set<string>();
      const inDegree = new Map<number, number>();
      for (const bIdx of toList) inDegree.set(bIdx, 0);

      const addPair = (aIdx: number, bIdx: number, priority: number, isCs50xPath = false) => {
        const key = `${aIdx}->${bIdx}`;
        if (pairKeys.has(key)) return;
        pairKeys.add(key);
        inDegree.set(bIdx, (inDegree.get(bIdx) ?? 0) + 1);

        const nA = nodes[aIdx];
        const nB = nodes[bIdx];
        const shared = new Set<ApproachId>();
        nA.approachLinks.forEach((appId) => {
          if (nB.approachLinks.has(appId)) shared.add(appId);
        });

        const isSemantic =
          (nA.kind !== 'structural' || nB.kind !== 'structural') && shared.size > 0;
        const drawStart = (li / (LAYER_SPECS.length - 1)) * 0.62;
        const drawEnd = Math.min(0.98, drawStart + 0.34);

        const edgeIdx = edges.length;
        const tValues = new Float32Array(EDGE_SUBDIV + 1);
        for (let s = 0; s <= EDGE_SUBDIV; s++) {
          tValues[s] = s / EDGE_SUBDIV;
        }

        edges.push({
          fromIdx: aIdx,
          toIdx: bIdx,
          fromLayer: li,
          priority,
          isSemantic,
          isCs50xPath: isCs50xPath || aIdx === cs50NodeIdx || bIdx === cs50NodeIdx,
          sharedApproaches: shared,
          basePoints: new Float32Array((EDGE_SUBDIV + 1) * 3),
          targetBasePoints: new Float32Array((EDGE_SUBDIV + 1) * 3),
          isMorphingRoute: false,
          tValues,
          drawStart,
          drawEnd,
          pulsePhase: li * 0.22 + seededHash(aIdx, bIdx, 27.1) * 0.32,
          pulseSpeed: 0.34 + seededHash(aIdx, bIdx, 51.3) * 0.14,
          currentHighlight: 0,
          currentDim: 0,
        });
        corridorEdgeIndices[li].push(edgeIdx);
      };

      // 1. Primary Semantic Connections (highest priority so they claim the cleanest unobstructed lanes!)
      for (let fi = 0; fi < fromList.length; fi++) {
        const aIdx = fromList[fi];
        const nA = nodes[aIdx];
        const semanticTargets = toList
          .map((bIdx) => {
            const nB = nodes[bIdx];
            let sharedCount = 0;
            nA.approachLinks.forEach((appId) => {
              if (nB.approachLinks.has(appId)) sharedCount++;
            });
            return {
              bIdx,
              nB,
              sharedCount,
              distSq: nA.anchorPos.distanceToSquared(nB.anchorPos),
            };
          })
          .filter((item) => item.sharedCount > 0 && (nA.kind !== 'structural' || item.nB.kind !== 'structural'))
          .sort((u, v) => v.sharedCount - u.sharedCount || u.distSq - v.distSq);

        // Connect up to 3 cleanest semantic relays per interactive node (and full 3-branch fan for CS50x!)
        const maxSem =
          nA.kind === 'foundation'
            ? 4
            : nA.kind === 'approach'
              ? 3
              : 2;
        for (let k = 0; k < Math.min(maxSem, semanticTargets.length); k++) {
          const t = semanticTargets[k];
          const isCs50 = t.bIdx === cs50NodeIdx || aIdx === cs50NodeIdx;
          addPair(aIdx, t.bIdx, isCs50 ? 4 : 3, isCs50);
        }
      }

      // Guarantee every credential (especially Harvard CS50x) has crisp incoming routes from its Layer 3 relays
      if (li === 3) {
        for (const bIdx of toList) {
          const nB = nodes[bIdx];
          if (nB.kind !== 'credential') continue;
          const matchingRelays = fromList
            .map((aIdx) => {
              const nA = nodes[aIdx];
              let match = 0;
              nB.approachLinks.forEach((appId) => {
                if (nA.approachLinks.has(appId)) match++;
              });
              return { aIdx, match, distSq: nA.anchorPos.distanceToSquared(nB.anchorPos) };
            })
            .filter((item) => item.match > 0)
            .sort((u, v) => v.match - u.match || u.distSq - v.distSq);

          const isCs50 = bIdx === cs50NodeIdx;
          const targetRelays = isCs50 ? 3 : 2;
          for (let k = 0; k < Math.min(targetRelays, matchingRelays.length); k++) {
            addPair(matchingRelays[k].aIdx, bIdx, isCs50 ? 4 : 3, isCs50);
          }
        }
      }

      // 2. Clean Spatial K-Nearest Architectural Lattice (preserves hourglass geometry without X-clutter!)
      for (let fi = 0; fi < fromList.length; fi++) {
        const aIdx = fromList[fi];
        const nA = nodes[aIdx];
        const nearest = toList
          .map((bIdx) => ({
            bIdx,
            distSq: nA.anchorPos.distanceToSquared(nodes[bIdx].anchorPos),
          }))
          .sort((u, v) => u.distSq - v.distSq);

        const kOut = nA.kind === 'structural' ? 2 : 3;
        for (let k = 0; k < Math.min(kOut, nearest.length); k++) {
          addPair(aIdx, nearest[k].bIdx, 1, false);
        }
      }

      // 3. Ensure every destination cube receives at least 2 balanced incoming lanes
      for (let ti = 0; ti < toList.length; ti++) {
        const bIdx = toList[ti];
        if ((inDegree.get(bIdx) ?? 0) >= 2) continue;
        const nB = nodes[bIdx];
        const nearestSources = fromList
          .map((aIdx) => ({
            aIdx,
            distSq: nodes[aIdx].anchorPos.distanceToSquared(nB.anchorPos),
          }))
          .sort((u, v) => u.distSq - v.distSq);

        for (let k = 0; k < nearestSources.length && (inDegree.get(bIdx) ?? 0) < 2; k++) {
          addPair(nearestSources[k].aIdx, bIdx, 1, false);
        }
      }
    }

    const forceLayoutNodeInputs: ForceLayoutNodeInput[] = nodes.map((n) => ({
      id: n.id,
      layerIdx: n.layerIdx,
      row: n.row,
      col: n.col,
      colsInLayer: n.colsInLayer,
      cluster: n.cluster,
      kind: n.kind,
      cubeSize: n.cubeSize,
      anchorX: n.anchorPos.x,
      anchorY: n.anchorPos.y,
      anchorZ: n.anchorPos.z,
      isAlluringRedCert: n.isAlluringRedCert,
    }));

    const forceLayoutEdgeInputs: ForceLayoutEdgeInput[] = edges.map((e) => ({
      fromIdx: e.fromIdx,
      toIdx: e.toIdx,
      isSemantic: e.isSemantic,
    }));

    let lastSolvedBounds: ForceLayoutBounds = {
      minX: -6,
      maxX: 6,
      minY: -3.4,
      maxY: 3.4,
      minZ: -1.8,
      maxZ: 1.8,
      halfW: 6,
      halfH: 3.4,
      halfD: 1.8,
    };
    let lastSolvedWidth = width;
    let lastSolvedHeight = height;

    function computeFastCameraFraming(vpW: number, vpH: number): { z: number; y: number } {
      const aspect = THREE.MathUtils.clamp(vpW / Math.max(1, vpH), 0.44, 2.6);
      const tanHalfV = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
      const tanHalfH = tanHalfV * aspect;
      const hFill = aspect < 1.15 ? 0.9 : 0.86;
      const vFill = vpH < 680 ? 0.76 : 0.8;
      const zW = (lastSolvedBounds.halfW * 1.06) / Math.max(0.08, tanHalfH * hFill) + lastSolvedBounds.halfD;
      const zH = (lastSolvedBounds.halfH * 1.06) / Math.max(0.08, tanHalfV * vFill) + lastSolvedBounds.halfD;
      const z = THREE.MathUtils.clamp(Math.max(zW, zH), 15.6, 44.0);
      return { z, y: z * 0.054 };
    }

    function applyForceLayoutForViewport(
      vpW: number,
      vpH: number,
      immediate: boolean
    ): void {
      const solved = solveNeuralForceLayout(forceLayoutNodeInputs, forceLayoutEdgeInputs, {
        viewportWidth: vpW,
        viewportHeight: vpH,
        fovDeg: camera.fov,
        baseYaw: -0.26,
        basePitch: 0.1,
        iterations: 135,
      });

      lastSolvedBounds = solved.bounds;
      lastSolvedWidth = vpW;
      lastSolvedHeight = vpH;
      targetCameraZ = solved.recommendedCameraZ;
      targetCameraY = solved.recommendedCameraY;

      if (immediate) {
        currentCameraZ = targetCameraZ;
        currentCameraY = targetCameraY;
        camera.position.set(0.15, currentCameraY, currentCameraZ);
        camera.lookAt(0, -0.1, 0);
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pos = solved.positions[i];
        n.targetBasePos.copy(pos);
        if (immediate) {
          n.basePos.copy(pos);
          n.currentPos.copy(pos);
          n.mesh.position.copy(pos);
          if (n.hitProxy) n.hitProxy.position.copy(pos);
          if (n.auraSprite) n.auraSprite.position.copy(pos);
          if (n.rimLines) n.rimLines.position.copy(pos);
        }
      }

      // Re-run 3D Corridor A* Pathfinding against the relaxed, non-overlapping node positions
      const obstacles: CorridorObstacle[] = nodes.map((n) => ({
        x: n.targetBasePos.x,
        y: n.targetBasePos.y,
        z: n.targetBasePos.z,
        radius: n.cubeSize * 0.62,
      }));

      for (let li = 0; li < LAYER_SPECS.length - 1; li++) {
        const edgeIndices = corridorEdgeIndices[li];
        const corridorRequests: EdgeRouteRequest[] = edgeIndices.map((edgeIdx) => {
          const edge = edges[edgeIdx];
          const nA = nodes[edge.fromIdx];
          const nB = nodes[edge.toIdx];
          return {
            edgeIdx,
            fromPos: nA.targetBasePos,
            toPos: nB.targetBasePos,
            fromSize: nA.cubeSize,
            toSize: nB.cubeSize,
            priority: edge.priority,
          };
        });

        const routedPaths = routeCorridorEdges3D(corridorRequests, obstacles, EDGE_SUBDIV);
        for (let rp = 0; rp < routedPaths.length; rp++) {
          const routed = routedPaths[rp];
          const edge = edges[routed.edgeIdx];
          edge.targetBasePoints.set(routed.points);
          edge.tValues.set(routed.tValues);
          if (immediate) {
            edge.basePoints.set(routed.points);
            edge.isMorphingRoute = false;
          } else {
            edge.isMorphingRoute = true;
          }
        }
      }
    }

    // Solve initial force-directed layout & 3D A* corridors synchronously before first frame
    applyForceLayoutForViewport(width, height, true);

    // Precompute semantic graph links between Foundation, Approaches & Credentials for crisp pathway highlighting!
    const foundationNode = nodes[nodeIndexById.get(`foundation:${FOUNDATION_PROFILE.id}`)!];
    for (const app of APPROACHES_LIST) {
      const aNode = nodes[nodeIndexById.get(`approach:${app.id}`)!];
      foundationNode.connectedNodeIds.add(aNode.id);
      aNode.connectedNodeIds.add(foundationNode.id);
      for (const cred of CREDENTIALS_LIST) {
        if (cred.approaches.includes(app.id)) {
          const cNode = nodes[nodeIndexById.get(`cred:${cred.id}`)!];
          aNode.connectedNodeIds.add(cNode.id);
          cNode.connectedNodeIds.add(aNode.id);
        }
      }
    }

    // =========================================================================
    // CUSTOM GLSL FORWARD-PROPAGATION PULSING WIRE SHADER (Pathfound Curved Segments)
    // Organized, collision-free translucent architectural grey paths pulsing left -> right!
    // =========================================================================
    const totalLineVerts = edges.length * EDGE_SUBDIV * 2;
    const linePositions = new Float32Array(totalLineVerts * 3);
    const lineProgress = new Float32Array(totalLineVerts);
    const lineLayerPhase = new Float32Array(totalLineVerts);
    const lineSpeed = new Float32Array(totalLineVerts);
    const lineHighlight = new Float32Array(totalLineVerts);
    const lineDim = new Float32Array(totalLineVerts);

    for (let e = 0; e < edges.length; e++) {
      const edge = edges[e];
      for (let s = 0; s < EDGE_SUBDIV; s++) {
        const v0 = (e * EDGE_SUBDIV + s) * 2;
        const v1 = v0 + 1;
        lineProgress[v0] = edge.tValues[s];
        lineProgress[v1] = edge.tValues[s + 1];
        lineLayerPhase[v0] = edge.pulsePhase;
        lineLayerPhase[v1] = edge.pulsePhase;
        lineSpeed[v0] = edge.pulseSpeed;
        lineSpeed[v1] = edge.pulseSpeed;
      }
    }

    const wireGeo = new THREE.BufferGeometry();
    const wirePosAttr = new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage);
    const wireHiAttr = new THREE.BufferAttribute(lineHighlight, 1).setUsage(THREE.DynamicDrawUsage);
    const wireDimAttr = new THREE.BufferAttribute(lineDim, 1).setUsage(THREE.DynamicDrawUsage);
    wireGeo.setAttribute('position', wirePosAttr);
    wireGeo.setAttribute('aProgress', new THREE.BufferAttribute(lineProgress, 1));
    wireGeo.setAttribute('aPhase', new THREE.BufferAttribute(lineLayerPhase, 1));
    wireGeo.setAttribute('aSpeed', new THREE.BufferAttribute(lineSpeed, 1));
    wireGeo.setAttribute('aHighlight', wireHiAttr);
    wireGeo.setAttribute('aDim', wireDimAttr);

    const wireMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aProgress;
        attribute float aPhase;
        attribute float aSpeed;
        attribute float aHighlight;
        attribute float aDim;

        varying float vProgress;
        varying float vPhase;
        varying float vSpeed;
        varying float vHighlight;
        varying float vDim;

        void main() {
          vProgress = aProgress;
          vPhase = aPhase;
          vSpeed = aSpeed;
          vHighlight = aHighlight;
          vDim = aDim;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;

        varying float vProgress;
        varying float vPhase;
        varying float vSpeed;
        varying float vHighlight;
        varying float vDim;

        void main() {
          // Clean left-to-right forward-propagation data pulse along the pathfound 3D spline
          float speedBoost = mix(1.0, 1.9, vHighlight);
          float w = fract(vProgress - uTime * vSpeed * speedBoost + vPhase);
          float pulse = exp(-pow((w - 0.5) * 2.0, 2.0) * 18.0);

          // Crisp translucent architectural slate-grey at rest -> HDR glowing crimson on pulse crests & active routes!
          vec3 restGrey = vec3(0.42, 0.41, 0.39);
          vec3 pulseGlow = vec3(1.38, 0.34, 0.28);
          vec3 activeRed = vec3(1.32, 0.24, 0.19);

          vec3 col = mix(restGrey, pulseGlow, pulse * 0.72);
          col = mix(col, activeRed * (1.0 + pulse * 0.36), clamp(vHighlight * (0.82 + 0.18 * pulse), 0.0, 1.0));

          // Clean, organized line opacity with subtle futuristic glow on travelling pulses
          float alpha = 0.28 + pulse * 0.36 + vHighlight * 0.56;
          alpha *= mix(1.0, 0.16, vDim);

          gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.98));
        }
      `,
    });

    const wireLines = new THREE.LineSegments(wireGeo, wireMat);
    networkRoot.add(wireLines);
    disposables.push(
      () => wireGeo.dispose(),
      () => wireMat.dispose()
    );

    // =========================================================================
    // 3D LUMINOUS BINARY DUST MOTES (GPU THREE.InstancedMesh + EffectComposer Bloom!)
    // Anchored relative to each cluster node + driven by global mouse force vector & cursor swirl
    // =========================================================================
    const DUST_3D_COUNT = isConstrainedMobile ? 96 : gpuTier.isCoarsePointer ? 136 : 184;
    const dust3dAnchorNode = new Uint16Array(DUST_3D_COUNT);
    const dust3dOffsets = new Float32Array(DUST_3D_COUNT * 3);
    const dust3dDisp = new Float32Array(DUST_3D_COUNT * 3);
    const dust3dVel = new Float32Array(DUST_3D_COUNT * 3);
    const dust3dSwirlEnergy = new Float32Array(DUST_3D_COUNT);
    const dust3dGlyph = new Uint8Array(DUST_3D_COUNT);
    const dust3dRed = new Uint8Array(DUST_3D_COUNT);
    const dust3dPhase = new Float32Array(DUST_3D_COUNT);
    const dust3dWorldScale = new Float32Array(DUST_3D_COUNT);

    for (let i = 0; i < DUST_3D_COUNT; i++) {
      const anchorIdx = i % nodes.length;
      dust3dAnchorNode[i] = anchorIdx;
      dust3dOffsets[i * 3] = (seededHash(i, 1.3, 88.1) - 0.5) * 2.85;
      dust3dOffsets[i * 3 + 1] = (seededHash(i, 3.7, 88.1) - 0.5) * 1.75;
      dust3dOffsets[i * 3 + 2] = (seededHash(i, 7.1, 88.1) - 0.5) * 2.4;
      dust3dGlyph[i] = i % 2 === 0 ? 1 : 0;
      dust3dRed[i] = i % 3 === 0 ? 1 : 0;
      dust3dPhase[i] = seededHash(i, 11.9, 88.1) * Math.PI * 2;
      dust3dWorldScale[i] = 0.16 + seededHash(i, 15.3, 88.1) * 0.11;
    }

    const dust3dBatch = new InstancedBinaryDustBatch({
      maxInstances: DUST_3D_COUNT,
      billboard3d: true,
      depthTest: true,
    });
    networkRoot.add(dust3dBatch.mesh);
    disposables.push(
      () => dust3dBatch.dispose(),
      () => hudDustBatch.dispose()
    );

    // =========================================================================
    // GSAP LAYER-BY-LAYER ENTRANCE (Binary dust -> Cubes appear -> Wires draw L->R)
    // =========================================================================
    const entranceState = {
      lineDrawProgress: 0,
      cueAlpha: 0,
    };
    let hasTriggeredEntrance = false;
    let entranceTl: gsap.core.Timeline | null = null;

    const nodesLeftToRight = [...nodes].sort(
      (a, b) => a.layerIdx - b.layerIdx || a.row - b.row || a.col - b.col
    );

    function playNeuralEntrance(): void {
      entranceTl?.kill();
      entranceState.lineDrawProgress = 0;
      entranceState.cueAlpha = 0;
      for (const n of nodes) n.entranceScale = 0;

      entranceTl = gsap.timeline();
      entranceTl
        .to(
          nodesLeftToRight,
          {
            entranceScale: 1,
            duration: 0.58,
            stagger: 0.012,
            ease: 'back.out(1.38)',
          },
          0.06
        )
        .to(
          entranceState,
          {
            lineDrawProgress: 1,
            duration: 1.15,
            ease: 'power2.inOut',
          },
          0.22
        )
        .to(
          entranceState,
          {
            cueAlpha: 1,
            duration: 0.48,
            ease: 'power2.out',
          },
          0.76
        );
    }

    // =========================================================================
    // BINARY DUST FORMATION ENGINE (Condenses 0s & 1s cleanly into all 6 layers)
    // =========================================================================
    interface DustBit {
      nodeIdx: number;
      swirlX: number;
      swirlY: number;
      orbitR: number;
      orbitA: number;
      delay: number;
      bit: '0' | '1';
      isRed: boolean;
      size: number;
    }

    const dustBits: DustBit[] = [];
    const dustStructPerNode = isConstrainedMobile ? 2 : 4;
    const dustPrimaryPerNode = isConstrainedMobile ? 4 : 8;
    for (let ni = 0; ni < nodes.length; ni++) {
      const n = nodes[ni];
      const count = n.kind === 'structural' ? dustStructPerNode : dustPrimaryPerNode;
      for (let k = 0; k < count; k++) {
        const s = ni * 29 + k;
        dustBits.push({
          nodeIdx: ni,
          swirlX: (seededHash(s, 1.7, 71.1) - 0.5) * 220,
          swirlY: -65 - seededHash(s, 4.1, 71.1) * 175,
          orbitR: 5 + seededHash(s, 7.3, 71.1) * 22,
          orbitA: seededHash(s, 9.9, 71.1) * Math.PI * 2,
          delay: n.layerIdx * 0.045 + seededHash(s, 11.7, 71.1) * 0.16,
          bit: (s & 1) === 0 ? '1' : '0',
          isRed: n.tone === 'red' ? k % 2 === 0 : k % 6 === 0,
          size: n.kind === 'structural' ? 9 : 10.5,
        });
      }
    }

    // =========================================================================
    // INTERACTION (Hover Expand + Clean Preview, Click GSAP Scale Expansion, Smooth Drag Orbit)
    // =========================================================================
    let hoveredNodeId: string | null = null;
    let selectedNodeId: string | null = null;
    let currentFilter: ApproachId | 'all' = 'all';

    function triggerNodeClickExpand(nextId: string | null): void {
      if (selectedNodeId && selectedNodeId !== nextId) {
        const prevIdx = nodeIndexById.get(selectedNodeId);
        if (prevIdx !== undefined) {
          gsap.to(nodes[prevIdx], {
            clickExpandBoost: 0,
            duration: 0.28,
            ease: 'power2.out',
          });
        }
      }
      selectedNodeId = nextId;
      if (nextId) {
        const nextIdx = nodeIndexById.get(nextId);
        if (nextIdx !== undefined) {
          gsap.killTweensOf(nodes[nextIdx], 'clickExpandBoost');
          gsap.fromTo(
            nodes[nextIdx],
            { clickExpandBoost: 0.04 },
            {
              clickExpandBoost: 0.36,
              duration: 0.42,
              ease: 'back.out(1.65)',
            }
          );
        }
      }
    }

    externalSelectNode = (nodeId: string | null) => triggerNodeClickExpand(nodeId);
    externalSetFilter = (filter: ApproachId | 'all') => {
      currentFilter = filter;
    };

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(99, 99);
    let pointerParallaxX = 0;
    let pointerParallaxY = 0;
    let smoothParallaxX = 0;
    let smoothParallaxY = 0;

    // Global mouse force vector & cursor vortex state for binary dust swirl
    let cursorInsideStage = false;
    let cursorPresence = 0;
    let cursorNdcX = 0;
    let cursorNdcY = 0;
    let cursorPxX = width * 0.5;
    let cursorPxY = height * 0.5;
    let prevCursorNdcX = 0;
    let prevCursorNdcY = 0;
    let hasPrevCursor = false;
    let lastPointerMoveMs = 0;
    let rawCursorVelX = 0;
    let rawCursorVelY = 0;
    let smoothGlobalForceX = 0;
    let smoothGlobalForceY = 0;
    let smoothCursorSpeed = 0;
    let swirlSpinSign = 1;

    let isDraggingOrbit = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let lastDragX = 0;
    let lastDragY = 0;
    let didDragOrbit = false;
    let userOrbitYaw = 0;
    let userOrbitPitch = 0;
    let orbitVelYaw = 0;
    let orbitVelPitch = 0;

    // Smooth camera pan & pinch-zoom offsets for multi-touch mobile exploration
    let smoothPanX = 0;
    let smoothPanY = 0;
    let targetPanX = 0;
    let targetPanY = 0;
    let smoothZoomScale = 1.0;
    let targetZoomScale = 1.0;

    externalResetCameraView = () => {
      userOrbitYaw = 0;
      userOrbitPitch = 0;
      orbitVelYaw = 0;
      orbitVelPitch = 0;
      targetPanX = 0;
      targetPanY = 0;
      targetZoomScale = 1.0;
      hasCustomCameraView = false;
    };

    let lastHoverCastMs = 0;
    let lastProjectedCueMs = 0;

    // Pre-allocated scratch helpers (ZERO GC in render loop)
    const _vecA = new THREE.Vector3();
    const _projVec = new THREE.Vector3();
    const _colorTmp = new THREE.Color();
    const _invNetMat = new THREE.Matrix4();
    const _cursorRayDir = new THREE.Vector3();
    const _cursorWorldPos = new THREE.Vector3();
    const _cursorLocalPos = new THREE.Vector3();
    const _camRight = new THREE.Vector3();
    const _camUp = new THREE.Vector3();
    const _camFwd = new THREE.Vector3();
    const _localRight = new THREE.Vector3();
    const _localUp = new THREE.Vector3();
    const _localFwd = new THREE.Vector3();
    const _globalForceLocal = new THREE.Vector3();

    function projectWorldToLocalPx(worldPos: THREE.Vector3): { x: number; y: number } {
      _projVec.copy(worldPos).project(camera);
      return {
        x: (_projVec.x * 0.5 + 0.5) * width,
        y: (-_projVec.y * 0.5 + 0.5) * height,
      };
    }

    externalGetNodeScreenPos = (nodeId: string) => {
      const idx = nodeIndexById.get(nodeId);
      if (idx === undefined) return null;
      nodes[idx].mesh.getWorldPosition(_vecA);
      return projectWorldToLocalPx(_vecA);
    };

    // Camera framing handles exact viewport fit without squishing cube spacing
    let resizeReflowTimer = 0;

    function raycastNetworkNode(
      clientX: number,
      clientY: number,
      touchTolerancePx = 0
    ): LayerNode | null {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      pointerNdc.x = (localX / rect.width) * 2 - 1;
      pointerNdc.y = -(localY / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      // Prioritize primary interactive nodes (Foundation, Approaches, Credentials) over structural relays
      const primaryHits = raycaster.intersectObjects(interactiveHitTargets, false);
      if (primaryHits.length > 0) {
        return nodeByHitObj.get(primaryHits[0].object) ?? null;
      }

      if (touchTolerancePx > 0) {
        // Nearest screen-space interactive node fallback for effortless finger taps on 3D cubes
        let closest: LayerNode | null = null;
        let minDistSq = touchTolerancePx * touchTolerancePx;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (n.kind === 'structural' || !n.mesh.visible) continue;
          n.mesh.getWorldPosition(_vecA);
          _projVec.copy(_vecA).project(camera);
          if (_projVec.z < -1 || _projVec.z > 1) continue;
          const sx = (_projVec.x * 0.5 + 0.5) * rect.width;
          const sy = (-_projVec.y * 0.5 + 0.5) * rect.height;
          const dx = sx - localX;
          const dy = sy - localY;
          const d2 = dx * dx + dy * dy;
          if (d2 < minDistSq) {
            minDistSq = d2;
            closest = n;
          }
        }
        if (closest) return closest;
      }

      const structuralHits = raycaster.intersectObjects(structuralHitTargets, false);
      if (structuralHits.length > 0) {
        return nodeByHitObj.get(structuralHits[0].object) ?? null;
      }
      return null;
    }

    function selectOrToggleNode(hitNode: LayerNode, clientX: number, clientY: number): void {
      if (hitNode.kind === 'structural') {
        const clusterPrimaryApproach: ApproachId =
          hitNode.cluster === 'ml'
            ? 'machine-learning'
            : hitNode.cluster === 'data-science'
              ? 'data-science'
              : 'software-development';
        selectApproachFilter(clusterPrimaryApproach);
        onNodeInteract?.(clientX, clientY);
        return;
      }

      triggerNodeClickExpand(hitNode.id);
      hoveredNodeId = hitNode.id;
      hoverLabel = null;
      connectedHoverLabels = [];

      if (hitNode.kind === 'credential' && hitNode.credentialItem) {
        selectedTarget = { kind: 'credential', item: hitNode.credentialItem, nodeId: hitNode.id };
      } else if (hitNode.kind === 'approach' && hitNode.approachItem) {
        selectedTarget = { kind: 'approach', item: hitNode.approachItem, nodeId: hitNode.id };
      } else if (hitNode.kind === 'foundation' && hitNode.foundationItem) {
        selectedTarget = { kind: 'foundation', item: hitNode.foundationItem, nodeId: hitNode.id };
      }
      animateCardExpandFromNode(hitNode.id);
      onNodeInteract?.(clientX, clientY);
    }

    function updateHoverLabelsForNode(node: LayerNode | null): void {
      if (!node || selectedNodeId !== null) {
        hoverLabel = null;
        connectedHoverLabels = [];
        return;
      }

      node.mesh.getWorldPosition(_vecA);
      const px = projectWorldToLocalPx(_vecA);
      const xPad = width < 480 ? 96 : 120;
      const clampedX = Math.max(xPad, Math.min(width - xPad, px.x));
      const clampedY = Math.max(66, Math.min(height - 96, px.y - 24));
      const clusterName = CLUSTER_DISPLAY_NAME[node.cluster];

      if (node.kind === 'credential' && node.credentialItem) {
        const c = node.credentialItem;
        hoverLabel = {
          id: node.id,
          title: c.title,
          subtitle: `${c.issuer} · ${c.completionDate}`,
          clusterTag: clusterName,
          x: clampedX,
          y: clampedY,
          accentRed: node.tone === 'red',
          isStructural: false,
        };
      } else if (node.kind === 'approach' && node.approachItem) {
        const a = node.approachItem;
        const count = credentialsForApproach(a.id).length;
        hoverLabel = {
          id: node.id,
          title: a.name,
          subtitle: `${count} credentials · ${clusterName}`,
          clusterTag: clusterName,
          x: clampedX,
          y: clampedY,
          accentRed: a.accentTone === 'red',
          isStructural: false,
        };
      } else if (node.kind === 'foundation' && node.foundationItem) {
        hoverLabel = {
          id: node.id,
          title: 'NIT Silchar',
          subtitle: 'B.Tech Electrical Engineering',
          clusterTag: 'Foundation',
          x: clampedX,
          y: clampedY,
          accentRed: true,
          isStructural: false,
        };
      } else {
        hoverLabel = {
          id: node.id,
          title: node.label,
          subtitle: `${clusterName} cluster`,
          clusterTag: clusterName,
          x: clampedX,
          y: clampedY,
          accentRed: false,
          isStructural: true,
        };
      }

      // Reveal quiet, non-overlapping hover-only sans-serif labels on directly connected hubs/credentials
      const peers: ConnectedHoverLabel[] = [];
      if (node.kind !== 'structural') {
        const occupied: Array<{ x: number; y: number }> = [{ x: clampedX, y: clampedY }];
        node.connectedNodeIds.forEach((peerId) => {
          const pIdx = nodeIndexById.get(peerId);
          if (pIdx === undefined) return;
          const peer = nodes[pIdx];
          if (peer.kind === 'structural' || !peer.label) return;
          peer.mesh.getWorldPosition(_vecA);
          const pPx = projectWorldToLocalPx(_vecA);
          const lx = Math.max(82, Math.min(width - 82, pPx.x));
          const ly = Math.max(46, Math.min(height - 92, pPx.y - 20));

          let collides = false;
          for (let k = 0; k < occupied.length; k++) {
            if (Math.abs(lx - occupied[k].x) < 118 && Math.abs(ly - occupied[k].y) < 30) {
              collides = true;
              break;
            }
          }
          if (collides) return;
          occupied.push({ x: lx, y: ly });
          peers.push({
            id: peer.id,
            label: peer.label,
            x: lx,
            y: ly,
            accentRed: peer.tone === 'red',
          });
        });
      }
      connectedHoverLabels = peers;
    }

    function updateCursorForceSample(clientX: number, clientY: number, nowMs: number): void {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      const nx = (localX / rect.width) * 2 - 1;
      const ny = -(localY / rect.height) * 2 + 1;

      pointerParallaxX = nx;
      pointerParallaxY = -ny;
      cursorPxX = localX;
      cursorPxY = localY;
      cursorNdcX = nx;
      cursorNdcY = ny;
      cursorInsideStage = true;

      if (hasPrevCursor) {
        const moveDt = THREE.MathUtils.clamp((nowMs - lastPointerMoveMs) / 1000, 0.008, 0.08);
        const instVx = (nx - prevCursorNdcX) / moveDt;
        const instVy = (ny - prevCursorNdcY) / moveDt;
        const instMag = Math.hypot(instVx, instVy);
        const maxVel = 3.6;
        const scale = instMag > maxVel ? maxVel / instMag : 1;
        const clampedVx = instVx * scale;
        const clampedVy = instVy * scale;

        rawCursorVelX = rawCursorVelX * 0.35 + clampedVx * 0.65;
        rawCursorVelY = rawCursorVelY * 0.35 + clampedVy * 0.65;

        // Gently steer vortex chirality from cursor sweep direction without ever collapsing spin to zero
        if (instMag > 0.14) {
          const sweepBias = clampedVx * 0.65 - clampedVy * 0.35;
          if (Math.abs(sweepBias) > 0.08) {
            const targetSign = sweepBias >= 0 ? 1 : -1;
            swirlSpinSign += (targetSign - swirlSpinSign) * 0.16;
          }
        }
      }
      prevCursorNdcX = nx;
      prevCursorNdcY = ny;
      hasPrevCursor = true;
      lastPointerMoveMs = nowMs;
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const now = performance.now();
      updateCursorForceSample(e.clientX, e.clientY, now);

      if (isDraggingOrbit) {
        const dx = e.clientX - lastDragX;
        const dy = e.clientY - lastDragY;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > 5) {
          didDragOrbit = true;
        }
        userOrbitYaw += dx * 0.0048;
        userOrbitPitch = THREE.MathUtils.clamp(userOrbitPitch + dy * 0.004, -0.52, 0.52);
        orbitVelYaw = dx * 0.075;
        orbitVelPitch = dy * 0.055;
        activeCursor = 'grabbing';
        hoverLabel = null;
        connectedHoverLabels = [];
        return;
      }

      if (now - lastHoverCastMs < 16) return;
      lastHoverCastMs = now;

      const hitNode = raycastNetworkNode(e.clientX, e.clientY);
      hoveredNodeId = hitNode ? hitNode.id : null;
      activeCursor = hitNode ? 'pointer' : 'default';
      updateHoverLabelsForNode(hitNode);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      const hitNode = raycastNetworkNode(e.clientX, e.clientY);
      if (hitNode) {
        e.stopPropagation();
        selectOrToggleNode(hitNode, e.clientX, e.clientY);
        return;
      }

      isDraggingOrbit = true;
      didDragOrbit = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      orbitVelYaw = 0;
      orbitVelPitch = 0;
      try {
        renderer.domElement.setPointerCapture(e.pointerId);
      } catch {
        // Ignore synthetic events
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (isDraggingOrbit) {
        isDraggingOrbit = false;
        try {
          if (renderer.domElement.hasPointerCapture(e.pointerId)) {
            renderer.domElement.releasePointerCapture(e.pointerId);
          }
        } catch {
          // Safe cleanup
        }
        if (!didDragOrbit && selectedTarget !== null) {
          closeDetailPanel();
        }
        activeCursor = hoveredNodeId ? 'pointer' : 'default';
      }
    };

    const handlePointerLeave = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      cursorInsideStage = false;
      hasPrevCursor = false;
      rawCursorVelX = 0;
      rawCursorVelY = 0;
      if (!isDraggingOrbit) {
        hoveredNodeId = null;
        hoverLabel = null;
        connectedHoverLabels = [];
        activeCursor = 'default';
        pointerParallaxX = 0;
        pointerParallaxY = 0;
      }
    };

    // =========================================================================
    // NATIVE MULTI-TOUCH GESTURE ENGINE FOR MOBILE 3D NEURAL NETWORK
    // - 1-finger tap: selects node cleanly with 24px touch tolerance (or closes card)
    // - 1-finger drag: smooth 3D orbit (yaw + pitch + inertia) + finger binary dust swirl
    // - Edge pure-vertical swipe handoff: never traps vertical page scrolling
    // - 2-finger pinch & drag: simultaneous pinch-to-zoom + camera pan + dust swirl
    // - Double-tap empty background: smoothly resets orbit, pan & zoom back to home
    // =========================================================================
    type TouchGestureMode = 'none' | 'pending' | 'orbit' | 'scroll' | 'pinch-pan';
    let touchGesture: TouchGestureMode = 'none';
    let touchStartNode: LayerNode | null = null;
    let touchStartedInScrollGutter = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let pinchStartDist = 1;
    let pinchStartZoom = 1;
    let pinchStartMidX = 0;
    let pinchStartMidY = 0;
    let pinchStartPanX = 0;
    let pinchStartPanY = 0;
    let lastEmptyTapMs = 0;
    let touchLabelPreviewTimer = 0;

    function syncCustomCameraFlag(): void {
      const moved =
        Math.abs(userOrbitYaw) > 0.14 ||
        Math.abs(userOrbitPitch) > 0.14 ||
        Math.abs(targetPanX) > 0.22 ||
        Math.abs(targetPanY) > 0.22 ||
        Math.abs(targetZoomScale - 1) > 0.08;
      if (moved !== hasCustomCameraView) {
        hasCustomCameraView = moved;
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      const now = performance.now();
      window.clearTimeout(touchLabelPreviewTimer);

      if (e.touches.length === 1) {
        const t = e.touches[0];
        const rect = renderer.domElement.getBoundingClientRect();
        const lx = t.clientX - rect.left;
        const ly = t.clientY - rect.top;

        touchStartNode = raycastNetworkNode(t.clientX, t.clientY, 24);
        touchStartedInScrollGutter =
          !touchStartNode &&
          (ly < rect.height * 0.15 ||
            ly > rect.height * 0.85 ||
            lx < rect.width * 0.09 ||
            lx > rect.width * 0.91);

        touchGesture = 'pending';
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        lastTouchX = t.clientX;
        lastTouchY = t.clientY;
        isDraggingOrbit = false;
        orbitVelYaw = 0;
        orbitVelPitch = 0;
        hasPrevCursor = false;
        updateCursorForceSample(t.clientX, t.clientY, now);

        if (touchStartNode && selectedNodeId === null) {
          hoveredNodeId = touchStartNode.id;
          updateHoverLabelsForNode(touchStartNode);
        }
      } else if (e.touches.length >= 2) {
        e.preventDefault();
        touchGesture = 'pinch-pan';
        touchStartNode = null;
        isDraggingOrbit = false;
        hoveredNodeId = null;
        hoverLabel = null;
        connectedHoverLabels = [];

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        pinchStartDist = Math.max(24, Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY));
        pinchStartZoom = targetZoomScale;
        pinchStartMidX = (t0.clientX + t1.clientX) * 0.5;
        pinchStartMidY = (t0.clientY + t1.clientY) * 0.5;
        pinchStartPanX = targetPanX;
        pinchStartPanY = targetPanY;
        updateCursorForceSample(pinchStartMidX, pinchStartMidY, now);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const now = performance.now();

      if (e.touches.length >= 2) {
        e.preventDefault();
        if (touchGesture !== 'pinch-pan') {
          const t0 = e.touches[0];
          const t1 = e.touches[1];
          touchGesture = 'pinch-pan';
          pinchStartDist = Math.max(24, Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY));
          pinchStartZoom = targetZoomScale;
          pinchStartMidX = (t0.clientX + t1.clientX) * 0.5;
          pinchStartMidY = (t0.clientY + t1.clientY) * 0.5;
          pinchStartPanX = targetPanX;
          pinchStartPanY = targetPanY;
          return;
        }

        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.max(24, Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY));
        const midX = (t0.clientX + t1.clientX) * 0.5;
        const midY = (t0.clientY + t1.clientY) * 0.5;

        targetZoomScale = THREE.MathUtils.clamp(
          pinchStartZoom * (pinchStartDist / dist),
          0.62,
          1.38
        );

        const panGain = currentCameraZ * 0.00145;
        targetPanX = THREE.MathUtils.clamp(
          pinchStartPanX + (midX - pinchStartMidX) * panGain,
          -3.2,
          3.2
        );
        targetPanY = THREE.MathUtils.clamp(
          pinchStartPanY - (midY - pinchStartMidY) * panGain,
          -2.2,
          2.2
        );

        updateCursorForceSample(midX, midY, now);
        syncCustomCameraFlag();
        return;
      }

      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const totalDx = t.clientX - touchStartX;
      const totalDy = t.clientY - touchStartY;
      const stepDx = t.clientX - lastTouchX;
      const stepDy = t.clientY - lastTouchY;
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;

      updateCursorForceSample(t.clientX, t.clientY, now);

      if (touchGesture === 'pending') {
        if (Math.hypot(totalDx, totalDy) < 7) return;

        if (
          touchStartedInScrollGutter &&
          Math.abs(totalDy) > Math.abs(totalDx) * 1.25
        ) {
          touchGesture = 'scroll';
        } else {
          touchGesture = 'orbit';
          isDraggingOrbit = true;
          touchStartNode = null;
          hoveredNodeId = null;
          hoverLabel = null;
          connectedHoverLabels = [];
        }
      }

      if (touchGesture === 'scroll') {
        e.preventDefault();
        window.scrollBy({ top: -stepDy, behavior: 'auto' });
        return;
      }

      if (touchGesture === 'orbit') {
        e.preventDefault();
        userOrbitYaw += stepDx * 0.0056;
        userOrbitPitch = THREE.MathUtils.clamp(userOrbitPitch + stepDy * 0.0046, -0.56, 0.56);
        orbitVelYaw = stepDx * 0.085;
        orbitVelPitch = stepDy * 0.062;
        syncCustomCameraFlag();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const now = performance.now();

      if (e.touches.length === 1 && touchGesture === 'pinch-pan') {
        // Seamless 2->1 finger handoff with zero camera jump
        const rem = e.touches[0];
        lastTouchX = rem.clientX;
        lastTouchY = rem.clientY;
        touchStartX = rem.clientX;
        touchStartY = rem.clientY;
        touchGesture = 'orbit';
        isDraggingOrbit = true;
        orbitVelYaw = 0;
        orbitVelPitch = 0;
        return;
      }

      if (e.touches.length > 0) return;

      const endedMode = touchGesture;
      touchGesture = 'none';
      isDraggingOrbit = false;
      cursorInsideStage = false;
      hasPrevCursor = false;
      rawCursorVelX = 0;
      rawCursorVelY = 0;
      pointerParallaxX = 0;
      pointerParallaxY = 0;

      if (endedMode === 'pending') {
        const changed = e.changedTouches[0];
        const tapX = changed ? changed.clientX : touchStartX;
        const tapY = changed ? changed.clientY : touchStartY;

        if (touchStartNode) {
          selectOrToggleNode(touchStartNode, tapX, tapY);
        } else if (selectedTarget !== null) {
          closeDetailPanel();
        } else {
          if (now - lastEmptyTapMs < 320) {
            externalResetCameraView?.();
            lastEmptyTapMs = 0;
          } else {
            lastEmptyTapMs = now;
          }
          hoveredNodeId = null;
          hoverLabel = null;
          connectedHoverLabels = [];
        }
      } else {
        touchLabelPreviewTimer = window.setTimeout(() => {
          hoveredNodeId = null;
          hoverLabel = null;
          connectedHoverLabels = [];
        }, 90);
      }
      touchStartNode = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImageSrc) {
          lightboxImageSrc = null;
        } else if (selectedTarget) {
          closeDetailPanel();
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove, { passive: true });
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointercancel', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    renderer.domElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    renderer.domElement.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    const onContextLost = (e: Event) => e.preventDefault();
    const onContextRestored = () => renderer.setSize(width, height, false);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const nextW = Math.max(Math.round(entry.contentRect.width), 320);
      const nextH = Math.max(Math.round(entry.contentRect.height), 320);
      if (nextW === width && nextH === height) return;
      width = nextW;
      height = nextH;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      hudDustCamera.right = width;
      hudDustCamera.bottom = height;
      hudDustCamera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      bloomPass.resolution.set(Math.round(width * bloomScale), Math.round(height * bloomScale));

      // Immediate zero-clipping frustum camera distance adjustment while dragging viewport edges
      const quickFrame = computeFastCameraFraming(width, height);
      targetCameraZ = quickFrame.z;
      targetCameraY = quickFrame.y;

      // Debounced full 3D force-directed re-layout + A* re-routing when viewport proportions shift
      const prevAspect = lastSolvedWidth / Math.max(1, lastSolvedHeight);
      const nextAspect = width / Math.max(1, height);
      const significantResize =
        Math.abs(nextAspect - prevAspect) >= 0.035 ||
        Math.abs(width - lastSolvedWidth) >= 28 ||
        Math.abs(height - lastSolvedHeight) >= 28;

      if (significantResize) {
        window.clearTimeout(resizeReflowTimer);
        resizeReflowTimer = window.setTimeout(() => {
          if (!disposed) {
            applyForceLayoutForViewport(width, height, false);
          }
        }, 90);
      }
    });
    resizeObserver.observe(container);

    // =========================================================================
    // GPU INSTANCED BINARY DUST OVERLAYS
    // (1. Stage HUD batch: Scroll Condensation + Node-to-Card Streams)
    // (2. Transient Card batch: Detail Card Veil Dissipation)
    // =========================================================================
    const HUD_RED_R = 1.0;
    const HUD_RED_G = 48 / 255;
    const HUD_RED_B = 39 / 255;
    const HUD_INK_R = 24 / 255;
    const HUD_INK_G = 24 / 255;
    const HUD_INK_B = 22 / 255;

    function prepareHudBinaryDust(clockSec: number): void {
      const tickStep = Math.floor(clockSec * 12);
      hudDustBatch.beginFrame();

      // A) Scroll condensation binary dust (active while page scrolls into network)
      if (buildProgress > 0.01 && buildProgress < 0.992) {
        const cloudFadeOut = Math.max(0, 1 - Math.max(0, (buildProgress - 0.56) / 0.42));
        if (cloudFadeOut > 0.01) {
          const tick = Math.floor(clockSec * 8);
          const spinDir2d = swirlSpinSign >= 0 ? 1 : -1;
          const globalWindX = smoothGlobalForceX * 26 * cursorPresence;
          const globalWindY = -smoothGlobalForceY * 26 * cursorPresence;

          for (let i = 0; i < dustBits.length; i++) {
            const dp = dustBits[i];
            const lt = Math.max(0, Math.min(1, (buildProgress - dp.delay) / (1 - dp.delay)));
            if (lt <= 0) continue;

            const n = nodes[dp.nodeIdx];
            n.mesh.getWorldPosition(_vecA);
            const dest = projectWorldToLocalPx(_vecA);

            const ease = quinticEase(lt);
            const inv = 1 - ease;
            const angle = dp.orbitA + inv * 2.1;
            let px = dest.x + Math.cos(angle) * dp.orbitR * inv + dp.swirlX * inv;
            let py = dest.y + Math.sin(angle) * dp.orbitR * inv + dp.swirlY * inv;

            if (cursorPresence > 0.01) {
              const dx = px - cursorPxX;
              const dy = py - cursorPxY;
              const distSq = dx * dx + dy * dy;
              const dist = Math.sqrt(distSq) + 0.001;
              const falloff = Math.exp(-distSq / (2 * 155 * 155));
              const swirlAmp =
                (18 + smoothCursorSpeed * 22) * falloff * cursorPresence * (0.35 + 0.65 * inv);
              px += globalWindX * (0.24 + 0.76 * falloff) + (-dy / dist) * swirlAmp * spinDir2d;
              py += globalWindY * (0.24 + 0.76 * falloff) + (dx / dist) * swirlAmp * spinDir2d;
            }

            const alpha = Math.min(1, lt / 0.18) * cloudFadeOut * 0.88;
            if (alpha <= 0.015) continue;

            const glyph: 0 | 1 =
              (i + tick) % 23 === 0 ? (dp.bit === '1' ? 0 : 1) : dp.bit === '1' ? 1 : 0;
            if (dp.isRed) {
              hudDustBatch.push2D(px, py, dp.size, glyph, HUD_RED_R, HUD_RED_G, HUD_RED_B, alpha);
            } else {
              hudDustBatch.push2D(px, py, dp.size, glyph, HUD_INK_R, HUD_INK_G, HUD_INK_B, alpha);
            }
          }
        }
      }

      // B) Node-to-Card binary dust burst stream driven by the GSAP card entry timeline
      if (cardDustState.active && cardDustState.streamAlpha > 0.01) {
        const sp = cardDustState.streamProgress;
        const sa = cardDustState.streamAlpha;

        for (let i = 0; i < CARD_STREAM_COUNT; i++) {
          const b = cardStreamBits[i];
          const localT = THREE.MathUtils.clamp((sp - b.delay) / Math.max(0.15, 1 - b.delay), 0, 1);
          if (localT <= 0.005) continue;

          const inv = 1 - localT;
          const px =
            inv * inv * b.startX + 2 * inv * localT * b.ctrlX + localT * localT * b.endX;
          const py =
            inv * inv * b.startY + 2 * inv * localT * b.ctrlY + localT * localT * b.endY;

          const env = Math.sin(Math.min(1, localT) * Math.PI * 0.92);
          const alpha = env * sa * 0.92;
          if (alpha <= 0.015) continue;

          const flip = (tickStep + b.flipSeed) % 11 === 0;
          const glyph: 0 | 1 = flip ? (b.bit === '1' ? 0 : 1) : b.bit === '1' ? 1 : 0;
          const sz = b.size * (0.85 + 0.35 * (1 - localT));
          if (b.isRed) {
            hudDustBatch.push2D(px, py, sz, glyph, HUD_RED_R, HUD_RED_G, HUD_RED_B, alpha);
          } else {
            hudDustBatch.push2D(px, py, sz, glyph, HUD_INK_R, HUD_INK_G, HUD_INK_B, alpha * 0.85);
          }
        }
      }

      hudDustBatch.commitFrame();

      // C) Detail card overlay GPU InstancedMesh veil
      const cgRenderer = cardGpuRenderer;
      if (cgRenderer && cardDustCanvasEl) {
        if (cardDustState.active && cardDustState.veilAlpha > 0.008) {
          const cw = Math.max(120, Math.round(cardDustCanvasEl.clientWidth || cardDustState.cardW));
          const chPx = Math.max(120, Math.round(cardDustCanvasEl.clientHeight || cardDustState.cardH));
          cgRenderer.resize(cw, chPx, false);

          const va = cardDustState.veilAlpha;
          const drift = cardDustState.veilDrift;
          cardVeilScrimAlpha = va * 0.42;

          cgRenderer.beginFrame();
          for (let i = 0; i < CARD_VEIL_COUNT; i++) {
            const v = cardVeilBits[i];
            const localAlpha = THREE.MathUtils.clamp((va - v.fadeOffset * (1 - va)) * 1.25, 0, 1);
            if (localAlpha <= 0.015) continue;

            const px = v.nx * cw + v.driftX * drift;
            const py = v.ny * chPx + v.driftY * drift;
            if (px < -12 || px > cw + 12 || py < -12 || py > chPx + 12) continue;

            const flip = (tickStep + v.flipSeed) % 9 === 0;
            const glyph: 0 | 1 = flip ? (v.bit === '1' ? 0 : 1) : v.bit === '1' ? 1 : 0;
            const sz = v.size * (0.76 + 0.34 * localAlpha);
            if (v.isRed) {
              cgRenderer.push(px, py, sz, glyph, HUD_RED_R, HUD_RED_G, HUD_RED_B, localAlpha * 0.88);
            } else {
              cgRenderer.push(px, py, sz, glyph, HUD_INK_R, HUD_INK_G, HUD_INK_B, localAlpha * 0.72);
            }
          }
          cgRenderer.render();
          cardDustState.veilCleared = false;
        } else if (!cardDustState.veilCleared) {
          cgRenderer.clear();
          cardVeilScrimAlpha = 0;
          cardDustState.veilCleared = true;
        }
      } else if (cardVeilScrimAlpha !== 0) {
        cardVeilScrimAlpha = 0;
      }
    }

    // =========================================================================
    // MAIN RENDER LOOP (Silky 60fps + Software-WebGL afterDraw Pacing)
    // =========================================================================
    let disposed = false;
    let rafId = 0;
    let syncTimerId = 0;
    let isTabPaused = document.hidden;
    let hasClearedWhenHidden = false;
    let lastMs = performance.now();
    let clock = 0;

    function afterDraw(cb: () => void): void {
      const glCtx = renderer.getContext() as WebGL2RenderingContext;
      const sync = glCtx.fenceSync?.(glCtx.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        syncTimerId = window.setTimeout(cb, 80);
        return;
      }
      glCtx.flush();
      const poll = () => {
        if (disposed) {
          glCtx.deleteSync(sync);
          return;
        }
        const status = glCtx.getSyncParameter(sync, glCtx.SYNC_STATUS);
        if (status === glCtx.UNSIGNALED) {
          syncTimerId = window.setTimeout(poll, 5);
        } else {
          glCtx.deleteSync(sync);
          syncTimerId = window.setTimeout(cb, 80);
        }
      };
      syncTimerId = window.setTimeout(poll, 5);
    }

    function stepAndRender(nowMs: number): void {
      if (disposed || isTabPaused) {
        rafId = 0;
        return;
      }

      const dt = Math.min((nowMs - lastMs) / 1000, 0.05);
      lastMs = nowMs;

      // Skip all 3D EffectComposer + simulation work when Credentials stage is completely scrolled out
      if (buildProgress <= 0.01 && !cardDustState.active) {
        if (hasTriggeredEntrance) {
          hasTriggeredEntrance = false;
          entranceTl?.kill();
          entranceState.lineDrawProgress = 0;
          entranceState.cueAlpha = 0;
          for (const n of nodes) n.entranceScale = 0;
        }
        if (!hasClearedWhenHidden) {
          networkRoot.visible = false;
          hudDustBatch.beginFrame();
          hudDustBatch.commitFrame();
          renderer.clear();
          hasClearedWhenHidden = true;
        }
        rafId = requestAnimationFrame(stepAndRender);
        return;
      }
      hasClearedWhenHidden = false;

      clock += dt;

      if (buildProgress >= 0.22 && !hasTriggeredEntrance) {
        hasTriggeredEntrance = true;
        playNeuralEntrance();
      } else if (buildProgress < 0.05 && hasTriggeredEntrance) {
        hasTriggeredEntrance = false;
        entranceTl?.kill();
        entranceState.lineDrawProgress = 0;
        entranceState.cueAlpha = 0;
        for (const n of nodes) n.entranceScale = 0;
      }

      const stageVisible = buildProgress > 0.04;
      networkRoot.visible = stageVisible;

      if (!isDraggingOrbit && touchGesture !== 'pinch-pan') {
        userOrbitYaw += orbitVelYaw * dt;
        userOrbitPitch = THREE.MathUtils.clamp(
          userOrbitPitch + orbitVelPitch * dt,
          -0.56,
          0.56
        );
        const damp = Math.exp(-4.8 * dt);
        orbitVelYaw *= damp;
        orbitVelPitch *= damp;
      }

      const pDamp = 1 - Math.exp(-5.4 * dt);
      smoothParallaxX += (pointerParallaxX - smoothParallaxX) * pDamp;
      smoothParallaxY += (pointerParallaxY - smoothParallaxY) * pDamp;

      // Iconic clean 3/4 architectural neural angle + subtle slow breathing drift
      const baseYaw = -0.26 + Math.sin(clock * 0.24) * 0.085;
      const basePitch = 0.1 + Math.cos(clock * 0.19) * 0.032;

      // Smoothly damp viewport-adaptive framing + multi-touch pan & pinch-zoom offsets
      const camDamp = 1 - Math.exp(-7.4 * dt);
      smoothZoomScale += (targetZoomScale - smoothZoomScale) * camDamp;
      smoothPanX += (targetPanX - smoothPanX) * camDamp;
      smoothPanY += (targetPanY - smoothPanY) * camDamp;
      const desiredZ = targetCameraZ * smoothZoomScale;
      currentCameraZ += (desiredZ - currentCameraZ) * camDamp;
      currentCameraY += (targetCameraY - currentCameraY) * camDamp;
      camera.position.set(0.15 - smoothPanX, currentCameraY - smoothPanY, currentCameraZ);
      camera.lookAt(-smoothPanX, -0.1 - smoothPanY, 0);

      networkRoot.rotation.y = baseYaw + userOrbitYaw + smoothParallaxX * 0.075;
      networkRoot.rotation.x = basePitch + userOrbitPitch + smoothParallaxY * 0.045;
      networkRoot.position.y = Math.sin(clock * 0.55) * 0.042 - 0.14;

      const targetShiftX =
        selectedNodeId !== null && width >= 1024 ? (width >= 1280 ? -1.45 : -1.0) : 0;
      networkRoot.position.x += (targetShiftX - networkRoot.position.x) * (1 - Math.exp(-5.6 * dt));
      networkRoot.scale.setScalar(1);

      // Determine active focus scope (hover > selected > domain filter)
      const focusId = hoveredNodeId ?? selectedNodeId;
      const focusNode = focusId ? nodes[nodeIndexById.get(focusId) ?? -1] ?? null : null;
      const hasFocus = focusNode !== null || currentFilter !== 'all';
      const nodeDamp = 1 - Math.exp(-10.0 * dt);
      const layoutDamp = 1 - Math.exp(-7.5 * dt);

      // Active approach set driven by focusNode or domain filter
      const activeApproaches = new Set<ApproachId>();
      if (focusNode) {
        focusNode.approachLinks.forEach((a) => activeApproaches.add(a));
      } else if (currentFilter !== 'all') {
        activeApproaches.add(currentFilter);
      }

      // 1. Update every 3D Beveled Cube Neuron (including smooth force-directed resize reflow)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        if (n.basePos.distanceToSquared(n.targetBasePos) > 1e-6) {
          n.basePos.lerp(n.targetBasePos, layoutDamp);
        }

        // Very subtle, tidy floating wave so the cluster spacing stays razor-neat
        const fy = Math.sin(clock * 0.9 + n.floatPhase) * 0.024;
        n.currentPos.set(n.basePos.x, n.basePos.y + fy, n.basePos.z);
        n.mesh.position.copy(n.currentPos);
        if (n.hitProxy) {
          n.hitProxy.position.copy(n.currentPos);
        }

        let isFocused = false;
        let isRelated = false;

        if (focusNode) {
          isFocused = n.id === focusNode.id;
          if (focusNode.kind === 'structural') {
            // Hovering any structural node illuminates its thematic cluster band smoothly
            isRelated = n.cluster === focusNode.cluster;
          } else {
            isRelated = focusNode.connectedNodeIds.has(n.id);
          }
        } else if (currentFilter !== 'all') {
          isFocused = n.id === `approach:${currentFilter}`;
          isRelated = n.kind !== 'structural' && n.approachLinks.has(currentFilter);
        }

        const targetHighlight = isFocused ? 1 : isRelated ? 0.65 : 0;
        const targetDim = hasFocus && !isFocused && !isRelated ? 1 : 0;

        n.currentHighlight += (targetHighlight - n.currentHighlight) * nodeDamp;
        n.currentDim += (targetDim - n.currentDim) * nodeDamp;

        const redPulse = n.pulseRed
          ? 0.5 + 0.5 * Math.sin(clock * (n.isAlluringRedCert ? 2.5 : 2.1) + n.pulsePhase)
          : 0;

        const targetScaleMul =
          1 +
          (isFocused ? 0.24 : isRelated ? 0.1 : 0) -
          n.currentDim * 0.08 +
          redPulse * (n.isAlluringRedCert ? 0.065 : 0.045);
        n.currentScaleMul += (targetScaleMul - n.currentScaleMul) * nodeDamp;

        const s = Math.max(
          0.0001,
          n.cubeSize * n.entranceScale * (n.currentScaleMul + n.clickExpandBoost)
        );
        n.mesh.scale.setScalar(s);
        n.mesh.visible = n.entranceScale > 0.002;

        // Subtle jewel-like specular sheen tilt on alluring red even certificate cubes
        if (n.isAlluringRedCert) {
          n.mesh.rotation.y = Math.sin(clock * 0.85 + n.pulsePhase) * 0.06 + n.currentHighlight * 0.14;
          n.mesh.rotation.x = Math.cos(clock * 0.72 + n.pulsePhase) * 0.04;
        }

        // Concrete solid color grading (zero ghost transparency)
        _colorTmp.copy(n.baseColor);
        if (n.currentDim > 0.005) {
          _colorTmp.lerp(n.dimColor, n.currentDim);
        }
        if (n.currentHighlight > 0.005) {
          _colorTmp.lerp(n.highlightColor, n.currentHighlight * (n.tone === 'red' ? 0.42 : 0.78));
        }
        n.mat.color.copy(_colorTmp);

        if (n.isAlluringRedCert) {
          n.mat.emissive.copy(COLOR_EMISSIVE_RUBY);
          // HDR emissive energy (> 1.02 on crests/focus) triggers silky EffectComposer bloom
          n.mat.emissiveIntensity =
            (0.68 + redPulse * 0.48 + n.currentHighlight * 0.56 + n.clickExpandBoost * 0.55) *
            (1 - n.currentDim * 0.76);

          if (n.auraSprite && n.auraMat) {
            n.auraSprite.position.copy(n.currentPos);
            n.auraSprite.visible = n.entranceScale > 0.05;
            n.auraSprite.scale.setScalar(s * (2.65 + redPulse * 0.35 + n.currentHighlight * 0.55));
            n.auraMat.opacity =
              (0.46 + redPulse * 0.22 + n.currentHighlight * 0.32) *
              n.entranceScale *
              (1 - n.currentDim * 0.78);
          }

          if (n.rimLines && n.rimMat) {
            n.rimLines.position.copy(n.currentPos);
            n.rimLines.rotation.copy(n.mesh.rotation);
            n.rimLines.scale.setScalar(s * 1.03);
            n.rimLines.visible = n.entranceScale > 0.05;
            n.rimMat.opacity =
              (0.42 + redPulse * 0.28 + n.currentHighlight * 0.42) *
              n.entranceScale *
              (1 - n.currentDim * 0.8);
          }
        } else if (n.tone === 'red') {
          n.mat.emissive.copy(COLOR_EMISSIVE_RED);
          n.mat.emissiveIntensity =
            (0.52 + redPulse * 0.42 + n.currentHighlight * 0.52 + n.clickExpandBoost * 0.48) *
            (1 - n.currentDim * 0.76);
        } else if (n.currentHighlight > 0.25 || n.clickExpandBoost > 0.05) {
          n.mat.emissive.copy(COLOR_EMISSIVE_RED);
          n.mat.emissiveIntensity = n.currentHighlight * 0.48 + n.clickExpandBoost * 0.52;
        } else {
          n.mat.emissiveIntensity = 0;
        }
      }

      // 2. Update 3D A* Pathfound Forward-Propagation Pulsing Wires
      wireMat.uniforms.uTime.value = clock;

      const posAttr = wireGeo.attributes.position as THREE.BufferAttribute;
      const hiAttr = wireGeo.attributes.aHighlight as THREE.BufferAttribute;
      const dimAttr = wireGeo.attributes.aDim as THREE.BufferAttribute;
      const pArr = posAttr.array as Float32Array;
      const hiArr = hiAttr.array as Float32Array;
      const dimArr = dimAttr.array as Float32Array;
      const lineP = entranceState.lineDrawProgress;

      for (let e = 0; e < edges.length; e++) {
        const edge = edges[e];
        const nA = nodes[edge.fromIdx];
        const nB = nodes[edge.toIdx];

        const drawT = quinticEase(
          (lineP - edge.drawStart) / Math.max(0.01, edge.drawEnd - edge.drawStart)
        );

        let edgeHighlighted = false;
        if (focusNode) {
          if (nA.id === focusNode.id || nB.id === focusNode.id) {
            edgeHighlighted = true;
          } else if (focusNode.kind === 'structural') {
            edgeHighlighted =
              nA.cluster === focusNode.cluster && nB.cluster === focusNode.cluster;
          } else if (edge.sharedApproaches.size > 0) {
            let matchesActive = false;
            edge.sharedApproaches.forEach((a) => {
              if (activeApproaches.has(a)) matchesActive = true;
            });
            if (
              matchesActive &&
              (focusNode.connectedNodeIds.has(nA.id) ||
                focusNode.connectedNodeIds.has(nB.id) ||
                (focusNode.id === 'cred:harvard-cs50x' && edge.fromLayer <= 3))
            ) {
              edgeHighlighted = true;
            }
          }
        } else if (currentFilter !== 'all') {
          edgeHighlighted = edge.sharedApproaches.has(currentFilter) && edge.isSemantic;
        }

        const targetHi = edgeHighlighted ? 1 : 0;
        const targetDim = hasFocus && !edgeHighlighted ? 1 : 0;
        edge.currentHighlight += (targetHi - edge.currentHighlight) * nodeDamp;
        edge.currentDim += (targetDim - edge.currentDim) * nodeDamp;

        // Smoothly morph re-routed 3D A* curves when force-directed layout reflows on resize
        if (edge.isMorphingRoute) {
          const bpCur = edge.basePoints;
          const bpTgt = edge.targetBasePoints;
          let maxDelta = 0;
          for (let k = 0; k < bpCur.length; k++) {
            const diff = bpTgt[k] - bpCur[k];
            const absDiff = Math.abs(diff);
            if (absDiff > maxDelta) maxDelta = absDiff;
            bpCur[k] += diff * layoutDamp;
          }
          if (maxDelta < 0.0008) {
            bpCur.set(bpTgt);
            edge.isMorphingRoute = false;
          }
        }

        // Smooth endpoint float delta blended linearly along the precomputed 3D A* curve
        const dyA = nA.currentPos.y - nA.basePos.y;
        const dyB = nB.currentPos.y - nB.basePos.y;
        const bp = edge.basePoints;
        const tv = edge.tValues;

        for (let s = 0; s < EDGE_SUBDIV; s++) {
          const v0 = (e * EDGE_SUBDIV + s) * 2;
          const v1 = v0 + 1;
          const idx0 = v0 * 3;
          const idx1 = v1 * 3;

          const t0 = tv[s];
          const t1 = tv[s + 1];

          if (drawT <= t0 + 0.001) {
            pArr[idx0] = pArr[idx0 + 1] = pArr[idx0 + 2] = 0;
            pArr[idx1] = pArr[idx1 + 1] = pArr[idx1 + 2] = 0;
          } else {
            const p0i = s * 3;
            const p1i = (s + 1) * 3;

            const x0 = bp[p0i];
            const y0 = bp[p0i + 1] + dyA + (dyB - dyA) * t0;
            const z0 = bp[p0i + 2];

            let x1 = bp[p1i];
            let y1 = bp[p1i + 1] + dyA + (dyB - dyA) * t1;
            let z1 = bp[p1i + 2];

            // Partial self-drawing smoothly along the exact A* curved segment
            if (drawT < t1) {
              const segFrac = (drawT - t0) / Math.max(0.0001, t1 - t0);
              x1 = x0 + (x1 - x0) * segFrac;
              y1 = y0 + (y1 - y0) * segFrac;
              z1 = z0 + (z1 - z0) * segFrac;
            }

            pArr[idx0] = x0;
            pArr[idx0 + 1] = y0;
            pArr[idx0 + 2] = z0;
            pArr[idx1] = x1;
            pArr[idx1 + 1] = y1;
            pArr[idx1 + 2] = z1;
          }

          hiArr[v0] = edge.currentHighlight;
          hiArr[v1] = edge.currentHighlight;
          dimArr[v0] = edge.currentDim;
          dimArr[v1] = edge.currentDim;
        }
      }

      posAttr.needsUpdate = true;
      hiAttr.needsUpdate = true;
      dimAttr.needsUpdate = true;

      // Update camera & network world matrices BEFORE simulating cursor-reactive binary dust so
      // cursor ray projection and global force vector transform use this exact frame's matrices.
      camera.updateMatrixWorld();
      networkRoot.updateMatrixWorld(true);

      // Smoothly update global mouse force vector & cursor presence
      const presenceLerp = 1 - Math.exp(-5.0 * dt);
      cursorPresence += ((cursorInsideStage ? 1 : 0) - cursorPresence) * presenceLerp;

      const rawVelDecay = Math.exp(-7.2 * dt);
      rawCursorVelX *= rawVelDecay;
      rawCursorVelY *= rawVelDecay;

      const forceSmooth = 1 - Math.exp(-10.5 * dt);
      smoothGlobalForceX += (rawCursorVelX - smoothGlobalForceX) * forceSmooth;
      smoothGlobalForceY += (rawCursorVelY - smoothGlobalForceY) * forceSmooth;
      const forceMag = Math.hypot(smoothGlobalForceX, smoothGlobalForceY);
      smoothCursorSpeed += (forceMag - smoothCursorSpeed) * (1 - Math.exp(-7.0 * dt));

      // Project screen-space cursor + global force vector into networkRoot-local 3D space (ZERO GC)
      camera.matrixWorld.extractBasis(_camRight, _camUp, _camFwd);
      _invNetMat.copy(networkRoot.matrixWorld).invert();
      _localRight.copy(_camRight).transformDirection(_invNetMat);
      _localUp.copy(_camUp).transformDirection(_invNetMat);
      _localFwd.copy(_camFwd).transformDirection(_invNetMat);

      _globalForceLocal
        .set(0, 0, 0)
        .addScaledVector(_localRight, smoothGlobalForceX)
        .addScaledVector(_localUp, smoothGlobalForceY);

      if (cursorPresence > 0.002) {
        _cursorRayDir.set(cursorNdcX, cursorNdcY, 0.5).unproject(camera).sub(camera.position).normalize();
        const denom = _cursorRayDir.dot(_camFwd);
        if (Math.abs(denom) > 1e-4) {
          const hitT = _vecA.subVectors(networkRoot.position, camera.position).dot(_camFwd) / denom;
          _cursorWorldPos.copy(camera.position).addScaledVector(_cursorRayDir, hitT);
          _cursorLocalPos.copy(_cursorWorldPos).applyMatrix4(_invNetMat);
        }
      }

      // 3. Simulate 3D blooming binary dust motes via GPU THREE.InstancedMesh (ZERO GC)
      dust3dBatch.material.uniforms.uTime.value = clock;
      dust3dBatch.material.uniforms.uOpacity.value =
        Math.min(1, buildProgress * 1.35) * (0.68 + 0.32 * entranceState.lineDrawProgress);
      dust3dBatch.beginFrame();
      const condenseSpread = 1 + Math.max(0, 1 - buildProgress) * 1.6;

      const swirlRadius = 3.85;
      const invTwoSigmaSq = 1 / (2 * swirlRadius * swirlRadius);
      const kSpring = 2.85;
      const velDamping = Math.exp(-3.65 * dt);
      const energyLerp = 1 - Math.exp(-8.5 * dt);
      const maxDisp = 1.95;
      const spinDir = swirlSpinSign >= 0 ? Math.max(0.55, swirlSpinSign) : Math.min(-0.55, swirlSpinSign);
      const activeSwirlStrength = cursorPresence * (0.58 + smoothCursorSpeed * 2.15);
      const globalForceGain = 1.38 * cursorPresence;

      for (let i = 0; i < DUST_3D_COUNT; i++) {
        const anchor = nodes[dust3dAnchorNode[i]];
        const ph = dust3dPhase[i];
        const bi = i * 3;

        const homeX =
          anchor.basePos.x +
          dust3dOffsets[bi] +
          Math.cos(clock * 0.38 + ph) * 0.18 * condenseSpread;
        const homeY =
          anchor.basePos.y +
          dust3dOffsets[bi + 1] +
          Math.sin(clock * 0.52 + ph * 1.3) * 0.22 * condenseSpread;
        const homeZ =
          anchor.basePos.z + dust3dOffsets[bi + 2] + Math.sin(clock * 0.34 + ph * 0.7) * 0.18;

        let dx = dust3dDisp[bi];
        let dy = dust3dDisp[bi + 1];
        let dz = dust3dDisp[bi + 2];

        let vx = dust3dVel[bi];
        let vy = dust3dVel[bi + 1];
        let vz = dust3dVel[bi + 2];

        let ax = -dx * kSpring;
        let ay = -dy * kSpring;
        let az = -dz * kSpring;

        let targetEnergy = 0;

        if (cursorPresence > 0.002) {
          const curX = homeX + dx;
          const curY = homeY + dy;
          const curZ = homeZ + dz;

          const rx = curX - _cursorLocalPos.x;
          const ry = curY - _cursorLocalPos.y;
          const rz = curZ - _cursorLocalPos.z;

          const u = rx * _localRight.x + ry * _localRight.y + rz * _localRight.z;
          const v = rx * _localUp.x + ry * _localUp.y + rz * _localUp.z;
          const distSq2d = u * u + v * v;
          const dist2d = Math.sqrt(distSq2d) + 0.001;

          const proximity = Math.exp(-distSq2d * invTwoSigmaSq);

          const globalWeight = globalForceGain * (0.28 + 0.72 * proximity);
          ax += _globalForceLocal.x * globalWeight;
          ay += _globalForceLocal.y * globalWeight;
          az += _globalForceLocal.z * globalWeight;

          const invDist = 1 / dist2d;
          const tu = -v * invDist * spinDir;
          const tv = u * invDist * spinDir;
          const swirlAccel = proximity * activeSwirlStrength * (1.25 + 0.35 * Math.sin(ph));

          ax += (_localRight.x * tu + _localUp.x * tv) * swirlAccel;
          ay += (_localRight.y * tu + _localUp.y * tv) * swirlAccel;
          az += (_localRight.z * tu + _localUp.z * tv) * swirlAccel;

          const radScale =
            dist2d < 1.05
              ? (1.05 - dist2d) * 1.4
              : -Math.min(0.42, (dist2d - 1.05) * 0.14);
          const radialAccel = radScale * proximity * cursorPresence * (0.65 + smoothCursorSpeed * 0.55);
          const ru = u * invDist;
          const rv = v * invDist;
          ax += (_localRight.x * ru + _localUp.x * rv) * radialAccel;
          ay += (_localRight.y * ru + _localUp.y * rv) * radialAccel;
          az += (_localRight.z * ru + _localUp.z * rv) * radialAccel;

          const helixZ = Math.sin(clock * 2.5 + ph) * 0.45 * proximity * cursorPresence * (0.3 + smoothCursorSpeed);
          ax += _localFwd.x * helixZ;
          ay += _localFwd.y * helixZ;
          az += _localFwd.z * helixZ;

          targetEnergy = Math.min(1, proximity * cursorPresence * (0.38 + smoothCursorSpeed * 0.58));
        }

        vx = (vx + ax * dt) * velDamping;
        vy = (vy + ay * dt) * velDamping;
        vz = (vz + az * dt) * velDamping;

        dx += vx * dt;
        dy += vy * dt;
        dz += vz * dt;

        const dispMagSq = dx * dx + dy * dy + dz * dz;
        if (dispMagSq > maxDisp * maxDisp) {
          const clampScale = maxDisp / Math.sqrt(dispMagSq);
          dx *= clampScale;
          dy *= clampScale;
          dz *= clampScale;
          vx *= 0.72;
          vy *= 0.72;
          vz *= 0.72;
        }

        dust3dDisp[bi] = dx;
        dust3dDisp[bi + 1] = dy;
        dust3dDisp[bi + 2] = dz;

        dust3dVel[bi] = vx;
        dust3dVel[bi + 1] = vy;
        dust3dVel[bi + 2] = vz;

        const velBoost = Math.min(0.55, Math.hypot(vx, vy, vz) * 0.24);
        const desiredEnergy = Math.min(1, targetEnergy + velBoost);
        dust3dSwirlEnergy[i] += (desiredEnergy - dust3dSwirlEnergy[i]) * energyLerp;

        const sw = dust3dSwirlEnergy[i];
        const isRed = dust3dRed[i] === 1;
        const r = isRed ? 1.58 : 0.18 + sw * 0.24;
        const g = isRed ? 0.3 : 0.17 - sw * 0.03;
        const b = isRed ? 0.24 : 0.16 - sw * 0.03;

        dust3dBatch.push3D(
          homeX + dx,
          homeY + dy,
          homeZ + dz,
          dust3dWorldScale[i],
          dust3dGlyph[i] === 1 ? 1 : 0,
          r,
          g,
          b,
          1.0,
          ph,
          sw
        );
      }
      dust3dBatch.commitFrame();

      prepareHudBinaryDust(clock);

      if (isSoftwareGl) {
        renderer.render(scene, camera);
      } else {
        composer.render();
      }

      if (hudDustBatch.count > 0) {
        const prevAutoClear = renderer.autoClear;
        renderer.autoClear = false;
        renderer.clearDepth();
        renderer.render(hudDustScene, hudDustCamera);
        renderer.autoClear = prevAutoClear;
      }

      // Keep hover-only minimalist sans-serif text labels cleanly tracked to moving 3D nodes (ZERO resting text!)
      if (nowMs - lastProjectedCueMs > 28) {
        lastProjectedCueMs = nowMs;
        if (hoveredNodeId && selectedNodeId === null) {
          const hIdx = nodeIndexById.get(hoveredNodeId);
          if (hIdx !== undefined) {
            updateHoverLabelsForNode(nodes[hIdx]);
          }
        } else if (hoverLabel !== null || connectedHoverLabels.length > 0) {
          hoverLabel = null;
          connectedHoverLabels = [];
        }
      }

      if (isSoftwareGl) {
        afterDraw(() => {
          if (!disposed && !isTabPaused) rafId = requestAnimationFrame(stepAndRender);
        });
      } else {
        rafId = requestAnimationFrame(stepAndRender);
      }
    }

    const onVisibilityChange = () => {
      isTabPaused = document.hidden;
      if (!isTabPaused && rafId === 0) {
        lastMs = performance.now();
        rafId = requestAnimationFrame(stepAndRender);
      } else if (isTabPaused && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    if (!isTabPaused) {
      rafId = requestAnimationFrame(stepAndRender);
    }

    return () => {
      disposed = true;
      externalSelectNode = null;
      externalSetFilter = null;
      externalGetNodeScreenPos = null;
      externalResetCameraView = null;
      cancelAnimationFrame(rafId);
      window.clearTimeout(syncTimerId);
      window.clearTimeout(resizeReflowTimer);
      window.clearTimeout(touchLabelPreviewTimer);
      entranceTl?.kill();
      cardEntryTl?.kill();
      cardEntryTl = null;
      cardDustState.active = false;
      gsap.killTweensOf(nodesLeftToRight);
      gsap.killTweensOf(nodes);
      gsap.killTweensOf(entranceState);
      if (detailPanelEl) gsap.killTweensOf(detailPanelEl);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);

      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointercancel', handlePointerUp);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('touchstart', handleTouchStart);
      renderer.domElement.removeEventListener('touchmove', handleTouchMove);
      renderer.domElement.removeEventListener('touchend', handleTouchEnd);
      renderer.domElement.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      for (const cleanup of disposables) cleanup();
      bloomPass.dispose();
      composer.dispose();
      composerTarget.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  });
</script>

<div
  bind:this={stageContainer}
  class="relative h-full w-full select-none overflow-hidden"
  style="cursor: {activeCursor}; touch-action: pan-y; background: radial-gradient(circle at 50% 48%, #f8f7f3 0%, #f5f4f0 64%, #eceae3 100%);"
  aria-label="Layered 3D neural network connecting credentials across Machine Learning, Data Science, Full Stack, and Software Development"
>

  <!-- Hover-Only Minimalist Sans-Serif Node Labels (Zero Resting Text Clutter) -->
  {#if connectedHoverLabels.length > 0 && !selectedTarget}
    <div class="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {#each connectedHoverLabels as peer (peer.id)}
        <div
          class="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap font-display text-[11.5px] font-semibold tracking-[-0.015em]"
          style="
            left: {peer.x.toFixed(1)}px;
            top: {peer.y.toFixed(1)}px;
            color: {peer.accentRed ? '#ff3027' : '#3a3935'};
            text-shadow: 0 0 10px rgba(245, 244, 240, 0.96), 0 0 4px rgba(245, 244, 240, 0.98);
          "
        >
          {peer.label}
        </div>
      {/each}
    </div>
  {/if}

  {#if hoverLabel && !selectedTarget}
    <div
      class="pointer-events-none absolute z-30 flex -translate-x-1/2 -translate-y-full flex-col items-center text-center"
      style="left: {hoverLabel.x.toFixed(1)}px; top: {hoverLabel.y.toFixed(1)}px;"
    >
      <p
        class="max-w-[260px] font-display leading-tight tracking-[-0.025em] {hoverLabel.isStructural
          ? 'text-[12.5px] font-semibold'
          : 'text-[14.5px] font-bold'}"
        style="
          color: {hoverLabel.accentRed ? '#ff3027' : '#141412'};
          text-shadow: 0 0 12px rgba(245, 244, 240, 0.98), 0 0 5px rgba(245, 244, 240, 1);
        "
      >
        {hoverLabel.title}
      </p>
      <p
        class="mt-0.5 whitespace-nowrap font-display text-[11.5px] font-medium tracking-[-0.01em] text-[#5c5a54]"
        style="text-shadow: 0 0 10px rgba(245, 244, 240, 0.98), 0 0 4px rgba(245, 244, 240, 1);"
      >
        {hoverLabel.subtitle}
      </p>
      <span
        aria-hidden="true"
        class="mt-1.5 block h-3 w-px"
        style="background: {hoverLabel.accentRed ? 'rgba(255, 48, 39, 0.55)' : 'rgba(20, 20, 18, 0.28)'};"
      ></span>
    </div>
  {/if}

  <!-- Minimal Responsive Bottom Approach Filter Bar -->
  <div
    class="pointer-events-auto absolute bottom-3 left-1/2 z-30 flex max-w-[calc(100vw-1.25rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-lg border border-[#181816]/12 bg-white/95 p-1 shadow-[0_10px_28px_rgba(20,19,17,0.09)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:bottom-5"
    style="opacity: {Math.max(0, Math.min(1, (buildProgress - 0.55) / 0.35)).toFixed(3)};"
    role="tablist"
    aria-label="Filter neural network by approach"
  >
    <button
      type="button"
      role="tab"
      aria-selected={activeFilter === 'all'}
      onclick={(e) => {
        e.stopPropagation();
        selectApproachFilter('all');
      }}
      class="shrink-0 cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1.5 font-display text-[11px] font-semibold transition-colors sm:px-3 sm:text-[12px] {activeFilter === 'all'
        ? 'bg-[#181816] text-white'
        : 'text-[#575550] hover:text-[#111110]'}"
    >
      All
    </button>
    {#each APPROACHES_LIST as app (app.id)}
      <button
        type="button"
        role="tab"
        aria-selected={activeFilter === app.id}
        onclick={(e) => {
          e.stopPropagation();
          selectApproachFilter(app.id);
        }}
        class="shrink-0 cursor-pointer whitespace-nowrap rounded-md px-2.5 py-1.5 font-display text-[11px] font-semibold transition-colors sm:px-3 sm:text-[12px] {activeFilter === app.id
          ? 'bg-[#ff3027] text-white'
          : 'text-[#575550] hover:text-[#111110]'}"
      >
        {app.shortName}
      </button>
    {/each}
    {#if hasCustomCameraView}
      <button
        type="button"
        aria-label="Reset camera view"
        onclick={(e) => {
          e.stopPropagation();
          externalResetCameraView?.();
        }}
        class="shrink-0 cursor-pointer whitespace-nowrap rounded-md border-l border-[#181816]/10 px-2.5 py-1.5 font-display text-[11px] font-semibold text-[#ff3027] transition-colors hover:bg-[#ff3027]/8 sm:px-3 sm:text-[12px]"
      >
        Reset
      </button>
    {/if}
  </div>

  <!-- Polished, Minimal Detail Card (GSAP Timeline Expand from Clicked Node + GPU InstancedMesh Binary Dust Dissipation) -->
  {#if selectedTarget}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <aside
      bind:this={detailPanelEl}
      onclick={(e) => e.stopPropagation()}
      ontouchstart={(e) => e.stopPropagation()}
      ontouchmove={(e) => e.stopPropagation()}
      class="pointer-events-auto absolute inset-x-3 bottom-16 top-auto z-40 flex max-h-[54vh] w-auto flex-col overflow-hidden rounded-2xl border border-[#181816]/12 bg-white shadow-[0_24px_64px_rgba(18,17,15,0.16)] will-change-transform sm:inset-x-auto sm:top-8 sm:right-8 sm:bottom-auto sm:max-h-[calc(100vh-7.5rem)] sm:w-[380px]"
      aria-label="Selected node details"
    >
      {#if cardVeilScrimAlpha > 0.005}
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 z-[19] bg-[#faf9f6]"
          style="opacity: {cardVeilScrimAlpha.toFixed(3)};"
        ></div>
      {/if}
      <!-- GPU InstancedMesh Binary Dust Dissipation Veil Canvas (driven in lockstep by cardEntryTl GSAP timeline) -->
      <canvas
        bind:this={cardDustCanvasEl}
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-20 block h-full w-full"
      ></canvas>

      {#if selectedTarget.kind === 'credential'}
        {@const cert = selectedTarget.item}
        {#if cert.nodeTone === 'red'}
          <div class="h-1 w-full bg-gradient-to-r from-[#d81610] via-[#ff3027] to-[#ff6b61]"></div>
        {/if}
        <div data-card-reveal class="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div class="min-w-0">
            <h3 class="font-display text-[19px] leading-[1.2] font-extrabold tracking-[-0.025em] text-[#111110]">
              {cert.title}
            </h3>
            <p class="mt-1 text-[13px] text-[#5e5c56]">
              {cert.issuer} · <span class="tabular-nums">{cert.completionDate}</span>
            </p>
          </div>
          <button
            type="button"
            onclick={closeDetailPanel}
            aria-label="Close"
            class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#5e5c56] transition-colors hover:bg-[#f5f4f0] hover:text-[#111110]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M3 3L11 11M11 3L3 11"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 pb-5">
          <div data-card-reveal>
            {#if cert.credentialId}
              <p class="mb-4 font-mono text-[11.5px] tabular-nums text-[#78756e]">
                ID {cert.credentialId}
              </p>
            {/if}

            <!-- Clean Original Certificate Preview (Upgrades seamlessly once actual certificate images are added) -->
            {#if cert.certificateImage}
              <button
                type="button"
                onclick={() => {
                  lightboxImageSrc = cert.certificateImage ?? null;
                  lightboxImageTitle = cert.title;
                }}
                class="block w-full cursor-pointer overflow-hidden rounded-xl border border-[#181816]/10 bg-[#faf9f6] transition-transform duration-200 hover:scale-[1.01]"
              >
                <img
                  src={cert.certificateImage}
                  alt="{cert.title} certificate"
                  referrerpolicy="no-referrer"
                  class="aspect-[4/3] w-full object-cover"
                />
              </button>
            {:else}
              <div class="rounded-xl border border-[#181816]/10 bg-[#faf9f6] p-4">
                <div class="flex items-center justify-between text-[11px] text-[#6b6861]">
                  <span class="font-medium">{cert.issuer}</span>
                  <span class="font-mono font-semibold text-[#ff3027]">{cert.stampDate}</span>
                </div>
                <p class="mt-3 font-display text-[14.5px] leading-snug font-bold text-[#141412]">
                  {cert.title}
                </p>
                <p class="mt-1.5 text-[12px] text-[#5e5c56]">Aryan Das</p>
              </div>
            {/if}
          </div>

          <!-- Minimal Clickable Connected Approaches -->
          <div data-card-reveal class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            {#each cert.approaches as appId (appId)}
              {@const app = approachById.get(appId)}
              {#if app}
                <button
                  type="button"
                  onclick={() => jumpToApproach(appId)}
                  class="cursor-pointer font-display font-semibold text-[#5e5c56] transition-colors hover:text-[#ff3027]"
                >
                  {app.name}
                </button>
              {/if}
            {/each}
          </div>
        </div>

        <div data-card-reveal class="border-t border-[#181816]/8 px-6 py-3.5">
          <a
            href={cert.verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#141412] px-4 py-2.5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-[#ff3027]"
          >
            <span>Verify Credential</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M3 9L9 3M9 3H4.5M9 3V7.5"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </a>
        </div>
      {:else if selectedTarget.kind === 'approach'}
        {@const app = selectedTarget.item}
        {@const linkedCreds = credentialsForApproach(app.id)}
        <div data-card-reveal class="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div class="min-w-0">
            <h3 class="font-display text-[20px] leading-tight font-extrabold tracking-[-0.025em] text-[#111110]">
              {app.name}
            </h3>
            <p class="mt-1 text-[12.5px] text-[#66635d]">
              {app.stackTools.slice(0, 6).join(' · ')}
            </p>
          </div>
          <button
            type="button"
            onclick={closeDetailPanel}
            aria-label="Close"
            class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#5e5c56] transition-colors hover:bg-[#f5f4f0] hover:text-[#111110]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M3 3L11 11M11 3L3 11"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <div data-card-reveal class="flex-1 overflow-y-auto px-6 pb-5">
          <div class="divide-y divide-[#181816]/8 border-t border-[#181816]/8">
            {#each linkedCreds as cred (cred.id)}
              <button
                type="button"
                onclick={() => jumpToCredential(cred)}
                class="group flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left transition-colors"
              >
                <div class="min-w-0">
                  <p class="truncate font-display text-[13.5px] font-bold text-[#141412] group-hover:text-[#ff3027]">
                    {cred.title}
                  </p>
                  <p class="mt-0.5 text-[11.5px] text-[#6b6861]">
                    {cred.issuer} · {cred.completionDate}
                  </p>
                </div>
                <span class="shrink-0 text-[13px] text-[#8a8780] group-hover:text-[#ff3027]">→</span>
              </button>
            {/each}
          </div>
        </div>
      {:else}
        {@const profile = selectedTarget.item}
        <div data-card-reveal class="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div class="min-w-0">
            <h3 class="font-display text-[20px] leading-tight font-extrabold tracking-[-0.025em] text-[#111110]">
              {profile.name}
            </h3>
            <p class="mt-1 text-[13px] text-[#5e5c56]">
              B.Tech Electrical Engineering · NIT Silchar
            </p>
          </div>
          <button
            type="button"
            onclick={closeDetailPanel}
            aria-label="Close"
            class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#5e5c56] transition-colors hover:bg-[#f5f4f0] hover:text-[#111110]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M3 3L11 11M11 3L3 11"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <div class="px-6 pb-5">
          <p data-card-reveal class="border-t border-[#181816]/8 pt-3.5 font-mono text-[12px] text-[#454440]">
            {profile.languages.join(' · ')}
          </p>

          <div data-card-reveal class="mt-4 divide-y divide-[#181816]/8 border-t border-[#181816]/8">
            {#each APPROACHES_LIST as app (app.id)}
              <button
                type="button"
                onclick={() => jumpToApproach(app.id)}
                class="group flex w-full cursor-pointer items-center justify-between py-2.5 text-left"
              >
                <span class="font-display text-[13.5px] font-bold text-[#141412] group-hover:text-[#ff3027]">
                  {app.name}
                </span>
                <span class="text-[12px] text-[#8a8780] group-hover:text-[#ff3027]">
                  {credentialsForApproach(app.id).length} →
                </span>
              </button>
            {/each}
          </div>

          <div data-card-reveal class="mt-4 flex items-center gap-4 border-t border-[#181816]/8 pt-3.5 text-[12.5px] font-semibold">
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#141412] transition-colors hover:text-[#ff3027]"
            >
              GitHub ↗
            </a>
            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#141412] transition-colors hover:text-[#ff3027]"
            >
              LinkedIn ↗
            </a>
            <a
              href={profile.orcidUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#141412] transition-colors hover:text-[#ff3027]"
            >
              ORCID ↗
            </a>
          </div>
        </div>
      {/if}
    </aside>
  {/if}

  <!-- Full-Screen Lightbox for Uploaded Certificate Images -->
  {#if lightboxImageSrc}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        onclick={() => {
          lightboxImageSrc = null;
        }}
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/84 p-3 sm:p-6"
      >
        <div
          onclick={(e) => e.stopPropagation()}
          class="relative max-h-[90vh] max-w-[920px] overflow-hidden rounded-2xl bg-white p-2.5 shadow-2xl sm:p-3"
        >
          <img
            src={lightboxImageSrc}
            alt={lightboxImageTitle}
            referrerpolicy="no-referrer"
            class="max-h-[78vh] w-auto max-w-full rounded-xl object-contain"
          />
          <button
            type="button"
            onclick={() => {
              lightboxImageSrc = null;
            }}
            class="mt-2 ml-auto block cursor-pointer rounded-lg bg-[#141412] px-4 py-1.5 font-display text-[12px] font-semibold text-white hover:bg-[#ff3027]"
          >
            Close
          </button>
        </div>
      </div>
  {/if}
</div>
