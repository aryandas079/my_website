<script lang="ts">
  import { onMount, tick } from 'svelte';
  import gsap from 'gsap';
  import {
    InstancedBinaryDustRenderer,
    detectDeviceGpuTier,
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
  import FluidNavButton from './FluidNavButton.svelte';

  interface Props {
    buildProgress?: number;
    onNodeInteract?: (clientX: number, clientY: number) => void;
    onEducationClick?: () => void;
  }

  let { buildProgress = 1, onNodeInteract, onEducationClick }: Props = $props();

  type SelectedTarget =
    | { kind: 'credential'; item: CredentialItem; nodeId: string }
    | { kind: 'approach'; item: ApproachItem; nodeId: string }
    | { kind: 'foundation'; item: FoundationProfile; nodeId: string }
    | null;

  type NodeKind = 'foundation' | 'approach' | 'credential';

  interface NeuralNode2D {
    id: string;
    kind: NodeKind;
    layer: 0 | 1 | 2;
    title: string;
    shortLabel: string;
    subtitle: string;
    accentRed: boolean;
    approaches: ApproachId[];
    credential?: CredentialItem;
    approach?: ApproachItem;
    baseX: number;
    baseY: number;
    x: number;
    y: number;
    radius: number;
    phase: number;
    hoverSpring: number;
    selectSpring: number;
    pulseRing: number;
  }

  interface NeuralEdge2D {
    id: string;
    fromId: string;
    toId: string;
    fromIdx: number;
    toIdx: number;
    accentRed: boolean;
  }

  interface SignalBead {
    edgeIdx: number;
    t: number;
    speed: number;
    isRed: boolean;
  }

  interface HoverLabelState {
    id: string;
    title: string;
    subtitle: string;
    x: number;
    y: number;
    accentRed: boolean;
  }

  let stageContainer = $state<HTMLDivElement | null>(null);
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let cardDustCanvasEl = $state<HTMLCanvasElement | null>(null);
  let detailPanelEl = $state<HTMLElement | null>(null);

  let activeCursor = $state<'default' | 'pointer' | 'grabbing'>('default');
  let activeFilter = $state<ApproachId | 'all'>('all');
  let selectedTarget = $state<SelectedTarget>(null);
  let hoverLabel = $state<HoverLabelState | null>(null);
  let lightboxImageSrc = $state<string | null>(null);
  let lightboxImageTitle = $state<string>('');
  let hasCustomView = $state(false);

  let externalSelectNode: ((nodeId: string | null) => void) | null = null;
  let externalSetFilter: ((filter: ApproachId | 'all') => void) | null = null;
  let externalGetNodeScreenPos: ((nodeId: string) => { x: number; y: number } | null) | null = null;
  let externalZoomBy: ((factor: number) => void) | null = null;
  let externalResetView: (() => void) | null = null;

  let isClosingPanel = false;
  let cardEntryTl: gsap.core.Timeline | null = null;
  let cardVeilScrimAlpha = $state(0);
  let cardGpuRenderer: InstancedBinaryDustRenderer | null = null;

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

  const CARD_VEIL_COUNT = 64;
  const cardVeilBits: CardVeilDustBit[] = Array.from({ length: CARD_VEIL_COUNT }, () => ({
    nx: 0.5,
    ny: 0.5,
    driftX: 0,
    driftY: 0,
    bit: '1',
    isRed: false,
    size: 10,
    fadeOffset: 0,
    flipSeed: 0,
  }));

  const cardDustState = {
    veilAlpha: 0,
    veilDrift: 0,
    cardW: 360,
    cardH: 380,
  };

  function seededHash(i: number, seed: number, mult: number): number {
    const x = Math.sin(i * 12.9898 + seed * 78.233 + mult) * 43758.5453;
    return x - Math.floor(x);
  }

  const approachById = new Map<ApproachId, ApproachItem>(
    APPROACHES_LIST.map((a) => [a.id, a])
  );

  function credentialsForApproach(approachId: ApproachId): CredentialItem[] {
    return CREDENTIALS_LIST.filter((c) => c.approaches.includes(approachId));
  }

  // Lazy GPU InstancedMesh veil strictly while detail panel is mounted (zero idle WebGL context)
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
      maxInstances: 100,
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

  function renderCardVeilFrame(): void {
    const gpu = cardGpuRenderer;
    if (!gpu || !cardDustCanvasEl) return;
    const cw = Math.max(120, Math.round(cardDustCanvasEl.clientWidth || cardDustState.cardW));
    const ch = Math.max(120, Math.round(cardDustCanvasEl.clientHeight || cardDustState.cardH));
    gpu.resize(cw, ch, false);

    if (cardDustState.veilAlpha <= 0.01) {
      gpu.clear();
      return;
    }

    gpu.beginFrame();
    const tickStep = Math.floor(cardDustState.veilDrift * 14);
    for (let i = 0; i < CARD_VEIL_COUNT; i++) {
      const v = cardVeilBits[i];
      const localClear = Math.max(
        0,
        Math.min(1, (cardDustState.veilDrift - v.fadeOffset * 0.5) / 0.72)
      );
      const alpha = cardDustState.veilAlpha * (1 - localClear) * 0.9;
      if (alpha <= 0.025) continue;

      const px = v.nx * cw + v.driftX * localClear;
      const py = v.ny * ch + v.driftY * localClear;
      const bitVal = (((v.bit === '1' ? 1 : 0) + ((i + tickStep + v.flipSeed) % 7 === 0 ? 1 : 0)) &
        1) as 0 | 1;
      if (v.isRed) {
        gpu.push(px, py, v.size, bitVal, 1.0, 38 / 255, 27 / 255, alpha);
      } else {
        gpu.push(px, py, v.size, bitVal, 20 / 255, 20 / 255, 18 / 255, alpha);
      }
    }
    gpu.render();
  }

  async function animateCardExpandFromNode(nodeId: string): Promise<void> {
    isClosingPanel = false;
    cardEntryTl?.kill();
    cardEntryTl = null;

    await tick();
    if (!detailPanelEl || !stageContainer || isClosingPanel) return;

    const panel = detailPanelEl;
    gsap.killTweensOf(panel);
    const revealEls = Array.from(panel.querySelectorAll<HTMLElement>('[data-card-reveal]'));
    if (revealEls.length > 0) gsap.killTweensOf(revealEls);

    gsap.set(panel, { x: 0, y: 0, scale: 1, opacity: 1 });
    const stageRect = stageContainer.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const cardLeft = panelRect.left - stageRect.left;
    const cardTop = panelRect.top - stageRect.top;
    const panelCenterX = cardLeft + panelRect.width * 0.5;
    const panelCenterY = cardTop + panelRect.height * 0.5;

    const nodePx = externalGetNodeScreenPos?.(nodeId);
    const originX = nodePx ? nodePx.x : panelCenterX - 36;
    const originY = nodePx ? nodePx.y : panelCenterY;
    const fromDx = Math.max(-220, Math.min(220, (originX - panelCenterX) * 0.3));
    const fromDy = Math.max(-140, Math.min(140, (originY - panelCenterY) * 0.3));

    let seedBase = 19;
    for (let i = 0; i < nodeId.length; i++) {
      seedBase += nodeId.charCodeAt(i) * (i + 1) * 0.17;
    }

    cardDustState.cardW = panelRect.width;
    cardDustState.cardH = panelRect.height;

    const cols = 8;
    const rows = Math.ceil(CARD_VEIL_COUNT / cols);
    for (let i = 0; i < CARD_VEIL_COUNT; i++) {
      const v = cardVeilBits[i];
      const h1 = seededHash(i, seedBase + 1.3, 41.3);
      const h2 = seededHash(i, seedBase + 5.7, 67.7);
      const h3 = seededHash(i, seedBase + 10.9, 23.1);
      const h4 = seededHash(i, seedBase + 15.1, 91.9);
      const col = i % cols;
      const row = Math.floor(i / cols);
      v.nx = Math.max(0.05, Math.min(0.95, (col + 0.15 + h1 * 0.7) / cols));
      v.ny = Math.max(0.05, Math.min(0.95, (row + 0.15 + h2 * 0.7) / rows));
      v.driftX = (v.nx - 0.5) * (28 + h3 * 22) + (h1 - 0.5) * 14;
      v.driftY = (v.ny - 0.5) * 14 - (14 + h4 * 28);
      v.bit = (i + Math.floor(seedBase)) % 2 === 0 ? '0' : '1';
      v.isRed = h3 < 0.38;
      v.size = 9.5 + h4 * 2.5;
      v.fadeOffset = v.ny * 0.24 + h2 * 0.15;
      v.flipSeed = Math.floor(h1 * 100);
    }

    cardDustState.veilAlpha = 1;
    cardDustState.veilDrift = 0;
    cardVeilScrimAlpha = 0.88;

    const tl = gsap.timeline({
      defaults: { force3D: true },
      onUpdate: () => {
        renderCardVeilFrame();
      },
      onComplete: () => {
        cardDustState.veilAlpha = 0;
        cardVeilScrimAlpha = 0;
        cardGpuRenderer?.clear();
      },
    });
    cardEntryTl = tl;

    tl.fromTo(
      panel,
      { x: fromDx, y: fromDy, scale: 0.86, opacity: 0 },
      { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.44, ease: 'expo.out' },
      0
    );

    tl.to(
      cardDustState,
      { veilDrift: 1.15, veilAlpha: 0, duration: 0.56, ease: 'power2.out' },
      0.06
    );

    const scrimProxy = { v: 0.88 };
    tl.to(
      scrimProxy,
      {
        v: 0,
        duration: 0.38,
        ease: 'power2.out',
        onUpdate: () => {
          cardVeilScrimAlpha = scrimProxy.v;
        },
      },
      0.05
    );

    if (revealEls.length > 0) {
      tl.fromTo(
        revealEls,
        { opacity: 0, y: 7 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.035, ease: 'power2.out' },
        0.1
      );
    }
  }

  function closeDetailPanel(): void {
    if (!selectedTarget || isClosingPanel) return;
    isClosingPanel = true;
    cardEntryTl?.kill();
    cardEntryTl = null;
    cardDustState.veilAlpha = 0;
    cardVeilScrimAlpha = 0;
    cardGpuRenderer?.clear();

    if (detailPanelEl) {
      gsap.to(detailPanelEl, {
        opacity: 0,
        scale: 0.95,
        y: 8,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => {
          selectedTarget = null;
          externalSelectNode?.(null);
          isClosingPanel = false;
        },
      });
    } else {
      selectedTarget = null;
      externalSelectNode?.(null);
      isClosingPanel = false;
    }
  }

  const FILTER_TABS: Array<{ id: ApproachId | 'all'; label: string }> = [
    { id: 'all', label: 'All' },
    ...APPROACHES_LIST.map((a) => ({ id: a.id, label: a.shortName })),
  ];

  let activeFilterIdx = $derived(
    Math.max(
      0,
      FILTER_TABS.findIndex((t) => t.id === activeFilter)
    )
  );
  let activeFilterTab = $derived(FILTER_TABS[activeFilterIdx] ?? FILTER_TABS[0]);

  let swipeStartX = 0;
  let swipeStartY = 0;

  function stepFilterTab(delta: -1 | 1): void {
    const nextIdx = (activeFilterIdx + delta + FILTER_TABS.length) % FILTER_TABS.length;
    const nextTab = FILTER_TABS[nextIdx];
    if (nextTab) {
      selectApproachFilter(nextTab.id);
    }
  }

  function handleTabSwipeStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
  }

  function handleTabSwipeEnd(e: TouchEvent): void {
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - swipeStartX;
    const dy = t.clientY - swipeStartY;
    if (Math.abs(dx) >= 34 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      stepFilterTab(dx < 0 ? 1 : -1);
    }
  }

  function selectApproachFilter(filter: ApproachId | 'all'): void {
    activeFilter = filter;
    externalSetFilter?.(filter);
  }

  function jumpToApproach(approachId: ApproachId): void {
    const app = approachById.get(approachId);
    if (!app) return;
    selectedTarget = { kind: 'approach', item: app, nodeId: `approach-${app.id}` };
    externalSelectNode?.(`approach-${app.id}`);
    void animateCardExpandFromNode(`approach-${app.id}`);
  }

  function jumpToCredential(cred: CredentialItem): void {
    selectedTarget = { kind: 'credential', item: cred, nodeId: `cred-${cred.id}` };
    externalSelectNode?.(`cred-${cred.id}`);
    void animateCardExpandFromNode(`cred-${cred.id}`);
  }

  onMount(() => {
    const container = stageContainer;
    const canvas = canvasEl;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = Math.max(320, container.clientWidth || window.innerWidth);
    let height = Math.max(400, container.clientHeight || window.innerHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // 1. Simplified, Ultra-Clean 3-Layer 2D Neural Graph: Core -> 4 Domains -> 7 Credentials
    const nodes: NeuralNode2D[] = [];
    const nodeIndexById = new Map<string, number>();

    const addNode = (node: NeuralNode2D) => {
      nodeIndexById.set(node.id, nodes.length);
      nodes.push(node);
    };

    // Layer 0: Core Foundation
    addNode({
      id: FOUNDATION_PROFILE.id,
      kind: 'foundation',
      layer: 0,
      title: FOUNDATION_PROFILE.name,
      shortLabel: 'Aryan Das',
      subtitle: FOUNDATION_PROFILE.institutionShort,
      accentRed: true,
      approaches: APPROACHES_LIST.map((a) => a.id),
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
      radius: 7.5,
      phase: 0.25,
      hoverSpring: 0,
      selectSpring: 0,
      pulseRing: 0,
    });

    // Layer 1: 4 Domain Hubs
    APPROACHES_LIST.forEach((app, i) => {
      addNode({
        id: `approach-${app.id}`,
        kind: 'approach',
        layer: 1,
        title: app.name,
        shortLabel: app.shortName,
        subtitle: `${credentialsForApproach(app.id).length} credentials`,
        accentRed: app.accentTone === 'red',
        approaches: [app.id],
        approach: app,
        baseX: 0,
        baseY: 0,
        x: 0,
        y: 0,
        radius: 5.5,
        phase: 1.2 + i * 0.95,
        hoverSpring: 0,
        selectSpring: 0,
        pulseRing: 0,
      });
    });

    // Layer 2: 7 Verified Credentials
    CREDENTIALS_LIST.forEach((cred, i) => {
      addNode({
        id: `cred-${cred.id}`,
        kind: 'credential',
        layer: 2,
        title: cred.title,
        shortLabel: cred.shortTitle,
        subtitle: `${cred.issuer} · ${cred.stampDate}`,
        accentRed: cred.nodeTone === 'red',
        approaches: cred.approaches,
        credential: cred,
        baseX: 0,
        baseY: 0,
        x: 0,
        y: 0,
        radius: 5,
        phase: 2.8 + i * 0.72,
        hoverSpring: 0,
        selectSpring: 0,
        pulseRing: 0,
      });
    });

    // 2. Direct Clean Synaptic Connections (Core -> Domains -> Credentials)
    const edges: NeuralEdge2D[] = [];
    const edgeSet = new Set<string>();

    const addEdge = (fromId: string, toId: string, accentRed: boolean) => {
      const key = `${fromId}->${toId}`;
      if (edgeSet.has(key)) return;
      const fromIdx = nodeIndexById.get(fromId);
      const toIdx = nodeIndexById.get(toId);
      if (fromIdx === undefined || toIdx === undefined) return;
      edgeSet.add(key);
      edges.push({ id: key, fromId, toId, fromIdx, toIdx, accentRed });
    };

    for (const app of APPROACHES_LIST) {
      addEdge(FOUNDATION_PROFILE.id, `approach-${app.id}`, app.accentTone === 'red');
    }

    for (const cred of CREDENTIALS_LIST) {
      for (const appId of cred.approaches) {
        const app = approachById.get(appId);
        addEdge(
          `approach-${appId}`,
          `cred-${cred.id}`,
          cred.nodeTone === 'red' || app?.accentTone === 'red'
        );
      }
    }

    // One crisp minimal signal bead per edge (glides cleanly when active, subtle at rest)
    const beads: SignalBead[] = edges.map((edge, idx) => ({
      edgeIdx: idx,
      t: (idx * 0.37) % 1,
      speed: 0.19 + ((idx * 13) % 9) * 0.014,
      isRed: edge.accentRed,
    }));

    // Interactive 2D Camera Transform (Pan + Zoom)
    let panX = 0;
    let panY = 0;
    let targetPanX = 0;
    let targetPanY = 0;
    let zoom = 1;
    let targetZoom = 1;

    let hoveredNodeId: string | null = null;
    let selectedNodeId: string | null = null;
    let filterState: ApproachId | 'all' = 'all';
    let isVerticalLayout = width < 680 && height >= width;
    let isShortLandscape = height <= 560 && width >= 640;
    let isTvDisplay = width >= 2000 && height >= 1000;

    function layoutNodes(): void {
      isVerticalLayout = width < 680 && height >= width;
      isShortLandscape = height <= 560 && width >= 640;
      isTvDisplay = width >= 2000 && height >= 1000;
      const tvScale = isTvDisplay ? 1.32 : 1;

      if (!isVerticalLayout) {
        const topSafe = isShortLandscape
          ? Math.max(62, height * 0.14)
          : Math.max(122, height * 0.19);
        const bottomSafe = height - (isShortLandscape ? 64 : isTvDisplay ? 104 : 84);
        const usableH = Math.max(180, bottomSafe - topSafe);

        const leftSafe = Math.max(isShortLandscape ? 58 : 74, width * (isTvDisplay ? 0.1 : 0.11));
        const rightReserve = isShortLandscape
          ? Math.min(210, Math.max(150, width * 0.22))
          : width < 1024
            ? Math.min(220, Math.max(158, width * 0.25))
            : Math.min(340, Math.max(204, width * (isTvDisplay ? 0.18 : 0.21)));
        const rightSafe = width - rightReserve;
        const usableW = Math.max(200, rightSafe - leftSafe);

        const layerXs = [leftSafe, leftSafe + usableW * 0.44, leftSafe + usableW];
        const buckets: NeuralNode2D[][] = [[], [], []];
        for (const n of nodes) buckets[n.layer].push(n);

        const baseScale = isShortLandscape ? 0.85 : tvScale;
        buckets.forEach((bucket, lIdx) => {
          const count = bucket.length;
          bucket.forEach((n, idx) => {
            const frac = count === 1 ? 0.5 : idx / (count - 1);
            const pad = lIdx === 1 ? 0.12 : 0.02;
            const yFrac = pad + frac * (1 - pad * 2);
            n.baseX = layerXs[lIdx];
            n.baseY = topSafe + yFrac * usableH;
            n.radius =
              (n.kind === 'foundation' ? 7.5 : n.kind === 'approach' ? 5.5 : 5) * baseScale;
          });
        });
      } else {
        const topSafe = Math.max(96, height * 0.15);
        const bottomSafe = height - 92;
        const usableH = Math.max(220, bottomSafe - topSafe);
        const sidePad = Math.max(24, width * 0.085);
        const usableW = Math.max(180, width - sidePad * 2);

        const layerYs = [
          topSafe + usableH * 0.06,
          topSafe + usableH * 0.42,
          topSafe + usableH * 0.81,
        ];
        const buckets: NeuralNode2D[][] = [[], [], []];
        for (const n of nodes) buckets[n.layer].push(n);

        const narrowCover = width < 360;
        buckets.forEach((bucket, lIdx) => {
          const count = bucket.length;
          bucket.forEach((n, idx) => {
            const frac = count === 1 ? 0.5 : idx / (count - 1);
            const staggerY = lIdx === 2 ? (idx % 2 === 0 ? (narrowCover ? -16 : -22) : narrowCover ? 16 : 22) : 0;
            n.baseX = sidePad + frac * usableW;
            n.baseY = layerYs[lIdx] + staggerY;
            n.radius =
              n.kind === 'foundation'
                ? narrowCover ? 5.8 : 6.5
                : n.kind === 'approach'
                  ? narrowCover ? 4.5 : 5
                  : narrowCover ? 4.2 : 4.6;
          });
        });
      }
    }

    function resizeCanvas(): void {
      if (!container || !canvas) return;
      width = Math.max(260, container.clientWidth || window.innerWidth);
      height = Math.max(240, container.clientHeight || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      layoutNodes();
    }

    resizeCanvas();

    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    resizeObserver.observe(container);

    function worldToScreen(wx: number, wy: number): { x: number; y: number } {
      const cx = width * 0.5;
      const cy = height * 0.5;
      return {
        x: (wx - cx) * zoom + cx + panX,
        y: (wy - cy) * zoom + cy + panY,
      };
    }

    function screenToWorld(sx: number, sy: number): { x: number; y: number } {
      const cx = width * 0.5;
      const cy = height * 0.5;
      return {
        x: (sx - cx - panX) / zoom + cx,
        y: (sy - cy - panY) / zoom + cy,
      };
    }

    function computeActiveSets(): {
      focusActive: boolean;
      activeNodes: Set<string>;
      activeEdges: Set<string>;
    } {
      const activeNodes = new Set<string>();
      const activeEdges = new Set<string>();
      const focusId = selectedNodeId ?? hoveredNodeId;

      if (focusId) {
        activeNodes.add(focusId);
        const focusNode = nodes[nodeIndexById.get(focusId) ?? -1];
        if (focusNode) {
          if (focusNode.kind === 'foundation') {
            for (const n of nodes) activeNodes.add(n.id);
            for (const e of edges) activeEdges.add(e.id);
          } else if (focusNode.kind === 'approach' && focusNode.approach) {
            const appId = focusNode.approach.id;
            activeNodes.add(FOUNDATION_PROFILE.id);
            for (const n of nodes) {
              if (n.approaches.includes(appId)) activeNodes.add(n.id);
            }
          } else if (focusNode.kind === 'credential' && focusNode.credential) {
            activeNodes.add(FOUNDATION_PROFILE.id);
            for (const appId of focusNode.credential.approaches) {
              activeNodes.add(`approach-${appId}`);
            }
          }
          for (const e of edges) {
            if (activeNodes.has(e.fromId) && activeNodes.has(e.toId)) {
              activeEdges.add(e.id);
            }
          }
        }
        return { focusActive: true, activeNodes, activeEdges };
      }

      if (filterState !== 'all') {
        activeNodes.add(FOUNDATION_PROFILE.id);
        for (const n of nodes) {
          if (n.approaches.includes(filterState)) activeNodes.add(n.id);
        }
        for (const e of edges) {
          if (activeNodes.has(e.fromId) && activeNodes.has(e.toId)) {
            activeEdges.add(e.id);
          }
        }
        return { focusActive: true, activeNodes, activeEdges };
      }

      return { focusActive: false, activeNodes, activeEdges };
    }

    function hitTestNode(localX: number, localY: number): NeuralNode2D | null {
      const wPt = screenToWorld(localX, localY);
      let best: NeuralNode2D | null = null;
      let bestScore = Infinity;
      const baseHitR = isVerticalLayout ? 30 : isTvDisplay ? 36 : 26;

      for (const n of nodes) {
        const hitR = baseHitR / Math.max(0.75, zoom);
        const dx = wPt.x - n.x;
        const dy = wPt.y - n.y;
        const dist = Math.hypot(dx, dy);

        // Make full text labels clickable as well as dots
        let labelHit = false;
        if (!isVerticalLayout) {
          const labelSpanX = isTvDisplay ? 280 : isShortLandscape ? 175 : 210;
          const labelBandY = isShortLandscape ? 15 : isTvDisplay ? 24 : 18;
          if (n.kind === 'credential' && dx >= -10 && dx <= labelSpanX / zoom && Math.abs(dy) <= labelBandY / zoom) {
            labelHit = true;
          } else if (n.kind === 'approach' && Math.abs(dx) <= 68 / zoom && dy >= -14 && dy <= 34 / zoom) {
            labelHit = true;
          } else if (n.kind === 'foundation' && Math.abs(dx) <= 60 / zoom && dy >= -14 && dy <= 44 / zoom) {
            labelHit = true;
          }
        } else if (Math.abs(dx) <= 34 / zoom && dy >= -18 && dy <= 32 / zoom) {
          labelHit = true;
        }

        if (dist <= hitR || labelHit) {
          const score = labelHit ? Math.min(dist, hitR * 0.65) : dist;
          if (score < bestScore) {
            bestScore = score;
            best = n;
          }
        }
      }
      return best;
    }

    function updateHoverTooltip(node: NeuralNode2D | null): void {
      if (!node) {
        hoverLabel = null;
        return;
      }
      const sp = worldToScreen(node.x, node.y);
      hoverLabel = {
        id: node.id,
        title: node.title,
        subtitle: node.subtitle,
        x: Math.max(120, Math.min(width - 120, sp.x)),
        y: Math.max(76, sp.y - node.radius * zoom - 16),
        accentRed: node.accentRed,
      };
    }

    function triggerNodeSelection(node: NeuralNode2D | null, clientX?: number, clientY?: number): void {
      if (!node) {
        selectedNodeId = null;
        closeDetailPanel();
        return;
      }

      node.pulseRing = 1.0;

      if (clientX !== undefined && clientY !== undefined) {
        onNodeInteract?.(clientX, clientY);
      }

      selectedNodeId = node.id;
      if (node.kind === 'foundation') {
        selectedTarget = { kind: 'foundation', item: FOUNDATION_PROFILE, nodeId: node.id };
      } else if (node.kind === 'approach' && node.approach) {
        selectedTarget = { kind: 'approach', item: node.approach, nodeId: node.id };
      } else if (node.kind === 'credential' && node.credential) {
        selectedTarget = { kind: 'credential', item: node.credential, nodeId: node.id };
      }
      hoverLabel = null;
      void animateCardExpandFromNode(node.id);
    }

    externalSelectNode = (nodeId: string | null) => {
      selectedNodeId = nodeId;
      if (nodeId) {
        const idx = nodeIndexById.get(nodeId);
        if (idx !== undefined) nodes[idx].pulseRing = 1.0;
      }
    };

    externalSetFilter = (filter: ApproachId | 'all') => {
      filterState = filter;
      if (filter !== 'all') {
        const appNode = nodes[nodeIndexById.get(`approach-${filter}`) ?? -1];
        if (appNode) appNode.pulseRing = 1.0;
      }
    };

    externalGetNodeScreenPos = (nodeId: string) => {
      const idx = nodeIndexById.get(nodeId);
      if (idx === undefined) return null;
      return worldToScreen(nodes[idx].x, nodes[idx].y);
    };

    externalZoomBy = (factor: number) => {
      targetZoom = Math.max(0.76, Math.min(2.0, targetZoom * factor));
      hasCustomView = Math.abs(targetZoom - 1) > 0.02 || Math.hypot(targetPanX, targetPanY) > 6;
    };

    externalResetView = () => {
      targetZoom = 1;
      targetPanX = 0;
      targetPanY = 0;
      hasCustomView = false;
    };

    let isDraggingPan = false;
    let dragMoved = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartPanX = 0;
    let dragStartPanY = 0;
    let downHitNode: NeuralNode2D | null = null;

    const activeTouches = new Map<number, { x: number; y: number }>();
    let pinchStartDist = 0;
    let pinchStartZoom = 1;

    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const hit = hitTestNode(e.clientX - rect.left, e.clientY - rect.top);
      downHitNode = hit;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragMoved = false;

      if (e.pointerType === 'touch') {
        activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activeTouches.size === 2) {
          const pts = Array.from(activeTouches.values());
          pinchStartDist = Math.max(10, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
          pinchStartZoom = targetZoom;
        }
        return;
      }

      dragStartPanX = targetPanX;
      dragStartPanY = targetPanY;
      if (!hit) {
        isDraggingPan = true;
        activeCursor = 'grabbing';
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;

      if (e.pointerType === 'touch') {
        if (activeTouches.has(e.pointerId)) {
          activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }
        if (Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) > 10) {
          dragMoved = true;
        }
        if (activeTouches.size === 2 && pinchStartDist > 0) {
          const pts = Array.from(activeTouches.values());
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          targetZoom = Math.max(0.76, Math.min(2.0, pinchStartZoom * (dist / pinchStartDist)));
          hasCustomView = Math.abs(targetZoom - 1) > 0.02 || Math.hypot(targetPanX, targetPanY) > 6;
        }
        return;
      }

      if (isDraggingPan) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.hypot(dx, dy) > 6) dragMoved = true;
        targetPanX = Math.max(-width * 0.36, Math.min(width * 0.36, dragStartPanX + dx));
        targetPanY = Math.max(-height * 0.3, Math.min(height * 0.3, dragStartPanY + dy));
        hasCustomView = Math.abs(targetZoom - 1) > 0.02 || Math.hypot(targetPanX, targetPanY) > 6;
        return;
      }

      const hit = hitTestNode(lx, ly);
      hoveredNodeId = hit ? hit.id : null;
      activeCursor = hit ? 'pointer' : 'default';
      if (!selectedTarget) {
        updateHoverTooltip(hit);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        activeTouches.delete(e.pointerId);
      }
      isDraggingPan = false;
      activeCursor = hoveredNodeId ? 'pointer' : 'default';

      if (dragMoved) {
        downHitNode = null;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const hit = hitTestNode(e.clientX - rect.left, e.clientY - rect.top) ?? downHitNode;
      downHitNode = null;

      if (hit) {
        e.stopPropagation();
        triggerNodeSelection(hit, e.clientX, e.clientY);
      } else if (selectedTarget) {
        closeDetailPanel();
      } else {
        selectedNodeId = null;
      }
    };

    const onPointerLeave = () => {
      isDraggingPan = false;
      downHitNode = null;
      hoveredNodeId = null;
      hoverLabel = null;
      activeCursor = 'default';
    };

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      externalZoomBy?.(e.deltaY < 0 ? 1.12 : 0.89);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImageSrc) {
          lightboxImageSrc = null;
        } else if (selectedTarget) {
          closeDetailPanel();
        } else {
          selectedNodeId = null;
        }
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    function evalCubicBezier(
      x0: number,
      y0: number,
      cx1: number,
      cy1: number,
      cx2: number,
      cy2: number,
      x1: number,
      y1: number,
      t: number
    ): { x: number; y: number } {
      const mt = 1 - t;
      const mt2 = mt * mt;
      const t2 = t * t;
      return {
        x: mt2 * mt * x0 + 3 * mt2 * t * cx1 + 3 * mt * t2 * cx2 + t2 * t * x1,
        y: mt2 * mt * y0 + 3 * mt2 * t * cy1 + 3 * mt * t2 * cy2 + t2 * t * y1,
      };
    }

    function getEdgeControlPoints(
      x0: number,
      y0: number,
      x1: number,
      y1: number
    ): [number, number, number, number] {
      if (!isVerticalLayout) {
        const dx = (x1 - x0) * 0.48;
        return [x0 + dx, y0, x1 - dx, y1];
      }
      const dy = (y1 - y0) * 0.48;
      return [x0, y0 + dy, x1, y1 - dy];
    }

    let rafId = 0;
    let disposed = false;
    let isPaused = document.hidden;
    let lastMs = performance.now();
    let clock = 0;
    let smoothBuild = 0;

    const renderFrame = (nowMs: number) => {
      if (disposed || isPaused) {
        rafId = 0;
        return;
      }

      const dt = Math.min((nowMs - lastMs) / 1000, 0.035);
      lastMs = nowMs;
      clock += dt;

      smoothBuild += (buildProgress - smoothBuild) * (1 - Math.exp(-9 * dt));

      if (smoothBuild < 0.01 && buildProgress < 0.01) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        rafId = requestAnimationFrame(renderFrame);
        return;
      }

      const camLerp = 1 - Math.exp(-12 * dt);
      panX += (targetPanX - panX) * camLerp;
      panY += (targetPanY - panY) * camLerp;
      zoom += (targetZoom - zoom) * camLerp;

      const floatAmp = reducedMotion ? 0 : isVerticalLayout ? 1.5 : 2.2;
      const revealEase = Math.max(0, Math.min(1, (smoothBuild - 0.05) / 0.72));

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x = n.baseX + Math.cos(clock * 0.75 + n.phase) * floatAmp;
        n.y = n.baseY + Math.sin(clock * 0.95 + n.phase * 1.25) * floatAmp;

        const isHov = hoveredNodeId === n.id ? 1 : 0;
        const isSel = selectedNodeId === n.id ? 1 : 0;
        n.hoverSpring += (isHov - n.hoverSpring) * (1 - Math.exp(-15 * dt));
        n.selectSpring += (isSel - n.selectSpring) * (1 - Math.exp(-14 * dt));
        if (n.pulseRing > 0) {
          n.pulseRing = Math.max(0, n.pulseRing - dt * 1.6);
        }
      }

      if (hoveredNodeId && !selectedTarget) {
        const hNode = nodes[nodeIndexById.get(hoveredNodeId) ?? -1];
        if (hNode) updateHoverTooltip(hNode);
      }

      const { focusActive, activeNodes, activeEdges } = computeActiveSets();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width * 0.5 + panX, height * 0.5 + panY);
      ctx.scale(zoom, zoom);
      ctx.translate(-width * 0.5, -height * 0.5);

      // 1. Razor-Clean Minimal Cubic Bézier Synapses
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const a = nodes[edge.fromIdx];
        const b = nodes[edge.toIdx];

        const edgeStagger = Math.max(0, Math.min(1, (revealEase - a.layer * 0.14) / 0.56));
        if (edgeStagger <= 0.01) continue;

        const isHighlighted = focusActive && activeEdges.has(edge.id);
        const [cx1, cy1, cx2, cy2] = getEdgeControlPoints(a.x, a.y, b.x, b.y);

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.bezierCurveTo(cx1, cy1, cx2, cy2, b.x, b.y);

        if (isHighlighted) {
          ctx.strokeStyle = edge.accentRed
            ? `rgba(255, 38, 27, ${(0.82 * edgeStagger).toFixed(3)})`
            : `rgba(20, 20, 18, ${(0.62 * edgeStagger).toFixed(3)})`;
          ctx.lineWidth = 1.65;
        } else if (focusActive) {
          ctx.strokeStyle = `rgba(20, 20, 18, ${(0.05 * edgeStagger).toFixed(3)})`;
          ctx.lineWidth = 0.9;
        } else {
          ctx.strokeStyle = edge.accentRed
            ? `rgba(255, 38, 27, ${(0.22 * edgeStagger).toFixed(3)})`
            : `rgba(20, 20, 18, ${(0.13 * edgeStagger).toFixed(3)})`;
          ctx.lineWidth = 1.05;
        }
        ctx.stroke();
      }

      // 2. Subtle Tiny Signal Beads gliding cleanly along active connections
      for (let i = 0; i < beads.length; i++) {
        const b = beads[i];
        const edge = edges[b.edgeIdx];
        const nA = nodes[edge.fromIdx];
        const nB = nodes[edge.toIdx];

        const isHighlighted = focusActive && activeEdges.has(edge.id);
        if (!reducedMotion) {
          b.t = (b.t + b.speed * (isHighlighted ? 1.7 : 0.9) * dt) % 1;
        }
        if (focusActive && !isHighlighted) continue;

        const edgeStagger = Math.max(0, Math.min(1, (revealEase - nA.layer * 0.16) / 0.56));
        if (edgeStagger <= 0.05) continue;

        const [cx1, cy1, cx2, cy2] = getEdgeControlPoints(nA.x, nA.y, nB.x, nB.y);
        const pt = evalCubicBezier(nA.x, nA.y, cx1, cy1, cx2, cy2, nB.x, nB.y, b.t);
        const alpha = Math.sin(b.t * Math.PI) * (isHighlighted ? 0.92 : 0.42) * edgeStagger;
        if (alpha <= 0.04) continue;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isHighlighted ? 2.4 : 1.7, 0, Math.PI * 2);
        ctx.fillStyle = b.isRed
          ? `rgba(255, 38, 27, ${alpha.toFixed(3)})`
          : `rgba(20, 20, 18, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      // 3. Ultra-Clean Solid Minimal Dots (Zero Bullseye Rings, Zero Blurry Halos) + Sharp Labels
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const nodeStagger = Math.max(0, Math.min(1, (revealEase - n.layer * 0.14) / 0.48));
        if (nodeStagger <= 0.01) continue;

        const isActive = !focusActive || activeNodes.has(n.id);
        const isPrimaryFocus = selectedNodeId === n.id || hoveredNodeId === n.id;
        const dimFactor = isActive ? 1.0 : 0.22;
        const scale = (1 + n.hoverSpring * 0.34 + n.selectSpring * 0.38) * (0.45 + 0.55 * nodeStagger);
        const r = n.radius * scale;

        // Crisp click feedback ripple (disappears smoothly right after click)
        if (n.pulseRing > 0.01) {
          const prog = 1 - n.pulseRing;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 4 + prog * 22, 0, Math.PI * 2);
          ctx.strokeStyle = n.accentRed
            ? `rgba(255, 38, 27, ${(n.pulseRing * 0.45).toFixed(3)})`
            : `rgba(20, 20, 18, ${(n.pulseRing * 0.32).toFixed(3)})`;
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }

        // Single hairline focus indicator ONLY when hovered or selected
        if (isPrimaryFocus) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = n.accentRed
            ? `rgba(255, 38, 27, ${(0.75 * nodeStagger).toFixed(3)})`
            : `rgba(20, 20, 18, ${(0.45 * nodeStagger).toFixed(3)})`;
          ctx.lineWidth = 1.25;
          ctx.stroke();
        }

        // Clean Solid Minimal Dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.accentRed
          ? `rgba(255, 38, 27, ${(dimFactor * nodeStagger).toFixed(3)})`
          : `rgba(20, 20, 18, ${(dimFactor * nodeStagger).toFixed(3)})`;
        ctx.fill();

        // Crisp Editorial Labels on Pure White (scaled across foldable cover, car, tablet, desktop & 4K TV)
        if (nodeStagger > 0.28) {
          const labelAlpha = Math.min(1, (nodeStagger - 0.28) / 0.5) * (isActive ? 1 : 0.24);
          const fontMult = isTvDisplay ? 1.3 : isShortLandscape ? 0.88 : width < 1024 ? 0.92 : 1.0;

          if (!isVerticalLayout) {
            if (n.kind === 'credential') {
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.font = `${isPrimaryFocus ? 700 : 600} ${(13 * fontMult).toFixed(1)}px "Plus Jakarta Sans", Inter, system-ui, sans-serif`;
              ctx.fillStyle =
                isPrimaryFocus && n.accentRed
                  ? `rgba(255, 38, 27, ${labelAlpha.toFixed(3)})`
                  : `rgba(17, 17, 16, ${labelAlpha.toFixed(3)})`;
              const gapX = isShortLandscape ? 10 : 14;
              if (isShortLandscape) {
                ctx.fillText(n.shortLabel, n.x + r + gapX, n.y);
              } else {
                ctx.fillText(n.shortLabel, n.x + r + gapX, n.y - 5.5 * fontMult);
                ctx.font = `500 ${(10.5 * fontMult).toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
                ctx.fillStyle = `rgba(107, 106, 101, ${(labelAlpha * 0.9).toFixed(3)})`;
                ctx.fillText(n.credential?.issuer.split(',')[0] ?? '', n.x + r + gapX, n.y + 9 * fontMult);
              }
            } else if (n.kind === 'approach') {
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.font = `700 ${(12 * fontMult).toFixed(1)}px "Plus Jakarta Sans", Inter, system-ui, sans-serif`;
              ctx.fillStyle = n.accentRed
                ? `rgba(255, 38, 27, ${labelAlpha.toFixed(3)})`
                : `rgba(17, 17, 16, ${labelAlpha.toFixed(3)})`;
              ctx.fillText(n.shortLabel, n.x, n.y + r + (isShortLandscape ? 7 : 10));
            } else if (n.kind === 'foundation') {
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.font = `800 ${(13 * fontMult).toFixed(1)}px "Plus Jakarta Sans", Inter, system-ui, sans-serif`;
              ctx.fillStyle = `rgba(17, 17, 16, ${labelAlpha.toFixed(3)})`;
              ctx.fillText(n.shortLabel, n.x, n.y + r + (isShortLandscape ? 8 : 11));

              ctx.font = `600 ${(9.5 * fontMult).toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
              ctx.fillStyle = `rgba(255, 38, 27, ${(labelAlpha * 0.92).toFixed(3)})`;
              ctx.fillText('NIT SILCHAR', n.x, n.y + r + (isShortLandscape ? 21 : 27 * fontMult));
            }
          } else {
            const narrowCover = width < 360;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            if (n.kind === 'foundation') {
              ctx.font = `700 ${narrowCover ? '10.5px' : '11.5px'} "Plus Jakarta Sans", Inter, system-ui, sans-serif`;
              ctx.fillStyle = `rgba(17, 17, 16, ${labelAlpha.toFixed(3)})`;
              ctx.fillText(n.shortLabel, n.x, n.y + r + 7);
            } else if (n.kind === 'approach') {
              ctx.font = `700 ${narrowCover ? '9.2px' : '10px'} "Plus Jakarta Sans", Inter, system-ui, sans-serif`;
              ctx.fillStyle = n.accentRed
                ? `rgba(255, 38, 27, ${labelAlpha.toFixed(3)})`
                : `rgba(17, 17, 16, ${labelAlpha.toFixed(3)})`;
              const tinyName =
                n.approach?.id === 'machine-learning'
                  ? 'ML'
                  : n.approach?.id === 'data-science'
                    ? 'Data'
                    : n.approach?.id === 'full-stack'
                      ? narrowCover ? 'Web' : 'Full Stack'
                      : 'SWE';
              ctx.fillText(tinyName, n.x, n.y + r + 7);
            } else {
              ctx.font = `600 ${narrowCover ? '8.5px' : '9.5px'} "JetBrains Mono", ui-monospace, monospace`;
              ctx.fillStyle = `rgba(17, 17, 16, ${labelAlpha.toFixed(3)})`;
              ctx.fillText(n.shortLabel.split(' ')[0], n.x, n.y + r + 7);
            }
          }
        }
      }

      ctx.restore();
      rafId = requestAnimationFrame(renderFrame);
    };

    const onVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused && rafId === 0) {
        lastMs = performance.now();
        rafId = requestAnimationFrame(renderFrame);
      } else if (isPaused && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    if (!isPaused) {
      rafId = requestAnimationFrame(renderFrame);
    }

    return () => {
      disposed = true;
      if (rafId !== 0) cancelAnimationFrame(rafId);
      cardEntryTl?.kill();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      resizeObserver.disconnect();
      externalSelectNode = null;
      externalSetFilter = null;
      externalGetNodeScreenPos = null;
      externalZoomBy = null;
      externalResetView = null;
    };
  });
</script>

<!-- ====================================================================== -->
<!-- SIMPLIFIED PURE WHITE 2D NEURAL NETWORK CREDENTIALS STAGE              -->
<!-- Clean solid dots · Direct 3-layer pathways · Full interactive inspect  -->
<!-- ====================================================================== -->
<div
  bind:this={stageContainer}
  class="relative h-full w-full select-none overflow-hidden bg-[#FFFFFF] text-[#141412]"
  style="cursor: {activeCursor}; touch-action: pan-y;"
  aria-label="Simplified interactive 2D neural network connecting credentials across Machine Learning, Data Science, Full Stack, and Software Development"
>
  <!-- Crisp HiDPI 2D Neural Network Canvas (supports horizontal swipe to switch tabs on touch) -->
  <canvas
    bind:this={canvasEl}
    ontouchstart={handleTabSwipeStart}
    ontouchend={handleTabSwipeEnd}
    class="block h-full w-full"
  ></canvas>

  <!-- Minimal Hover Tooltip -->
  {#if hoverLabel && !selectedTarget}
    <div
      class="pointer-events-none absolute z-30 flex -translate-x-1/2 -translate-y-full flex-col items-center text-center"
      style="left: {hoverLabel.x.toFixed(1)}px; top: {hoverLabel.y.toFixed(1)}px;"
    >
      <div class="rounded-lg border border-[#141412]/12 bg-white/95 px-3 py-1.5 shadow-[0_10px_28px_rgba(17,17,16,0.1)]">
        <p
          class="max-w-[260px] font-display text-[13px] leading-tight font-bold tracking-[-0.02em]"
          style="color: {hoverLabel.accentRed ? '#FF261B' : '#141412'};"
        >
          {hoverLabel.title}
        </p>
        <p class="mt-0.5 whitespace-nowrap font-mono text-[10.5px] text-[#6b6a65]">
          {hoverLabel.subtitle}
        </p>
      </div>
      <span
        aria-hidden="true"
        class="mt-1 block h-2 w-px"
        style="background: {hoverLabel.accentRed ? 'rgba(255, 38, 27, 0.55)' : 'rgba(20, 20, 18, 0.25)'};"
      ></span>
    </div>
  {/if}

  <!-- Clean Light Bottom Domain Filter & Zoom Bar -->
  <!-- Mobile (< md): Swipeable Single-Focus Tab Deck so NO tab name ever clips/exceeds -->
  <div
    ontouchstart={handleTabSwipeStart}
    ontouchend={handleTabSwipeEnd}
    class="pointer-events-auto absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-30 flex w-[min(calc(100vw-1.25rem),390px)] -translate-x-1/2 items-center justify-between gap-1 rounded-2xl border border-[#141412]/12 bg-white/96 p-1.5 shadow-[0_10px_28px_rgba(17,17,16,0.08)] md:hidden"
    style="opacity: {Math.max(0, Math.min(1, (buildProgress - 0.45) / 0.35)).toFixed(3)}; touch-action: pan-y;"
    role="tablist"
    aria-label="Swipe to switch credential domain filter"
  >
    <button
      type="button"
      aria-label="Previous domain tab"
      onclick={(e) => {
        e.stopPropagation();
        stepFilterTab(-1);
      }}
      class="flex h-9 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg font-mono text-base font-semibold text-[#575550] transition-colors hover:bg-[#141412]/6 hover:text-[#141412]"
    >
      ‹
    </button>

    <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1">
      <div
        role="tab"
        aria-selected="true"
        class="inline-flex min-h-[30px] max-w-full items-center justify-center rounded-lg px-3 py-1 font-display text-[12px] font-bold tracking-[-0.01em] whitespace-nowrap transition-colors {activeFilter === 'all'
          ? 'bg-[#141412] text-white'
          : 'bg-[#FF261B] text-white'}"
      >
        {activeFilterTab.label}
      </div>
      <div class="flex items-center justify-center gap-1.5" aria-hidden="true">
        {#each FILTER_TABS as tab (tab.id)}
          <button
            type="button"
            tabindex="-1"
            onclick={(e) => {
              e.stopPropagation();
              selectApproachFilter(tab.id);
            }}
            class="h-1.5 cursor-pointer rounded-full transition-all duration-200 {activeFilter === tab.id
              ? activeFilter === 'all'
                ? 'w-4 bg-[#141412]'
                : 'w-4 bg-[#FF261B]'
              : 'w-1.5 bg-[#141412]/20'}"
          ></button>
        {/each}
      </div>
    </div>

    <button
      type="button"
      aria-label="Next domain tab"
      onclick={(e) => {
        e.stopPropagation();
        stepFilterTab(1);
      }}
      class="flex h-9 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg font-mono text-base font-semibold text-[#575550] transition-colors hover:bg-[#141412]/6 hover:text-[#141412]"
    >
      ›
    </button>

    <div class="flex shrink-0 items-center gap-0.5 border-l border-[#141412]/10 pl-1">
      <button
        type="button"
        aria-label="Zoom in"
        onclick={(e) => {
          e.stopPropagation();
          externalZoomBy?.(1.18);
        }}
        class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md font-mono text-[14px] text-[#575550] transition-colors hover:bg-[#141412]/6 hover:text-[#141412]"
      >
        +
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onclick={(e) => {
          e.stopPropagation();
          externalZoomBy?.(0.84);
        }}
        class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md font-mono text-[14px] text-[#575550] transition-colors hover:bg-[#141412]/6 hover:text-[#141412]"
      >
        −
      </button>
      {#if hasCustomView}
        <button
          type="button"
          aria-label="Reset 2D network view"
          onclick={(e) => {
            e.stopPropagation();
            externalResetView?.();
          }}
          class="inline-flex h-8 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md px-2 font-display text-[10.5px] font-semibold text-[#FF261B] transition-colors hover:bg-[#FF261B]/10"
        >
          Reset
        </button>
      {/if}
    </div>
  </div>

  <!-- Tablet / Desktop / TV (>= md): Full Unclipped Domain Filter Bar -->
  <div
    class="pointer-events-auto absolute bottom-[max(1.1rem,env(safe-area-inset-bottom))] left-1/2 z-30 hidden -translate-x-1/2 items-center gap-0.5 rounded-xl border border-[#141412]/12 bg-white/95 p-1 shadow-[0_10px_28px_rgba(17,17,16,0.08)] md:flex"
    style="opacity: {Math.max(0, Math.min(1, (buildProgress - 0.45) / 0.35)).toFixed(3)};"
    role="tablist"
    aria-label="Filter 2D neural network by approach"
  >
    {#each FILTER_TABS as tab (tab.id)}
      <button
        type="button"
        role="tab"
        aria-selected={activeFilter === tab.id}
        onclick={(e) => {
          e.stopPropagation();
          selectApproachFilter(tab.id);
        }}
        class="inline-flex min-h-[36px] shrink-0 cursor-pointer items-center whitespace-nowrap rounded-lg px-3 py-1.5 font-display text-[12px] font-semibold transition-colors {activeFilter === tab.id
          ? tab.id === 'all'
            ? 'bg-[#141412] text-white'
            : 'bg-[#FF261B] text-white'
          : 'text-[#575550] hover:text-[#111110]'}"
      >
        {tab.label}
      </button>
    {/each}

    <div class="ml-1 flex items-center gap-0.5 border-l border-[#141412]/10 pl-1">
      <button
        type="button"
        aria-label="Zoom in"
        onclick={(e) => {
          e.stopPropagation();
          externalZoomBy?.(1.18);
        }}
        class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md font-mono text-[14px] text-[#575550] transition-colors hover:bg-[#141412]/6 hover:text-[#141412]"
      >
        +
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onclick={(e) => {
          e.stopPropagation();
          externalZoomBy?.(0.84);
        }}
        class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md font-mono text-[14px] text-[#575550] transition-colors hover:bg-[#141412]/6 hover:text-[#141412]"
      >
        −
      </button>
      {#if hasCustomView}
        <button
          type="button"
          aria-label="Reset 2D network view"
          onclick={(e) => {
            e.stopPropagation();
            externalResetView?.();
          }}
          class="inline-flex min-h-[36px] shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md px-2.5 py-1 font-display text-[11px] font-semibold text-[#FF261B] transition-colors hover:bg-[#FF261B]/10"
        >
          Reset
        </button>
      {/if}
    </div>
  </div>

  <!-- Ferrofluid Education Button in Bottom-Left (matching red circled area) -->
  <div
    class="pointer-events-auto absolute bottom-[max(4.6rem,calc(env(safe-area-inset-bottom)+3.8rem))] left-3 z-30 md:bottom-[max(1.1rem,env(safe-area-inset-bottom))] md:left-[max(1.75rem,env(safe-area-inset-left))]"
    style="opacity: {Math.max(0, Math.min(1, (buildProgress - 0.45) / 0.35)).toFixed(3)};"
  >
    <FluidNavButton
      id="credentials-education-btn"
      label="Education"
      compact={true}
      lightRim={true}
      onclick={(e) => {
        e.stopPropagation();
        onEducationClick?.();
      }}
    />
  </div>

  <!-- Crisp Light Gallery Detail Card (GSAP Expand from Node + Binary Dust Veil) -->
  {#if selectedTarget}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <aside
      bind:this={detailPanelEl}
      onclick={(e) => e.stopPropagation()}
      onpointerdown={(e) => e.stopPropagation()}
      ontouchstart={(e) => e.stopPropagation()}
      ontouchmove={(e) => e.stopPropagation()}
      class="pointer-events-auto absolute inset-x-3 bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+3.75rem))] top-auto z-40 flex max-h-[58dvh] w-auto flex-col overflow-hidden rounded-2xl border border-[#141412]/12 bg-white text-[#141412] shadow-[0_24px_64px_rgba(18,17,15,0.14)] will-change-transform sm:inset-x-auto sm:top-[max(1rem,env(safe-area-inset-top))] sm:right-[max(1rem,env(safe-area-inset-right))] sm:bottom-auto sm:max-h-[calc(100dvh-5.5rem)] sm:w-[min(390px,42vw)] lg:top-8 lg:right-8 lg:max-h-[calc(100dvh-7.5rem)]"
      aria-label="Selected credential node details"
    >
      {#if cardVeilScrimAlpha > 0.005}
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 z-[19] bg-white"
          style="opacity: {cardVeilScrimAlpha.toFixed(3)};"
        ></div>
      {/if}
      <canvas
        bind:this={cardDustCanvasEl}
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-20 block h-full w-full"
      ></canvas>

      {#if selectedTarget.kind === 'credential'}
        {@const cert = selectedTarget.item}
        {#if cert.nodeTone === 'red'}
          <div class="h-1 w-full bg-[#FF261B]"></div>
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
            class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#5e5c56] transition-colors hover:bg-[#f4f3ef] hover:text-[#111110]"
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

            {#if cert.certificateImage}
              <button
                type="button"
                onclick={() => {
                  lightboxImageSrc = cert.certificateImage ?? null;
                  lightboxImageTitle = cert.title;
                }}
                class="block w-full cursor-pointer overflow-hidden rounded-xl border border-[#141412]/10 bg-[#faf9f6] transition-transform duration-200 hover:scale-[1.01]"
              >
                <img
                  src={cert.certificateImage}
                  alt="{cert.title} certificate"
                  referrerpolicy="no-referrer"
                  class="aspect-[4/3] w-full object-cover"
                />
              </button>
            {:else}
              <div class="rounded-xl border border-[#141412]/10 bg-[#f9f9f7] p-4">
                <div class="flex items-center justify-between text-[11px] text-[#6b6861]">
                  <span class="font-medium">{cert.issuer}</span>
                  <span class="font-mono font-semibold text-[#FF261B]">{cert.stampDate}</span>
                </div>
                <p class="mt-3 font-display text-[14.5px] leading-snug font-bold text-[#141412]">
                  {cert.title}
                </p>
                <p class="mt-1.5 text-[12px] text-[#5e5c56]">Aryan Das</p>
              </div>
            {/if}
          </div>

          <div data-card-reveal class="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            {#each cert.approaches as appId (appId)}
              {@const app = approachById.get(appId)}
              {#if app}
                <button
                  type="button"
                  onclick={() => jumpToApproach(appId)}
                  class="cursor-pointer font-display font-semibold text-[#5e5c56] transition-colors hover:text-[#FF261B]"
                >
                  {app.name}
                </button>
              {/if}
            {/each}
          </div>
        </div>

        <div data-card-reveal class="border-t border-[#141412]/8 px-6 py-3.5">
          <a
            href={cert.verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#141412] px-4 py-2.5 font-display text-[13px] font-semibold text-white transition-colors hover:bg-[#FF261B]"
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
            class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#5e5c56] transition-colors hover:bg-[#f4f3ef] hover:text-[#111110]"
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
          <div class="divide-y divide-[#141412]/8 border-t border-[#141412]/8">
            {#each linkedCreds as cred (cred.id)}
              <button
                type="button"
                onclick={() => jumpToCredential(cred)}
                class="group flex w-full cursor-pointer items-center justify-between gap-3 py-3 text-left transition-colors"
              >
                <div class="min-w-0">
                  <p class="truncate font-display text-[13.5px] font-bold text-[#141412] group-hover:text-[#FF261B]">
                    {cred.title}
                  </p>
                  <p class="mt-0.5 text-[11.5px] text-[#6b6861]">
                    {cred.issuer} · {cred.completionDate}
                  </p>
                </div>
                <span class="shrink-0 text-[13px] text-[#8a8780] group-hover:text-[#FF261B]">→</span>
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
            class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#5e5c56] transition-colors hover:bg-[#f4f3ef] hover:text-[#111110]"
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
          <p data-card-reveal class="border-t border-[#141412]/8 pt-3.5 font-mono text-[12px] text-[#454440]">
            {profile.languages.join(' · ')}
          </p>

          <div data-card-reveal class="mt-4 divide-y divide-[#141412]/8 border-t border-[#141412]/8">
            {#each APPROACHES_LIST as app (app.id)}
              <button
                type="button"
                onclick={() => jumpToApproach(app.id)}
                class="group flex w-full cursor-pointer items-center justify-between py-2.5 text-left"
              >
                <span class="font-display text-[13.5px] font-bold text-[#141412] group-hover:text-[#FF261B]">
                  {app.name}
                </span>
                <span class="text-[12px] text-[#8a8780] group-hover:text-[#FF261B]">
                  {credentialsForApproach(app.id).length} →
                </span>
              </button>
            {/each}
          </div>

          <div data-card-reveal class="mt-4 flex items-center gap-4 border-t border-[#141412]/8 pt-3.5 text-[12.5px] font-semibold">
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#141412] transition-colors hover:text-[#FF261B]"
            >
              GitHub ↗
            </a>
            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#141412] transition-colors hover:text-[#FF261B]"
            >
              LinkedIn ↗
            </a>
            <a
              href={profile.orcidUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-[#141412] transition-colors hover:text-[#FF261B]"
            >
              ORCID ↗
            </a>
          </div>
        </div>
      {/if}
    </aside>
  {/if}

  <!-- Lightbox for Certificate Images -->
  {#if lightboxImageSrc}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      onclick={() => {
        lightboxImageSrc = null;
      }}
      class="fixed inset-0 z-50 flex items-center justify-center bg-[#f5f5f2]/85 p-3 sm:p-6 backdrop-blur-xl"
    >
      <div
        onclick={(e) => e.stopPropagation()}
        class="relative max-h-[90vh] max-w-[920px] overflow-hidden rounded-2xl border border-black/10 bg-white p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.12)] sm:p-3"
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
          class="mt-2 ml-auto block cursor-pointer rounded-lg bg-black px-4 py-1.5 font-display text-[12px] font-semibold text-white hover:bg-[#FF261B]"
        >
          Close
        </button>
      </div>
    </div>
  {/if}
</div>
