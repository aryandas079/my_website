import * as THREE from 'three';

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

interface FlagHeadlineSlide {
  num: string;
  tag: string;
  lines: string[];
  sub: string;
}

const FLAG_SLIDES: FlagHeadlineSlide[] = [
  {
    num: '01',
    tag: '01 // EDUCATION & CORE',
    lines: ['Electrical', 'Engineering', '@ NIT Silchar'],
    sub: 'B.Tech Undergraduate · National Institute of Technology, Silchar',
  },
  {
    num: '02',
    tag: '02 // ROLE & CRAFT',
    lines: ['Developer |', 'Programmer |', 'Engineer'],
    sub: 'Systems problem solver · C++ · Python · TypeScript · Kotlin',
  },
  {
    num: '03',
    tag: '03 // SPECIALIZATIONS',
    lines: ['Machine Learning', 'Data Scientist |', 'Full Stack Dev'],
    sub: 'Machine Learning Engineer | Data Scientist | Full stack Web Developer',
  },
  {
    num: '04',
    tag: '04 // NEXT CHAPTER',
    lines: ['Scroll for', 'details ↓'],
    sub: 'Explore engineering architecture, projects, and technical stack below',
  },
];

export class HolographicFlagSceneController {
  private container: HTMLElement;
  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private worldRoot = new THREE.Group();
  private hologramGridGroup = new THREE.Group();
  private flagRigGroup = new THREE.Group();
  private windSensorCube!: THREE.Mesh;

  // Dynamic CanvasTexture for the Flag print & continuous text animation
  private flagCanvas: HTMLCanvasElement;
  private flagCtx: CanvasRenderingContext2D;
  private flagTexture: THREE.CanvasTexture;
  private flagShaderMat!: THREE.ShaderMaterial;

  // Wind & Mouse Flutter Physics
  private mouseNdc = new THREE.Vector2(0, 0);
  private targetCameraParallax = new THREE.Vector2(0, 0);
  private currentCameraParallax = new THREE.Vector2(0, 0);
  private windFlutterBoost = 0;
  private targetWindFlutterBoost = 0;
  private scrollProgress = 0;

  // Slide animation state
  private lastRedrawMs = 0;
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
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.add(this.worldRoot);

    this.camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 60);
    this.camera.position.set(0, 0, 11.5);

    // Offscreen 2D Canvas for crisp dynamic typography on the 3D cloth
    this.flagCanvas = document.createElement('canvas');
    this.flagCanvas.width = 768;
    this.flagCanvas.height = 1080;
    const ctx = this.flagCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create 2D context for 3D flag texture');
    }
    this.flagCtx = ctx;

    this.flagTexture = new THREE.CanvasTexture(this.flagCanvas);
    this.flagTexture.colorSpace = THREE.SRGBColorSpace;
    this.flagTexture.minFilter = THREE.LinearFilter;
    this.flagTexture.magFilter = THREE.LinearFilter;
    this.flagTexture.anisotropy = this.isSoftwareGl
      ? 1
      : Math.min(this.renderer.capabilities.getMaxAnisotropy(), 4);
    this.disposables.push(this.flagTexture);

    this.buildLights();
    this.buildHolographicDepthSpace();
    this.buildFlagAndMastRig();
    this.layoutSceneForViewport();
    this.drawFlagCanvasTexture(0);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.lastTimeMs = performance.now();
    this.tick();
  }

  private buildLights(): void {
    const hemi = new THREE.HemisphereLight(0xf5f5f2, 0x181816, 1.35);
    hemi.position.set(0, 10, 6);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(5, 7, 8);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0xff261b, 1.2);
    rim.position.set(-7, 2, 4);
    this.scene.add(rim);
  }

  /**
   * Builds a multi-plane 3D perspective holographic depth field so depth is
   * immediately visible across the homepage (using only our dull + bright colors).
   */
  private buildHolographicDepthSpace(): void {
    this.worldRoot.add(this.hologramGridGroup);

    // 1. Receding 3D Perspective Floor & Ceiling Grid Planes
    const gridPositions: number[] = [];
    const gridWidth = 26;
    const gridDepth = 20;
    const floorY = -3.6;
    const ceilY = 3.8;

    // Longitudinal perspective lines receding into -Z
    for (let i = -10; i <= 10; i++) {
      const x = (i / 10) * (gridWidth * 0.5);
      gridPositions.push(x, floorY, 2.5, x, floorY, -gridDepth);
      if (i % 2 === 0) {
        gridPositions.push(x, ceilY, 1.0, x, ceilY, -gridDepth);
      }
    }

    // Transverse depth rungs along Z
    for (let j = 0; j <= 12; j++) {
      const z = 2.5 - (j / 12) * (gridDepth + 2.5);
      gridPositions.push(-gridWidth * 0.5, floorY, z, gridWidth * 0.5, floorY, z);
    }

    // Back horizon architectural frame at Z = -8.5
    const backZ = -8.5;
    gridPositions.push(
      -9, floorY, backZ, 9, floorY, backZ,
      9, floorY, backZ, 9, ceilY, backZ,
      9, ceilY, backZ, -9, ceilY, backZ,
      -9, ceilY, backZ, -9, floorY, backZ
    );

    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
    const gridMat = new THREE.LineBasicMaterial({
      color: 0x8e8e86,
      transparent: true,
      opacity: 0.24,
    });
    const gridLines = new THREE.LineSegments(gridGeo, gridMat);
    this.hologramGridGroup.add(gridLines);
    this.disposables.push(gridGeo, gridMat);

    // 2. Floating 3D Holographic Depth Reticles (+) at multiple Z layers (-5.5 to +1.2)
    const crossPositions: number[] = [];
    const redNodePositions: number[] = [];
    const s = 0.14;

    const coords: Array<[number, number, number, boolean]> = [
      [-5.6, 2.1, -4.5, false],
      [-3.2, 0.8, -2.2, true],
      [-6.2, -0.9, -1.8, false],
      [-1.8, 2.4, -3.4, false],
      [-0.4, -0.4, -1.2, true],
      [0.8, 2.6, -4.0, false],
      [5.4, 2.3, -3.2, true],
      [-4.4, 1.6, 0.6, true],
      [-2.1, -1.3, 0.8, false],
      [1.4, -1.5, -2.6, false],
    ];

    for (const [cx, cy, cz, isRed] of coords) {
      crossPositions.push(
        cx - s, cy, cz, cx + s, cy, cz,
        cx, cy - s, cz, cx, cy + s, cz,
        cx, cy, cz - s * 1.4, cx, cy, cz + s * 1.4
      );
      if (isRed) {
        redNodePositions.push(cx, cy, cz);
      }
    }

    const crossGeo = new THREE.BufferGeometry();
    crossGeo.setAttribute('position', new THREE.Float32BufferAttribute(crossPositions, 3));
    const crossMat = new THREE.LineBasicMaterial({
      color: 0x181816,
      transparent: true,
      opacity: 0.36,
    });
    this.hologramGridGroup.add(new THREE.LineSegments(crossGeo, crossMat));

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.Float32BufferAttribute(redNodePositions, 3));
    const nodeMat = new THREE.PointsMaterial({
      color: 0xff261b,
      size: 0.11,
      sizeAttenuation: true,
    });
    this.hologramGridGroup.add(new THREE.Points(nodeGeo, nodeMat));

    // 3. Holographic Depth Rings / Floating Framing Planes in 3D space
    const frameGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(11.5, 5.6, 4.2));
    const frameMat = new THREE.LineBasicMaterial({
      color: 0x8e8e86,
      transparent: true,
      opacity: 0.16,
    });
    const depthFrame = new THREE.LineSegments(frameGeo, frameMat);
    depthFrame.position.set(-0.5, 0.2, -3.2);
    this.hologramGridGroup.add(depthFrame);

    this.disposables.push(crossGeo, crossMat, nodeGeo, nodeMat, frameGeo, frameMat);
  }

  /**
   * Builds the 3D Mast Pole, Horizontal Cantilever Arm, 45° Gusset Strut,
   * Guy-Wires, Top Red Beacon, Anemometer Sensor Cube, 4 Suspension Hooks,
   * and the 3D Waving Swallowtail Flag matching /public/assets/aistudio/image_3ab175fa.png.
   */
  private buildFlagAndMastRig(): void {
    this.worldRoot.add(this.flagRigGroup);

    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x181816,
      roughness: 0.32,
      metalness: 0.78,
    });
    const redMat = new THREE.MeshStandardMaterial({
      color: 0xff261b,
      roughness: 0.25,
      metalness: 0.2,
      emissive: 0xff261b,
      emissiveIntensity: 0.35,
    });
    this.disposables.push(poleMat, redMat);

    const mastX = -1.65;
    const boomY = 2.25;
    const flagW = 2.75;
    const flagH = 3.95;
    const flagLeftX = -1.18;
    const flagTopY = 2.02;

    // 1. Vertical Mast Pole (left of flag)
    const mastGeo = new THREE.CylinderGeometry(0.042, 0.046, 7.6, 20);
    const mastMesh = new THREE.Mesh(mastGeo, poleMat);
    mastMesh.position.set(mastX, -0.85, 0);
    this.flagRigGroup.add(mastMesh);
    this.disposables.push(mastGeo);

    // Collar bands on mast pole (matching image_3ab175fa.png)
    const collarGeo = new THREE.CylinderGeometry(0.056, 0.056, 0.11, 16);
    const collar1 = new THREE.Mesh(collarGeo, poleMat);
    collar1.position.set(mastX, 0.92, 0);
    this.flagRigGroup.add(collar1);
    this.disposables.push(collarGeo);

    // 2. Small Red Beacon Sphere on top of the mast pole
    const finialGeo = new THREE.SphereGeometry(0.052, 16, 16);
    const finialMesh = new THREE.Mesh(finialGeo, redMat);
    finialMesh.position.set(mastX, 2.98, 0);
    this.flagRigGroup.add(finialMesh);
    this.disposables.push(finialGeo);

    // 3. Angled Wind Sensor Arm + Rotating Black Cube at top of mast (from image_3ab175fa.png)
    const sensorArmGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.55, 10);
    const sensorArm = new THREE.Mesh(sensorArmGeo, poleMat);
    sensorArm.position.set(mastX + 0.16, 2.96, 0);
    sensorArm.rotation.z = -0.58;
    this.flagRigGroup.add(sensorArm);

    const cubeGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    this.windSensorCube = new THREE.Mesh(cubeGeo, poleMat);
    this.windSensorCube.position.set(mastX + 0.32, 3.19, 0);
    this.windSensorCube.rotation.set(0.4, 0.4, -0.58);
    this.flagRigGroup.add(this.windSensorCube);
    this.disposables.push(sensorArmGeo, cubeGeo);

    // 4. Horizontal Cantilever Boom Bar
    const boomLen = 3.85;
    const boomGeo = new THREE.CylinderGeometry(0.028, 0.028, boomLen, 16);
    boomGeo.rotateZ(Math.PI / 2);
    const boomMesh = new THREE.Mesh(boomGeo, poleMat);
    boomMesh.position.set(mastX + boomLen * 0.5, boomY, 0);
    this.flagRigGroup.add(boomMesh);

    const tipBallGeo = new THREE.SphereGeometry(0.038, 12, 12);
    const tipBall = new THREE.Mesh(tipBallGeo, poleMat);
    tipBall.position.set(mastX + boomLen, boomY, 0);
    this.flagRigGroup.add(tipBall);
    this.disposables.push(boomGeo, tipBallGeo);

    // 5. 45-Degree Diagonal Gusset Strut between Mast and Boom
    const strutLen = 1.08;
    const strutGeo = new THREE.CylinderGeometry(0.018, 0.018, strutLen, 12);
    const strutMesh = new THREE.Mesh(strutGeo, poleMat);
    strutMesh.position.set(mastX + 0.38, boomY - 0.38, 0);
    strutMesh.rotation.z = -Math.PI / 4;
    this.flagRigGroup.add(strutMesh);
    this.disposables.push(strutGeo);

    // 6. Tension Guy-Wires anchoring down-left and down-right from the mast
    const wireVertices = new Float32Array([
      mastX, 1.75, 0, mastX - 1.55, -4.4, 0.3,
      mastX, 1.75, 0, mastX - 1.15, -4.4, -0.25,
      mastX, 1.35, 0, mastX + 0.35, -4.4, -0.15,
    ]);
    const wireGeo = new THREE.BufferGeometry();
    wireGeo.setAttribute('position', new THREE.BufferAttribute(wireVertices, 3));
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x181816,
      transparent: true,
      opacity: 0.55,
    });
    const wireLines = new THREE.LineSegments(wireGeo, wireMat);
    this.flagRigGroup.add(wireLines);
    this.disposables.push(wireGeo, wireMat);

    // 7. Four Suspension Hooks & Grommet Rings along the top of the flag
    const hookGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.28, 10);
    const grommetGeo = new THREE.TorusGeometry(0.042, 0.012, 10, 20);
    const grommetMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f2,
      roughness: 0.25,
      metalness: 0.5,
    });
    this.disposables.push(hookGeo, grommetGeo, grommetMat);

    for (let i = 0; i < 4; i++) {
      const u = i / 3;
      const hx = flagLeftX + u * flagW;
      const hook = new THREE.Mesh(hookGeo, poleMat);
      hook.position.set(hx, boomY - 0.12, 0);
      this.flagRigGroup.add(hook);

      const grommet = new THREE.Mesh(grommetGeo, grommetMat);
      grommet.position.set(hx, flagTopY - 0.06, 0.02);
      this.flagRigGroup.add(grommet);
    }

    // 8. 3D Swallowtail Flag Mesh with Catenary Scallop Top & V-Notch Bottom
    const segX = 48;
    const segY = 64;
    const flagGeo = new THREE.PlaneGeometry(flagW, flagH, segX, segY);
    const posAttr = flagGeo.attributes.position;
    const uvAttr = flagGeo.attributes.uv;

    for (let i = 0; i < posAttr.count; i++) {
      const u = uvAttr.getX(i); // 0 (left) -> 1 (right)
      const v = uvAttr.getY(i); // 0 (bottom) -> 1 (top)

      // Top catenary sag between the 4 hooks (3 bays across u = 0..1)
      const baySin = Math.abs(Math.sin(u * 3.0 * Math.PI));
      const topScallop = -0.11 * baySin * Math.pow(v, 1.6);

      // Bottom swallowtail V-notch (peaks at center u = 0.5, lowest at corners u = 0, 1)
      const centerProximity = 1.0 - Math.min(1.0, Math.abs(u - 0.5) * 2.0);
      const bottomNotch = 0.34 * centerProximity * Math.pow(1.0 - v, 1.45);

      // Slight horizontal pinch in the middle waist from fabric tension
      const waistPinch = (u - 0.5) * -0.05 * Math.sin(v * Math.PI);

      posAttr.setX(i, posAttr.getX(i) + waistPinch);
      posAttr.setY(i, posAttr.getY(i) + topScallop + bottomNotch);
    }
    flagGeo.computeVertexNormals();

    this.flagShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.flagTexture },
        uTime: { value: 0 },
        uFlutter: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
      },
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime;
        uniform float uFlutter;
        uniform vec2 uMouse;

        varying vec2 vUv;
        varying float vWaveCrest;
        varying vec3 vWorldNormal;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Pin the top edge at the 4 grommet rings, allowing natural hanging movement below
          float distG0 = length(vec2(uv.x - 0.0, uv.y - 1.0));
          float distG1 = length(vec2(uv.x - 0.3333, uv.y - 1.0));
          float distG2 = length(vec2(uv.x - 0.6667, uv.y - 1.0));
          float distG3 = length(vec2(uv.x - 1.0, uv.y - 1.0));
          float minGrommetDist = min(min(distG0, distG1), min(distG2, distG3));

          float topFreedom = smoothstep(0.0, 0.16, 1.0 - uv.y);
          float grommetPin = smoothstep(0.02, 0.14, minGrommetDist);
          float freedom = max(topFreedom, grommetPin * 0.45);

          // Base wind + intense mouse-triggered flutter
          float speed = 3.2 + uFlutter * 4.5;
          float amp = (0.14 + uFlutter * 0.22) * freedom;

          float wave1 = sin(uv.x * 5.2 - uTime * speed + uv.y * 2.4);
          float wave2 = cos(uv.y * 6.8 - uTime * (speed * 0.85) - uv.x * 3.1) * 0.55;
          // High-frequency aerodynamic edge flutter when mouse moves fast
          float ripple = sin(uv.x * 16.0 - uTime * 19.0) * sin(uv.y * 12.0 - uTime * 15.0) * (0.08 + uFlutter * 0.42);

          float totalWave = wave1 + wave2 + ripple;
          pos.z += totalWave * amp;
          pos.x += sin(uTime * 2.4 + uv.y * 4.0) * 0.045 * freedom * (1.0 + uFlutter * 1.4);
          pos.y += cos(uTime * 3.0 + uv.x * 5.0) * 0.025 * freedom * uFlutter;

          vWaveCrest = totalWave * freedom;

          // Approximate perturbed normal for rich cloth self-shadowing
          float dWaveDx = cos(uv.x * 5.2 - uTime * speed + uv.y * 2.4) * 5.2 * amp;
          float dWaveDy = -sin(uv.y * 6.8 - uTime * (speed * 0.85) - uv.x * 3.1) * 3.7 * amp;
          vec3 perturbedNormal = normalize(vec3(-dWaveDx * 0.28, -dWaveDy * 0.28, 1.0));
          vWorldNormal = normalize(normalMatrix * perturbedNormal);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uTime;
        uniform float uFlutter;

        varying vec2 vUv;
        varying float vWaveCrest;
        varying vec3 vWorldNormal;

        void main() {
          vec4 texColor = texture2D(uMap, vUv);

          // Directional studio key lighting + cloth crease ambient occlusion
          vec3 lightDir = normalize(vec3(0.45, 0.55, 0.85));
          float diff = max(dot(normalize(vWorldNormal), lightDir), 0.0);

          // Crease shading from wave crests and troughs
          float foldShade = clamp(0.88 + vWaveCrest * 0.16 + diff * 0.18, 0.68, 1.16);

          // Subtle ripstop technical fabric weave
          float weaveX = sin(vUv.x * 380.0) * 0.5 + 0.5;
          float weaveY = sin(vUv.y * 520.0) * 0.5 + 0.5;
          float microWeave = mix(0.975, 1.025, weaveX * weaveY);

          vec3 finalRgb = texColor.rgb * foldShade * microWeave;
          gl_FragColor = vec4(finalRgb, texColor.a);
        }
      `,
    });

    const flagMesh = new THREE.Mesh(flagGeo, this.flagShaderMat);
    flagMesh.position.set(flagLeftX + flagW * 0.5, flagTopY - flagH * 0.5, 0);
    this.flagRigGroup.add(flagMesh);
    this.disposables.push(flagGeo, this.flagShaderMat);
  }

  /**
   * Draws the high-resolution graphics and continuously animating 1-4 headlines
   * onto the 3D Flag's CanvasTexture, styled directly after image_3ab175fa.png.
   */
  private drawFlagCanvasTexture(elapsedSec: number): void {
    const ctx = this.flagCtx;
    const W = this.flagCanvas.width;
    const H = this.flagCanvas.height;

    // 1. Base Vermilion-Orange Technical Banner Color (#eb3b1f / #ff261b)
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#f03e22');
    grad.addColorStop(0.55, '#e2351b');
    grad.addColorStop(1, '#c92b14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 2. Subtle Technical Blueprint Grid & Telemetry Lines (like image_3ab175fa.png)
    ctx.strokeStyle = 'rgba(24, 24, 22, 0.14)';
    ctx.lineWidth = 1.5;
    for (let y = 120; y < H - 100; y += 90) {
      ctx.beginPath();
      ctx.moveTo(44, y);
      ctx.lineTo(W - 44, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(350, 310);
    ctx.lineTo(350, 680);
    ctx.stroke();

    // 3. Top Row: Peak Icon + "NIT SILCHAR · B.TECH EE" and Right Elevation/Wind Metric
    ctx.fillStyle = '#181816';
    ctx.beginPath();
    ctx.moveTo(46, 118);
    ctx.lineTo(66, 92);
    ctx.lineTo(80, 110);
    ctx.lineTo(92, 98);
    ctx.lineTo(108, 118);
    ctx.closePath();
    ctx.fill();

    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(24, 24, 22, 0.78)';
    ctx.fillText('NIT SILCHAR · ASSAM', 120, 114);

    ctx.textAlign = 'right';
    ctx.font = '500 14px "JetBrains Mono", monospace';
    ctx.fillText('ORCID // 9012-4034', W - 46, 98);
    ctx.font = '700 28px "Space Grotesk", sans-serif';
    ctx.fillStyle = '#181816';
    ctx.fillText('2026 B.Tech', W - 46, 132);
    ctx.textAlign = 'left';

    // 4. Giant Flag Header Title (matching "ARÊTE" in image_3ab175fa.png)
    ctx.fillStyle = '#181816';
    ctx.font = '800 124px "Syne", "Space Grotesk", sans-serif';
    ctx.fillText('ARYAN', 42, 252);

    // Circumflex accent mark above the second 'A' in ARYAN (homage to ARÊTE)
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#181816';
    ctx.beginPath();
    ctx.moveTo(324, 146);
    ctx.lineTo(344, 124);
    ctx.lineTo(364, 146);
    ctx.stroke();

    ctx.font = '500 21px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(24, 24, 22, 0.82)';
    ctx.fillText('Electrical Engineering & Full-Stack Systems', 46, 290);

    // 5. Left Circular Wind / Telemetry Dial Gauge (matching the 2.7 dial in image_3ab175fa.png)
    const cx = 186;
    const cy = 485;
    const r = 114;

    ctx.strokeStyle = 'rgba(24, 24, 22, 0.65)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.78, Math.PI * 2.22);
    ctx.stroke();

    // Tick marks around the circular gauge
    for (let t = 0; t <= 20; t++) {
      const ang = Math.PI * 0.78 + (t / 20) * (Math.PI * 1.44);
      const innerR = t % 5 === 0 ? r - 16 : r - 9;
      ctx.lineWidth = t % 5 === 0 ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * innerR, cy + Math.sin(ang) * innerR);
      ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
      ctx.stroke();
    }

    // Dynamic Wind Speed value & oscillating gauge needle (reacts hard to mouse movement!)
    const windSpeed = 2.7 + Math.sin(elapsedSec * 2.3) * 0.6 + this.windFlutterBoost * 4.8;
    const needleNorm = Math.min(1, (windSpeed - 1.5) / 14.0);
    const needleAngle = Math.PI * 0.82 + needleNorm * (Math.PI * 1.35);

    ctx.strokeStyle = '#181816';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (r - 22), cy + Math.sin(needleAngle) * (r - 22));
    ctx.stroke();

    ctx.fillStyle = '#181816';
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.font = '700 42px "Space Grotesk", sans-serif';
    ctx.fillText(windSpeed.toFixed(1), cx, cy + 56);
    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(24, 24, 22, 0.75)';
    ctx.fillText('m/s FLUTTER', cx, cy + 78);
    ctx.textAlign = 'left';

    // 6. Right-Side Live 4-Item Index Matrix (shows all 4 items with active indicator)
    const cycleDuration = 3.2; // seconds per headline
    const timeSlideFloat = elapsedSec / cycleDuration;
    // Combine continuous time cycle with user scroll progress
    const activeIndex =
      this.scrollProgress > 0.06
        ? Math.min(3, Math.floor(this.scrollProgress * 4))
        : Math.floor(timeSlideFloat) % FLAG_SLIDES.length;
    const phaseInSlide =
      this.scrollProgress > 0.06 ? 1 : Math.min(1, (elapsedSec % cycleDuration) / 0.45);

    const listLabels = [
      '1. Electrical Eng @ NIT Silchar',
      '2. Developer | Programmer | Eng',
      '3. ML | Data Science | Full Stack',
      '4. Scroll for details',
    ];

    ctx.font = '600 15px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(24, 24, 22, 0.72)';
    ctx.fillText('LIVE SEQUENCE // 01—04', 376, 358);

    listLabels.forEach((itemText, idx) => {
      const rowY = 404 + idx * 54;
      const isCurrent = idx === activeIndex;

      if (isCurrent) {
        ctx.fillStyle = '#181816';
        ctx.fillRect(372, rowY - 24, W - 414, 36);
        ctx.fillStyle = '#f5f5f2';
        ctx.font = '700 16px "JetBrains Mono", monospace';
        ctx.fillText(itemText, 384, rowY - 1);
      } else {
        ctx.fillStyle = 'rgba(24, 24, 22, 0.78)';
        ctx.font = '500 15px "JetBrains Mono", monospace';
        ctx.fillText(itemText, 384, rowY - 1);
      }
    });

    // 7. Bottom Primary Headline Area (matching "Weather for high places." in image_3ab175fa.png)
    const currentSlide = FLAG_SLIDES[activeIndex];

    // Dark Rectangular Badge Tag above the big headline
    ctx.fillStyle = '#181816';
    ctx.fillRect(46, 654, 300, 32);
    ctx.fillStyle = '#f5f5f2';
    ctx.font = '700 15px "JetBrains Mono", monospace';
    ctx.fillText(currentSlide.tag, 58, 675);

    // Big Bold Multi-Line Animated Headline
    ctx.save();
    const slideOffsetY = (1 - phaseInSlide) * 18;
    ctx.globalAlpha = 0.25 + 0.75 * phaseInSlide;
    ctx.fillStyle = '#181816';
    ctx.font = '800 56px "Space Grotesk", sans-serif';

    currentSlide.lines.forEach((line, lineIdx) => {
      ctx.fillText(line, 46, 750 + lineIdx * 62 + slideOffsetY);
    });

    // Subtitle line underneath the main headline
    const subY = 750 + currentSlide.lines.length * 62 + 8;
    ctx.font = '500 17px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(24, 24, 22, 0.85)';
    ctx.fillText(currentSlide.sub, 46, subY);
    ctx.restore();

    // 8. Bottom Horizontal Timeline Bar & Progress Marker (like bottom of image_3ab175fa.png)
    const barY = 955;
    ctx.strokeStyle = 'rgba(24, 24, 22, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(46, barY);
    ctx.lineTo(W - 46, barY);
    ctx.stroke();

    const totalCycleProgress =
      this.scrollProgress > 0.06
        ? this.scrollProgress
        : ((elapsedSec / cycleDuration) % FLAG_SLIDES.length) / FLAG_SLIDES.length;
    const knobX = 46 + totalCycleProgress * (W - 92);

    ctx.fillStyle = '#181816';
    ctx.beginPath();
    ctx.arc(knobX, barY, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '600 14px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(24, 24, 22, 0.78)';
    ctx.fillText(`SLIDE 0${activeIndex + 1} / 04`, 46, barY + 28);
    ctx.textAlign = 'right';
    ctx.fillText('SCROLL FOR DETAILS ↓', W - 46, barY + 28);
    ctx.textAlign = 'left';

    this.flagTexture.needsUpdate = true;
  }

  /**
   * Positions the 3D Flag on the right side behind the "aryandas" name
   * and scales it cleanly for desktop and mobile viewports.
   */
  private layoutSceneForViewport(): void {
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const visH = 2 * Math.tan(vFov / 2) * this.camera.position.z;
    const visW = visH * this.camera.aspect;

    const isCompact = this.container.clientWidth < 768;
    if (isCompact) {
      this.flagRigGroup.position.set(visW * 0.12, -0.05, -0.4);
      this.flagRigGroup.scale.setScalar(0.76);
      this.flagRigGroup.rotation.set(0.03, -0.18, 0.01);
    } else {
      // Positioned on the right side, standing behind the right half of "aryandas"
      this.flagRigGroup.position.set(visW * 0.21, -0.08, -0.35);
      this.flagRigGroup.scale.setScalar(0.96);
      this.flagRigGroup.rotation.set(0.04, -0.22, 0.015);
    }
  }

  /**
   * Triggered on mouse move: creates both 3D holographic depth parallax
   * and intense wind flutter on the 3D flag!
   */
  public onPointerMove(clientX: number, clientY: number): void {
    const rect = this.container.getBoundingClientRect();
    const nx = ((clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    const ny = -((clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;

    const dx = nx - this.mouseNdc.x;
    const dy = ny - this.mouseNdc.y;
    const speed = Math.hypot(dx, dy);

    this.mouseNdc.set(nx, ny);
    this.targetCameraParallax.set(nx * 0.85, ny * 0.52);

    // Boost wind flutter strongly when mouse moves across the screen
    const proximityToRightFlag = nx > -0.1 ? 1.45 : 1.0;
    this.targetWindFlutterBoost = Math.min(
      2.6,
      this.targetWindFlutterBoost + speed * 14.0 * proximityToRightFlag
    );
  }

  public setScrollProgress(progress: number): void {
    this.scrollProgress = THREE.MathUtils.clamp(progress, 0, 1);
    // Scrolling also sends a gust of wind through the flag
    this.targetWindFlutterBoost = Math.min(2.2, this.targetWindFlutterBoost + 0.18);
  }

  private handleResize(): void {
    if (this.disposed) return;
    const width = Math.max(this.container.clientWidth, 300);
    const height = Math.max(this.container.clientHeight, 300);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.layoutSceneForViewport();
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
    const delta = Math.min((nowMs - this.lastTimeMs) / 1000, 0.1);
    this.lastTimeMs = nowMs;
    const elapsedSec = nowMs / 1000;

    // Decay wind flutter boost smoothly back to ambient wind
    this.targetWindFlutterBoost = Math.max(0, this.targetWindFlutterBoost - delta * 2.4);
    this.windFlutterBoost = THREE.MathUtils.damp(
      this.windFlutterBoost,
      this.targetWindFlutterBoost,
      8.0,
      delta
    );

    // Smooth 3D Holographic Camera Parallax + Scroll Depth Dollies
    this.currentCameraParallax.x = THREE.MathUtils.damp(
      this.currentCameraParallax.x,
      this.targetCameraParallax.x,
      5.0,
      delta
    );
    this.currentCameraParallax.y = THREE.MathUtils.damp(
      this.currentCameraParallax.y,
      this.targetCameraParallax.y,
      5.0,
      delta
    );

    this.camera.position.x = this.currentCameraParallax.x;
    this.camera.position.y = this.currentCameraParallax.y - this.scrollProgress * 0.45;
    this.camera.position.z = 11.5 - this.scrollProgress * 1.1;
    this.camera.lookAt(
      this.currentCameraParallax.x * 0.25,
      this.currentCameraParallax.y * 0.2,
      -1.5
    );

    // Subtle counter-rotation of the flag rig for dramatic 3D holographic relief
    this.flagRigGroup.rotation.y =
      -0.22 - this.currentCameraParallax.x * 0.14 + Math.sin(elapsedSec * 1.1) * 0.03;
    this.flagRigGroup.rotation.x = 0.04 + this.currentCameraParallax.y * 0.08;

    // Spin the top anemometer cube faster when the wind flutters
    if (this.windSensorCube) {
      this.windSensorCube.rotation.y += delta * (1.8 + this.windFlutterBoost * 7.5);
    }

    // Update Cloth Shader Uniforms
    if (this.flagShaderMat) {
      this.flagShaderMat.uniforms.uTime.value = elapsedSec;
      this.flagShaderMat.uniforms.uFlutter.value = this.windFlutterBoost;
      this.flagShaderMat.uniforms.uMouse.value.copy(this.mouseNdc);
    }

    // Redraw dynamic CanvasTexture at ~20fps so text animation & wind gauge are fluid
    if (nowMs - this.lastRedrawMs > 48) {
      this.lastRedrawMs = nowMs;
      this.drawFlagCanvasTexture(elapsedSec);
    }

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
