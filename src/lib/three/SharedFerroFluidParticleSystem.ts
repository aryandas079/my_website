import * as THREE from 'three';

/**
 * Detect software WebGL (SwiftShader, llvmpipe, softpipe, Basic Render)
 * from the GPU renderer string so we can pace frames properly on CPU-backed WebGL.
 */
const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

const BOTTOM_RATIOS = [0.09, 0.2, 0.31, 0.42, 0.53, 0.64, 0.75, 0.85, 0.93];
const SIDE_RATIOS = [0.16, 0.32, 0.48, 0.64, 0.79, 0.91];
const TOP_RATIOS = [0.16, 0.33, 0.5, 0.67, 0.84];

const CHAIN_NODES = 6;
const MAX_DROPS_PER_CARD = 42;
const MAX_PARTICLES_PER_CARD =
  (BOTTOM_RATIOS.length + SIDE_RATIOS.length * 2 + TOP_RATIOS.length) * CHAIN_NODES +
  MAX_DROPS_PER_CARD * 2 +
  16;

export interface CardFerroInstance {
  id: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  cardW: number;
  cardH: number;
  padX: number;
  padTop: number;
  padBottom: number;
  isHovered: boolean;
  isVisible: boolean;
  pointerNormX: number;
  pointerNormY: number;
  // Internal simulation state (zero-GC typed arrays per card)
  simTime: number;
  hoverTension: number;
  smoothPtrX: number;
  smoothPtrY: number;
  lastBottomSpawnMs: number;
  lastSideSpawnMs: number;
  needsClear: boolean;
  bottomTipX: Float32Array;
  bottomTipY: Float32Array;
  sideTipX: Float32Array;
  sideTipY: Float32Array;
  dropActive: Uint8Array;
  dropX: Float32Array;
  dropY: Float32Array;
  dropVx: Float32Array;
  dropVy: Float32Array;
  dropR: Float32Array;
  dropAlpha: Float32Array;
  activeDropCount: number;
}

/**
 * Shared WebGL Particle System Singleton for all 6 Project Cards.
 * Uses a single THREE.WebGLRenderer, a single shared THREE.Points BufferGeometry,
 * and a 2-pass GPU Metaball Iso-Surface Shader to simulate and render cohesive
 * magnetic ferrofluid tendrils and dripping droplets across all cards simultaneously.
 *
 * Strictly hover-activated: animations appear ONLY when a card is hovered,
 * and the shared WebGL loop sleeps at 0% CPU/GPU when all cards are settled.
 */
class SharedFerroFluidParticleController {
  private cards = new Map<string, CardFerroInstance>();
  private renderer: THREE.WebGLRenderer | null = null;
  private fieldTarget: THREE.WebGLRenderTarget | null = null;

  private fieldScene: THREE.Scene | null = null;
  private fieldCamera: THREE.OrthographicCamera | null = null;
  private cardCoreMaterial: THREE.ShaderMaterial | null = null;

  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;

  private posArray = new Float32Array(MAX_PARTICLES_PER_CARD * 3);
  private sizeArray = new Float32Array(MAX_PARTICLES_PER_CARD);
  private weightArray = new Float32Array(MAX_PARTICLES_PER_CARD);

  private postScene: THREE.Scene | null = null;
  private postCamera: THREE.OrthographicCamera | null = null;
  private postMaterial: THREE.ShaderMaterial | null = null;

  private currentW = 0;
  private currentH = 0;
  private dpr = 1;

  private frameId = 0;
  private isRunning = false;
  private lastMs = 0;

  private ensureInitialized(): void {
    if (this.renderer || typeof window === 'undefined') return;

    this.dpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.75);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(1);
    renderer.autoClear = false;
    this.renderer = renderer;

    // Pass 1 Scene: Scalar Potential Field (Card SDF Core + Additive GPU Particle System)
    const fieldScene = new THREE.Scene();
    const fieldCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    fieldCamera.position.z = 1;
    this.fieldScene = fieldScene;
    this.fieldCamera = fieldCamera;

    // Card Rounded-Rect SDF Core so perimeter particles form a true liquid meniscus with the card border
    const cardCoreMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uResolution: { value: new THREE.Vector2(470, 630) },
        uCardRect: { value: new THREE.Vector4(68, 48, 335, 430) },
        uCornerRadius: { value: 28.0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform vec2 uResolution;
        uniform vec4 uCardRect;
        uniform float uCornerRadius;

        float sdRoundedBox(vec2 p, vec2 b, float r) {
          vec2 q = abs(p) - b + r;
          return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
        }

        void main() {
          vec2 pixelPos = vec2(vUv.x * uResolution.x, (1.0 - vUv.y) * uResolution.y);
          vec2 cardCenter = uCardRect.xy + uCardRect.zw * 0.5;
          vec2 halfSize = uCardRect.zw * 0.5;
          float dist = sdRoundedBox(pixelPos - cardCenter, halfSize, uCornerRadius);
          // Smooth scalar field around card boundary so particles fuse into the card rim
          float field = smoothstep(14.0, -4.0, dist) * 0.72;
          gl_FragColor = vec4(field, 0.0, 0.0, 1.0);
        }
      `,
    });
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    const cardCoreMesh = new THREE.Mesh(quadGeo, cardCoreMat);
    fieldScene.add(cardCoreMesh);
    this.cardCoreMaterial = cardCoreMat;

    // Shared GPU Particle System Geometry & Shader
    const pGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(this.posArray, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const sizeAttr = new THREE.BufferAttribute(this.sizeArray, 1);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);
    const weightAttr = new THREE.BufferAttribute(this.weightArray, 1);
    weightAttr.setUsage(THREE.DynamicDrawUsage);

    pGeo.setAttribute('position', posAttr);
    pGeo.setAttribute('aSize', sizeAttr);
    pGeo.setAttribute('aWeight', weightAttr);

    const pMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uResolution: { value: new THREE.Vector2(470, 630) },
        uDpr: { value: this.dpr },
      },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute float aWeight;
        varying float vWeight;
        uniform vec2 uResolution;
        uniform float uDpr;

        void main() {
          vWeight = aWeight;
          // Convert pixel coordinates (origin top-left) to NDC [-1, 1]
          vec2 ndc = vec2(
            (position.x / uResolution.x) * 2.0 - 1.0,
            1.0 - (position.y / uResolution.y) * 2.0
          );
          gl_Position = vec4(ndc, 0.0, 1.0);
          gl_PointSize = aSize * uDpr;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying float vWeight;

        void main() {
          vec2 c = gl_PointCoord * 2.0 - 1.0;
          float r2 = dot(c, c);
          if (r2 > 1.0) discard;
          // Smooth quartic polynomial metaball kernel
          float falloff = 1.0 - r2;
          float field = falloff * falloff * vWeight;
          gl_FragColor = vec4(field, 0.0, 0.0, 1.0);
        }
      `,
    });

    const points = new THREE.Points(pGeo, pMat);
    points.frustumCulled = false;
    fieldScene.add(points);
    this.particleGeometry = pGeo;
    this.particleMaterial = pMat;

    // Pass 2 Scene: Ferrofluid Iso-Surface Threshold & Glossy Meniscus Highlight
    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    postCamera.position.z = 1;

    const postMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tField: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / 470, 1 / 630) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        varying vec2 vUv;
        uniform sampler2D tField;
        uniform vec2 uTexelSize;

        void main() {
          float f = texture2D(tField, vUv).r;
          float threshold = 0.44;
          float alpha = smoothstep(threshold - 0.055, threshold + 0.055, f);
          if (alpha <= 0.004) discard;

          // Compute screen-space liquid surface normal from scalar field gradient for glossy ferrofluid rim
          float fx = texture2D(tField, vUv + vec2(uTexelSize.x, 0.0)).r -
                     texture2D(tField, vUv - vec2(uTexelSize.x, 0.0)).r;
          float fy = texture2D(tField, vUv + vec2(0.0, uTexelSize.y)).r -
                     texture2D(tField, vUv - vec2(0.0, uTexelSize.y)).r;
          vec2 grad = vec2(fx, fy);
          float edgeBand = smoothstep(0.85, 0.44, f) * smoothstep(0.36, 0.48, f);
          vec2 lightDir = normalize(vec2(-0.55, 0.83));
          float spec = max(0.0, dot(normalize(grad + vec2(0.0001)), lightDir));
          float sheen = pow(spec, 3.0) * edgeBand * 0.24;

          vec3 ferroColor = vec3(0.031) + vec3(sheen);
          gl_FragColor = vec4(ferroColor, alpha);
        }
      `,
    });

    const postMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
    postScene.add(postMesh);
    this.postScene = postScene;
    this.postCamera = postCamera;
    this.postMaterial = postMat;
  }

  private ensureViewportSize(canvasW: number, canvasH: number): void {
    if (!this.renderer) return;
    const targetW = Math.round(canvasW * this.dpr);
    const targetH = Math.round(canvasH * this.dpr);

    if (targetW !== this.currentW || targetH !== this.currentH || !this.fieldTarget) {
      this.currentW = targetW;
      this.currentH = targetH;
      this.renderer.setSize(targetW, targetH, false);

      this.fieldTarget?.dispose();
      this.fieldTarget = new THREE.WebGLRenderTarget(targetW, targetH, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        depthBuffer: false,
        stencilBuffer: false,
      });

      if (this.postMaterial) {
        this.postMaterial.uniforms.tField.value = this.fieldTarget.texture;
        this.postMaterial.uniforms.uTexelSize.value.set(1 / targetW, 1 / targetH);
      }
    }

    if (this.cardCoreMaterial) {
      this.cardCoreMaterial.uniforms.uResolution.value.set(canvasW, canvasH);
    }
    if (this.particleMaterial) {
      this.particleMaterial.uniforms.uResolution.value.set(canvasW, canvasH);
      this.particleMaterial.uniforms.uDpr.value = this.dpr;
    }
  }

  public registerCard(config: {
    id: string;
    canvas: HTMLCanvasElement;
    cardW: number;
    cardH: number;
    padX: number;
    padTop: number;
    padBottom: number;
  }): void {
    this.ensureInitialized();
    const seed = config.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 0.37;

    const instance: CardFerroInstance = {
      id: config.id,
      canvas: config.canvas,
      ctx: config.canvas.getContext('2d'),
      cardW: config.cardW,
      cardH: config.cardH,
      padX: config.padX,
      padTop: config.padTop,
      padBottom: config.padBottom,
      isHovered: false,
      isVisible: true,
      pointerNormX: 0,
      pointerNormY: 0,
      simTime: seed,
      hoverTension: 0,
      smoothPtrX: 0,
      smoothPtrY: 0,
      lastBottomSpawnMs: 0,
      lastSideSpawnMs: 0,
      needsClear: false,
      bottomTipX: new Float32Array(BOTTOM_RATIOS.length),
      bottomTipY: new Float32Array(BOTTOM_RATIOS.length),
      sideTipX: new Float32Array(SIDE_RATIOS.length * 2),
      sideTipY: new Float32Array(SIDE_RATIOS.length * 2),
      dropActive: new Uint8Array(MAX_DROPS_PER_CARD),
      dropX: new Float32Array(MAX_DROPS_PER_CARD),
      dropY: new Float32Array(MAX_DROPS_PER_CARD),
      dropVx: new Float32Array(MAX_DROPS_PER_CARD),
      dropVy: new Float32Array(MAX_DROPS_PER_CARD),
      dropR: new Float32Array(MAX_DROPS_PER_CARD),
      dropAlpha: new Float32Array(MAX_DROPS_PER_CARD),
      activeDropCount: 0,
    };

    this.resizeCardCanvas(instance, config.cardW, config.cardH);
    this.cards.set(config.id, instance);
  }

  public unregisterCard(id: string): void {
    this.cards.delete(id);
    if (this.cards.size === 0 && this.isRunning) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.isRunning = false;
    }
  }

  public resizeCard(id: string, cardW: number, cardH: number): void {
    const card = this.cards.get(id);
    if (!card) return;
    this.resizeCardCanvas(card, cardW, cardH);
    if (card.hoverTension > 0.005 || card.activeDropCount > 0) {
      this.wakeLoop();
    }
  }

  private resizeCardCanvas(card: CardFerroInstance, cardW: number, cardH: number): void {
    card.cardW = cardW;
    card.cardH = cardH;
    const canvasW = cardW + card.padX * 2;
    const canvasH = cardH + card.padTop + card.padBottom;
    const dpr = this.dpr || 1;
    card.canvas.width = Math.round(canvasW * dpr);
    card.canvas.height = Math.round(canvasH * dpr);
    card.canvas.style.width = `${canvasW}px`;
    card.canvas.style.height = `${canvasH}px`;
  }

  public updateCardState(
    id: string,
    state: {
      isHovered: boolean;
      isVisible: boolean;
      pointerNormX: number;
      pointerNormY: number;
    }
  ): void {
    const card = this.cards.get(id);
    if (!card) return;

    const wasHovered = card.isHovered;
    card.isHovered = state.isHovered;
    card.isVisible = state.isVisible;
    card.pointerNormX = state.pointerNormX;
    card.pointerNormY = state.pointerNormY;

    if (state.isHovered || wasHovered || card.hoverTension > 0.004 || card.activeDropCount > 0) {
      this.wakeLoop();
    }
  }

  private spawnDroplet(
    card: CardFerroInstance,
    x: number,
    y: number,
    vx: number,
    vy: number,
    r: number
  ): void {
    for (let i = 0; i < MAX_DROPS_PER_CARD; i++) {
      if (card.dropActive[i] === 0) {
        card.dropActive[i] = 1;
        card.dropX[i] = x;
        card.dropY[i] = y;
        card.dropVx[i] = vx;
        card.dropVy[i] = vy;
        card.dropR[i] = r;
        card.dropAlpha[i] = 1.0;
        card.activeDropCount++;
        return;
      }
    }
  }

  private wakeLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastMs = performance.now();
    this.frameId = requestAnimationFrame(this.tick);
  }

  private afterDraw(cb: () => void): void {
    if (!this.renderer) return;
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (nowMs: number): void => {
    const dt = Math.min((nowMs - this.lastMs) / 1000, 0.05);
    this.lastMs = nowMs;

    let anyCardActive = false;

    for (const card of this.cards.values()) {
      if (!card.isVisible) {
        if (card.needsClear && card.ctx) {
          card.ctx.clearRect(0, 0, card.canvas.width, card.canvas.height);
          card.needsClear = false;
        }
        continue;
      }

      // Hover-only activation: ramps to 1.0 when hovered, retracts smoothly to 0.0 when unhovered
      const targetTension = card.isHovered ? 1.0 : 0.0;
      const dampRate = card.isHovered ? 9.5 : 7.5;
      const damp = 1 - Math.exp(-dampRate * dt);
      card.hoverTension += (targetTension - card.hoverTension) * damp;
      card.smoothPtrX += ((card.isHovered ? card.pointerNormX : 0) - card.smoothPtrX) * damp;
      card.smoothPtrY += ((card.isHovered ? card.pointerNormY : 0) - card.smoothPtrY) * damp;

      const isSimActive =
        card.isHovered || card.hoverTension > 0.006 || card.activeDropCount > 0;

      if (!isSimActive) {
        if (card.hoverTension > 0) card.hoverTension = 0;
        if (card.needsClear && card.ctx) {
          card.ctx.clearRect(0, 0, card.canvas.width, card.canvas.height);
          card.needsClear = false;
        }
        continue;
      }

      anyCardActive = true;
      card.needsClear = true;
      card.simTime += dt;

      this.simulateAndRenderCard(card, nowMs, dt);
    }

    if (!anyCardActive) {
      this.isRunning = false;
      return;
    }

    if (isSoftwareGl) {
      this.afterDraw(() => {
        if (this.isRunning) this.tick(performance.now());
      });
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private simulateAndRenderCard(
    card: CardFerroInstance,
    nowMs: number,
    dt: number
  ): void {
    if (
      !this.renderer ||
      !this.fieldScene ||
      !this.fieldCamera ||
      !this.postScene ||
      !this.postCamera ||
      !this.particleGeometry ||
      !this.cardCoreMaterial ||
      !card.ctx
    ) {
      return;
    }

    const canvasW = card.cardW + card.padX * 2;
    const canvasH = card.cardH + card.padTop + card.padBottom;
    this.ensureViewportSize(canvasW, canvasH);

    const cLeft = card.padX;
    const cRight = card.padX + card.cardW;
    const cTop = card.padTop;
    const cBottom = card.padTop + card.cardH;

    this.cardCoreMaterial.uniforms.uCardRect.value.set(
      cLeft,
      cTop,
      card.cardW,
      card.cardH
    );

    const tension = card.hoverTension;
    const simTime = card.simTime;
    let pCount = 0;

    const pushParticle = (x: number, y: number, diameter: number, weight: number) => {
      if (pCount >= MAX_PARTICLES_PER_CARD) return;
      const idx3 = pCount * 3;
      this.posArray[idx3] = x;
      this.posArray[idx3 + 1] = y;
      this.posArray[idx3 + 2] = 0;
      this.sizeArray[pCount] = diameter;
      this.weightArray[pCount] = weight;
      pCount++;
    };

    if (tension > 0.008) {
      // 1. Bottom Edge Dripping Ferrofluid Particle Chains
      for (let i = 0; i < BOTTOM_RATIOS.length; i++) {
        const ratio = BOTTOM_RATIOS[i];
        const phase = simTime * 3.1 + i * 1.15;
        const secPhase = simTime * 4.2 - i * 0.85;

        const ptrBias = Math.max(
          0.35,
          1.15 - Math.abs(ratio - (card.smoothPtrX * 0.5 + 0.5)) * 0.9
        );
        const localTension = tension * ptrBias;

        const ax = cLeft + card.cardW * ratio + Math.sin(secPhase) * 3.5 * tension;
        const ay = cBottom - 3;

        const swayX =
          (Math.sin(phase) * 13 + card.smoothPtrX * 24) * localTension;
        const baseLen =
          (i % 2 === 0 ? 48 : 34) +
          Math.sin(phase * 1.1) * 15 +
          Math.cos(secPhase) * 8;
        const reachY =
          (baseLen + Math.max(0, card.smoothPtrY) * 16) * localTension;

        const tx = ax + swayX;
        const ty = ay + Math.max(4, reachY);

        card.bottomTipX[i] = tx;
        card.bottomTipY[i] = ty;

        for (let n = 0; n < CHAIN_NODES; n++) {
          const t = n / (CHAIN_NODES - 1);
          // Parabolic gravity curve from anchor root to bulbous tip
          const px = ax + (tx - ax) * (t * t * 0.65 + t * 0.35);
          const py = ay + (ty - ay) * t;
          // Wide meniscus root, slender waist, bulbous tip
          const profile =
            n === 0
              ? 36
              : n === CHAIN_NODES - 1
                ? 21 + Math.max(0, Math.sin(phase)) * 6
                : 25 * (1 - t * 0.38);
          pushParticle(px, py, profile * (0.35 + 0.65 * Math.min(1, localTension)), 0.76);
        }
      }

      // 2. Left & Right Gravity-Curved Side Ferrofluid Particle Chains
      let sideIdx = 0;
      for (let i = 0; i < SIDE_RATIOS.length; i++) {
        const r = SIDE_RATIOS[i];
        const lPhase = simTime * 3.15 + i * 1.3;
        const rPhase = simTime * 2.95 + i * 1.45 + 2.1;

        // Left edge particle chain
        const lay = cTop + card.cardH * r;
        const lax = cLeft + 3;
        const lBias = Math.max(0.4, 1.0 - Math.max(0, card.smoothPtrX) * 0.5);
        const lTen = tension * lBias;
        const lOut = (15 + Math.sin(lPhase) * 8 + r * 10) * lTen;
        const lDrop = (18 + r * 22 + Math.cos(lPhase * 0.9) * 7) * lTen;
        const ltx = lax - lOut;
        const lty = lay + lDrop;

        card.sideTipX[sideIdx] = ltx;
        card.sideTipY[sideIdx] = lty;
        sideIdx++;

        for (let n = 0; n < CHAIN_NODES; n++) {
          const t = n / (CHAIN_NODES - 1);
          const px = lax + (ltx - lax) * Math.pow(t, 0.85);
          const py = lay + (lty - lay) * (t * t);
          const diam = n === 0 ? 32 : n === CHAIN_NODES - 1 ? 18 : 21 * (1 - t * 0.35);
          pushParticle(px, py, diam * (0.35 + 0.65 * lTen), 0.72);
        }

        // Right edge particle chain
        const ray = cTop + card.cardH * r;
        const rax = cRight - 3;
        const rBias = Math.max(0.4, 1.0 + Math.min(0, card.smoothPtrX) * 0.5);
        const rTen = tension * rBias;
        const rOut = (15 + Math.sin(rPhase) * 8 + r * 10) * rTen;
        const rDrop = (18 + r * 22 + Math.cos(rPhase * 0.9) * 7) * rTen;
        const rtx = rax + rOut;
        const rty = ray + rDrop;

        card.sideTipX[sideIdx] = rtx;
        card.sideTipY[sideIdx] = rty;
        sideIdx++;

        for (let n = 0; n < CHAIN_NODES; n++) {
          const t = n / (CHAIN_NODES - 1);
          const px = rax + (rtx - rax) * Math.pow(t, 0.85);
          const py = ray + (rty - ray) * (t * t);
          const diam = n === 0 ? 32 : n === CHAIN_NODES - 1 ? 18 : 21 * (1 - t * 0.35);
          pushParticle(px, py, diam * (0.35 + 0.65 * rTen), 0.72);
        }
      }

      // 3. Top Edge Magnetic Crown Particle Chains
      for (let i = 0; i < TOP_RATIOS.length; i++) {
        const r = TOP_RATIOS[i];
        const tPhase = simTime * 3.4 + i * 1.5;
        const tax = cLeft + card.cardW * r;
        const tay = cTop + 3;
        const tRise = (11 + Math.max(0, Math.sin(tPhase)) * 12) * tension;
        const tSway = (Math.cos(tPhase * 0.8) * 8 + card.smoothPtrX * 10) * tension;

        for (let n = 0; n < CHAIN_NODES; n++) {
          const t = n / (CHAIN_NODES - 1);
          const px = tax + tSway * t;
          const py = tay - tRise * t;
          const diam = n === 0 ? 30 : 18 * (1 - t * 0.35);
          pushParticle(px, py, diam * (0.35 + 0.65 * tension), 0.7);
        }
      }
    }

    // 4. Spawn Detaching Ferrofluid Droplets ONLY While Hovered
    if (card.isHovered && tension > 0.38) {
      if (nowMs - card.lastBottomSpawnMs > 85) {
        card.lastBottomSpawnMs = nowMs;
        for (let k = 0; k < 2; k++) {
          const idx = Math.floor(Math.random() * BOTTOM_RATIOS.length);
          this.spawnDroplet(
            card,
            card.bottomTipX[idx] + (Math.random() - 0.5) * 3,
            card.bottomTipY[idx] + 2,
            (Math.random() - 0.5) * 10,
            36 + Math.random() * 28,
            18 + Math.random() * 7
          );
        }
      }

      if (nowMs - card.lastSideSpawnMs > 180) {
        card.lastSideSpawnMs = nowMs;
        const sIdx = Math.floor(Math.random() * (SIDE_RATIOS.length * 2));
        const sx = card.sideTipX[sIdx];
        const sy = card.sideTipY[sIdx];
        this.spawnDroplet(
          card,
          sx,
          sy + 2,
          (sx < cLeft ? -1 : 1) * (5 + Math.random() * 6),
          28 + Math.random() * 24,
          16 + Math.random() * 5
        );
      }
    }

    // 5. Update & Emit Free-Falling Ferrofluid Droplet Particles (Head + Tail Teardrop Pair)
    if (card.activeDropCount > 0) {
      let remaining = 0;
      for (let i = 0; i < MAX_DROPS_PER_CARD; i++) {
        if (card.dropActive[i] === 0) continue;

        const ny = card.dropY[i] + card.dropVy[i] * dt;
        const nx = card.dropX[i] + card.dropVx[i] * dt;
        const nvy = card.dropVy[i] + 210 * dt;
        const distBelow = ny - cBottom;
        const nAlpha =
          distBelow > 85 ? Math.max(0, 1 - (distBelow - 85) / 48) : 1;
        const nr = card.dropR[i] * 0.995;

        if (nAlpha <= 0.05 || ny >= canvasH - 6) {
          card.dropActive[i] = 0;
          continue;
        }

        card.dropX[i] = nx;
        card.dropY[i] = ny;
        card.dropVy[i] = nvy;
        card.dropR[i] = nr;
        card.dropAlpha[i] = nAlpha;
        remaining++;

        // Head particle + trailing velocity-aligned tail particle fuse in the GPU metaball pass into a teardrop
        pushParticle(nx, ny, nr, 0.85 * nAlpha);
        pushParticle(
          nx - card.dropVx[i] * 0.03,
          ny - Math.min(12, nvy * 0.042),
          nr * 0.72,
          0.62 * nAlpha
        );
      }
      card.activeDropCount = remaining;
    }

    // Upload active particle slice to the shared WebGL BufferGeometry
    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const sizeAttr = this.particleGeometry.getAttribute('aSize') as THREE.BufferAttribute;
    const weightAttr = this.particleGeometry.getAttribute('aWeight') as THREE.BufferAttribute;

    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    weightAttr.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, pCount);

    // Execute Pass 1: Render Card Core + Particle Scalar Field into shared WebGLRenderTarget
    this.renderer.setRenderTarget(this.fieldTarget);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(this.fieldScene, this.fieldCamera);

    // Execute Pass 2: Render Iso-Surface Ferrofluid Metaball Shader to shared WebGL Canvas
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.clear();
    this.renderer.render(this.postScene, this.postCamera);

    // Blit shared WebGL output onto the card's 3D-transformed layer canvas
    card.ctx.clearRect(0, 0, card.canvas.width, card.canvas.height);
    card.ctx.drawImage(
      this.renderer.domElement,
      0,
      0,
      this.currentW,
      this.currentH,
      0,
      0,
      card.canvas.width,
      card.canvas.height
    );
  }
}

export const sharedFerroFluidParticles = new SharedFerroFluidParticleController();
