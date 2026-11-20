import * as THREE from 'three';

let cachedIsSoftwareGl: boolean | null = null;

export interface DeviceGpuTier {
  isSoftwareGl: boolean;
  isCoarsePointer: boolean;
  isLowEndMobile: boolean;
  recommendedParticleScale: number;
  recommendedMaxDpr: number;
}

let cachedGpuTier: DeviceGpuTier | null = null;

/**
 * Detect CPU-backed software WebGL (SwiftShader, llvmpipe, softpipe, Basic Render)
 * once per session so every GPU dust system adapts DPR, antialias, and pacing cleanly.
 */
export function detectSoftwareWebGL(): boolean {
  if (cachedIsSoftwareGl !== null) return cachedIsSoftwareGl;
  if (typeof document === 'undefined') {
    cachedIsSoftwareGl = false;
    return false;
  }
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) {
      cachedIsSoftwareGl = true;
      return true;
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    cachedIsSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedIsSoftwareGl;
  } catch {
    cachedIsSoftwareGl = true;
    return true;
  }
}

/**
 * Inspect GPU hardware tier & coarse touch viewport once per session to keep
 * mobile tile-based GPUs (Adreno/Mali/Apple TBDR) comfortably within a 16.6ms 60fps budget.
 */
export function detectDeviceGpuTier(): DeviceGpuTier {
  if (cachedGpuTier !== null) return cachedGpuTier;
  const isSoftwareGl = detectSoftwareWebGL();
  if (typeof window === 'undefined') {
    cachedGpuTier = {
      isSoftwareGl,
      isCoarsePointer: false,
      isLowEndMobile: false,
      recommendedParticleScale: 1,
      recommendedMaxDpr: 2,
    };
    return cachedGpuTier;
  }

  const isCoarsePointer =
    window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
  const cores = navigator.hardwareConcurrency || 4;
  const deviceMemory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;
  const minViewport = Math.min(window.innerWidth || 768, window.innerHeight || 768);

  const isLowEndMobile =
    !isSoftwareGl &&
    isCoarsePointer &&
    (cores <= 4 || deviceMemory <= 4 || minViewport <= 430);

  cachedGpuTier = {
    isSoftwareGl,
    isCoarsePointer,
    isLowEndMobile,
    recommendedParticleScale: isLowEndMobile ? 0.68 : isCoarsePointer ? 0.84 : 1,
    recommendedMaxDpr: isSoftwareGl ? 1 : isLowEndMobile ? 1.25 : isCoarsePointer ? 1.5 : 2,
  };
  return cachedGpuTier;
}

/**
 * Shared pre-baked compact 128x64 binary glyph atlas texture ('0' left UV [0..0.5], '1' right UV [0.5..1]).
 * Tighter cell fill & 4x smaller texture cache footprint (32 KB) improves mobile L1 texture hit rate
 * and cuts transparent pixel overdraw inside alpha-blended InstancedMesh particle passes.
 */
export function createBinaryGlyphAtlasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 64);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 48px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('0', 32, 33.5);
    ctx.fillText('1', 96, 33.5);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export interface InstancedBinaryDustBatchOptions {
  maxInstances: number;
  /** True for 3D world-space camera-billboarded binary dust; false for 2D orthographic screen-space dust */
  billboard3d?: boolean;
  /** Flip UVs vertically when rendering under a top-down Y+ orthographic projection */
  topDownOrtho?: boolean;
  /** Depth testing (false for HUD overlays, true for 3D volumetric particles) */
  depthTest?: boolean;
}

/**
 * Zero-allocation, bandwidth-optimized GPU InstancedMesh batch for rendering hundreds to
 * thousands of binary '0' & '1' dust particles in a single draw call at 60fps on mobile GPUs.
 *
 * Optimizations vs naive InstancedMesh:
 * 1. Bypasses 64-byte mat4 instanceMatrix per-frame writes & uploads in favor of compact vec4
 *    pose + colorAlpha buffers (62% less CPU->GPU bandwidth on 2D particles).
 * 2. Uploads ONLY [0 .. activeCount * 4] via BufferAttribute.addUpdateRange so preallocated
 *    capacity never streams idle bytes across mobile unified memory.
 * 3. Moves UV atlas selection, top-down flip, twinkle, HDR boost, and uOpacity math into the
 *    vertex shader; fragment shader executes a single mediump texture fetch + multiply.
 */
export class InstancedBinaryDustBatch {
  public readonly mesh: THREE.InstancedMesh;
  public readonly material: THREE.ShaderMaterial;
  public readonly geometry: THREE.PlaneGeometry;
  public readonly atlasTexture: THREE.CanvasTexture;
  public readonly maxInstances: number;

  private readonly poseAttr: THREE.InstancedBufferAttribute;
  private readonly colorAlphaAttr: THREE.InstancedBufferAttribute;
  private readonly metaAttr: THREE.InstancedBufferAttribute | null;

  private readonly poseArray: Float32Array;
  private readonly colorAlphaArray: Float32Array;
  private readonly metaArray: Float32Array | null;

  private readonly billboard3d: boolean;
  private activeCount = 0;

  constructor(options: InstancedBinaryDustBatchOptions) {
    this.maxInstances = Math.max(1, options.maxInstances);
    this.billboard3d = Boolean(options.billboard3d);

    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.atlasTexture = createBinaryGlyphAtlasTexture();

    // Compact packed attributes:
    //   2D: aPose(x, y, signedSize, rotRad) + aColorAlpha(r, g, b, alpha) = 32B/instance
    //   3D: aPose(x, y, z, worldScale) + aColorAlpha(r, g, b, alpha) + aMeta(phase, swirl, glyph, 0) = 48B/instance
    this.poseArray = new Float32Array(this.maxInstances * 4);
    this.colorAlphaArray = new Float32Array(this.maxInstances * 4);

    this.poseAttr = new THREE.InstancedBufferAttribute(this.poseArray, 4);
    this.poseAttr.setUsage(THREE.DynamicDrawUsage);

    this.colorAlphaAttr = new THREE.InstancedBufferAttribute(this.colorAlphaArray, 4);
    this.colorAlphaAttr.setUsage(THREE.DynamicDrawUsage);

    this.geometry.setAttribute('aPose', this.poseAttr);
    this.geometry.setAttribute('aColorAlpha', this.colorAlphaAttr);

    if (this.billboard3d) {
      this.metaArray = new Float32Array(this.maxInstances * 4);
      this.metaAttr = new THREE.InstancedBufferAttribute(this.metaArray, 4);
      this.metaAttr.setUsage(THREE.DynamicDrawUsage);
      this.geometry.setAttribute('aMeta', this.metaAttr);
    } else {
      this.metaArray = null;
      this.metaAttr = null;
    }

    const vertexShader = this.billboard3d
      ? /* glsl */ `
        attribute vec4 aPose;
        attribute vec4 aColorAlpha;
        attribute vec4 aMeta;

        uniform float uTime;
        uniform float uOpacity;

        varying vec2 vAtlasUv;
        varying vec4 vColorAlpha;

        void main() {
          float phase = aMeta.x;
          float swirl = aMeta.y;
          float glyphOffset = step(0.5, aMeta.z) * 0.5;
          vAtlasUv = vec2(uv.x * 0.5 + glyphOffset, uv.y);

          float twinkle = 0.55 + 0.45 * sin(uTime * (1.9 + swirl * 1.2) + phase);
          vec3 col = aColorAlpha.rgb * (0.94 + 0.26 * twinkle + swirl * 0.42);
          float alpha = aColorAlpha.a * uOpacity * min(0.95, 0.34 + 0.38 * twinkle + swirl * 0.24);
          vColorAlpha = vec4(col, alpha);

          // Camera-facing spherical billboard computed directly in view space without a 4x4 matrix
          vec4 mvCenter = modelViewMatrix * vec4(aPose.xyz, 1.0);
          float pulseSize = aPose.w * (1.0 + swirl * 0.24);
          mvCenter.xy += position.xy * pulseSize;
          gl_Position = projectionMatrix * mvCenter;
        }
      `
      : /* glsl */ `
        attribute vec4 aPose;
        attribute vec4 aColorAlpha;

        uniform float uTopDown;
        uniform float uOpacity;

        varying vec2 vAtlasUv;
        varying vec4 vColorAlpha;

        void main() {
          // Branchless glyph select packed into sign of aPose.z (>0 => '1', <0 => '0')
          float glyphOffset = step(0.0, aPose.z) * 0.5;
          float size = abs(aPose.z);
          vAtlasUv = vec2(uv.x * 0.5 + glyphOffset, mix(uv.y, 1.0 - uv.y, uTopDown));
          vColorAlpha = vec4(aColorAlpha.rgb, aColorAlpha.a * uOpacity);

          float s = sin(aPose.w);
          float c = cos(aPose.w);
          vec2 worldXY = aPose.xy + vec2(position.x * c - position.y * s, position.x * s + position.y * c) * size;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(worldXY, 0.0, 1.0);
        }
      `;

    const fragmentShader = /* glsl */ `
      precision mediump float;

      uniform sampler2D uAtlas;

      varying vec2 vAtlasUv;
      varying vec4 vColorAlpha;

      void main() {
        float mask = texture2D(uAtlas, vAtlasUv).a;
        float alpha = mask * vColorAlpha.a;
        if (alpha < 0.015) discard;
        gl_FragColor = vec4(vColorAlpha.rgb, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: options.depthTest ?? this.billboard3d,
      side: this.billboard3d ? THREE.FrontSide : THREE.DoubleSide,
      uniforms: {
        uAtlas: { value: this.atlasTexture },
        uOpacity: { value: 1.0 },
        uTime: { value: 0.0 },
        uTopDown: { value: options.topDownOrtho ? 1.0 : 0.0 },
      },
      vertexShader,
      fragmentShader,
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.maxInstances);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.visible = false;
  }

  public beginFrame(): void {
    this.activeCount = 0;
  }

  public get count(): number {
    return this.activeCount;
  }

  /**
   * Push an orthographic/2D glyph instance directly into packed vec4 TypedArrays
   * with zero heap allocations and zero mat4 matrix math.
   */
  public push2D(
    x: number,
    y: number,
    size: number,
    glyph: 0 | 1,
    r: number,
    g: number,
    b: number,
    alpha: number,
    rotRad = 0
  ): void {
    const i = this.activeCount;
    if (i >= this.maxInstances || alpha <= 0.01 || size <= 0.1) return;

    const pIdx = i * 4;
    this.poseArray[pIdx] = x;
    this.poseArray[pIdx + 1] = y;
    // Sign bit packs glyph without allocating or uploading a separate attribute
    this.poseArray[pIdx + 2] = glyph === 1 ? size : -size;
    this.poseArray[pIdx + 3] = rotRad;

    this.colorAlphaArray[pIdx] = r;
    this.colorAlphaArray[pIdx + 1] = g;
    this.colorAlphaArray[pIdx + 2] = b;
    this.colorAlphaArray[pIdx + 3] = alpha;

    this.activeCount = i + 1;
  }

  /**
   * Push a 3D camera-billboarded binary dust particle (supports HDR bloom & swirl phase).
   */
  public push3D(
    x: number,
    y: number,
    z: number,
    worldScale: number,
    glyph: 0 | 1,
    r: number,
    g: number,
    b: number,
    alpha: number,
    phase: number,
    swirlEnergy: number
  ): void {
    const i = this.activeCount;
    if (i >= this.maxInstances) return;

    const pIdx = i * 4;
    this.poseArray[pIdx] = x;
    this.poseArray[pIdx + 1] = y;
    this.poseArray[pIdx + 2] = z;
    this.poseArray[pIdx + 3] = worldScale;

    this.colorAlphaArray[pIdx] = r;
    this.colorAlphaArray[pIdx + 1] = g;
    this.colorAlphaArray[pIdx + 2] = b;
    this.colorAlphaArray[pIdx + 3] = alpha;

    if (this.metaArray) {
      this.metaArray[pIdx] = phase;
      this.metaArray[pIdx + 1] = swirlEnergy;
      this.metaArray[pIdx + 2] = glyph;
      this.metaArray[pIdx + 3] = 0;
    }

    this.activeCount = i + 1;
  }

  public commitFrame(): void {
    this.mesh.count = this.activeCount;
    if (this.activeCount === 0) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    const uploadCount = this.activeCount * 4;
    this.poseAttr.clearUpdateRanges();
    this.poseAttr.addUpdateRange(0, uploadCount);
    this.poseAttr.needsUpdate = true;

    this.colorAlphaAttr.clearUpdateRanges();
    this.colorAlphaAttr.addUpdateRange(0, uploadCount);
    this.colorAlphaAttr.needsUpdate = true;

    if (this.metaAttr) {
      this.metaAttr.clearUpdateRanges();
      this.metaAttr.addUpdateRange(0, uploadCount);
      this.metaAttr.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.atlasTexture.dispose();
  }
}

export interface InstancedBinaryDustRendererOptions {
  canvas?: HTMLCanvasElement;
  maxInstances: number;
  width?: number;
  height?: number;
  maxDpr?: number;
}

/**
 * Self-contained orthographic GPU InstancedMesh renderer for overlay canvases
 * (e.g. BinaryDustWordMorph, ThankYouFinaleStage, Say Hi condensation veil).
 * Includes automatic mobile/software GPU tiering, sub-range uploads, and context safety.
 */
export class InstancedBinaryDustRenderer {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.OrthographicCamera;
  public readonly batch: InstancedBinaryDustBatch;
  public readonly isSoftwareGl: boolean;
  public readonly gpuTier: DeviceGpuTier;
  public readonly dpr: number;

  private width = 320;
  private height = 320;
  private maxDpr: number;
  private disposed = false;
  private hasRenderedInk = false;

  private readonly onContextLost = (e: Event) => {
    e.preventDefault();
  };

  private readonly onContextRestored = () => {
    if (!this.disposed) {
      this.renderer.setSize(this.width, this.height, false);
    }
  };

  constructor(options: InstancedBinaryDustRendererOptions) {
    this.gpuTier = detectDeviceGpuTier();
    this.isSoftwareGl = this.gpuTier.isSoftwareGl;
    this.maxDpr = Math.min(options.maxDpr ?? 2, this.gpuTier.recommendedMaxDpr);
    this.dpr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, this.maxDpr);

    // Alpha-masked glyph quads get crisp edges from linear texture filtering;
    // disabling hardware MSAA saves substantial mobile tile-resolve bandwidth.
    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = true;

    this.width = Math.max(1, options.width ?? 320);
    this.height = Math.max(1, options.height ?? 320);
    this.renderer.setSize(this.width, this.height, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, this.width, 0, this.height, -100, 100);
    this.camera.position.z = 10;

    this.batch = new InstancedBinaryDustBatch({
      maxInstances: options.maxInstances,
      billboard3d: false,
      topDownOrtho: true,
      depthTest: false,
    });
    this.scene.add(this.batch.mesh);

    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored);
  }

  public get domElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public resize(widthPx: number, heightPx: number, updateStyle = true): void {
    if (this.disposed) return;
    const w = Math.max(1, Math.round(widthPx));
    const h = Math.max(1, Math.round(heightPx));
    if (w === this.width && h === this.height) return;

    this.width = w;
    this.height = h;
    const nextDpr = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.renderer.setPixelRatio(nextDpr);
    this.renderer.setSize(w, h, updateStyle);

    this.camera.left = 0;
    this.camera.right = w;
    this.camera.top = 0;
    this.camera.bottom = h;
    this.camera.updateProjectionMatrix();
  }

  public beginFrame(): void {
    this.batch.beginFrame();
  }

  public push(
    x: number,
    y: number,
    size: number,
    glyph: 0 | 1,
    r: number,
    g: number,
    b: number,
    alpha: number,
    rotRad = 0
  ): void {
    this.batch.push2D(x, y, size, glyph, r, g, b, alpha, rotRad);
  }

  public render(forceSceneRender = false): void {
    if (this.disposed) return;
    this.batch.commitFrame();
    if (this.batch.count === 0 && !forceSceneRender) {
      if (this.hasRenderedInk) {
        this.renderer.clear();
        this.hasRenderedInk = false;
      }
      return;
    }
    this.renderer.render(this.scene, this.camera);
    this.hasRenderedInk = true;
  }

  public clear(): void {
    if (this.disposed) return;
    if (this.hasRenderedInk) {
      this.batch.beginFrame();
      this.batch.commitFrame();
      this.renderer.clear();
      this.hasRenderedInk = false;
    }
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.batch.dispose();
    this.renderer.dispose();
  }
}
