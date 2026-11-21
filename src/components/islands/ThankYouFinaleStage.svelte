<script lang="ts">
  import { onMount, tick } from 'svelte';
  import gsap from 'gsap';
  import {
    InstancedBinaryDustRenderer,
    detectDeviceGpuTier,
  } from '../../lib/three/InstancedBinaryDust';

  interface Props {
    buildProgress?: number;
    anchorEl?: HTMLElement | null;
    connectButtonEl?: HTMLElement | null;
    sayHiOpen?: boolean;
  }

  interface CppToken {
    text: string;
    color: string;
  }

  interface VisibleCppLine {
    lineNumber: number;
    tokens: CppToken[];
    isCursorLine: boolean;
  }

  // Authentic GitHub Dark Default C++ syntax highlighting
  const SAY_HI_CPP_LINES: CppToken[][] = [
    [
      { text: '#include', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: '<iostream>', color: '#a5d6ff' },
    ],
    [
      { text: 'using', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: 'namespace', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: 'std', color: '#79c0ff' },
      { text: ';', color: '#e6edf3' },
    ],
    [
      { text: 'int', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: 'main', color: '#d2a8ff' },
      { text: '() {', color: '#e6edf3' },
    ],
    [
      { text: '  cout ', color: '#79c0ff' },
      { text: '<<', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: '"Hey! Let\'s connect & build."', color: '#a5d6ff' },
      { text: ' ', color: '#e6edf3' },
      { text: '<<', color: '#ff7b72' },
      { text: ' endl', color: '#79c0ff' },
      { text: ';', color: '#e6edf3' },
    ],
    [
      { text: '  return', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: '0', color: '#79c0ff' },
      { text: ';', color: '#e6edf3' },
    ],
    [{ text: '}', color: '#e6edf3' }],
  ];

  const TOTAL_SAY_HI_CHARS = SAY_HI_CPP_LINES.reduce(
    (acc, line) => acc + line.reduce((s, t) => s + t.text.length, 0),
    0
  );

  interface ConnectChannel {
    id: 'instagram' | 'linkedin' | 'github' | 'mail' | 'resume';
    label: string;
    handle: string;
    href?: string;
    external?: boolean;
    download?: string;
  }

  const CONNECT_CHANNELS: ConnectChannel[] = [
    {
      id: 'instagram',
      label: 'Instagram',
      handle: '@iam_aryandas',
      href: 'https://www.instagram.com/iam_aryandas/',
      external: true,
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      handle: '@iam-aryandas',
      href: 'https://www.linkedin.com/in/iam-aryandas',
      external: true,
    },
    {
      id: 'github',
      label: 'GitHub',
      handle: '@aryandas079',
      href: 'https://github.com/aryandas079',
      external: true,
    },
    {
      id: 'mail',
      label: 'Mail',
      handle: 'aryandas.original@gmail.com',
      href: 'mailto:aryandas.original@gmail.com',
      external: false,
    },
    {
      id: 'resume',
      label: 'Resume',
      handle: 'Aryan_Das_CV.pdf',
      href: `${import.meta.env.BASE_URL}assets/aistudio/Profile_585ff650.pdf`,
      download: 'Aryan_Das_CV.pdf',
    },
  ];

  let {
    buildProgress = 0,
    anchorEl = $bindable<HTMLElement | null>(null),
    connectButtonEl = $bindable<HTMLElement | null>(null),
    sayHiOpen = $bindable(false),
  }: Props = $props();

  let stageEl = $state<HTMLElement | null>(null);
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let cvDownloaded = $state(false);
  let cvResetTimer = 0;

  // Interactive Connect Floating C++ Editor + Binary-Dust Pop-Out Links + 3D Cluster Modal
  let connectModalOpen = $state(false);
  let clusterModalOpen = $state(false);

  $effect(() => {
    sayHiOpen = connectModalOpen || clusterModalOpen;
  });

  let sayHiBackdropEl = $state<HTMLElement | null>(null);
  let sayHiEditorEl = $state<HTMLElement | null>(null);
  let sayHiCodeScrollEl = $state<HTMLElement | null>(null);
  let sayHiTerminalEl = $state<HTMLElement | null>(null);
  let sayHiDustCanvasEl = $state<HTMLCanvasElement | null>(null);
  let sayHiIconEls = $state<Array<HTMLElement | null>>([null, null, null, null, null, null]);
  let sayHiTimeline: gsap.core.Timeline | null = null;
  let sayHiIconsTl: gsap.core.Timeline | null = null;
  let cppTypedChars = $state(0);
  let iconsReady = $state(false);
  let hoveredChannelId = $state<string | null>(null);
  let copiedMail = $state(false);
  let copyMailTimer = 0;

  let startIconDustCondensation: (() => void) | null = null;
  let resetIconDustCondensation: (() => void) | null = null;
  let emitModalIconBurst: ((clientX: number, clientY: number, count?: number) => void) | null = null;
  let modalGpuRenderer: InstancedBinaryDustRenderer | null = null;
  let triggerLinkDustBurst: ((clientX: number, clientY: number, count?: number) => void) | null = null;

  // Lazy GPU InstancedMesh lifecycle for the Connect C++ modal (zero idle WebGL context when closed)
  $effect(() => {
    const modalCanvas = sayHiDustCanvasEl;
    if (!connectModalOpen || !modalCanvas) {
      if (modalGpuRenderer) {
        modalGpuRenderer.dispose();
        modalGpuRenderer = null;
      }
      return;
    }

    const gpuTier = detectDeviceGpuTier();
    const mw = Math.max(320, window.innerWidth);
    const mh = Math.max(320, window.innerHeight);
    const renderer = new InstancedBinaryDustRenderer({
      canvas: modalCanvas,
      maxInstances: 620,
      width: mw,
      height: mh,
      maxDpr: gpuTier.recommendedMaxDpr,
    });
    modalGpuRenderer = renderer;

    return () => {
      renderer.dispose();
      if (modalGpuRenderer === renderer) {
        modalGpuRenderer = null;
      }
    };
  });

  // Non-passive touch handlers on the floating C++ editor (micro-tilt, dust trail, tap-to-complete, swipe-down dismiss)
  $effect(() => {
    const editorEl = sayHiEditorEl;
    if (!connectModalOpen || !editorEl) return;

    type EditorTouchMode = 'none' | 'pending' | 'tilt-scroll' | 'dismiss';
    let mode: EditorTouchMode = 'none';
    let startX = 0;
    let startY = 0;
    let dragY = 0;
    let lastSparkMs = 0;
    let startedInCloseBtn = false;

    const applyTilt = (clientX: number, clientY: number) => {
      const rect = editorEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = ((clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((clientY - rect.top) / rect.height - 0.5) * 2;
      gsap.to(editorEl, {
        rotateY: Math.max(-5, Math.min(5, nx * 4.5)),
        rotateX: Math.max(-5, Math.min(5, -ny * 4.5)),
        transformPerspective: 860,
        duration: 0.18,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    };

    const onEditorTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      startedInCloseBtn = Boolean(target?.closest('button[aria-label="Close"]'));
      if (startedInCloseBtn) return;

      const t = e.touches[0];
      mode = 'pending';
      startX = t.clientX;
      startY = t.clientY;
      dragY = 0;
      lastSparkMs = performance.now();
      emitModalIconBurst?.(t.clientX, t.clientY, 8);
      applyTilt(t.clientX, t.clientY);
    };

    const onEditorTouchMove = (e: TouchEvent) => {
      if (startedInCloseBtn || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const now = performance.now();

      if (now - lastSparkMs > 42) {
        lastSparkMs = now;
        emitModalIconBurst?.(t.clientX, t.clientY, 4);
      }

      if (mode === 'pending') {
        if (Math.hypot(dx, dy) < 9) return;
        const canScrollHoriz =
          sayHiCodeScrollEl !== null &&
          sayHiCodeScrollEl.scrollWidth > sayHiCodeScrollEl.clientWidth + 2 &&
          sayHiCodeScrollEl.contains(e.target as Node);

        if (canScrollHoriz && Math.abs(dx) >= Math.abs(dy)) {
          mode = 'tilt-scroll';
        } else if (dy > 10 && Math.abs(dy) > Math.abs(dx) * 1.2) {
          mode = 'dismiss';
        } else {
          mode = 'tilt-scroll';
        }
      }

      if (mode === 'dismiss') {
        e.preventDefault();
        dragY = Math.max(0, dy * 0.78);
        const fade = Math.max(0.28, 1 - dragY / 240);
        gsap.set(editorEl, { y: dragY, opacity: fade, rotateX: 0, rotateY: 0 });
      } else {
        applyTilt(t.clientX, t.clientY);
      }
    };

    const onEditorTouchEnd = (e: TouchEvent) => {
      if (startedInCloseBtn) {
        startedInCloseBtn = false;
        return;
      }
      const endedMode = mode;
      mode = 'none';

      if (endedMode === 'dismiss' && dragY > 72) {
        closeConnectModal();
        return;
      }

      gsap.to(editorEl, {
        x: 0,
        y: 0,
        opacity: 1,
        rotateX: 0,
        rotateY: 0,
        duration: 0.36,
        ease: 'expo.out',
      });

      if (endedMode === 'pending') {
        const changed = e.changedTouches[0];
        const cx = changed ? changed.clientX : startX;
        const cy = changed ? changed.clientY : startY;
        const hitTerminal = Boolean(
          sayHiTerminalEl && sayHiTerminalEl.contains(e.target as Node)
        );
        if (cppTypedChars < TOTAL_SAY_HI_CHARS) {
          cppTypedChars = TOTAL_SAY_HI_CHARS;
          emitModalIconBurst?.(cx, cy, 18);
          revealIconsFromBinaryDust();
        } else if (hitTerminal) {
          replaySayHiCpp(cx, cy);
        }
      }
    };

    editorEl.addEventListener('touchstart', onEditorTouchStart, { passive: true });
    editorEl.addEventListener('touchmove', onEditorTouchMove, { passive: false });
    editorEl.addEventListener('touchend', onEditorTouchEnd, { passive: true });
    editorEl.addEventListener('touchcancel', onEditorTouchEnd, { passive: true });

    return () => {
      editorEl.removeEventListener('touchstart', onEditorTouchStart);
      editorEl.removeEventListener('touchmove', onEditorTouchMove);
      editorEl.removeEventListener('touchend', onEditorTouchEnd);
      editorEl.removeEventListener('touchcancel', onEditorTouchEnd);
    };
  });

  function getVisibleCppLines(charCount: number): VisibleCppLine[] {
    let remaining = Math.max(0, Math.floor(charCount));
    const result: VisibleCppLine[] = [];

    for (let i = 0; i < SAY_HI_CPP_LINES.length; i++) {
      const lineTokens = SAY_HI_CPP_LINES[i];
      const lineLen = lineTokens.reduce((acc, t) => acc + t.text.length, 0);

      if (remaining >= lineLen) {
        remaining -= lineLen;
        result.push({
          lineNumber: i + 1,
          tokens: lineTokens,
          isCursorLine: i === SAY_HI_CPP_LINES.length - 1 && remaining >= 0,
        });
      } else {
        const partial: CppToken[] = [];
        let lineRem = remaining;
        for (const tok of lineTokens) {
          if (lineRem <= 0) break;
          if (lineRem >= tok.text.length) {
            partial.push(tok);
            lineRem -= tok.text.length;
          } else {
            partial.push({ text: tok.text.slice(0, lineRem), color: tok.color });
            lineRem = 0;
          }
        }
        result.push({
          lineNumber: i + 1,
          tokens: partial,
          isCursorLine: true,
        });
        break;
      }
    }

    if (result.length === 0) {
      result.push({ lineNumber: 1, tokens: [], isCursorLine: true });
    }
    return result;
  }

  let visibleSayHiCpp = $derived(getVisibleCppLines(cppTypedChars));
  let cppFinished = $derived(cppTypedChars >= TOTAL_SAY_HI_CHARS);
  let activeHoverChannel = $derived(
    hoveredChannelId
      ? (CONNECT_CHANNELS.find((c) => c.id === hoveredChannelId) ?? null)
      : null
  );

  // Derived reveal opacity from scroll-driven buildProgress (0..1)
  let headerOpacity = $derived(Math.max(0, Math.min(1, (buildProgress - 0.36) / 0.44)));

  function handleButtonHover(e: PointerEvent): void {
    triggerLinkDustBurst?.(e.clientX, e.clientY, 16);
  }

  function revealIconsFromBinaryDust(): void {
    if (iconsReady) return;
    iconsReady = true;
    startIconDustCondensation?.();

    sayHiIconsTl?.kill();
    const tl = gsap.timeline({ defaults: { force3D: true } });
    sayHiIconsTl = tl;

    sayHiIconEls.forEach((el, idx) => {
      if (!el) return;
      const startAt = 0.34 + idx * 0.09;
      tl.fromTo(
        el,
        { opacity: 0, scale: 0.58, y: 12, filter: 'blur(5px)' },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.52,
          ease: 'expo.out',
          clearProps: 'transform,filter',
        },
        startAt
      );
    });
  }

  function replaySayHiCpp(clientX: number, clientY: number): void {
    emitModalIconBurst?.(clientX, clientY, 18);
    cppTypedChars = 0;
    iconsReady = false;
    resetIconDustCondensation?.();
    sayHiIconsTl?.kill();
    sayHiIconEls.forEach((el) => {
      if (el) {
        gsap.set(el, { opacity: 0, scale: 0.58, y: 12, filter: 'blur(5px)' });
      }
    });
  }

  async function openConnectModal(e: MouseEvent): Promise<void> {
    e.stopPropagation();
    triggerLinkDustBurst?.(e.clientX, e.clientY, 28);
    connectModalOpen = true;
    cppTypedChars = 0;
    iconsReady = false;
    hoveredChannelId = null;
    copiedMail = false;
    resetIconDustCondensation?.();

    await tick();

    sayHiTimeline?.kill();
    sayHiIconsTl?.kill();

    sayHiIconEls.forEach((el) => {
      if (el) {
        gsap.set(el, { opacity: 0, scale: 0.58, y: 12, filter: 'blur(5px)' });
      }
    });

    const tl = gsap.timeline({ defaults: { force3D: true } });
    sayHiTimeline = tl;

    if (sayHiBackdropEl) {
      tl.fromTo(
        sayHiBackdropEl,
        { opacity: 0 },
        { opacity: 1, duration: 0.32, ease: 'power2.out' },
        0
      );
    }

    if (sayHiEditorEl) {
      tl.fromTo(
        sayHiEditorEl,
        { opacity: 0, scale: 0.92, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.54, ease: 'expo.out' },
        0.04
      );
    }
  }

  function closeConnectModal(): void {
    if (!connectModalOpen) return;
    sayHiTimeline?.kill();
    sayHiIconsTl?.kill();
    resetIconDustCondensation?.();

    const tl = gsap.timeline({
      defaults: { force3D: true },
      onComplete: () => {
        connectModalOpen = false;
        iconsReady = false;
        hoveredChannelId = null;
      },
    });
    sayHiTimeline = tl;

    const visibleIcons = sayHiIconEls.filter((el): el is HTMLElement => el !== null);
    if (visibleIcons.length > 0 && iconsReady) {
      tl.to(
        visibleIcons,
        { opacity: 0, scale: 0.78, y: 10, duration: 0.16, stagger: 0.02, ease: 'power2.in' },
        0
      );
    }

    if (sayHiEditorEl) {
      tl.to(
        sayHiEditorEl,
        { opacity: 0, scale: 0.94, y: 16, duration: 0.22, ease: 'power2.in' },
        0.02
      );
    }
    if (sayHiBackdropEl) {
      tl.to(sayHiBackdropEl, { opacity: 0, duration: 0.24, ease: 'power2.in' }, 0.04);
    } else {
      connectModalOpen = false;
    }
  }

  async function handleMailIconClick(e: MouseEvent): Promise<void> {
    e.stopPropagation();
    emitModalIconBurst?.(e.clientX, e.clientY, 24);
    try {
      await navigator.clipboard.writeText('aryandas.original@gmail.com');
      copiedMail = true;
      window.clearTimeout(copyMailTimer);
      copyMailTimer = window.setTimeout(() => {
        copiedMail = false;
      }, 2400);
    } catch {
      // Native mailto still executes
    }
  }

  function handleCvClick(e: MouseEvent): void {
    e.stopPropagation();
    emitModalIconBurst?.(e.clientX, e.clientY, 24);
    cvDownloaded = true;
    window.clearTimeout(cvResetTimer);
    cvResetTimer = window.setTimeout(() => {
      cvDownloaded = false;
    }, 2400);
  }

  function quinticSmooth(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  onMount(() => {
    const canvas = canvasEl;
    const stage = stageEl;
    if (!canvas || !stage) return;

    const gpuTier = detectDeviceGpuTier();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = Math.max(320, stage.clientWidth || window.innerWidth);
    let height = Math.max(400, stage.clientHeight || window.innerHeight);

    const mainGpu = new InstancedBinaryDustRenderer({
      canvas,
      maxInstances: 5400,
      width,
      height,
      maxDpr: Math.min(1.75, gpuTier.recommendedMaxDpr),
    });

    // Strict White, Obsidian Black & Signature #FF261B Red palette for InstancedMesh binary dust
    const WHITE_R = 1.0;
    const WHITE_G = 1.0;
    const WHITE_B = 1.0;
    const INK_R = 18 / 255;
    const INK_G = 18 / 255;
    const INK_B = 16 / 255;
    const MUTED_R = 88 / 255;
    const MUTED_G = 86 / 255;
    const MUTED_B = 82 / 255;
    const RED_R = 1.0;
    const RED_G = 38 / 255;
    const RED_B = 27 / 255;

    // Exact Monumental Geometric "ad" Paths (viewBox 0 0 1440 780) rasterized into crisp 1 & 0 binary cells
    const AD_VB_W = 1440;
    const AD_VB_H = 780;
    const AD_PATH_A =
      'M 42 220 H 460 C 610 220 676 300 676 430 V 780 H 196 C 54 780 -8 704 -8 594 C -8 486 58 424 196 424 H 516 C 516 368 484 344 426 344 H 42 Z M 218 544 H 516 V 656 H 218 C 166 656 144 632 144 600 C 144 568 166 544 218 544 Z';
    const AD_PATH_D =
      'M 1288 0 H 1448 V 780 H 1032 C 836 780 742 664 742 500 C 742 336 836 220 1032 220 H 1288 Z M 1044 352 H 1288 V 648 H 1044 C 942 648 898 588 898 500 C 898 412 942 352 1044 352 Z';

    // Pre-rasterize mask once offscreen (360 x 195 = exact 1:4 scale of 1440 x 780)
    const MASK_W = 360;
    const MASK_H = 195;
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = MASK_W;
    maskCanvas.height = MASK_H;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    let maskAlpha = new Uint8Array(MASK_W * MASK_H);
    if (maskCtx) {
      maskCtx.clearRect(0, 0, MASK_W, MASK_H);
      maskCtx.save();
      maskCtx.scale(MASK_W / AD_VB_W, MASK_H / AD_VB_H);
      maskCtx.fillStyle = '#ffffff';
      maskCtx.fill(new Path2D(AD_PATH_A), 'evenodd');
      maskCtx.fill(new Path2D(AD_PATH_D), 'evenodd');
      maskCtx.restore();
      const raw = maskCtx.getImageData(0, 0, MASK_W, MASK_H).data;
      for (let p = 0; p < MASK_W * MASK_H; p++) {
        maskAlpha[p] = raw[p * 4 + 3] > 110 ? 1 : 0;
      }
    }

    // Flat TypedArrays for the living Binary 1 & 0 "ad" Monogram (ZERO per-frame GC)
    let monoCount = 0;
    let monoX = new Float32Array(0);
    let monoY = new Float32Array(0);
    let monoBit = new Uint8Array(0);
    let monoEdge = new Uint8Array(0);
    let monoPhase = new Float32Array(0);
    let monoWavePos = new Float32Array(0);
    let monoGlyphSize = 14;
    let monoFlipCursor = 0;

    // 1. Subtle Obsidian Binary Rain Streams (Flat TypedArrays — ZERO per-frame GC)
    const CELL_H = 18;
    const MAX_LEN = 16;
    const RAIN_STEPS = 8;
    const rainAlphaLut = new Float32Array((MAX_LEN + 1) * MAX_LEN);
    for (let len = 1; len <= MAX_LEN; len++) {
      const base = len * MAX_LEN;
      for (let b = 1; b < len; b++) {
        const stepIdx = Math.min(
          RAIN_STEPS - 1,
          Math.floor(((len - b) / len) * RAIN_STEPS)
        );
        const ratio = (stepIdx + 1) / RAIN_STEPS;
        const smooth = ratio * ratio * (3 - 2 * ratio);
        rainAlphaLut[base + b] = 0.035 + smooth * 0.17;
      }
    }

    let streamCount = 0;
    let streamX = new Int16Array(0);
    let streamHeadY = new Float32Array(0);
    let streamSpeed = new Float32Array(0);
    let streamLen = new Uint8Array(0);
    let streamIsRedLead = new Uint8Array(0);
    let streamBits = new Uint8Array(0);

    // 2. Link Hover / Click Micro-Burst Pool (ZERO GC Ring Buffer)
    const BURST_POOL = 96;
    const burstX = new Float32Array(BURST_POOL);
    const burstY = new Float32Array(BURST_POOL);
    const burstVx = new Float32Array(BURST_POOL);
    const burstVy = new Float32Array(BURST_POOL);
    const burstLife = new Float32Array(BURST_POOL);
    const burstMaxLife = new Float32Array(BURST_POOL);
    const burstBit = new Uint8Array(BURST_POOL);
    const burstRed = new Uint8Array(BURST_POOL);
    let burstCursor = 0;

    triggerLinkDustBurst = (clientX: number, clientY: number, count = 16) => {
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const lx = clientX - rect.left;
      const ly = clientY - rect.top;
      for (let k = 0; k < count; k++) {
        const idx = burstCursor;
        burstCursor = (burstCursor + 1) % BURST_POOL;
        const angle = (k / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
        const speed = 42 + Math.random() * 115;
        burstX[idx] = lx + (Math.random() - 0.5) * 28;
        burstY[idx] = ly + (Math.random() - 0.5) * 14;
        burstVx[idx] = Math.cos(angle) * speed;
        burstVy[idx] = Math.sin(angle) * speed - 18;
        const maxL = 0.55 + Math.random() * 0.42;
        burstLife[idx] = maxL;
        burstMaxLife[idx] = maxL;
        burstBit[idx] = Math.random() > 0.5 ? 1 : 0;
        burstRed[idx] = k % 2 === 0 ? 1 : 0;
      }
    };

    function rebuildBinaryAdMonogram(): void {
      if (!stage) return;
      const stageRect = stage.getBoundingClientRect();
      const anchorRect = anchorEl?.getBoundingClientRect();

      let availLeft = 0;
      let availTop = Math.min(92, height * 0.14);
      let availW = width;
      let availH = Math.max(180, height - availTop);

      if (anchorRect && anchorRect.width > 40 && anchorRect.height > 40 && stageRect.width > 0) {
        availLeft = anchorRect.left - stageRect.left;
        availTop = anchorRect.top - stageRect.top;
        availW = anchorRect.width;
        availH = anchorRect.height;
      }

      // Match preserveAspectRatio="xMidYMax meet" so 'ad' sits monumental & flush to bottom edge
      const scale = Math.min(availW / AD_VB_W, availH / AD_VB_H);
      const drawW = AD_VB_W * scale;
      const drawH = AD_VB_H * scale;
      const offsetX = availLeft + (availW - drawW) * 0.5;
      const offsetY = availTop + (availH - drawH);

      // Compute crisp monospace matrix step so every '1' and '0' is sharp across cover screens, car displays & 4K TVs
      const targetCells = gpuTier.isLowEndMobile
        ? 1450
        : width >= 2200
          ? 3900
          : gpuTier.isCoarsePointer
            ? 2200
            : 3400;
      const fillRatio = 0.47;
      const colAspect = 0.58;
      const rowAspect = 0.76;
      const rawStep = Math.sqrt((drawW * drawH * fillRatio) / (targetCells * colAspect * rowAspect));
      const minStep = width < 380 ? 9.5 : width < 640 || height < 520 ? 11.5 : width >= 2200 ? 18.5 : 15.5;
      const maxStep = width < 380 ? 14.0 : width < 640 || height < 520 ? 16.5 : width >= 2200 ? 30.0 : 22.0;
      const cellSize = Math.max(minStep, Math.min(maxStep, rawStep));

      const stepX = cellSize * colAspect;
      const stepY = cellSize * rowAspect;
      monoGlyphSize = cellSize * 0.98;

      const cols = Math.max(1, Math.floor(drawW / stepX));
      const rows = Math.max(1, Math.floor(drawH / stepY));
      const padX = (drawW - cols * stepX) * 0.5;
      const padY = (drawH - rows * stepY) * 0.5;

      const maxCap = Math.min(4200, cols * rows);
      const tmpX = new Float32Array(maxCap);
      const tmpY = new Float32Array(maxCap);
      const tmpBit = new Uint8Array(maxCap);
      const tmpEdge = new Uint8Array(maxCap);
      const tmpPhase = new Float32Array(maxCap);
      const tmpWave = new Float32Array(maxCap);

      let count = 0;
      for (let r = 0; r < rows; r++) {
        const localY = padY + (r + 0.5) * stepY;
        const my = Math.min(MASK_H - 1, Math.max(0, Math.floor((localY / drawH) * MASK_H)));
        const rowOff = my * MASK_W;

        for (let c = 0; c < cols; c++) {
          if (count >= maxCap) break;
          const localX = padX + (c + 0.5) * stepX;
          const mx = Math.min(MASK_W - 1, Math.max(0, Math.floor((localX / drawW) * MASK_W)));
          if (maskAlpha[rowOff + mx] === 0) continue;

          // Edge detection on mask neighborhood to sharpen the 'a' and 'd' contour with crisp bits
          const leftOut = mx > 0 ? maskAlpha[rowOff + mx - 1] === 0 : true;
          const rightOut = mx < MASK_W - 1 ? maskAlpha[rowOff + mx + 1] === 0 : true;
          const upOut = my > 0 ? maskAlpha[(my - 1) * MASK_W + mx] === 0 : true;
          const downOut = my < MASK_H - 1 ? maskAlpha[(my + 1) * MASK_W + mx] === 0 : true;
          const isEdge = leftOut || rightOut || upOut || downOut ? 1 : 0;

          // Deterministic pseudo-random binary pattern (organic 0/1 mix, zero flat checkerboard)
          const hash = ((c * 374761393 + r * 668265263) ^ (c * r * 1274126177)) >>> 0;
          tmpX[count] = offsetX + localX;
          tmpY[count] = offsetY + localY;
          tmpBit[count] = (hash >> 7) & 1;
          tmpEdge[count] = isEdge;
          tmpPhase[count] = ((hash & 1023) / 1023) * Math.PI * 2;
          tmpWave[count] = (localX / Math.max(1, drawW)) * 0.78 + (localY / Math.max(1, drawH)) * 0.22;
          count++;
        }
      }

      monoCount = count;
      monoX = tmpX.subarray(0, count);
      monoY = tmpY.subarray(0, count);
      monoBit = tmpBit.subarray(0, count);
      monoEdge = tmpEdge.subarray(0, count);
      monoPhase = tmpPhase.subarray(0, count);
      monoWavePos = tmpWave.subarray(0, count);
      monoFlipCursor = 0;
    }

    function initCanvasSize(): void {
      if (!canvas || !stage) return;
      width = Math.max(260, stage.clientWidth || window.innerWidth);
      height = Math.max(240, stage.clientHeight || window.innerHeight);
      mainGpu.resize(width, height, false);

      const colSpacing = width < 768 ? 30 : 26;
      const numCols = Math.ceil(width / colSpacing);
      streamCount = numCols;

      streamX = new Int16Array(streamCount);
      streamHeadY = new Float32Array(streamCount);
      streamSpeed = new Float32Array(streamCount);
      streamLen = new Uint8Array(streamCount);
      streamIsRedLead = new Uint8Array(streamCount);
      streamBits = new Uint8Array(streamCount * MAX_LEN);

      const speedScale = reducedMotion ? 0.3 : 1;
      for (let i = 0; i < numCols; i++) {
        streamX[i] = Math.round(i * colSpacing + colSpacing * 0.5);
        const len = 7 + ((i * 5 + 3) % 8);
        const span = height + len * CELL_H;
        streamLen[i] = len;
        streamHeadY[i] = ((i * 113) % Math.max(1, span)) - len * CELL_H * 0.3;
        streamSpeed[i] = (44 + ((i * 19) % 42)) * speedScale;
        streamIsRedLead[i] = i % 5 === 0 ? 1 : 0;

        const base = i * MAX_LEN;
        for (let b = 0; b < MAX_LEN; b++) {
          streamBits[base + b] = ((i * 7 + b * 13) & 1) as 0 | 1;
        }
      }

      rebuildBinaryAdMonogram();
    }

    initCanvasSize();

    const resizeObserver = new ResizeObserver(() => {
      initCanvasSize();
    });
    resizeObserver.observe(stage);
    if (anchorEl) {
      resizeObserver.observe(anchorEl);
    }

    // 3. Modal Binary Dust -> Pop-Out Icons Condensation Engine (6 slots, ZERO GC)
    const ICON_SLOTS = CONNECT_CHANNELS.length;
    const ICON_DUST_PER_SLOT = 76;
    const ICON_DUST_TOTAL = ICON_DUST_PER_SLOT * ICON_SLOTS;
    const iconDustStartX = new Float32Array(ICON_DUST_TOTAL);
    const iconDustStartY = new Float32Array(ICON_DUST_TOTAL);
    const iconDustCtrlX = new Float32Array(ICON_DUST_TOTAL);
    const iconDustCtrlY = new Float32Array(ICON_DUST_TOTAL);
    const iconDustDstX = new Float32Array(ICON_DUST_TOTAL);
    const iconDustDstY = new Float32Array(ICON_DUST_TOTAL);
    const iconDustDelay = new Float32Array(ICON_DUST_TOTAL);
    const iconDustBit = new Uint8Array(ICON_DUST_TOTAL);
    const iconDustCrimson = new Uint8Array(ICON_DUST_TOTAL);
    let iconDustActive = false;
    let iconDustElapsed = 0;

    // Modal hover spark ring buffer (ZERO GC)
    const MODAL_SPARK_POOL = 72;
    const mSparkX = new Float32Array(MODAL_SPARK_POOL);
    const mSparkY = new Float32Array(MODAL_SPARK_POOL);
    const mSparkVx = new Float32Array(MODAL_SPARK_POOL);
    const mSparkVy = new Float32Array(MODAL_SPARK_POOL);
    const mSparkLife = new Float32Array(MODAL_SPARK_POOL);
    const mSparkMax = new Float32Array(MODAL_SPARK_POOL);
    const mSparkBit = new Uint8Array(MODAL_SPARK_POOL);
    const mSparkRed = new Uint8Array(MODAL_SPARK_POOL);
    let mSparkCursor = 0;

    startIconDustCondensation = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const termRect =
        sayHiTerminalEl?.getBoundingClientRect() ?? sayHiEditorEl?.getBoundingClientRect();
      const originCenterX = termRect ? termRect.left + termRect.width * 0.5 : vw * 0.5;
      const originY = termRect ? termRect.bottom - 8 : vh * 0.5;
      const originSpreadW = termRect ? termRect.width * 0.78 : 300;

      for (let slot = 0; slot < ICON_SLOTS; slot++) {
        const iconEl = sayHiIconEls[slot];
        const iRect = iconEl?.getBoundingClientRect();
        const cx = iRect ? iRect.left + iRect.width * 0.5 : vw * 0.5 + (slot - 2.5) * 66;
        const cy = iRect ? iRect.top + iRect.height * 0.5 : originY + 64;
        const slotBaseDelay = slot * 0.09;

        for (let k = 0; k < ICON_DUST_PER_SLOT; k++) {
          const idx = slot * ICON_DUST_PER_SLOT + k;
          const seed = ((idx + 23) * 0.61803398875) % 1;
          const angle = (k / ICON_DUST_PER_SLOT) * Math.PI * 2 + seed * 1.4;
          const ringR = k < ICON_DUST_PER_SLOT * 0.45 ? 18 + seed * 10 : seed * 19;

          const sx = originCenterX + (seed - 0.5) * originSpreadW;
          const sy = originY + (((idx * 17) % 11) - 5) * 2.2;
          const dx = cx + Math.cos(angle) * ringR;
          const dy = cy + Math.sin(angle) * ringR;

          const swirlDir = (idx & 1) === 0 ? 1 : -1;
          const midX = (sx + dx) * 0.5 + swirlDir * (24 + seed * 52);
          const midY = (sy + dy) * 0.5 - 12 + (seed - 0.5) * 42;

          iconDustStartX[idx] = sx;
          iconDustStartY[idx] = sy;
          iconDustCtrlX[idx] = midX;
          iconDustCtrlY[idx] = midY;
          iconDustDstX[idx] = dx;
          iconDustDstY[idx] = dy;
          iconDustDelay[idx] = slotBaseDelay + seed * 0.14;
          iconDustBit[idx] = idx & 1;
          iconDustCrimson[idx] = idx % 3 === 0 ? 1 : 0;
        }
      }
      iconDustElapsed = 0;
      iconDustActive = true;
    };

    resetIconDustCondensation = () => {
      iconDustActive = false;
      iconDustElapsed = 0;
      mSparkLife.fill(0);
    };

    emitModalIconBurst = (clientX: number, clientY: number, count = 16) => {
      for (let k = 0; k < count; k++) {
        const idx = mSparkCursor;
        mSparkCursor = (mSparkCursor + 1) % MODAL_SPARK_POOL;
        const ang = (k / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
        const spd = 34 + Math.random() * 88;
        mSparkX[idx] = clientX + (Math.random() - 0.5) * 18;
        mSparkY[idx] = clientY + (Math.random() - 0.5) * 18;
        mSparkVx[idx] = Math.cos(ang) * spd;
        mSparkVy[idx] = Math.sin(ang) * spd - 12;
        const ml = 0.45 + Math.random() * 0.35;
        mSparkLife[idx] = ml;
        mSparkMax[idx] = ml;
        mSparkBit[idx] = Math.random() > 0.5 ? 1 : 0;
        mSparkRed[idx] = k % 2 === 0 ? 1 : 0;
      }
    };

    let rafId = 0;
    let syncTimerId = 0;
    let disposed = false;
    let isPaused = document.hidden;
    let lastMs = performance.now();
    let clock = 0;
    let smoothBuild = 0;
    let frameCounter = 0;
    let flipCursor = 0;

    const invCellH = 1 / CELL_H;
    const dustSizePx = width < 640 ? 9.5 : 10.5;
    const rainSizePx = width < 640 ? 10.2 : 11.2;

    function afterDraw(cb: () => void): void {
      if (disposed) return;
      const gl = mainGpu.renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        syncTimerId = window.setTimeout(cb, 32);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          syncTimerId = window.setTimeout(poll, 4);
        } else {
          if (sync) gl.deleteSync(sync);
          cb();
        }
      };
      syncTimerId = window.setTimeout(poll, 4);
    }

    const renderLoop = (nowMs: number) => {
      if (isPaused || disposed) {
        rafId = 0;
        return;
      }

      const dt = Math.min((nowMs - lastMs) / 1000, 0.033);
      lastMs = nowMs;
      clock += dt;
      frameCounter++;

      smoothBuild += (buildProgress - smoothBuild) * (1 - Math.exp(-11 * dt));

      // Advance live C++ typing animation when the Connect modal is open
      if (connectModalOpen && cppTypedChars < TOTAL_SAY_HI_CHARS) {
        cppTypedChars = Math.min(TOTAL_SAY_HI_CHARS, cppTypedChars + dt * 155);
        if (cppTypedChars >= TOTAL_SAY_HI_CHARS && !iconsReady) {
          revealIconsFromBinaryDust();
        }
      }

      // Render GPU InstancedMesh modal binary dust -> icon pop-out condensation
      if (connectModalOpen && modalGpuRenderer) {
        const mw = Math.max(320, window.innerWidth);
        const mh = Math.max(320, window.innerHeight);
        modalGpuRenderer.resize(mw, mh, false);
        modalGpuRenderer.beginFrame();

        const mTick = Math.floor(clock * 11);

        if (iconDustActive) {
          iconDustElapsed += dt;
          const travelDur = 0.62;
          let anyAlive = false;

          for (let i = 0; i < ICON_DUST_TOTAL; i++) {
            const localSec = iconDustElapsed - iconDustDelay[i];
            if (localSec <= 0) {
              anyAlive = true;
              continue;
            }
            const rawT = localSec / travelDur;
            if (rawT >= 1.18) continue;
            anyAlive = true;

            const t = Math.min(1, rawT);
            const ease = quinticSmooth(t);
            const inv = 1 - ease;

            const px =
              inv * inv * iconDustStartX[i] +
              2 * inv * ease * iconDustCtrlX[i] +
              ease * ease * iconDustDstX[i];
            const py =
              inv * inv * iconDustStartY[i] +
              2 * inv * ease * iconDustCtrlY[i] +
              ease * ease * iconDustDstY[i];

            const fadeIn = Math.min(1, rawT / 0.16);
            const fadeOut = rawT > 0.72 ? Math.max(0, 1 - (rawT - 0.72) / 0.44) : 1;
            const alpha = fadeIn * fadeOut * 0.94;
            if (alpha <= 0.025) continue;

            const bit = (
              rawT < 0.85 && (i + mTick) % 9 === 0 ? iconDustBit[i] ^ 1 : iconDustBit[i]
            ) as 0 | 1;
            if (iconDustCrimson[i]) {
              modalGpuRenderer.push(px, py, 11.2, bit, RED_R, RED_G, RED_B, alpha);
            } else {
              modalGpuRenderer.push(px, py, 11.2, bit, WHITE_R, WHITE_G, WHITE_B, alpha);
            }
          }

          if (!anyAlive) {
            iconDustActive = false;
          }
        }

        // Modal icon hover / click sparks
        for (let i = 0; i < MODAL_SPARK_POOL; i++) {
          if (mSparkLife[i] <= 0) continue;
          mSparkLife[i] -= dt;
          if (mSparkLife[i] <= 0) continue;
          mSparkVx[i] *= Math.exp(-3.0 * dt);
          mSparkVy[i] = mSparkVy[i] * Math.exp(-2.6 * dt) + 22 * dt;
          mSparkX[i] += mSparkVx[i] * dt;
          mSparkY[i] += mSparkVy[i] * dt;
          const alpha = Math.max(0, mSparkLife[i] / Math.max(0.01, mSparkMax[i])) * 0.9;
          if (alpha <= 0.03) continue;
          const bit = (mSparkBit[i] & 1) as 0 | 1;
          if (mSparkRed[i]) {
            modalGpuRenderer.push(mSparkX[i], mSparkY[i], 10.5, bit, RED_R, RED_G, RED_B, alpha);
          } else {
            modalGpuRenderer.push(mSparkX[i], mSparkY[i], 10.5, bit, WHITE_R, WHITE_G, WHITE_B, alpha);
          }
        }

        modalGpuRenderer.render();
      }

      // Skip background rain work when scrolled above the finale or when 3D cluster modal covers screen
      if ((smoothBuild < 0.008 && buildProgress < 0.008) || clusterModalOpen) {
        mainGpu.clear();
        rafId = requestAnimationFrame(renderLoop);
        return;
      }

      mainGpu.beginFrame();
      const rainAlphaEnv = Math.min(1, smoothBuild * 1.35);

      if ((frameCounter & 1) === 0 && streamBits.length > 0) {
        for (let f = 0; f < 4; f++) {
          flipCursor = (flipCursor + 31) % streamBits.length;
          streamBits[flipCursor] ^= 1;
        }
      }

      // Subtle black/white/red binary rain in the obsidian background
      const maxY = height + CELL_H;
      if (rainAlphaEnv > 0.02) {
        for (let i = 0; i < streamCount; i++) {
          let headY = streamHeadY[i] + streamSpeed[i] * dt;
          const len = streamLen[i];
          if (headY - len * CELL_H > height + 24) {
            headY = -CELL_H * 2;
          }
          streamHeadY[i] = headY;

          let bStart = Math.floor((headY - maxY) * invCellH);
          if (bStart < 0) bStart = 0;
          let bEnd = Math.floor((headY + CELL_H) * invCellH);
          if (bEnd >= len) bEnd = len - 1;
          if (bStart > bEnd) continue;

          const cx = streamX[i];
          const bitOffset = i * MAX_LEN;
          const lutBase = len * MAX_LEN;
          const redLead = streamIsRedLead[i] === 1;

          for (let b = bStart; b <= bEnd; b++) {
            const bitY = headY - b * CELL_H;
            const bitVal = (streamBits[bitOffset + b] & 1) as 0 | 1;
            if (b === 0) {
              if (redLead) {
                mainGpu.push(cx, bitY, rainSizePx, bitVal, RED_R, RED_G, RED_B, 0.44 * rainAlphaEnv);
              } else {
                mainGpu.push(cx, bitY, rainSizePx, bitVal, INK_R, INK_G, INK_B, 0.28 * rainAlphaEnv);
              }
            } else {
              const alpha = rainAlphaLut[lutBase + b] * 0.72 * rainAlphaEnv;
              mainGpu.push(cx, bitY, rainSizePx, bitVal, MUTED_R, MUTED_G, MUTED_B, alpha);
            }
          }
        }
      }

      // Monumental "ad" Monogram constructed entirely from living binary 1s and 0s
      const monoReveal = Math.max(0, Math.min(1, (smoothBuild - 0.18) / 0.56));
      if (monoReveal > 0.01 && monoCount > 0) {
        // Gently flip a few bits across the 'ad' matrix each 3 frames so the binary feels alive
        if (!reducedMotion && frameCounter % 3 === 0) {
          for (let f = 0; f < 7; f++) {
            monoFlipCursor = (monoFlipCursor + 137) % monoCount;
            monoBit[monoFlipCursor] ^= 1;
          }
        }

        const sweepPos = ((clock * 0.22) % 1.45) - 0.22;
        const settleOffset = (1 - monoReveal) * 22;

        for (let i = 0; i < monoCount; i++) {
          const phase = monoPhase[i];
          const wPos = monoWavePos[i];
          // Staggered diagonal reveal as user scrolls into the finale
          const localRev = Math.max(0, Math.min(1, (monoReveal * 1.28 - wPos * 0.28)));
          if (localRev <= 0.02) continue;

          const bitVal = (monoBit[i] & 1) as 0 | 1;
          const isEdge = monoEdge[i] === 1;
          const shimmer = 0.5 + 0.5 * Math.sin(clock * 1.9 + phase);

          // Crisp obsidian ink binary glint along slow diagonal wave on pure white
          const distWave = Math.abs(wPos - sweepPos);
          const isInkGlint =
            !reducedMotion && distWave < 0.045 && ((i + Math.floor(clock * 3)) % 11 === 0);

          const py = monoY[i] + settleOffset * (1 - localRev);
          if (isInkGlint) {
            mainGpu.push(
              monoX[i],
              py,
              monoGlyphSize,
              bitVal,
              INK_R,
              INK_G,
              INK_B,
              0.92 * localRev
            );
          } else {
            const baseAlpha = isEdge ? 0.96 + shimmer * 0.04 : 0.78 + shimmer * 0.2;
            mainGpu.push(
              monoX[i],
              py,
              monoGlyphSize,
              bitVal,
              RED_R,
              RED_G,
              RED_B,
              baseAlpha * localRev
            );
          }
        }
      }

      // Hover/click binary bursts around the CONNECT button
      for (let i = 0; i < BURST_POOL; i++) {
        if (burstLife[i] <= 0) continue;
        burstLife[i] -= dt;
        if (burstLife[i] <= 0) continue;
        burstVx[i] *= Math.exp(-2.8 * dt);
        burstVy[i] = burstVy[i] * Math.exp(-2.4 * dt) + 28 * dt;
        burstX[i] += burstVx[i] * dt;
        burstY[i] += burstVy[i] * dt;
        const ratio = Math.max(0, burstLife[i] / Math.max(0.01, burstMaxLife[i]));
        const alpha = ratio * 0.88;
        if (alpha <= 0.025) continue;
        if (burstRed[i]) {
          mainGpu.push(burstX[i], burstY[i], dustSizePx, (burstBit[i] & 1) as 0 | 1, RED_R, RED_G, RED_B, alpha);
        } else {
          mainGpu.push(burstX[i], burstY[i], dustSizePx, (burstBit[i] & 1) as 0 | 1, INK_R, INK_G, INK_B, alpha);
        }
      }

      mainGpu.render();

      if (mainGpu.isSoftwareGl && mainGpu.batch.count > 0) {
        afterDraw(() => {
          if (!disposed && !isPaused) {
            rafId = requestAnimationFrame(renderLoop);
          }
        });
      } else {
        rafId = requestAnimationFrame(renderLoop);
      }
    };

    const onVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused && rafId === 0) {
        lastMs = performance.now();
        rafId = requestAnimationFrame(renderLoop);
      } else if (isPaused && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && connectModalOpen) {
        closeConnectModal();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('keydown', onKeyDown);
    if (!isPaused) {
      rafId = requestAnimationFrame(renderLoop);
    }

    return () => {
      disposed = true;
      if (rafId !== 0) cancelAnimationFrame(rafId);
      window.clearTimeout(syncTimerId);
      sayHiTimeline?.kill();
      sayHiIconsTl?.kill();
      window.clearTimeout(cvResetTimer);
      window.clearTimeout(copyMailTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('keydown', onKeyDown);
      resizeObserver.disconnect();
      triggerLinkDustBurst = null;
      startIconDustCondensation = null;
      resetIconDustCondensation = null;
      emitModalIconBurst = null;
      mainGpu.dispose();
    };
  });
</script>

<!-- ====================================================================== -->
<!-- MONUMENTAL WHITE, BLACK & RED FINALE POSTER                            -->
<!-- Single top-left CONNECT button + top-right copyright + binary red AD   -->
<!-- ====================================================================== -->
<div
  bind:this={stageEl}
  class="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#FFFFFF] text-[#111110]"
>
  <!-- Subtle Ink & Red Binary Rain + Monumental Binary AD Canvas on Pure White -->
  <canvas
    bind:this={canvasEl}
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 z-0 block h-full w-full will-change-transform"
  ></canvas>

  <!-- TOP HEADER BAR: Single Clean CONNECT Button (Left) + Bold Copyright (Right) -->
  <header
    class="relative z-20 flex w-full items-start justify-between gap-3 px-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))] pb-2 sm:px-[max(2rem,env(safe-area-inset-left))] sm:pt-[max(1.5rem,env(safe-area-inset-top))] sm:pb-3"
    style="opacity: {headerOpacity.toFixed(3)}; transform: translate3d(0, {((1 - headerOpacity) * -12).toFixed(1)}px, 0);"
  >
    <!-- Clean Minimal CONNECT Button (Pure White / Black / #FF261B Red) -->
    <button
      bind:this={connectButtonEl}
      type="button"
      onpointerenter={handleButtonHover}
      onclick={openConnectModal}
      class="inline-flex min-h-[46px] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border border-[#141412]/20 bg-white px-5 py-2.5 font-display text-[12.5px] font-bold tracking-[0.15em] text-[#111110] uppercase shadow-[0_10px_28px_rgba(17,17,16,0.08)] transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[#FF261B] hover:bg-[#FF261B] hover:text-white active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FF261B] sm:min-h-[48px] sm:px-7 sm:py-3 sm:text-[14px]"
    >
      CONNECT
    </button>

    <!-- Bold Uppercase Copyright Block (Top-Right) -->
    <div class="text-right font-display text-[10px] leading-[1.2] font-extrabold tracking-[0.04em] text-[#111110] uppercase select-none sm:text-[13px]">
      <div>©2026 ARYAN DAS</div>
      <div>ALL RIGHTS RESERVED</div>
    </div>
  </header>

  <!-- MONUMENTAL BINARY (1 & 0) "ad" LAYOUT ANCHOR (Rendered directly on GPU InstancedMesh canvas) -->
  <div class="pointer-events-none relative z-10 flex min-h-0 flex-1 w-full items-end justify-center overflow-hidden">
    <div
      bind:this={anchorEl}
      role="img"
      aria-label="AD monogram made of binary ones and zeros"
      class="h-full max-h-[84dvh] w-full select-none"
    ></div>
  </div>

  <!-- ====================================================================== -->
  <!-- CONNECT POP-UP MODAL: GITHUB DARK C++ ANIMATION -> BINARY-DUST LINKS   -->
  <!-- ====================================================================== -->
  {#if connectModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={sayHiBackdropEl}
      onclick={closeConnectModal}
      onpointerdown={(e) => e.stopPropagation()}
      class="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-[#f5f5f2]/85 p-3 sm:p-6 backdrop-blur-xl"
      style="opacity: 0;"
    >
      <!-- Dedicated GPU Binary Dust Canvas for Icon Materialization & Sparks -->
      <canvas
        bind:this={sayHiDustCanvasEl}
        aria-hidden="true"
        class="pointer-events-none fixed inset-0 z-20 block h-full w-full"
      ></canvas>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect with Aryan Das"
        onclick={(e) => e.stopPropagation()}
        class="relative z-10 my-auto flex max-h-[92dvh] w-full max-w-[520px] flex-col items-center overflow-y-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <!-- FLOATING C++ CODE EDITOR BLOCK (Authentic GitHub Dark Default Theme) -->
        <div
          bind:this={sayHiEditorEl}
          class="w-full overflow-hidden rounded-xl border border-[#30363d] bg-[#0d1117] text-left shadow-[0_32px_90px_rgba(0,0,0,0.88)] will-change-transform"
          style="opacity: 0;"
        >
          <!-- GitHub Dark Editor Titlebar -->
          <div class="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4 py-2.5">
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-[#ff5f56]"></span>
              <span class="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]"></span>
              <span class="h-2.5 w-2.5 rounded-full bg-[#27c93f]"></span>
              <span class="ml-2 font-mono text-[11.5px] font-medium tracking-tight text-[#e6edf3]">
                say_hi.cpp
              </span>
            </div>

            <div class="flex items-center gap-3">
              <span class="font-mono text-[10.5px] text-[#8b949e]">
                {cppFinished ? 'exited 0' : 'running...'}
              </span>
              <button
                type="button"
                aria-label="Close"
                onclick={closeConnectModal}
                class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-xs text-[#8b949e] transition-colors duration-150 hover:bg-[#30363d] hover:text-[#f0f6fc] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#58a6ff]"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Live GitHub Dark Syntax-Highlighted C++ Body -->
          <div
            bind:this={sayHiCodeScrollEl}
            class="overflow-x-auto bg-[#0d1117] px-3 py-3.5 font-mono text-[11px] leading-[1.62] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5 sm:py-4 sm:text-[12.5px] sm:leading-[1.7]"
          >
            {#each visibleSayHiCpp as line (line.lineNumber)}
              <div
                class="flex items-baseline rounded px-1 {line.isCursorLine && !cppFinished
                  ? 'bg-[#6e7681]/15'
                  : ''}"
              >
                <span
                  class="mr-3.5 w-4 shrink-0 text-right text-[10.5px] select-none {line.isCursorLine
                    ? 'text-[#e6edf3]'
                    : 'text-[#6e7681]'}"
                >
                  {line.lineNumber}
                </span>
                <span class="whitespace-pre">
                  {#each line.tokens as tok, tIdx (tIdx)}
                    <span style="color: {tok.color};">{tok.text}</span>
                  {/each}{#if line.isCursorLine}<span
                      class="ml-[1px] inline-block h-[13.5px] w-[6px] translate-y-[2px] bg-[#58a6ff] animate-pulse"
                    ></span>{/if}
                </span>
              </div>
            {/each}
          </div>

          <!-- GitHub Dark Terminal Execution Strip (Click to replay C++ + binary dust wave) -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            bind:this={sayHiTerminalEl}
            onclick={(e) => {
              e.stopPropagation();
              if (cppFinished) replaySayHiCpp(e.clientX, e.clientY);
            }}
            class="cursor-pointer border-t border-[#30363d] bg-[#010409] px-4 py-2.5 font-mono text-[11.5px] transition-opacity duration-300 sm:px-5"
            style="opacity: {cppFinished ? 1 : 0.4};"
          >
            <span class="font-bold text-[#3fb950]">$</span>
            <span class="ml-1.5 text-[#8b949e]">./say_hi</span>
            {#if cppFinished}
              <span class="ml-2 text-[#e6edf3]">Hey! Let's connect &amp; build.</span>
            {/if}
          </div>
        </div>

        <!-- POP-OUT SOCIAL, RESUME & 3D CLUSTER ICONS (Materialize from Binary Dust AFTER C++ runs!) -->
        <div
          class="mt-6 flex flex-col items-center gap-3"
          style="pointer-events: {iconsReady ? 'auto' : 'none'};"
        >
          <div class="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5">
            {#each CONNECT_CHANNELS as channel, idx (channel.id)}
              <a
                bind:this={sayHiIconEls[idx]}
                href={channel.href}
                target={channel.external ? '_blank' : undefined}
                rel={channel.external ? 'noopener noreferrer' : undefined}
                download={channel.download}
                aria-label="{channel.label} — {channel.handle}"
                  ontouchstart={(e) => {
                    hoveredChannelId = channel.id;
                    const t = e.touches[0];
                    if (t) emitModalIconBurst?.(t.clientX, t.clientY, 12);
                  }}
                  onpointerenter={(e) => {
                    hoveredChannelId = channel.id;
                    emitModalIconBurst?.(e.clientX, e.clientY, 12);
                  }}
                  onpointerleave={() => {
                    if (hoveredChannelId === channel.id) hoveredChannelId = null;
                  }}
                  onfocus={() => {
                    hoveredChannelId = channel.id;
                  }}
                  onblur={() => {
                    if (hoveredChannelId === channel.id) hoveredChannelId = null;
                  }}
                  onclick={(e) => {
                    if (channel.id === 'mail') {
                      handleMailIconClick(e);
                    } else if (channel.id === 'resume') {
                      handleCvClick(e);
                    } else {
                      e.stopPropagation();
                      emitModalIconBurst?.(e.clientX, e.clientY, 20);
                    }
                  }}
                  class="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-black/12 bg-white text-black shadow-md transition-[transform,border-color,background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-[#FF261B] hover:bg-black hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-black sm:h-[56px] sm:w-[56px]"
                  style="opacity: 0;"
                >
                  {#if channel.id === 'instagram'}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="h-[22px] w-[22px] transition-transform duration-200 group-hover:scale-110"
                      aria-hidden="true"
                    >
                      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
                      <circle cx="12" cy="12" r="4.2" />
                      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                    </svg>
                  {:else if channel.id === 'linkedin'}
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      class="h-[21px] w-[21px] transition-transform duration-200 group-hover:scale-110"
                      aria-hidden="true"
                    >
                      <path d="M6.94 8.5H3.56V19.5H6.94V8.5ZM5.25 3.5C4.14 3.5 3.25 4.39 3.25 5.5C3.25 6.6 4.14 7.5 5.25 7.5C6.35 7.5 7.25 6.6 7.25 5.5C7.25 4.39 6.35 3.5 5.25 3.5ZM20.44 13.02C20.44 9.88 18.76 8.22 16.22 8.22C14.37 8.22 13.47 9.24 12.98 9.98V8.5H9.6C9.64 9.48 9.6 19.5 9.6 19.5H12.98V13.36C12.98 13.02 13.01 12.69 13.11 12.45C13.38 11.79 13.99 11.11 15.03 11.11C16.38 11.11 17.06 12.14 17.06 13.65V19.5H20.44V13.02Z" />
                    </svg>
                  {:else if channel.id === 'github'}
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      class="h-[22px] w-[22px] transition-transform duration-200 group-hover:scale-110"
                      aria-hidden="true"
                    >
                      <path d="M12 2.2C6.48 2.2 2 6.68 2 12.2C2 16.62 4.87 20.36 8.84 21.68C9.34 21.77 9.52 21.46 9.52 21.2C9.52 20.96 9.51 20.17 9.51 19.33C7 19.79 6.35 18.72 6.15 18.16C6.04 17.87 5.55 16.98 5.12 16.74C4.77 16.55 4.27 16.09 5.11 16.08C5.9 16.07 6.46 16.81 6.65 17.11C7.55 18.62 8.99 18.2 9.56 17.94C9.65 17.29 9.91 16.85 10.2 16.6C7.98 16.35 5.66 15.49 5.66 11.67C5.66 10.58 6.05 9.69 6.69 8.99C6.59 8.74 6.24 7.71 6.79 6.33C6.79 6.33 7.63 6.06 9.54 7.35C10.34 7.13 11.19 7.02 12.04 7.02C12.89 7.02 13.74 7.13 14.54 7.35C16.45 6.05 17.29 6.33 17.29 6.33C17.84 7.71 17.49 8.74 17.39 8.99C18.03 9.69 18.42 10.57 18.42 11.67C18.42 15.5 16.09 16.35 13.87 16.6C14.23 16.91 14.54 17.51 14.54 18.45C14.54 19.79 14.53 20.86 14.53 21.2C14.53 21.46 14.71 21.78 15.21 21.68C19.17 20.36 22 16.61 22 12.2C22 6.68 17.52 2.2 12 2.2Z" />
                    </svg>
                  {:else if channel.id === 'resume'}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="h-[21px] w-[21px] transition-transform duration-200 group-hover:scale-110"
                      aria-hidden="true"
                    >
                      <path d="M14 2.5H6.5A2 2 0 0 0 4.5 4.5V19.5A2 2 0 0 0 6.5 21.5H17.5A2 2 0 0 0 19.5 19.5V8Z" />
                      <path d="M14 2.5V8H19.5" />
                      <path d="M12 11.5V17.5M9.5 15L12 17.5L14.5 15" />
                    </svg>
                  {:else}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="h-[22px] w-[22px] transition-transform duration-200 group-hover:scale-110"
                      aria-hidden="true"
                    >
                      <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
                      <path d="M3.5 6.5L12 13L20.5 6.5" />
                    </svg>
                  {/if}
                </a>
            {/each}
          </div>

          <!-- Quiet Hover / Status Caption -->
          <div class="h-5 font-mono text-[12px] tracking-tight text-black/85">
            {#if copiedMail}
              <span class="font-semibold text-black">Copied aryandas.original@gmail.com ✓</span>
            {:else if cvDownloaded}
              <span class="font-semibold text-black">Downloading Aryan_Das_CV.pdf ✓</span>
            {:else if activeHoverChannel}
              <span>
                <span class="text-black/60">{activeHoverChannel.label}</span>
                <span class="mx-1.5 text-[#FF261B]">·</span>
                <span class="font-semibold text-black">{activeHoverChannel.handle}</span>
              </span>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
