import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

const _quatTarget = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _tempNormal = new THREE.Vector3();
const _tempPos = new THREE.Vector3();
const _flightPos = new THREE.Vector3();
const _flightTan = new THREE.Vector3();

export interface PointerTargetOptions {
  targetKey?: string;
  preferredAngleRad?: number;
  fallbackClientX?: number;
  fallbackClientY?: number;
  scale?: number;
  allowFullRoll?: boolean;
  forceSwoop?: boolean;
}

export interface HoverRectInfo {
  left: number;
  top: number;
  width: number;
  height: number;
  kind: 'icon' | 'button' | 'card';
}

export interface LivePointerTarget {
  clientX: number;
  clientY: number;
  hoverRect?: HoverRectInfo | null;
}

/** Natural upright macOS/pointer orientation (+X tip rotated to ~117deg up-left) */
const NATURAL_POINTER_ANGLE = Math.atan2(0.85, -0.42);

/**
 * Exact analytical solution for a critically-damped 2nd-order spring (zeta = 1.0).
 * Unconditionally stable at any frame rate (30/60/120/240Hz), zero overshoot,
 * C2 smooth acceleration/velocity continuity, and zero garbage allocation.
 */
function dampSpringScalar(
  current: number,
  velocity: number,
  target: number,
  omega: number,
  dt: number
): [number, number] {
  const dx = current - target;
  const e = Math.exp(-omega * dt);
  const c = velocity + omega * dx;
  const nextPos = target + (dx + c * dt) * e;
  const nextVel = (velocity - c * omega * dt) * e;
  return [nextPos, nextVel];
}

function detectSoftwareWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

/**
 * Shortest signed angular difference between two angles in radians (-PI to +PI)
 * enabling continuous smooth 360-degree rotation without wrap-around snaps.
 */
function shortestAngleDelta(fromRad: number, toRad: number): number {
  const diff = ((toRad - fromRad + Math.PI) % (Math.PI * 2)) - Math.PI;
  return diff < -Math.PI ? diff + Math.PI * 2 : diff;
}

/**
 * Smooth responsive ease-out-quart / soft-in curve so choreographed flights launch
 * briskly without a sluggish start dead-zone and settle like silk.
 */
function easeSilkFlight(u: number): number {
  const t = THREE.MathUtils.clamp(u, 0, 1);
  // Blend gentle ease-in with luxurious expo-like deceleration
  const smoothIn = t * t * (3 - 2 * t);
  const silkOut = 1 - Math.pow(1 - t, 3.4);
  return smoothIn * 0.28 + silkOut * 0.72;
}

/**
 * Evaluates a cubic Bezier curve point without allocating new vectors.
 */
function evalCubicBezier(
  p0: THREE.Vector3,
  c1: THREE.Vector3,
  c2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  const b1 = 3 * uu * t;
  const b2 = 3 * u * tt;

  out.set(
    uuu * p0.x + b1 * c1.x + b2 * c2.x + ttt * p3.x,
    uuu * p0.y + b1 * c1.y + b2 * c2.y + ttt * p3.y,
    uuu * p0.z + b1 * c1.z + b2 * c2.z + ttt * p3.z
  );
  return out;
}

/**
 * Evaluates a cubic Bezier derivative (tangent) without allocating new vectors.
 */
function evalCubicBezierTangent(
  p0: THREE.Vector3,
  c1: THREE.Vector3,
  c2: THREE.Vector3,
  p3: THREE.Vector3,
  t: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  const twoUT = 2 * u * t;

  out.set(
    3 * uu * (c1.x - p0.x) + 6 * u * t * (c2.x - c1.x) + 3 * tt * (p3.x - c2.x),
    3 * uu * (c1.y - p0.y) + 6 * u * t * (c2.y - c1.y) + 3 * tt * (p3.y - c2.y),
    3 * uu * (c1.z - p0.z) + 3 * twoUT * (c2.z - c1.z) + 3 * tt * (p3.z - c2.z)
  );
  return out;
}

/**
 * Builds the stemless rounded-corner pointer silhouette with a concave bottom notch
 * matching /public/assets/aistudio/image_946c651c.png.
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
 * Gently curves the vertex normals across the front/back faces and bevels of an
 * extruded pointer geometry so environment reflections and studio softboxes sweep
 * brilliantly across the entire surface like a domed luxury ceramic/chrome sculpture.
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

    // Add radial convex normal tilt proportional to XY offset from the pointer centroid
    _tempNormal.x += _tempPos.x * domeCurvature;
    _tempNormal.y += _tempPos.y * domeCurvature;
    _tempNormal.normalize();

    normAttr.setXYZ(i, _tempNormal.x, _tempNormal.y, _tempNormal.z);
  }
  normAttr.needsUpdate = true;
}

export class Big3DCursorController {
  private container: HTMLElement;
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

  // Position, velocity & 360-degree orientation state in world coordinates (2nd-order springs)
  private currentPos = new THREE.Vector3(-0.8, 0.65, 0.15);
  private targetPos = new THREE.Vector3(-0.8, 0.65, 0.15);
  private velPos = new THREE.Vector3(0, 0, 0);

  // Dynamic non-fixed Cubic Bezier flight state for smooth organic choreographed swoops
  private mode: 'roam' | 'track' | 'follow' = 'roam';
  private activeTargetKey = '';
  private flightActive = false;
  private flightElapsed = 0;
  private flightDuration = 0.68;
  private flightP0 = new THREE.Vector3();
  private flightC1 = new THREE.Vector3();
  private flightC2 = new THREE.Vector3();
  private flightP3 = new THREE.Vector3();
  private lastRollMs = 0;
  private rollSignToggle = 1;

  // Live pointer follow & icon hover state
  private liveHoverKind: 'none' | 'icon' | 'button' | 'card' = 'none';
  private lastLiveHoverRect: HoverRectInfo | null = null;
  private clickPulse = 0;
  private clickPulseVel = 0;
  private bankRoll = 0;
  private bankPitch = 0;
  private smoothPointerVelX = 0;
  private smoothPointerVelY = 0;
  private lastPointerWorldX = 0;
  private lastPointerWorldY = 0;
  private hasLastPointerWorld = false;

  // Randomized organic wander phases so free-roam movement is never a fixed repeating path
  private roamScrollProgress = 0.22;
  private roamFocusWorld = new THREE.Vector3(-0.6, -1.5, 0);
  private readonly wanderPhaseX = Math.random() * Math.PI * 2;
  private readonly wanderPhaseY = Math.random() * Math.PI * 2;
  private readonly wanderPhaseZ = Math.random() * Math.PI * 2;
  private readonly wanderPhaseSub = Math.random() * Math.PI * 2;
  private roamRollAccum = 0;
  private lastRoamProgress = 0.22;

  // Scale state with critically-damped spring velocity
  private currentScale = 0.84;
  private targetScale = 0.84;
  private velScale = 0;

  // Continuous 360-degree angles (unbounded radians) with smooth spring velocity
  private currentAimAngleZ = NATURAL_POINTER_ANGLE;
  private targetAimAngleZ = NATURAL_POINTER_ANGLE;
  private velAimAngleZ = 0;
  private currentSpin3D = 0;
  private targetSpin3D = 0;

  // Geometry metrics in world units (at scale 1.0)
  private readonly baseTipRadiusWorld = 0.95;
  private readonly baseBoundingRadiusWorld = 1.12;

  private lastTimeMs = performance.now();
  private frameId = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private disposables: Array<{ dispose: () => void }> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 300);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.28;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
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

    // Default initial state: organically floating on screen and aiming at "aryandas"
    this.setScrollArcProgress(0.22);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.lastTimeMs = performance.now();
    this.tick();
  }

  /**
   * Generates a high-contrast studio reflection environment map combining
   * RoomEnvironment with bright overhead softbox strips, diagonal light ribbons,
   * and warm/cool rim panels so every facet and face of the 3D cursor gleams.
   */
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

    // High-intensity studio softbox strips for crisp, mirror-like reflections all over the cursor
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

    // Dynamic orbiting specular lights that glide reflections across the cursor surface
    this.specularGliderLight = new THREE.PointLight(0xffffff, 14, 18, 1.5);
    this.specularGliderLight.position.set(1.8, 2.2, 4.2);
    this.scene.add(this.specularGliderLight);

    this.secondaryGliderLight = new THREE.PointLight(0xf5f9ff, 10, 16, 1.5);
    this.secondaryGliderLight.position.set(-2.2, -1.6, 3.8);
    this.scene.add(this.secondaryGliderLight);

    if (!this.isSoftwareGl) {
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

  /**
   * Computes exact frustum half-extents and strict safe centroid limits at depth `z`
   * so 100% of the 3D cursor geometry (including bevels & 360° roll) stays inside the screen.
   */
  private getSafeBoundsAtZ(
    z: number,
    scale: number
  ): { halfW: number; halfH: number; maxX: number; maxY: number } {
    const dist = Math.max(2.0, this.camera.position.z - z);
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const halfH = Math.tan(vFov / 2) * dist;
    const halfW = halfH * this.camera.aspect;
    const pad = this.baseBoundingRadiusWorld * scale + 0.1;
    return {
      halfW,
      halfH,
      maxX: Math.max(0.15, halfW - pad),
      maxY: Math.max(0.15, halfH - pad),
    };
  }

  /**
   * Converts viewport client coordinates into exact world coordinates on the plane at `z`.
   */
  private screenToWorldAtZ(
    clientX: number,
    clientY: number,
    z: number
  ): { x: number; y: number } {
    const rect = this.container.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const ndcY = -((clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
    const dist = Math.max(2.0, this.camera.position.z - z);
    const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * dist;
    const halfW = halfH * this.camera.aspect;
    return {
      x: ndcX * halfW,
      y: ndcY * halfH,
    };
  }

  /**
   * Computes a smooth, continuous edge-aware pointer angle and centroid for live interactive
   * mouse movement so the sharp tip reaches EVERY icon, navbar button, link, and screen corner
   * effortlessly without ever snapping 180 degrees or getting blocked near viewport borders.
   */
  private solveInteractivePointerPose(
    clientX: number,
    clientY: number,
    hoverRect: HoverRectInfo | null | undefined,
    z: number,
    scale: number
  ): { cx: number; cy: number; angle: number; worldTipX: number; worldTipY: number } {
    const safe = this.getSafeBoundsAtZ(z, scale);
    const pointerWorld = this.screenToWorldAtZ(clientX, clientY, z);

    // Track pointer travel velocity in world space for natural heading steering
    if (this.hasLastPointerWorld) {
      const moveX = pointerWorld.x - this.lastPointerWorldX;
      const moveY = pointerWorld.y - this.lastPointerWorldY;
      this.smoothPointerVelX = this.smoothPointerVelX * 0.72 + moveX * 0.28;
      this.smoothPointerVelY = this.smoothPointerVelY * 0.72 + moveY * 0.28;
    }
    this.lastPointerWorldX = pointerWorld.x;
    this.lastPointerWorldY = pointerWorld.y;
    this.hasLastPointerWorld = true;

    let tipX = pointerWorld.x;
    let tipY = pointerWorld.y;
    let desiredAngle = NATURAL_POINTER_ANGLE;

    if (hoverRect && (hoverRect.kind === 'icon' || hoverRect.kind === 'button')) {
      const centerClientX = hoverRect.left + hoverRect.width * 0.5;
      const centerClientY = hoverRect.top + hoverRect.height * 0.5;
      const centerWorld = this.screenToWorldAtZ(centerClientX, centerClientY, z);
      const edgeWorldRight = this.screenToWorldAtZ(
        hoverRect.left + hoverRect.width,
        centerClientY,
        z
      );
      const edgeWorldTop = this.screenToWorldAtZ(centerClientX, hoverRect.top, z);

      const halfElemW = Math.max(0.06, Math.abs(edgeWorldRight.x - centerWorld.x));
      const halfElemH = Math.max(0.06, Math.abs(edgeWorldTop.y - centerWorld.y));

      // Gently pull the 3D tip toward the icon/button's perimeter edge so pointing feels
      // magnetized, crisp, and effortless without stealing mouse control.
      const toCenterX = centerWorld.x - pointerWorld.x;
      const toCenterY = centerWorld.y - pointerWorld.y;
      const distToCenter = Math.hypot(toCenterX, toCenterY);

      if (hoverRect.kind === 'icon') {
        // Point right at the icon center from a comfortable natural up-left / approach stance
        const pull = 0.26;
        tipX = pointerWorld.x + toCenterX * pull;
        tipY = pointerWorld.y + toCenterY * pull;

        // Softly orient the nose toward the icon center while staying close to natural pointer posture
        const approachAngle =
          distToCenter > 0.04
            ? Math.atan2(toCenterY, toCenterX)
            : NATURAL_POINTER_ANGLE;
        const deltaFromNatural = shortestAngleDelta(NATURAL_POINTER_ANGLE, approachAngle);
        desiredAngle =
          NATURAL_POINTER_ANGLE + THREE.MathUtils.clamp(deltaFromNatural * 0.42, -0.58, 0.58);
      } else {
        // Button / nav link: lightly magnetize vertically toward label midline and aim slightly inward
        tipX = pointerWorld.x + toCenterX * 0.1;
        tipY = pointerWorld.y + THREE.MathUtils.clamp(toCenterY * 0.28, -halfElemH * 0.35, halfElemH * 0.35);

        const biasAngle =
          distToCenter > 0.06
            ? Math.atan2(toCenterY, toCenterX)
            : NATURAL_POINTER_ANGLE;
        const deltaFromNatural = shortestAngleDelta(NATURAL_POINTER_ANGLE, biasAngle);
        desiredAngle =
          NATURAL_POINTER_ANGLE +
          THREE.MathUtils.clamp(deltaFromNatural * 0.28, -0.42, 0.42) +
          THREE.MathUtils.clamp((halfElemW > 0.5 ? 0 : 0.05), -0.1, 0.1);
      }
    } else {
      // Free-roaming or card glide: subtle aerodynamic heading lean along cursor sweep direction
      const speed = Math.hypot(this.smoothPointerVelX, this.smoothPointerVelY);
      const steerWeight = THREE.MathUtils.clamp(speed * 1.4, 0, 0.32);
      if (speed > 0.008) {
        const travelAngle = Math.atan2(this.smoothPointerVelY, this.smoothPointerVelX);
        const deltaFromNatural = shortestAngleDelta(NATURAL_POINTER_ANGLE, travelAngle);
        desiredAngle =
          NATURAL_POINTER_ANGLE +
          THREE.MathUtils.clamp(deltaFromNatural, -0.85, 0.85) * steerWeight;
      }
    }

    // Continuous viewport edge awareness: gently pivot the trailing body inward near screen edges
    // so the tip reaches 100% of navbar tabs, bottom links, and corners with ZERO abrupt flips!
    const tipDist = (this.baseTipRadiusWorld + 0.04) * scale;
    let vx = Math.cos(desiredAngle);
    let vy = Math.sin(desiredAngle);

    const marginX = tipDist * 1.15;
    const marginY = tipDist * 1.15;
    const nearLeft = THREE.MathUtils.clamp(((-safe.halfW + marginX) - tipX) / marginX, 0, 1);
    const nearRight = THREE.MathUtils.clamp((tipX - (safe.halfW - marginX)) / marginX, 0, 1);
    const nearBottom = THREE.MathUtils.clamp(((-safe.halfH + marginY) - tipY) / marginY, 0, 1);
    const nearTop = THREE.MathUtils.clamp((tipY - (safe.halfH - marginY)) / marginY, 0, 1);

    // Push tip vector outward toward the wall (meaning the trailing body swings smoothly inward!)
    vx += (nearRight - nearLeft) * 1.65;
    vy += (nearTop - nearBottom) * 1.65;

    const finalAngle = Math.hypot(vx, vy) > 0.05 ? Math.atan2(vy, vx) : desiredAngle;
    const cx = tipX - Math.cos(finalAngle) * tipDist;
    const cy = tipY - Math.sin(finalAngle) * tipDist;

    return {
      cx: THREE.MathUtils.clamp(cx, -safe.halfW + 0.12, safe.halfW - 0.12),
      cy: THREE.MathUtils.clamp(cy, -safe.halfH + 0.12, safe.halfH - 0.12),
      angle: finalAngle,
      worldTipX: tipX,
      worldTipY: tipY,
    };
  }

  /**
   * Solves a frustum-safe cursor centroid and aiming angle so the marked sharp tip (+X)
   * points cleanly at the target without ANY part of the 3D cursor ever clipping off-screen.
   */
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
    const tipDist = (this.baseTipRadiusWorld + 0.06) * scale;

    const tryCx = primary.x - Math.cos(preferredAngleRad) * tipDist;
    const tryCy = primary.y - Math.sin(preferredAngleRad) * tipDist;

    const fitsPrimary =
      Math.abs(tryCx) <= safe.maxX && Math.abs(tryCy) <= safe.maxY;
    if (fitsPrimary) {
      return { cx: tryCx, cy: tryCy, angle: preferredAngleRad };
    }

    // If the preferred side would push the cursor off-screen and a fallback edge was given
    // (e.g., right side of a left-aligned headline on a narrow viewport), approach from there.
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

    // Strict fallback: clamp centroid inside the viewport and aim the marked tip directly at the target
    const clampedX = THREE.MathUtils.clamp(tryCx, -safe.maxX, safe.maxX);
    const clampedY = THREE.MathUtils.clamp(tryCy, -safe.maxY, safe.maxY);
    const dx = primary.x - clampedX;
    const dy = primary.y - clampedY;
    const dist = Math.hypot(dx, dy);
    const resolvedAngle = dist > 0.06 ? Math.atan2(dy, dx) : preferredAngleRad;

    return { cx: clampedX, cy: clampedY, angle: resolvedAngle };
  }

  /**
   * Launches a smooth, non-fixed organic Cubic Bezier flight arc inside the visible screen
   * paired with a graceful 360-degree barrel roll so every transition feels alive yet poised.
   */
  private launchOrganicFlight(
    destX: number,
    destY: number,
    destZ: number,
    scale: number,
    allowFullRoll: boolean,
    forceSwoop = false
  ): void {
    const dx = destX - this.currentPos.x;
    const dy = destY - this.currentPos.y;
    const dist = Math.hypot(dx, dy);

    if (!forceSwoop && dist < 0.34) {
      this.flightP3.set(destX, destY, destZ);
      this.targetSpin3D =
        Math.round(this.currentSpin3D / (Math.PI * 2)) * (Math.PI * 2);
      return;
    }

    const safe = this.getSafeBoundsAtZ(destZ + 0.45, scale);

    this.flightP0.copy(this.currentPos);
    this.flightP3.set(destX, destY, destZ);

    // Build a perpendicular vector and bias the organic curve inward toward open screen space
    const safeDist = Math.max(dist, 0.001);
    const ux = dx / safeDist;
    const uy = dy / safeDist;
    const px = -uy;
    const py = ux;

    const midX = (this.flightP0.x + destX) * 0.5;
    const midY = (this.flightP0.y + destY) * 0.5;

    // Choose curve bow side biased toward viewport center (0,0) with organic variation
    const dotCenter = px * -midX + py * -midY;
    let arcSign = dotCenter >= 0 ? 1 : -1;
    if (Math.abs(dotCenter) < 0.45 && Math.random() < 0.5) {
      arcSign *= -1;
    }

    const arcAmp = THREE.MathUtils.clamp(
      dist * (0.24 + Math.random() * 0.24),
      0.32,
      1.55
    );
    // Subtle organic asymmetry between first and second control handles (gentle C or shallow S curve)
    const c1Scale = 0.72 + Math.random() * 0.46;
    const c2Scale = (Math.random() < 0.26 ? -0.35 : 0.62) + Math.random() * 0.45;
    const zLift1 = destZ + 0.32 + Math.random() * 0.42;
    const zLift2 = destZ + 0.24 + Math.random() * 0.38;

    const c1x = this.flightP0.x + dx * 0.33 + px * arcSign * arcAmp * c1Scale;
    const c1y = this.flightP0.y + dy * 0.33 + py * arcSign * arcAmp * c1Scale;
    const c2x = this.flightP0.x + dx * 0.7 + px * arcSign * arcAmp * c2Scale;
    const c2y = this.flightP0.y + dy * 0.7 + py * arcSign * arcAmp * c2Scale;

    this.flightC1.set(
      THREE.MathUtils.clamp(c1x, -safe.maxX * 0.92, safe.maxX * 0.92),
      THREE.MathUtils.clamp(c1y, -safe.maxY * 0.9, safe.maxY * 0.9),
      zLift1
    );
    this.flightC2.set(
      THREE.MathUtils.clamp(c2x, -safe.maxX * 0.92, safe.maxX * 0.92),
      THREE.MathUtils.clamp(c2y, -safe.maxY * 0.9, safe.maxY * 0.9),
      zLift2
    );

    this.flightElapsed = 0;
    this.flightDuration = THREE.MathUtils.clamp(
      0.56 + dist * 0.085,
      0.58,
      1.04
    );
    this.flightActive = true;

    // Execute a silky, gleaming 360-degree barrel roll on major swoops (never rapid/erratic)
    const nowMs = performance.now();
    const canRoll =
      allowFullRoll &&
      (forceSwoop || dist > 0.85) &&
      nowMs - this.lastRollMs > 780;

    if (canRoll) {
      this.lastRollMs = nowMs;
      const rollDir = Math.abs(dx) > 0.25 ? (dx >= 0 ? 1 : -1) : this.rollSignToggle;
      this.rollSignToggle *= -1;
      const nearestUpright =
        Math.round(this.currentSpin3D / (Math.PI * 2)) * (Math.PI * 2);
      this.targetSpin3D = nearestUpright + rollDir * Math.PI * 2;
    } else {
      // Keep upright when stepping quickly between adjacent items
      this.targetSpin3D =
        Math.round(this.targetSpin3D / (Math.PI * 2)) * (Math.PI * 2);
    }
  }

  private buildPointer3DMesh(): void {
    this.scene.add(this.cursorRoot);
    this.cursorRoot.add(this.cursorAimGroup);
    this.cursorAimGroup.add(this.cursorSpinGroup);

    const tipAlignAngle = -Math.atan2(0.85, -0.42);

    // 1. Mirror-Polished Obsidian-Chrome Outer Casing (#101012)
    const outerShape = createRoundedPointerShape(1.0);
    const outerGeo = new THREE.ExtrudeGeometry(outerShape, {
      steps: 1,
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.068,
      bevelSize: 0.088,
      bevelSegments: 10,
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

    // 2. Brilliant Silver-Chrome Chamfer Bezel Layer for Razor-Sharp Specular Rim Highlights
    const chromeRimShape = createRoundedPointerShape(1.0);
    const chromeRimGeo = new THREE.ExtrudeGeometry(chromeRimShape, {
      steps: 1,
      depth: 0.285,
      bevelEnabled: true,
      bevelThickness: 0.042,
      bevelSize: 0.032,
      bevelSegments: 8,
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

    // 3. Brilliant Mirror-Lacquered White Ceramic-Crystal Inner Face (#FFFFFF)
    const innerShape = createRoundedPointerShape(1.0);
    const innerGeo = new THREE.ExtrudeGeometry(innerShape, {
      steps: 1,
      depth: 0.315,
      bevelEnabled: true,
      bevelThickness: 0.034,
      bevelSize: 0.012,
      bevelSegments: 8,
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

    // 4. Anodized Ruby-Chrome Side Trim Plate (#FF261B)
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
   * Live interactive pointer follow mode:
   * Glides ultra-smoothly wherever the user moves around the page, effortlessly magnetizes
   * and shrinks slightly when hovering icons/buttons so nothing is obscured, and continuously
   * adapts near viewport borders so the tip reaches every corner and nav item with zero snaps.
   */
  public followPointer(target: LivePointerTarget): void {
    const hoverKind = target.hoverRect?.kind ?? 'none';
    const scale =
      hoverKind === 'icon'
        ? 0.36
        : hoverKind === 'button'
          ? 0.41
          : hoverKind === 'card'
            ? 0.45
            : 0.48;
    const z = hoverKind === 'icon' ? 0.34 : hoverKind === 'button' ? 0.3 : 0.24;

    if (this.mode !== 'follow') {
      this.mode = 'follow';
      this.flightActive = false;
      this.activeTargetKey = '';
      // Settle smoothly upright when handing control to live pointer steering
      this.targetSpin3D =
        Math.round(this.currentSpin3D / (Math.PI * 2)) * (Math.PI * 2);
    }

    this.liveHoverKind = hoverKind;
    this.lastLiveHoverRect = target.hoverRect ?? null;
    this.targetScale = scale;

    const solved = this.solveInteractivePointerPose(
      target.clientX,
      target.clientY,
      target.hoverRect,
      z,
      scale
    );

    this.targetPos.set(solved.cx, solved.cy, z);
    this.targetAimAngleZ += shortestAngleDelta(
      this.targetAimAngleZ,
      solved.angle
    );
  }

  /**
   * Snappy tactile micro-press on click while actively pointing at an icon or link.
   * Gives immediate physical feedback (gentle tip-tap + specular shimmer) without
   * hijacking cursor control or interrupting rapid icon navigation.
   */
  public pulseClick(clientX: number, clientY: number): void {
    this.clickPulse = 1.0;
    this.clickPulseVel = 2.8;

    if (this.mode === 'follow') {
      const z = this.targetPos.z;
      const solved = this.solveInteractivePointerPose(
        clientX,
        clientY,
        this.lastLiveHoverRect,
        z,
        this.targetScale
      );
      this.targetPos.set(solved.cx, solved.cy, z);
      this.targetAimAngleZ += shortestAngleDelta(
        this.targetAimAngleZ,
        solved.angle
      );
      return;
    }

    this.pointAndMoveToClick(clientX, clientY);
  }

  /**
   * Smoothly releases live pointer follow mode (e.g. when scrolling or leaving viewport)
   * while preserving momentum so choreographed tracking resumes without any jump.
   */
  public resumeAutoMode(): void {
    if (this.mode === 'follow') {
      this.mode = 'track';
      this.liveHoverKind = 'none';
      this.lastLiveHoverRect = null;
      this.hasLastPointerWorld = false;
      this.smoothPointerVelX = 0;
      this.smoothPointerVelY = 0;
      this.activeTargetKey = '';
    }
  }

  /**
   * Organic free-roaming 360° gliding mode for the initial hero screen.
   * Gently explores open screen space without a rigid fixed path while staying
   * 100% inside the viewport and smoothly aiming its marked tip at the hero wordmark.
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
      this.liveHoverKind = 'none';
      this.activeTargetKey = '';
      this.flightActive = false;
    }

    this.targetScale = 0.84;

    // Accumulate smooth 360-degree barrel roll as the user scrolls on the hero stage
    this.roamRollAccum += scrollDelta * Math.PI * 2.2;

    if (focusClientX !== undefined && focusClientY !== undefined) {
      const worldFocus = this.screenToWorldAtZ(focusClientX, focusClientY, 0.15);
      this.roamFocusWorld.set(worldFocus.x, worldFocus.y, 0.15);
    } else {
      const safe = this.getSafeBoundsAtZ(0.15, this.targetScale);
      this.roamFocusWorld.set(-safe.halfW * 0.24, -safe.halfH * 0.52, 0.15);
    }
  }

  /**
   * Dynamically tracks and points the 3D cursor's marked right-hand apex tip (+X)
   * at a section headline or element at `(clientX, clientY)`.
   * - Same `targetKey`: smoothly follows the live scroll position every frame.
   * - New `targetKey`: launches an organic non-fixed Bezier swoop + graceful 360° barrel roll.
   * - Always strictly clamped inside the visible viewport so it never clips off-screen.
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
    const scale = opts.scale ?? 0.64;
    const z = 0.22;

    this.mode = 'track';
    this.liveHoverKind = 'none';
    this.targetScale = scale;

    const solved = this.solveSafeCentroidAndAngle(
      clientX,
      clientY,
      preferredAngleRad,
      z,
      scale,
      opts.fallbackClientX,
      opts.fallbackClientY
    );

    this.targetPos.set(solved.cx, solved.cy, z);
    this.targetAimAngleZ += shortestAngleDelta(
      this.targetAimAngleZ,
      solved.angle
    );

    const nextKey = opts.targetKey ?? `${Math.round(clientX / 40)}:${Math.round(clientY / 40)}`;
    const isNewTarget = nextKey !== this.activeTargetKey;

    if (isNewTarget) {
      this.activeTargetKey = nextKey;
      this.launchOrganicFlight(
        solved.cx,
        solved.cy,
        z,
        scale,
        opts.allowFullRoll ?? true,
        opts.forceSwoop ?? false
      );
    } else if (this.flightActive) {
      // Continuously update the flight destination so if the user keeps scrolling mid-swoop,
      // the cursor lands directly on the moving headline without drift!
      this.flightP3.set(solved.cx, solved.cy, z);
    }
  }

  /**
   * Called whenever the user clicks anywhere on the screen.
   * If already tracking the pointer right near the click, fires a snappy tactile press pulse.
   * On long jumps (touch tap or click from afar), swoops smoothly with a gleaming roll.
   */
  public pointAndMoveToClick(clientX: number, clientY: number): void {
    const z = 0.26;
    const worldClick = this.screenToWorldAtZ(clientX, clientY, z);
    const tipNowX =
      this.currentPos.x +
      Math.cos(this.currentAimAngleZ) * this.baseTipRadiusWorld * this.currentScale;
    const tipNowY =
      this.currentPos.y +
      Math.sin(this.currentAimAngleZ) * this.baseTipRadiusWorld * this.currentScale;
    const tipDistToClick = Math.hypot(worldClick.x - tipNowX, worldClick.y - tipNowY);

    // If the cursor is already right at the user's pointer, do a crisp tactile pulse
    // instead of a disruptive slow detour!
    if (this.mode === 'follow' && tipDistToClick < 1.35) {
      this.pulseClick(clientX, clientY);
      return;
    }

    const scale = 0.54;
    this.mode = 'track';
    this.liveHoverKind = 'none';
    this.targetScale = scale;
    this.clickPulse = 0.9;
    this.clickPulseVel = 2.2;

    const dx = worldClick.x - this.currentPos.x;
    const dy = worldClick.y - this.currentPos.y;
    const dist = Math.hypot(dx, dy);
    const preferredAngle = dist > 0.12 ? Math.atan2(dy, dx) : NATURAL_POINTER_ANGLE;

    const solved = this.solveSafeCentroidAndAngle(
      clientX,
      clientY,
      preferredAngle,
      z,
      scale
    );

    this.targetPos.set(solved.cx, solved.cy, z);
    this.targetAimAngleZ += shortestAngleDelta(
      this.targetAimAngleZ,
      solved.angle
    );

    this.activeTargetKey = `click-${performance.now()}`;
    const shouldRoll = dist > 1.85;
    if (shouldRoll) {
      this.lastRollMs = 0;
    }
    this.launchOrganicFlight(solved.cx, solved.cy, z, scale, shouldRoll, dist > 0.8);
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 300);
    const height = Math.max(this.container.clientHeight, 300);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
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
      if (this.disposed) {
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

  private tick = (): void => {
    if (this.disposed) return;

    const nowMs = performance.now();
    const delta = Math.min(Math.max((nowMs - this.lastTimeMs) / 1000, 0.0005), 0.033);
    this.lastTimeMs = nowMs;
    const t = nowMs / 1000;

    // Critically-damped spring for click press pulse (snappy press + silky rebound)
    const [nextPulse, nextPulseVel] = dampSpringScalar(
      this.clickPulse,
      this.clickPulseVel,
      0,
      20,
      delta
    );
    this.clickPulse = nextPulse;
    this.clickPulseVel = nextPulseVel;

    // Critically-damped spring for scale (smooth zoom down over icons, crisp tap dip on click)
    const scaleOmega = this.mode === 'follow' ? 16.5 : 10.5;
    const [nextScale, nextScaleVel] = dampSpringScalar(
      this.currentScale,
      this.velScale,
      this.targetScale,
      scaleOmega,
      delta
    );
    this.currentScale = nextScale;
    this.velScale = nextScaleVel;
    const renderScale = this.currentScale * (1 - this.clickPulse * 0.11);

    let desiredAimZ = this.targetAimAngleZ;
    let ambientFloatX = Math.cos(t * 1.25) * 0.015;
    let ambientFloatY = Math.sin(t * 1.48) * 0.015;
    let extraBankPitch = 0;
    let extraBankRoll = 0;

    if (this.mode === 'follow') {
      // Ultra-smooth critically-damped spring following the user's pointer & hovered icons
      // High natural frequency (omega ~22) gives immediate effortless tracking with velvety deceleration
      const followOmega =
        this.liveHoverKind === 'icon'
          ? 24.5
          : this.liveHoverKind === 'button'
            ? 23.0
            : 21.0;

      const [nx, vx] = dampSpringScalar(
        this.currentPos.x,
        this.velPos.x,
        this.targetPos.x,
        followOmega,
        delta
      );
      const [ny, vy] = dampSpringScalar(
        this.currentPos.y,
        this.velPos.y,
        this.targetPos.y,
        followOmega,
        delta
      );
      const [nz, vz] = dampSpringScalar(
        this.currentPos.z,
        this.velPos.z,
        this.targetPos.z,
        16.0,
        delta
      );

      this.currentPos.set(nx, ny, nz);
      this.velPos.set(vx, vy, vz);

      // Gentle aerodynamic 3D bank & pitch driven by live travel velocity so chrome highlights glide
      const targetBankRoll = THREE.MathUtils.clamp(-vy * 0.055, -0.34, 0.34);
      const targetBankPitch = THREE.MathUtils.clamp(vx * 0.06, -0.36, 0.36);
      this.bankRoll = THREE.MathUtils.damp(this.bankRoll, targetBankRoll, 13, delta);
      this.bankPitch = THREE.MathUtils.damp(this.bankPitch, targetBankPitch, 13, delta);
      extraBankRoll = this.bankRoll + this.clickPulse * 0.14;
      extraBankPitch = this.bankPitch + this.clickPulse * 0.22;

      // Stay rock-steady over icons/buttons; whisper-soft float in open space
      const floatScale =
        this.liveHoverKind === 'icon' || this.liveHoverKind === 'button' ? 0.18 : 0.45;
      ambientFloatX *= floatScale;
      ambientFloatY *= floatScale;

      // Subtle forward tip-tap on click
      if (this.clickPulse > 0.005) {
        const tapOffset = this.clickPulse * 0.055 * renderScale;
        ambientFloatX += Math.cos(this.currentAimAngleZ) * tapOffset;
        ambientFloatY += Math.sin(this.currentAimAngleZ) * tapOffset;
      }

      // Gently decay pointer velocity accumulator when pointer pauses
      const pDecay = Math.exp(-9.0 * delta);
      this.smoothPointerVelX *= pDecay;
      this.smoothPointerVelY *= pDecay;
    } else if (this.mode === 'roam') {
      // Smooth, non-fixed organic multi-harmonic wandering across the open upper/mid viewport
      const safe = this.getSafeBoundsAtZ(0.25, renderScale);
      const scrollWave = (this.roamScrollProgress - 0.5) * 2;

      const roamX =
        Math.sin(t * 0.37 + this.wanderPhaseX) * safe.maxX * 0.58 +
        Math.cos(t * 0.21 + this.wanderPhaseSub) * safe.maxX * 0.22 +
        scrollWave * safe.maxX * 0.28;

      const roamY =
        Math.sin(t * 0.29 + this.wanderPhaseY) * safe.maxY * 0.42 +
        Math.cos(t * 0.43 + this.wanderPhaseSub) * safe.maxY * 0.16 +
        safe.maxY * 0.16;

      const roamZ = 0.2 + Math.sin(t * 0.41 + this.wanderPhaseZ) * 0.35;

      this.targetPos.set(
        THREE.MathUtils.clamp(roamX, -safe.maxX * 0.88, safe.maxX * 0.88),
        THREE.MathUtils.clamp(roamY, -safe.maxY * 0.78, safe.maxY * 0.84),
        roamZ
      );

      const [nx, vx] = dampSpringScalar(this.currentPos.x, this.velPos.x, this.targetPos.x, 5.2, delta);
      const [ny, vy] = dampSpringScalar(this.currentPos.y, this.velPos.y, this.targetPos.y, 5.2, delta);
      const [nz, vz] = dampSpringScalar(this.currentPos.z, this.velPos.z, this.targetPos.z, 5.5, delta);
      this.currentPos.set(nx, ny, nz);
      this.velPos.set(vx, vy, vz);

      // Aim smoothly toward the hero wordmark while gracefully rolling 360° through space
      const aimToHero = Math.atan2(
        this.roamFocusWorld.y - this.currentPos.y,
        this.roamFocusWorld.x - this.currentPos.x
      );
      this.targetAimAngleZ += shortestAngleDelta(this.targetAimAngleZ, aimToHero);
      desiredAimZ = this.targetAimAngleZ;

      // Gentle continuous 360° roll during hero roaming (slow & poised, never frantic)
      this.targetSpin3D = t * 0.52 + this.roamRollAccum;
      ambientFloatX = 0;
      ambientFloatY = 0;
    } else if (this.flightActive) {
      // Advance organic Bezier flight curve with brisk silk easing + critically-damped spring follow
      this.flightElapsed += delta;
      const rawU = Math.min(1, this.flightElapsed / Math.max(this.flightDuration, 0.24));
      const easedU = easeSilkFlight(rawU);

      evalCubicBezier(
        this.flightP0,
        this.flightC1,
        this.flightC2,
        this.flightP3,
        easedU,
        _flightPos
      );
      evalCubicBezierTangent(
        this.flightP0,
        this.flightC1,
        this.flightC2,
        this.flightP3,
        easedU,
        _flightTan
      );

      const [nx, vx] = dampSpringScalar(this.currentPos.x, this.velPos.x, _flightPos.x, 22.0, delta);
      const [ny, vy] = dampSpringScalar(this.currentPos.y, this.velPos.y, _flightPos.y, 22.0, delta);
      const [nz, vz] = dampSpringScalar(this.currentPos.z, this.velPos.z, _flightPos.z, 17.0, delta);
      this.currentPos.set(nx, ny, nz);
      this.velPos.set(vx, vy, vz);

      // Mid-flight, subtly lean/bank along the flight tangent, then smoothly lock onto the target angle
      const tanSpeed = Math.hypot(_flightTan.x, _flightTan.y);
      if (tanSpeed > 0.25) {
        const flightAngle = Math.atan2(_flightTan.y, _flightTan.x);
        const bankBlend = Math.sin(rawU * Math.PI) * (1 - rawU) * 0.36;
        desiredAimZ =
          this.targetAimAngleZ +
          shortestAngleDelta(this.targetAimAngleZ, flightAngle) * bankBlend;
        extraBankPitch = Math.sin(rawU * Math.PI) * 0.16;
      }

      ambientFloatX *= rawU;
      ambientFloatY *= rawU;

      if (rawU >= 1) {
        this.flightActive = false;
      }
    } else {
      // Silky critically-damped real-time scroll tracking while locked onto the active headline
      const [nx, vx] = dampSpringScalar(this.currentPos.x, this.velPos.x, this.targetPos.x, 15.5, delta);
      const [ny, vy] = dampSpringScalar(this.currentPos.y, this.velPos.y, this.targetPos.y, 15.5, delta);
      const [nz, vz] = dampSpringScalar(this.currentPos.z, this.velPos.z, this.targetPos.z, 13.0, delta);
      this.currentPos.set(nx, ny, nz);
      this.velPos.set(vx, vy, vz);
    }

    // Soft viewport safety bounds: tighter in roam/track, full-reach in live follow mode so
    // the sharp tip can effortlessly reach icons, navbar links, and corner buttons!
    const renderSafe = this.getSafeBoundsAtZ(this.currentPos.z, renderScale);
    const clampLimitX = this.mode === 'follow' ? renderSafe.halfW - 0.1 : renderSafe.maxX;
    const clampLimitY = this.mode === 'follow' ? renderSafe.halfH - 0.1 : renderSafe.maxY;

    const finalX = THREE.MathUtils.clamp(
      this.currentPos.x + ambientFloatX,
      -clampLimitX,
      clampLimitX
    );
    const finalY = THREE.MathUtils.clamp(
      this.currentPos.y + ambientFloatY,
      -clampLimitY,
      clampLimitY
    );

    this.cursorRoot.position.set(finalX, finalY, this.currentPos.z);
    this.cursorRoot.scale.setScalar(renderScale);

    // Glide the specular lights across the cursor so reflections shimmer brilliantly across all faces
    if (this.specularGliderLight) {
      this.specularGliderLight.position.set(
        finalX + Math.cos(t * 1.8) * 2.1,
        finalY + Math.sin(t * 1.4) * 1.9 + 0.8,
        this.currentPos.z + 3.2
      );
    }
    if (this.secondaryGliderLight) {
      this.secondaryGliderLight.position.set(
        finalX - Math.sin(t * 1.5) * 2.4,
        finalY - Math.cos(t * 1.2) * 1.8 - 0.5,
        this.currentPos.z + 2.8
      );
    }

    // Critically-damped 360-degree in-plane aiming rotation (zero overshoot, silky sweep)
    const aimDelta = shortestAngleDelta(this.currentAimAngleZ, desiredAimZ);
    const unwrappedTargetAim = this.currentAimAngleZ + aimDelta;
    const aimOmega = this.mode === 'follow' ? 18.5 : 13.5;
    const [nextAim, nextAimVel] = dampSpringScalar(
      this.currentAimAngleZ,
      this.velAimAngleZ,
      unwrappedTargetAim,
      aimOmega,
      delta
    );
    this.currentAimAngleZ = nextAim;
    this.velAimAngleZ = nextAimVel;
    this.cursorAimGroup.rotation.z = this.currentAimAngleZ;

    // Smoothly damp 360-degree 3D barrel roll around the pointing axis (+X)
    const spinLambda = this.mode === 'follow' ? 9.5 : this.mode === 'roam' ? 4.2 : 6.8;
    this.currentSpin3D = THREE.MathUtils.damp(
      this.currentSpin3D,
      this.targetSpin3D,
      spinLambda,
      delta
    );

    const idleRockScale = this.mode === 'follow' ? 0.48 : 1.0;
    const subtleRockX =
      this.currentSpin3D + Math.sin(t * 1.25) * 0.11 * idleRockScale + extraBankRoll;
    const subtlePitchY =
      Math.cos(t * 1.0) * 0.085 * idleRockScale + extraBankPitch;
    _euler.set(subtleRockX, subtlePitchY, 0, 'XYZ');
    _quatTarget.setFromEuler(_euler);
    this.cursorSpinGroup.quaternion.slerp(_quatTarget, 1 - Math.exp(-15.0 * delta));

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
