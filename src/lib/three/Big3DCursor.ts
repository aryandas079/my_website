import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { detectDeviceGpuTier, type DeviceGpuTier } from './InstancedBinaryDust';

// Module-scope reusable scratch math objects (zero GC allocations in tick loop)
const _quatTarget = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _tempNormal = new THREE.Vector3();
const _tempPos = new THREE.Vector3();

export type HeadingApproachSide = 'left' | 'right' | 'top' | 'bottom';

export interface HeadingRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface HeadingTargetOptions {
  targetKey: string;
  preferredSide?: HeadingApproachSide;
  fallbackSides?: HeadingApproachSide[];
  preferredAngleOffsetRad?: number;
  gapPx?: number;
  scale?: number;
  allowFullRoll?: boolean;
  forceImpulse?: boolean;
}

export interface PointerTargetOptions {
  targetKey?: string;
  preferredAngleRad?: number;
  fallbackClientX?: number;
  fallbackClientY?: number;
  scale?: number;
  allowFullRoll?: boolean;
  forceSwoop?: boolean;
}

/** Natural upright pointer orientation (+X sharp apex tip rotated ~114deg up-left) */
const NATURAL_POINTER_ANGLE = Math.atan2(0.835, -0.365);

/** Fixed high-frequency physics substep (240Hz) for rock-solid framerate-independent stability */
const PHYSICS_SUBSTEP_DT = 1 / 240;
const MAX_SUBSTEPS_PER_FRAME = 10;

/**
 * Shortest signed angular difference between two angles in radians (-PI to +PI)
 * enabling continuous smooth 360-degree rotation without wrap-around snaps.
 */
function shortestAngleDelta(fromRad: number, toRad: number): number {
  const diff = ((toRad - fromRad + Math.PI) % (Math.PI * 2)) - Math.PI;
  return diff < -Math.PI ? diff + Math.PI * 2 : diff;
}

/**
 * Builds the stemless rounded-corner pointer silhouette with a concave bottom notch.
 * Its sharp apex tip sits at ~(0.055, -0.015) before centroid centering & +X alignment.
 */
function createRoundedPointerShape(scale = 1): THREE.Shape {
  const s = scale;
  const shape = new THREE.Shape();

  shape.moveTo(0 * s, -0.18 * s);
  shape.lineTo(0 * s, -1.52 * s);
  shape.quadraticCurveTo(0 * s, -1.72 * s, 0.19 * s, -1.62 * s);
  shape.bezierCurveTo(
    0.42 * s,
    -1.46 * s,
    0.66 * s,
    -1.26 * s,
    1.04 * s,
    -1.24 * s
  );
  shape.quadraticCurveTo(1.26 * s, -1.23 * s, 1.12 * s, -1.04 * s);
  shape.lineTo(0.22 * s, -0.08 * s);
  shape.quadraticCurveTo(0 * s, 0.1 * s, 0 * s, -0.18 * s);

  return shape;
}

/**
 * Curves vertex normals gently outward across front/back faces and bevels so studio
 * softbox reflections sweep brilliantly across the entire sculpted surface.
 */
function applyConvexReflectiveNormals(
  geometry: THREE.BufferGeometry,
  domeCurvature = 0.34
): void {
  geometry.computeVertexNormals();
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const normAttr = geometry.getAttribute('normal') as THREE.BufferAttribute;
  if (!posAttr || !normAttr) return;

  for (let i = 0; i < posAttr.count; i++) {
    _tempPos.fromBufferAttribute(posAttr, i);
    _tempNormal.fromBufferAttribute(normAttr, i);

    _tempNormal.x += _tempPos.x * domeCurvature;
    _tempNormal.y += _tempPos.y * domeCurvature;
    _tempNormal.normalize();

    normAttr.setXYZ(i, _tempNormal.x, _tempNormal.y, _tempNormal.z);
  }
  normAttr.needsUpdate = true;
}

export class Big3DCursorController {
  private container: HTMLElement;
  private gpuTier: DeviceGpuTier;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envTexture: THREE.Texture;

  private cursorRoot = new THREE.Group();
  private cursorAimGroup = new THREE.Group();
  private cursorSpinGroup = new THREE.Group();

  private outerBorderMesh!: THREE.Mesh;
  private chromeRimMesh!: THREE.Mesh;
  private innerFaceMesh!: THREE.Mesh;
  private sideAccentTrimMesh!: THREE.Mesh;
  private specularGliderLight!: THREE.PointLight;
  private secondaryGliderLight!: THREE.PointLight;

  // Viewport dimensions cached on resize (avoids layout thrashing inside physics step)
  private viewportWidth = 1280;
  private viewportHeight = 800;

  // =========================================================================
  // NEWTONIAN FORCE & TORQUE RIGID-BODY PHYSICS STATE (Zero-GC scalar/Vec3)
  // =========================================================================
  private readonly mass = 1.0;
  private currentPos = new THREE.Vector3(-0.7, 0.55, 0.18);
  private targetPos = new THREE.Vector3(-0.7, 0.55, 0.18);
  private velPos = new THREE.Vector3(0, 0, 0);
  private lastAccel = new THREE.Vector3(0, 0, 0);

  // Physics mode: 'roam' (Hero orbital force) | 'finale-roam' (Full-page sweeping flight) | 'track' (Heading magnetic attractor) | 'click' (Pixel 360 target)
  private mode: 'roam' | 'finale-roam' | 'track' | 'click' = 'roam';
  private activeTargetKey = '';
  private lastRollMs = 0;
  private rollSignToggle = 1;
  private physicsAccumulator = 0;

  // =========================================================================
  // GSAP PHYSICS MAGNETIC SNAPPING STATE (Smooth Elastic Center-Lock on Headings)
  // =========================================================================
  private magneticSnap = {
    pull: 0, // 0..1 magnetic lock strength animated via GSAP elastic/expo physics
    centerX: 0, // centered heading anchor X in world space
    centerY: 0, // centered heading anchor Y in world space
    centerAngle: NATURAL_POINTER_ANGLE,
    scalePulse: 0, // GSAP elastic tactile lock pulse
    spinBoost: 0, // GSAP smooth 360-degree flourish offset on pixel clicks
  };
  private magneticSnapActiveKey = '';
  private magneticTween: gsap.core.Tween | null = null;
  private magneticPulseTween: gsap.core.Tween | null = null;
  private clickSpinTween: gsap.core.Tween | null = null;

  // Dynamic 3D banking & pitching rigid-body spring state (driven by linear force/accel)
  private bankRoll = 0;
  private bankRollVel = 0;
  private bankPitch = 0;
  private bankPitchVel = 0;

  // Organic multi-harmonic Hero force-field state (pointing at "aryandas")
  private roamScrollProgress = 0.22;
  private roamFocusWorld = new THREE.Vector3(-0.6, -1.5, 0);
  private readonly wanderPhaseX = Math.random() * Math.PI * 2;
  private readonly wanderPhaseY = Math.random() * Math.PI * 2;
  private readonly wanderPhaseZ = Math.random() * Math.PI * 2;
  private readonly wanderPhaseSub = Math.random() * Math.PI * 2;
  private roamRollAccum = 0;
  private lastRoamProgress = 0.22;

  // Scale spring physics state (noticeably bigger commanding 3D presence)
  private currentScale = 0.92;
  private targetScale = 0.92;
  private velScale = 0;

  // Rotational torque physics (unbounded radians for continuous 360-degree sweeps)
  private currentAimAngleZ = NATURAL_POINTER_ANGLE;
  private targetAimAngleZ = NATURAL_POINTER_ANGLE;
  private angVelZ = 0;

  private currentSpin3D = 0;
  private targetSpin3D = 0;
  private spinVelX = 0;

  // Exact world-unit radius from centroid (0,0) to the red-circled sharp apex tip (+X) at scale 1.0
  private readonly baseTipRadiusWorld = 1.01;
  private readonly baseBoundingRadiusWorld = 1.12;

  private lastTimeMs = performance.now();
  private frameId = 0;
  private disposed = false;
  private externalPaused = false;
  private documentHidden = false;
  private resizeObserver: ResizeObserver;
  private disposables: Array<{ dispose: () => void }> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.gpuTier = detectDeviceGpuTier();
    this.isSoftwareGl = this.gpuTier.isSoftwareGl;

    const width = Math.max(container.clientWidth, 260);
    const height = Math.max(container.clientHeight, 240);
    this.viewportWidth = width;
    this.viewportHeight = height;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !this.gpuTier.isLowEndMobile,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.gpuTier.recommendedMaxDpr)
    );
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
    this.camera.position.set(0, 0, 10);

    this.envTexture = this.buildBrilliantStudioEnvironment();
    this.scene.environment = this.envTexture;
    this.disposables.push(this.envTexture);

    this.buildLights();
    this.buildPointer3DMesh();

    // Initialize bigger commanding scale proportionally for mobile / tablet / desktop
    const initialScale = this.resolveResponsiveScale(0.96);
    this.currentScale = initialScale;
    this.targetScale = initialScale;
    this.cursorRoot.scale.setScalar(initialScale);

    // Default initial state: organically floating on screen and aiming at "aryandas"
    this.setScrollArcProgress(0.22);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    this.documentHidden = document.hidden;
    this.lastTimeMs = performance.now();
    this.scheduleNextFrame();
  }

  /**
   * Adaptive responsive scale multiplier across foldable covers, phones, car screens,
   * tablets, desktop, and 4K TV displays.
   */
  private resolveResponsiveScale(desktopBaseScale: number): number {
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    // Short wide automotive infotainment or landscape phone screens: scale proportionally by height too
    if (h <= 560 && w >= 640) {
      const hFactor = THREE.MathUtils.clamp(h / 720, 0.56, 0.78);
      return desktopBaseScale * hFactor;
    }
    if (w < 360) {
      return desktopBaseScale * 0.56;
    }
    if (w < 430) {
      return desktopBaseScale * 0.64;
    }
    if (w < 640) {
      return desktopBaseScale * 0.72;
    }
    if (w < 1024) {
      return desktopBaseScale * 0.84;
    }
    if (w < 1280) {
      return desktopBaseScale * 0.96;
    }
    if (w >= 2200 && h >= 1100) {
      return desktopBaseScale * 1.16;
    }
    return desktopBaseScale * 1.08;
  }

  /**
   * Allows parent overlays (Focus View or Say Hi modal) to pause WebGL rendering
   * cleanly while hidden, saving 100% GPU frame time.
   */
  public setPaused(paused: boolean): void {
    if (this.externalPaused === paused) return;
    this.externalPaused = paused;
    if (paused) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.frameId = 0;
    } else if (!this.disposed && !this.documentHidden) {
      this.lastTimeMs = performance.now();
      this.scheduleNextFrame();
    }
  }

  private onVisibilityChange = (): void => {
    this.documentHidden = document.hidden;
    if (this.documentHidden) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.frameId = 0;
    } else if (!this.disposed && !this.externalPaused) {
      this.lastTimeMs = performance.now();
      this.scheduleNextFrame();
    }
  };

  private scheduleNextFrame(): void {
    if (this.disposed || this.externalPaused || this.documentHidden) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private buildBrilliantStudioEnvironment(): THREE.Texture {
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    pmrem.compileEquirectangularShader();

    const envScene = new RoomEnvironment();

    const addLightPanel = (
      w: number,
      h: number,
      colorHex: number,
      intensity: number,
      pos: [number, number, number],
      rot: [number, number, number]
    ) => {
      const geo = new THREE.PlaneGeometry(w, h);
      const col = new THREE.Color(colorHex).multiplyScalar(intensity);
      const mat = new THREE.MeshBasicMaterial({
        color: col,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.set(rot[0], rot[1], rot[2]);
      envScene.add(mesh);
    };

    addLightPanel(12, 2.2, 0xffffff, 8.5, [0, 5.5, 4.5], [Math.PI * 0.32, 0, 0.18]);
    addLightPanel(10, 1.6, 0xf8fbff, 7.2, [-4.8, 3.2, 5.2], [0.22, 0.58, -0.28]);
    addLightPanel(10, 1.6, 0xffffff, 7.0, [5.0, 2.6, 5.0], [0.18, -0.55, 0.24]);
    addLightPanel(14, 1.1, 0xffffff, 6.4, [0, -4.6, 4.8], [-Math.PI * 0.28, 0, -0.15]);
    addLightPanel(8, 2.4, 0xff3b30, 3.8, [-6.2, -2.5, 3.2], [0, Math.PI * 0.42, 0.15]);
    addLightPanel(9, 1.4, 0xeef6ff, 6.5, [0, 1.2, 6.8], [0, 0, 0.42]);

    const texture = pmrem.fromScene(envScene, 0.014).texture;
    envScene.dispose();
    pmrem.dispose();
    return texture;
  }

  private buildLights(): void {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1a18, 1.35);
    hemi.position.set(0, 8, 6);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(4.5, 6.5, 8.5);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xf0f6ff, 1.95);
    fill.position.set(-6.0, 3.5, 7.0);
    this.scene.add(fill);

    const backLight = new THREE.DirectionalLight(0xffffff, 2.2);
    backLight.position.set(-5, -4, -6);
    this.scene.add(backLight);

    const rim = new THREE.DirectionalLight(0xff261b, 1.65);
    rim.position.set(-6, -4, 4.5);
    this.scene.add(rim);

    this.specularGliderLight = new THREE.PointLight(0xffffff, 14, 18, 1.5);
    this.specularGliderLight.position.set(1.8, 2.2, 4.2);
    this.scene.add(this.specularGliderLight);

    this.secondaryGliderLight = new THREE.PointLight(0xf5f9ff, 10, 16, 1.5);
    this.secondaryGliderLight.position.set(-2.2, -1.6, 3.8);
    this.scene.add(this.secondaryGliderLight);

    if (!this.isSoftwareGl && !this.gpuTier.isLowEndMobile) {
      RectAreaLightUniformsLib.init();

      const topSoftbox = new THREE.RectAreaLight(0xffffff, 5.5, 8, 2.4);
      topSoftbox.position.set(1.5, 4.8, 5.5);
      topSoftbox.lookAt(0, 0, 0);
      this.scene.add(topSoftbox);

      const sideSoftbox = new THREE.RectAreaLight(0xf2f7ff, 4.2, 6, 2.0);
      sideSoftbox.position.set(-4.5, -2.0, 5.0);
      sideSoftbox.lookAt(0, 0, 0);
      this.scene.add(sideSoftbox);
    }
  }

  private getSafeBoundsAtZ(
    z: number,
    scale: number
  ): { halfW: number; halfH: number; maxX: number; maxY: number } {
    const dist = Math.max(2.0, this.camera.position.z - z);
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const halfH = Math.tan(vFov / 2) * dist;
    const halfW = halfH * this.camera.aspect;
    const marginPad = this.viewportWidth < 640 ? 0.05 : 0.08;
    const pad = this.baseBoundingRadiusWorld * scale + marginPad;
    return {
      halfW,
      halfH,
      maxX: Math.max(0.22, halfW - pad),
      maxY: Math.max(0.22, halfH - pad),
    };
  }

  private screenToWorldAtZ(
    clientX: number,
    clientY: number,
    z: number
  ): { x: number; y: number } {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(rect.width, 1);
    const h = Math.max(rect.height, 1);
    const ndcX = ((clientX - rect.left) / w) * 2 - 1;
    const ndcY = -((clientY - rect.top) / h) * 2 + 1;
    const dist = Math.max(2.0, this.camera.position.z - z);
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * dist;
    const halfW = halfH * this.camera.aspect;
    return {
      x: ndcX * halfW,
      y: ndcY * halfH,
    };
  }

  /**
   * Evaluates candidate stance positions around a heading's bounding box so the red-circled
   * sharp apex tip (+X) points cleanly and centrally at the heading without clipping off-screen
   * or dropping onto links below.
   */
  private solveHeadingRectStance(
    rect: HeadingRect,
    preferredSide: HeadingApproachSide,
    fallbackSides: HeadingApproachSide[],
    angleOffsetRad: number,
    gapPx: number,
    z: number,
    scale: number,
    allowAutoBottomFallback = true
  ): { cx: number; cy: number; angle: number } {
    const safe = this.getSafeBoundsAtZ(z, scale);
    const tipDist = (this.baseTipRadiusWorld + 0.04) * scale;
    const midX = rect.left + rect.width * 0.5;
    const midY = rect.top + rect.height * 0.5;

    const sidesToTry: HeadingApproachSide[] = [preferredSide];
    for (const s of fallbackSides) {
      if (!sidesToTry.includes(s)) sidesToTry.push(s);
    }
    if (allowAutoBottomFallback) {
      const allDefaults: HeadingApproachSide[] = ['left', 'right', 'top', 'bottom'];
      for (const s of allDefaults) {
        if (!sidesToTry.includes(s)) sidesToTry.push(s);
      }
    }

    let firstCandidateX = 0;
    let firstCandidateY = 0;
    let firstPrimaryX = 0;
    let firstPrimaryY = 0;
    let firstAngle = angleOffsetRad;
    let hasFirst = false;

    for (const side of sidesToTry) {
      let anchorX = midX;
      let anchorY = midY;
      let angle = angleOffsetRad;

      if (side === 'left') {
        anchorX = rect.left - gapPx;
        anchorY = midY;
        angle = 0 + angleOffsetRad;
      } else if (side === 'right') {
        anchorX = rect.right + gapPx;
        anchorY = midY;
        angle = Math.PI + angleOffsetRad;
      } else if (side === 'top') {
        // Centered directly above the heading pointing cleanly DOWN with the sharp apex tip (+X)
        anchorX = midX;
        anchorY = rect.top - gapPx;
        angle = -Math.PI * 0.5 + angleOffsetRad;
      } else {
        // Centered below the heading pointing cleanly UP with the sharp apex tip (+X)
        anchorX = midX;
        anchorY = rect.bottom + gapPx;
        angle = Math.PI * 0.5 + angleOffsetRad;
      }

      const worldAnchor = this.screenToWorldAtZ(anchorX, anchorY, z);
      const tryCx = worldAnchor.x - Math.cos(angle) * tipDist;
      const tryCy = worldAnchor.y - Math.sin(angle) * tipDist;

      if (!hasFirst) {
        firstCandidateX = tryCx;
        firstCandidateY = tryCy;
        firstPrimaryX = worldAnchor.x;
        firstPrimaryY = worldAnchor.y;
        firstAngle = angle;
        hasFirst = true;
      }

      if (Math.abs(tryCx) <= safe.maxX && Math.abs(tryCy) <= safe.maxY) {
        return { cx: tryCx, cy: tryCy, angle };
      }
    }

    // Frustum-safe centered clamp: stays on the preferred side (e.g. centered above "Connect with me")
    // and torques the sharp apex tip directly toward the heading center!
    const clampedX = THREE.MathUtils.clamp(firstCandidateX, -safe.maxX, safe.maxX);
    const clampedY = THREE.MathUtils.clamp(firstCandidateY, -safe.maxY, safe.maxY);
    const dx = firstPrimaryX - clampedX;
    const dy = firstPrimaryY - clampedY;
    const dist = Math.hypot(dx, dy);
    const resolvedAngle = dist > 0.08 ? Math.atan2(dy, dx) : firstAngle;

    return { cx: clampedX, cy: clampedY, angle: resolvedAngle };
  }

  private solveSafeCentroidAndAngle(
    clientX: number,
    clientY: number,
    preferredAngleRad: number,
    z: number,
    scale: number,
    fallbackClientX?: number,
    fallbackClientY?: number
  ): { cx: number; cy: number; angle: number } {
    const safe = this.getSafeBoundsAtZ(z, scale);
    const primary = this.screenToWorldAtZ(clientX, clientY, z);
    const tipDist = (this.baseTipRadiusWorld + 0.04) * scale;

    const tryCx = primary.x - Math.cos(preferredAngleRad) * tipDist;
    const tryCy = primary.y - Math.sin(preferredAngleRad) * tipDist;

    if (Math.abs(tryCx) <= safe.maxX && Math.abs(tryCy) <= safe.maxY) {
      return { cx: tryCx, cy: tryCy, angle: preferredAngleRad };
    }

    if (fallbackClientX !== undefined) {
      const fb = this.screenToWorldAtZ(
        fallbackClientX,
        fallbackClientY ?? clientY,
        z
      );
      const flippedAngle = preferredAngleRad + Math.PI;
      const fbCx = fb.x - Math.cos(flippedAngle) * tipDist;
      const fbCy = fb.y - Math.sin(flippedAngle) * tipDist;
      if (Math.abs(fbCx) <= safe.maxX && Math.abs(fbCy) <= safe.maxY) {
        return { cx: fbCx, cy: fbCy, angle: flippedAngle };
      }
    }

    const clampedX = THREE.MathUtils.clamp(tryCx, -safe.maxX, safe.maxX);
    const clampedY = THREE.MathUtils.clamp(tryCy, -safe.maxY, safe.maxY);
    const dx = primary.x - clampedX;
    const dy = primary.y - clampedY;
    const dist = Math.hypot(dx, dy);
    const resolvedAngle = dist > 0.06 ? Math.atan2(dy, dx) : preferredAngleRad;

    return { cx: clampedX, cy: clampedY, angle: resolvedAngle };
  }

  /**
   * Triggers a GSAP elastic magnetic snap lock when the cursor gets near a heading,
   * easing it cleanly into a centered, poised alignment with tactile elastic settle.
   */
  private engageGsapMagneticSnap(
    key: string,
    cx: number,
    cy: number,
    angle: number
  ): void {
    this.magneticSnap.centerX = cx;
    this.magneticSnap.centerY = cy;
    this.magneticSnap.centerAngle = angle;

    if (this.magneticSnapActiveKey === key) return;
    this.magneticSnapActiveKey = key;

    this.magneticTween?.kill();
    this.magneticPulseTween?.kill();

    this.magneticSnap.pull = 0;
    this.magneticTween = gsap.to(this.magneticSnap, {
      pull: 1,
      duration: 0.72,
      ease: 'elastic.out(1, 0.72)',
      overwrite: 'auto',
    });

    this.magneticSnap.scalePulse = 0.085;
    this.magneticPulseTween = gsap.to(this.magneticSnap, {
      scalePulse: 0,
      duration: 0.64,
      ease: 'elastic.out(1.05, 0.58)',
      overwrite: 'auto',
    });
  }

  private releaseGsapMagneticSnap(): void {
    this.magneticSnapActiveKey = '';
    this.magneticTween?.kill();
    this.magneticTween = gsap.to(this.magneticSnap, {
      pull: 0,
      duration: 0.22,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }

  /**
   * Applies Newtonian launch impulses (linear velocity kick + arbitrary curved orbital
   * steering impulse + Z-lift impulse + 360° angular barrel roll torque impulse).
   */
  private applyTransitionImpulse(
    destX: number,
    destY: number,
    allowFullRoll: boolean,
    forceImpulse = false,
    arbitraryRandomCurve = false
  ): void {
    const dx = destX - this.currentPos.x;
    const dy = destY - this.currentPos.y;
    const dist = Math.hypot(dx, dy);

    if (!forceImpulse && dist < 0.2) {
      this.targetSpin3D =
        Math.round(this.currentSpin3D / (Math.PI * 2)) * (Math.PI * 2);
      return;
    }

    const safeDist = Math.max(dist, 0.001);
    const ux = dx / safeDist;
    const uy = dy / safeDist;
    const px = -uy;
    const py = ux;

    const midX = (this.currentPos.x + destX) * 0.5;
    const midY = (this.currentPos.y + destY) * 0.5;
    const dotCenter = px * -midX + py * -midY;

    let arcSign = dotCenter >= 0 ? 1 : -1;
    if (arbitraryRandomCurve) {
      // Arbitrary non-repeating curved sweep on every screen click
      arcSign = Math.random() < 0.5 ? 1 : -1;
      if (Math.abs(dotCenter) > 1.35) {
        arcSign = dotCenter >= 0 ? 1 : -1;
      }
    } else if (Math.abs(dotCenter) < 0.35) {
      arcSign = this.rollSignToggle;
    }

    const viewportFactor =
      this.viewportWidth < 640 ? 0.64 : this.viewportWidth < 1024 ? 0.82 : 1.0;
    const isMajorLeap = forceImpulse || dist >= 0.62;
    const randomSweepMult = arbitraryRandomCurve ? 0.88 + Math.random() * 0.72 : 1.0;

    const forwardImpulse =
      (isMajorLeap
        ? THREE.MathUtils.clamp(dist * 1.42, 0.58, 3.6)
        : dist * 0.95) *
      viewportFactor *
      (arbitraryRandomCurve ? 0.95 + Math.random() * 0.35 : 1.0);

    const lateralImpulse =
      (isMajorLeap
        ? THREE.MathUtils.clamp(dist * 1.85, 0.85, 4.9)
        : dist * 0.55) *
      viewportFactor *
      randomSweepMult;

    const liftImpulseZ = isMajorLeap
      ? THREE.MathUtils.clamp(dist * 0.56, 0.38, 1.45) * randomSweepMult
      : dist * 0.25;

    this.velPos.x += (ux * forwardImpulse + px * arcSign * lateralImpulse) / this.mass;
    this.velPos.y += (uy * forwardImpulse + py * arcSign * lateralImpulse) / this.mass;
    this.velPos.z += liftImpulseZ / this.mass;

    const nowMs = performance.now();
    const canRoll =
      allowFullRoll &&
      (arbitraryRandomCurve || forceImpulse || dist > 0.7) &&
      (arbitraryRandomCurve || nowMs - this.lastRollMs > 620);

    if (canRoll) {
      this.lastRollMs = nowMs;
      const rollDir = arbitraryRandomCurve
        ? Math.random() < 0.5
          ? 1
          : -1
        : Math.abs(dx) > 0.2
          ? dx >= 0
            ? 1
            : -1
          : this.rollSignToggle;
      this.rollSignToggle *= -1;
      const nearestUpright =
        Math.round(this.currentSpin3D / (Math.PI * 2)) * (Math.PI * 2);
      this.targetSpin3D = nearestUpright + rollDir * Math.PI * 2;
      this.spinVelX += rollDir * (arbitraryRandomCurve ? 6.2 : 4.4);
    } else {
      this.targetSpin3D =
        Math.round(this.targetSpin3D / (Math.PI * 2)) * (Math.PI * 2);
    }
  }

  private buildPointer3DMesh(): void {
    this.scene.add(this.cursorRoot);
    this.cursorRoot.add(this.cursorAimGroup);
    this.cursorAimGroup.add(this.cursorSpinGroup);

    // Exact 0.0-degree alignment of the sharp apex tip (circled in red) onto local +X axis
    const tipAlignAngle = -Math.atan2(0.835, -0.365);
    const bevelDetail = this.gpuTier.isLowEndMobile ? 6 : 10;
    const innerBevelDetail = this.gpuTier.isLowEndMobile ? 5 : 8;

    // 1. Mirror-Polished Obsidian-Chrome Outer Casing (#0E0E10)
    const outerShape = createRoundedPointerShape(1.0);
    const outerGeo = new THREE.ExtrudeGeometry(outerShape, {
      steps: 1,
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.068,
      bevelSize: 0.088,
      bevelSegments: bevelDetail,
    });
    outerGeo.translate(-0.42, 0.85, -0.12);
    outerGeo.rotateZ(tipAlignAngle);
    applyConvexReflectiveNormals(outerGeo, 0.28);

    const borderMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e0e10,
      roughness: 0.045,
      metalness: 0.88,
      clearcoat: 1.0,
      clearcoatRoughness: 0.025,
      reflectivity: 1.0,
      ior: 1.85,
      specularIntensity: 1.4,
      specularColor: new THREE.Color(0xffffff),
      envMapIntensity: 2.8,
      sheen: 0.25,
      sheenRoughness: 0.15,
      sheenColor: new THREE.Color(0xffffff),
    });
    this.outerBorderMesh = new THREE.Mesh(outerGeo, borderMat);
    this.cursorSpinGroup.add(this.outerBorderMesh);

    // 2. Brilliant Silver-Chrome Chamfer Bezel Layer
    const chromeRimShape = createRoundedPointerShape(1.0);
    const chromeRimGeo = new THREE.ExtrudeGeometry(chromeRimShape, {
      steps: 1,
      depth: 0.285,
      bevelEnabled: true,
      bevelThickness: 0.042,
      bevelSize: 0.032,
      bevelSegments: innerBevelDetail,
    });
    chromeRimGeo.translate(-0.42, 0.85, -0.1425);
    chromeRimGeo.rotateZ(tipAlignAngle);
    applyConvexReflectiveNormals(chromeRimGeo, 0.32);

    const chromeRimMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4f7fb,
      roughness: 0.03,
      metalness: 0.96,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      reflectivity: 1.0,
      envMapIntensity: 3.1,
    });
    this.chromeRimMesh = new THREE.Mesh(chromeRimGeo, chromeRimMat);
    this.cursorSpinGroup.add(this.chromeRimMesh);

    // 3. Mirror-Lacquered White Ceramic-Crystal Inner Face (#FFFFFF)
    const innerShape = createRoundedPointerShape(1.0);
    const innerGeo = new THREE.ExtrudeGeometry(innerShape, {
      steps: 1,
      depth: 0.315,
      bevelEnabled: true,
      bevelThickness: 0.034,
      bevelSize: 0.012,
      bevelSegments: innerBevelDetail,
    });
    innerGeo.translate(-0.42, 0.85, -0.1575);
    innerGeo.rotateZ(tipAlignAngle);
    applyConvexReflectiveNormals(innerGeo, 0.38);

    const faceMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.035,
      metalness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.018,
      reflectivity: 1.0,
      ior: 1.72,
      specularIntensity: 1.5,
      specularColor: new THREE.Color(0xffffff),
      iridescence: 0.18,
      iridescenceIOR: 1.35,
      envMapIntensity: 2.55,
    });
    this.innerFaceMesh = new THREE.Mesh(innerGeo, faceMat);
    this.cursorSpinGroup.add(this.innerFaceMesh);

    // 4. Anodized Ruby-Chrome Accent Trim Plate (#FF261B)
    const accentShape = createRoundedPointerShape(0.65);
    const accentGeo = new THREE.ExtrudeGeometry(accentShape, {
      steps: 1,
      depth: 0.345,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.008,
      bevelSegments: 4,
    });
    accentGeo.translate(-0.31, 0.62, -0.1725);
    accentGeo.rotateZ(tipAlignAngle);
    applyConvexReflectiveNormals(accentGeo, 0.3);

    const accentMat = new THREE.MeshPhysicalMaterial({
      color: 0xff261b,
      roughness: 0.06,
      metalness: 0.62,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      reflectivity: 1.0,
      envMapIntensity: 2.4,
    });
    this.sideAccentTrimMesh = new THREE.Mesh(accentGeo, accentMat);
    this.cursorSpinGroup.add(this.sideAccentTrimMesh);

    this.cursorRoot.scale.setScalar(this.currentScale);

    this.disposables.push(
      outerGeo,
      borderMat,
      chromeRimGeo,
      chromeRimMat,
      innerGeo,
      faceMat,
      accentGeo,
      accentMat
    );
  }

  /**
   * Organic physics-driven orbital float mode for the initial Hero screen ("aryandas").
   */
  public setScrollArcProgress(
    progress: number,
    focusClientX?: number,
    focusClientY?: number
  ): void {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    const scrollDelta = p - this.lastRoamProgress;
    this.lastRoamProgress = p;
    this.roamScrollProgress = p;

    if (this.mode !== 'roam') {
      this.mode = 'roam';
      this.activeTargetKey = 'hero-aryandas';
      this.releaseGsapMagneticSnap();
      this.velPos.y += 1.4;
      this.velPos.z += 0.45;
    }

    this.targetScale = this.resolveResponsiveScale(0.96);
    this.roamRollAccum += scrollDelta * Math.PI * 2.0;

    if (focusClientX !== undefined && focusClientY !== undefined) {
      const worldFocus = this.screenToWorldAtZ(focusClientX, focusClientY, 0.18);
      this.roamFocusWorld.set(worldFocus.x, worldFocus.y, 0.18);
    } else {
      const safe = this.getSafeBoundsAtZ(0.18, this.targetScale);
      this.roamFocusWorld.set(-safe.halfW * 0.24, -safe.halfH * 0.52, 0.18);
    }
  }

  /**
   * Full-viewport physics roaming mode for the final page:
   * Launches the 3D cursor into continuous sweeping curves across all four quadrants
   * of the screen with velocity-aligned 360° steering, banking, and graceful barrel rolls.
   */
  public setFinaleRoamMode(scale = 0.88): void {
    const entering = this.mode !== 'finale-roam';
    this.mode = 'finale-roam';
    this.activeTargetKey = 'finale-full-roam';
    this.targetScale = this.resolveResponsiveScale(scale);

    if (entering) {
      this.releaseGsapMagneticSnap();
      const dirX = this.currentPos.x >= 0 ? -1 : 1;
      const dirY = this.currentPos.y >= 0 ? -1 : 1;
      this.velPos.x += dirX * 2.4;
      this.velPos.y += dirY * 1.6;
      this.velPos.z += 0.65;
      this.spinVelX += dirX * 4.4;
    }
  }

  /**
   * Primary heading-targeting method with GSAP physics magnetic snapping:
   * Moves via Newtonian force toward the heading and, as it approaches within the
   * magnetic capture zone, smoothly eases into a centered stance over/aligned with
   * the heading text using GSAP elastic physics.
   */
  public pointAtHeadingRect(
    rect: HeadingRect,
    opts: HeadingTargetOptions
  ): void {
    const z = 0.24;
    const responsiveScale = this.resolveResponsiveScale(opts.scale ?? 0.78);
    const preferredSide = opts.preferredSide ?? 'left';
    const fallbackSides = opts.fallbackSides ?? ['right', 'top', 'bottom'];
    const angleOffsetRad = opts.preferredAngleOffsetRad ?? 0;
    const gapPx = opts.gapPx ?? (this.viewportWidth < 640 ? 10 : 16);
    const allowAutoBottom =
      opts.fallbackSides === undefined || opts.fallbackSides.includes('bottom');

    this.mode = 'track';
    this.targetScale = responsiveScale;

    const solved = this.solveHeadingRectStance(
      rect,
      preferredSide,
      fallbackSides,
      angleOffsetRad,
      gapPx,
      z,
      responsiveScale,
      allowAutoBottom
    );

    this.targetPos.set(solved.cx, solved.cy, z);
    this.targetAimAngleZ += shortestAngleDelta(
      this.targetAimAngleZ,
      solved.angle
    );

    const isNewTarget = opts.targetKey !== this.activeTargetKey;
    if (isNewTarget) {
      this.activeTargetKey = opts.targetKey;
      this.releaseGsapMagneticSnap();
      this.applyTransitionImpulse(
        solved.cx,
        solved.cy,
        opts.allowFullRoll ?? true,
        opts.forceImpulse ?? false,
        false
      );
    }

    // Update live centered magnetic snap coordinates; engage GSAP elastic snap when near heading
    const distToHeading = Math.hypot(
      solved.cx - this.currentPos.x,
      solved.cy - this.currentPos.y
    );
    const magneticCaptureRadius = 1.65;
    if (distToHeading < magneticCaptureRadius) {
      this.engageGsapMagneticSnap(opts.targetKey, solved.cx, solved.cy, solved.angle);
    } else if (this.magneticSnapActiveKey === opts.targetKey) {
      this.magneticSnap.centerX = solved.cx;
      this.magneticSnap.centerY = solved.cy;
      this.magneticSnap.centerAngle = solved.angle;
    }
  }

  /**
   * Direct screen-point heading targeting with automatic responsive scaling & GSAP magnetic snap.
   */
  public pointAtScreenElement(
    clientX: number,
    clientY: number,
    preferredAngleRadOrOptions: number | PointerTargetOptions = -0.04,
    spinFlourish = false
  ): void {
    const opts: PointerTargetOptions =
      typeof preferredAngleRadOrOptions === 'number'
        ? {
            preferredAngleRad: preferredAngleRadOrOptions,
            allowFullRoll: spinFlourish,
          }
        : preferredAngleRadOrOptions;

    const preferredAngleRad = opts.preferredAngleRad ?? -0.04;
    const responsiveScale = this.resolveResponsiveScale(opts.scale ?? 0.78);
    const z = 0.24;

    this.mode = 'track';
    this.targetScale = responsiveScale;

    const solved = this.solveSafeCentroidAndAngle(
      clientX,
      clientY,
      preferredAngleRad,
      z,
      responsiveScale,
      opts.fallbackClientX,
      opts.fallbackClientY
    );

    this.targetPos.set(solved.cx, solved.cy, z);
    this.targetAimAngleZ += shortestAngleDelta(
      this.targetAimAngleZ,
      solved.angle
    );

    const nextKey =
      opts.targetKey ?? `${Math.round(clientX / 40)}:${Math.round(clientY / 40)}`;
    const isNewTarget = nextKey !== this.activeTargetKey;

    if (isNewTarget) {
      this.activeTargetKey = nextKey;
      this.releaseGsapMagneticSnap();
      this.applyTransitionImpulse(
        solved.cx,
        solved.cy,
        opts.allowFullRoll ?? true,
        opts.forceSwoop ?? false,
        false
      );
    }

    const dist = Math.hypot(
      solved.cx - this.currentPos.x,
      solved.cy - this.currentPos.y
    );
    if (dist < 1.65) {
      this.engageGsapMagneticSnap(nextKey, solved.cx, solved.cy, solved.angle);
    }
  }

  /**
   * Click-anywhere interaction:
   * Clicking ANY pixel `(clientX, clientY)` launches the 3D cursor on an arbitrary curved
   * physical trajectory with a guaranteed full 360-degree rotation so its exact red-circled
   * sharp apex tip (+X) points directly at the clicked pixel!
   *
   * If a nearby heading rect is supplied (within magnetic range), GSAP elastic physics
   * smoothly eases the cursor into a centered magnetic lock over that heading.
   */
  public pointAndMoveToPixel(
    clientX: number,
    clientY: number,
    nearbyHeading?: { rect: HeadingRect; key: string } | null
  ): void {
    const z = 0.28;
    const responsiveScale = this.resolveResponsiveScale(0.76);
    this.mode = 'click';
    this.targetScale = responsiveScale;
    this.releaseGsapMagneticSnap();

    const worldClick = this.screenToWorldAtZ(clientX, clientY, z);
    const dx = worldClick.x - this.currentPos.x;
    const dy = worldClick.y - this.currentPos.y;
    const dist = Math.hypot(dx, dy);

    // Choose a natural approach angle pointing the sharp apex tip (+X) directly into the clicked pixel
    let desiredAngle: number;
    if (dist > 0.16) {
      desiredAngle = Math.atan2(dy, dx);
    } else {
      // Even when clicking right near the cursor, choose a fresh arbitrary approach angle
      desiredAngle = this.currentAimAngleZ + (Math.random() < 0.5 ? 1 : -1) * (0.85 + Math.random() * 1.1);
    }

    let solved: { cx: number; cy: number; angle: number };
    if (nearbyHeading) {
      // Smoothly aim into a centered magnetic lock over the nearby heading
      const headingCenterX = nearbyHeading.rect.left + nearbyHeading.rect.width * 0.5;
      const headingCenterY = nearbyHeading.rect.top + nearbyHeading.rect.height * 0.5;
      const headingCenterWorld = this.screenToWorldAtZ(headingCenterX, headingCenterY, z);
      const toHeadX = headingCenterWorld.x - this.currentPos.x;
      const toHeadY = headingCenterWorld.y - this.currentPos.y;
      const approachSide: HeadingApproachSide =
        Math.abs(toHeadY) > Math.abs(toHeadX) * 0.9
          ? toHeadY < 0
            ? 'top'
            : 'bottom'
          : toHeadX >= 0
            ? 'left'
            : 'right';

      solved = this.solveHeadingRectStance(
        nearbyHeading.rect,
        approachSide,
        ['top', 'left', 'right', 'bottom'],
        0,
        this.viewportWidth < 640 ? 10 : 14,
        z,
        responsiveScale,
        true
      );
    } else {
      solved = this.solveSafeCentroidAndAngle(
        clientX,
        clientY,
        desiredAngle,
        z,
        responsiveScale
      );
    }

    this.targetPos.set(solved.cx, solved.cy, z);

    // Guaranteed full 360-degree planar + 3D barrel-roll rotation on every screen click!
    const spinDir = Math.random() < 0.5 ? 1 : -1;
    const shortest = shortestAngleDelta(this.currentAimAngleZ, solved.angle);
    this.targetAimAngleZ = this.currentAimAngleZ + shortest + spinDir * Math.PI * 2;
    this.angVelZ += spinDir * 7.5;

    // GSAP smooth 360-degree 3D roll boost layered onto the rigid-body spin
    this.clickSpinTween?.kill();
    const rollStart = this.magneticSnap.spinBoost;
    this.clickSpinTween = gsap.to(this.magneticSnap, {
      spinBoost: rollStart + spinDir * Math.PI * 2,
      duration: 0.88,
      ease: 'expo.out',
      overwrite: 'auto',
    });

    // Tactile GSAP elastic scale pop on click
    this.magneticPulseTween?.kill();
    this.magneticSnap.scalePulse = -0.1;
    this.magneticPulseTween = gsap.to(this.magneticSnap, {
      scalePulse: 0,
      duration: 0.58,
      ease: 'elastic.out(1.1, 0.55)',
      overwrite: 'auto',
    });

    const clickKey = nearbyHeading
      ? `magnetic-click-${nearbyHeading.key}-${performance.now()}`
      : `pixel-click-${performance.now()}`;
    this.activeTargetKey = clickKey;

    // Launch arbitrary curved physical trajectory with momentum + Z-lift
    this.applyTransitionImpulse(solved.cx, solved.cy, true, true, true);

    if (nearbyHeading) {
      this.engageGsapMagneticSnap(clickKey, solved.cx, solved.cy, solved.angle);
    }
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 260);
    const height = Math.max(this.container.clientHeight, 240);
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.gpuTier.recommendedMaxDpr)
    );
    if (this.mode === 'roam') {
      this.targetScale = this.resolveResponsiveScale(0.96);
    } else if (this.mode === 'finale-roam') {
      this.targetScale = this.resolveResponsiveScale(0.88);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed || this.externalPaused || this.documentHidden) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  /**
   * Advances one fixed 240Hz Symplectic Euler Newtonian physics substep integrated with
   * the GSAP elastic magnetic-snap pull when locked onto a heading.
   */
  private stepPhysics(h: number, t: number): void {
    // 1. Scale spring-force integration
    const scaleForce = (this.targetScale - this.currentScale) * 58.0 - this.velScale * 13.8;
    this.velScale += scaleForce * h;
    this.currentScale = Math.max(0.28, this.currentScale + this.velScale * h);

    const safe = this.getSafeBoundsAtZ(this.currentPos.z, this.currentScale);

    // 2. Linear forces (Hooke attraction + GSAP magnetic snap boost + drag + buoyancy + soft boundary)
    const magPull = THREE.MathUtils.clamp(this.magneticSnap.pull, 0, 1);
    let kPos = 44.0 + magPull * 34.0;
    let cPos = 10.8 + magPull * 5.2;
    let kPosZ = 34.0;
    let cPosZ = 9.8;
    let floatForceX = Math.cos(t * 1.45) * (0.42 * (1 - magPull * 0.55));
    let floatForceY = Math.sin(t * 1.72) * (0.48 * (1 - magPull * 0.55));

    if (this.mode === 'roam') {
      const scrollWave = (this.roamScrollProgress - 0.5) * 2;
      const roamX =
        Math.sin(t * 0.42 + this.wanderPhaseX) * safe.maxX * 0.54 +
        Math.cos(t * 0.24 + this.wanderPhaseSub) * safe.maxX * 0.2 +
        scrollWave * safe.maxX * 0.24;
      const roamY =
        Math.sin(t * 0.34 + this.wanderPhaseY) * safe.maxY * 0.34 +
        Math.cos(t * 0.48 + this.wanderPhaseSub) * safe.maxY * 0.14 +
        safe.maxY * 0.2;
      const roamZ = 0.22 + Math.sin(t * 0.44 + this.wanderPhaseZ) * 0.32;

      this.targetPos.set(
        THREE.MathUtils.clamp(roamX, -safe.maxX * 0.86, safe.maxX * 0.86),
        THREE.MathUtils.clamp(roamY, -safe.maxY * 0.68, safe.maxY * 0.82),
        roamZ
      );

      kPos = 16.5;
      cPos = 6.4;
      kPosZ = 18.0;
      cPosZ = 6.8;
      floatForceX = 0;
      floatForceY = 0;

      // Always point the red-circled sharp apex tip (+X) at "aryandas"
      const aimToHero = Math.atan2(
        this.roamFocusWorld.y - this.currentPos.y,
        this.roamFocusWorld.x - this.currentPos.x
      );
      this.targetAimAngleZ += shortestAngleDelta(this.targetAimAngleZ, aimToHero);
      this.targetSpin3D = t * 0.48 + this.roamRollAccum;
    } else if (this.mode === 'finale-roam') {
      // Wide, non-repeating multi-harmonic Lissajous trajectory sweeping ALL OVER the last page
      const fX =
        Math.sin(t * 0.58 + this.wanderPhaseX) * safe.maxX * 0.62 +
        Math.cos(t * 0.31 + this.wanderPhaseSub) * safe.maxX * 0.30;
      const fY =
        Math.sin(t * 0.45 + this.wanderPhaseY) * safe.maxY * 0.58 +
        Math.cos(t * 0.73 + this.wanderPhaseZ) * safe.maxY * 0.30;
      const fZ = 0.26 + Math.sin(t * 0.64 + this.wanderPhaseZ) * 0.40;

      this.targetPos.set(
        THREE.MathUtils.clamp(fX, -safe.maxX * 0.9, safe.maxX * 0.9),
        THREE.MathUtils.clamp(fY, -safe.maxY * 0.88, safe.maxY * 0.88),
        fZ
      );

      kPos = 15.2;
      cPos = 5.2;
      kPosZ = 18.0;
      cPosZ = 6.2;
      floatForceX = 0;
      floatForceY = 0;

      // Steer sharp apex tip (+X) smoothly along live 360-degree flight velocity vector
      const vSpeed = Math.hypot(this.velPos.x, this.velPos.y);
      let flightAngle: number;
      if (vSpeed > 0.35) {
        flightAngle = Math.atan2(this.velPos.y, this.velPos.x);
      } else {
        const dfX =
          Math.cos(t * 0.58 + this.wanderPhaseX) * safe.maxX * 0.62 * 0.58 -
          Math.sin(t * 0.31 + this.wanderPhaseSub) * safe.maxX * 0.30 * 0.31;
        const dfY =
          Math.cos(t * 0.45 + this.wanderPhaseY) * safe.maxY * 0.58 * 0.45 -
          Math.sin(t * 0.73 + this.wanderPhaseZ) * safe.maxY * 0.30 * 0.73;
        flightAngle = Math.atan2(dfY, dfX);
      }
      this.targetAimAngleZ += shortestAngleDelta(this.targetAimAngleZ, flightAngle);
      this.targetSpin3D = t * 0.72;
    }

    // Blend target smoothly into the GSAP magnetic centered anchor when captured
    const isMagneticMode = this.mode === 'track' || this.mode === 'click';
    const effectiveTargetX =
      isMagneticMode && magPull > 0.01
        ? THREE.MathUtils.lerp(this.targetPos.x, this.magneticSnap.centerX, magPull)
        : this.targetPos.x;
    const effectiveTargetY =
      isMagneticMode && magPull > 0.01
        ? THREE.MathUtils.lerp(this.targetPos.y, this.magneticSnap.centerY, magPull)
        : this.targetPos.y;

    const dx = effectiveTargetX - this.currentPos.x;
    const dy = effectiveTargetY - this.currentPos.y;
    const dz = this.targetPos.z - this.currentPos.z;

    const speedSq =
      this.velPos.x * this.velPos.x +
      this.velPos.y * this.velPos.y +
      this.velPos.z * this.velPos.z;
    const speed = Math.sqrt(speedSq);
    const quadDrag = 0.32 * speed;

    // Soft elastic boundary repulsion near viewport frustum edges
    let wallForceX = 0;
    let wallForceY = 0;
    const softMaxX = safe.maxX * 0.94;
    const softMaxY = safe.maxY * 0.94;
    if (this.currentPos.x > softMaxX) {
      wallForceX = -(this.currentPos.x - softMaxX) * 180.0 - Math.max(0, this.velPos.x) * 14.0;
    } else if (this.currentPos.x < -softMaxX) {
      wallForceX = (-softMaxX - this.currentPos.x) * 180.0 - Math.min(0, this.velPos.x) * 14.0;
    }
    if (this.currentPos.y > softMaxY) {
      wallForceY = -(this.currentPos.y - softMaxY) * 180.0 - Math.max(0, this.velPos.y) * 14.0;
    } else if (this.currentPos.y < -softMaxY) {
      wallForceY = (-softMaxY - this.currentPos.y) * 180.0 - Math.min(0, this.velPos.y) * 14.0;
    }

    const fx = dx * kPos - this.velPos.x * (cPos + quadDrag) + floatForceX + wallForceX;
    const fy = dy * kPos - this.velPos.y * (cPos + quadDrag) + floatForceY + wallForceY;
    const fz = dz * kPosZ - this.velPos.z * (cPosZ + quadDrag * 0.6);

    const ax = fx / this.mass;
    const ay = fy / this.mass;
    const az = fz / this.mass;
    this.lastAccel.set(ax, ay, az);

    this.velPos.x += ax * h;
    this.velPos.y += ay * h;
    this.velPos.z += az * h;

    this.currentPos.x += this.velPos.x * h;
    this.currentPos.y += this.velPos.y * h;
    this.currentPos.z += this.velPos.z * h;

    // Hard frustum safety guard
    if (this.currentPos.x > safe.maxX) {
      this.currentPos.x = safe.maxX;
      if (this.velPos.x > 0) this.velPos.x *= -0.25;
    } else if (this.currentPos.x < -safe.maxX) {
      this.currentPos.x = -safe.maxX;
      if (this.velPos.x < 0) this.velPos.x *= -0.25;
    }
    if (this.currentPos.y > safe.maxY) {
      this.currentPos.y = safe.maxY;
      if (this.velPos.y > 0) this.velPos.y *= -0.25;
    } else if (this.currentPos.y < -safe.maxY) {
      this.currentPos.y = -safe.maxY;
      if (this.velPos.y < 0) this.velPos.y *= -0.25;
    }
    this.currentPos.z = THREE.MathUtils.clamp(this.currentPos.z, -0.4, 1.95);

    // 3. Rotational Aiming Torque (+ full unwrapped 360-degree spin on pixel clicks!)
    if (this.mode === 'click') {
      // Unwrapped spring torque executes the full 360-degree sweep cleanly into the clicked pixel!
      const aimErr = this.targetAimAngleZ - this.currentAimAngleZ;
      const aimTorque = aimErr * 68.0 - this.angVelZ * 14.5;
      this.angVelZ += aimTorque * h;
      this.currentAimAngleZ += this.angVelZ * h;
    } else {
      let desiredAim = this.targetAimAngleZ;
      const planarSpeed = Math.hypot(this.velPos.x, this.velPos.y);
      if (this.mode === 'track' && planarSpeed > 0.75 && magPull < 0.75) {
        const velocityAngle = Math.atan2(this.velPos.y, this.velPos.x);
        const steerBlend =
          THREE.MathUtils.clamp((planarSpeed - 0.75) * 0.085, 0, 0.34) * (1 - magPull * 0.7);
        desiredAim =
          this.targetAimAngleZ +
          shortestAngleDelta(this.targetAimAngleZ, velocityAngle) * steerBlend;
      }

      const aimErr = shortestAngleDelta(this.currentAimAngleZ, desiredAim);
      const aimTorque = aimErr * (94.0 + magPull * 28.0) - this.angVelZ * (17.2 + magPull * 3.5);
      this.angVelZ += aimTorque * h;
      this.currentAimAngleZ += this.angVelZ * h;
    }

    // 4. 360-degree Barrel Roll Torque Dynamics around pointing axis (+X)
    const isOrbitalRoam = this.mode === 'roam' || this.mode === 'finale-roam';
    const spinK = isOrbitalRoam ? 18.0 : 34.0;
    const spinC = isOrbitalRoam ? 8.2 : 10.6;
    const spinTorque = (this.targetSpin3D - this.currentSpin3D) * spinK - this.spinVelX * spinC;
    this.spinVelX += spinTorque * h;
    this.currentSpin3D += this.spinVelX * h;

    // 5. Force/Acceleration-Coupled 3D Banking Roll & Pitch Torques
    const targetBankRoll = THREE.MathUtils.clamp(
      -this.velPos.y * 0.075 - this.lastAccel.y * 0.011,
      -0.44,
      0.44
    );
    const targetBankPitch = THREE.MathUtils.clamp(
      this.velPos.x * 0.08 + this.lastAccel.x * 0.011 + this.velPos.z * 0.14,
      -0.46,
      0.46
    );

    const rollTorque = (targetBankRoll - this.bankRoll) * 58.0 - this.bankRollVel * 12.6;
    this.bankRollVel += rollTorque * h;
    this.bankRoll += this.bankRollVel * h;

    const pitchTorque = (targetBankPitch - this.bankPitch) * 58.0 - this.bankPitchVel * 12.6;
    this.bankPitchVel += pitchTorque * h;
    this.bankPitch += this.bankPitchVel * h;
  }

  private tick = (): void => {
    if (this.disposed || this.externalPaused || this.documentHidden) return;

    const nowMs = performance.now();
    const frameDelta = Math.min(Math.max((nowMs - this.lastTimeMs) / 1000, 0.0005), 0.035);
    this.lastTimeMs = nowMs;
    const t = nowMs / 1000;

    this.physicsAccumulator = Math.min(
      this.physicsAccumulator + frameDelta,
      PHYSICS_SUBSTEP_DT * MAX_SUBSTEPS_PER_FRAME
    );
    let steps = 0;
    while (this.physicsAccumulator >= PHYSICS_SUBSTEP_DT && steps < MAX_SUBSTEPS_PER_FRAME) {
      this.stepPhysics(PHYSICS_SUBSTEP_DT, t);
      this.physicsAccumulator -= PHYSICS_SUBSTEP_DT;
      steps++;
    }
    if (steps === 0) {
      this.stepPhysics(frameDelta, t);
    }

    const renderScale = this.currentScale * (1 + this.magneticSnap.scalePulse);

    this.cursorRoot.position.set(
      this.currentPos.x,
      this.currentPos.y,
      this.currentPos.z
    );
    this.cursorRoot.scale.setScalar(renderScale);

    if (this.specularGliderLight) {
      this.specularGliderLight.position.set(
        this.currentPos.x + Math.cos(t * 1.8) * 2.1,
        this.currentPos.y + Math.sin(t * 1.4) * 1.9 + 0.8,
        this.currentPos.z + 3.2
      );
    }
    if (this.secondaryGliderLight) {
      this.secondaryGliderLight.position.set(
        this.currentPos.x - Math.sin(t * 1.5) * 2.4,
        this.currentPos.y - Math.cos(t * 1.2) * 1.8 - 0.5,
        this.currentPos.z + 2.8
      );
    }

    this.cursorAimGroup.rotation.z = this.currentAimAngleZ;

    const subtleRockX =
      this.currentSpin3D +
      this.magneticSnap.spinBoost +
      Math.sin(t * 1.25) * 0.095 +
      this.bankRoll;
    const subtlePitchY = Math.cos(t * 1.0) * 0.075 + this.bankPitch;
    _euler.set(subtleRockX, subtlePitchY, 0, 'XYZ');
    _quatTarget.setFromEuler(_euler);
    this.cursorSpinGroup.quaternion.copy(_quatTarget);

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.magneticTween?.kill();
    this.magneticPulseTween?.kill();
    this.clickSpinTween?.kill();
    this.resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
