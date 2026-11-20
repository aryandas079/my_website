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

  const CONNECT_CHANNELS = [
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
  ] as const;

  let {
    buildProgress = 0,
    anchorEl = $bindable<HTMLElement | null>(null),
  }: Props = $props();

  let stageEl = $state<HTMLElement | null>(null);
  let canvasEl = $state<HTMLCanvasElement | null>(null);
  let linksContainerEl = $state<HTMLElement | null>(null);
  let cvDownloaded = $state(false);
  let cvResetTimer = 0;

  // Interactive Say Hi Floating C++ Editor + Binary-Dust Social Icons state
  let sayHiOpen = $state(false);
  let sayHiBackdropEl = $state<HTMLElement | null>(null);
  let sayHiEditorEl = $state<HTMLElement | null>(null);
  let sayHiCodeScrollEl = $state<HTMLElement | null>(null);
  let sayHiTerminalEl = $state<HTMLElement | null>(null);
  let sayHiDustCanvasEl = $state<HTMLCanvasElement | null>(null);
  let sayHiIconEls = $state<Array<HTMLElement | null>>([null, null, null, null]);
  let sayHiTimeline: gsap.core.Timeline | null = null;
  let sayHiIconsTl: gsap.core.Timeline | null = null;
  let cppTypedChars = $state(0);
  let iconsReady = $state(false);
  let hoveredChannelId = $state<string | null>(null);
  let copiedMail = $state(false);
  let copyMailTimer = 0;

  // Callbacks wired inside onMount to drive the modal's binary dust -> icon condensation
  let startIconDustCondensation: (() => void) | null = null;
  let resetIconDustCondensation: (() => void) | null = null;
  let emitModalIconBurst: ((clientX: number, clientY: number, count?: number) => void) | null = null;
  let modalGpuRenderer: InstancedBinaryDustRenderer | null = null;

  // Lazy GPU InstancedMesh lifecycle for the Say Hi modal (zero idle WebGL context when closed)
  $effect(() => {
    const modalCanvas = sayHiDustCanvasEl;
    if (!sayHiOpen || !modalCanvas) {
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
      maxInstances: 460,
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

  // Non-passive touch handlers on the floating C++ code editor for 3D micro-tilt,
  // interactive binary dust trail, tap-to-complete/replay, and swipe-down dismiss
  $effect(() => {
    const editorEl = sayHiEditorEl;
    if (!sayHiOpen || !editorEl) return;

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
        closeSayHiModal();
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

  // Derived visual phases from scroll-driven buildProgress (0..1)
  let titleSolidOpacity = $derived(Math.max(0, Math.min(1, (buildProgress - 0.36) / 0.46)));
  let linksOpacity = $derived(Math.max(0, Math.min(1, (buildProgress - 0.5) / 0.38)));
  let linksTranslateY = $derived((1 - linksOpacity) * 18);
  let footerOpacity = $derived(Math.max(0, Math.min(1, (buildProgress - 0.64) / 0.32)));

  // Hover burst callback wired inside onMount so hovering/clicking links emits subtle cream binary dust
  let triggerLinkDustBurst: ((clientX: number, clientY: number, count?: number) => void) | null = null;

  function handleLinkHover(e: PointerEvent): void {
    triggerLinkDustBurst?.(e.clientX, e.clientY, 14);
  }

  function revealIconsFromBinaryDust(): void {
    if (iconsReady) return;
    iconsReady = true;
    startIconDustCondensation?.();

    sayHiIconsTl?.kill();
    const tl = gsap.timeline({ defaults: { force3D: true } });
    sayHiIconsTl = tl;

    // Each social icon crystallizes smoothly right as its binary dust cloud finishes condensing
    sayHiIconEls.forEach((el, idx) => {
      if (!el) return;
      const startAt = 0.38 + idx * 0.12;
      tl.fromTo(
        el,
        { opacity: 0, scale: 0.62, y: 8, filter: 'blur(5px)' },
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
    emitModalIconBurst?.(clientX, clientY, 16);
    cppTypedChars = 0;
    iconsReady = false;
    resetIconDustCondensation?.();
    sayHiIconsTl?.kill();
    sayHiIconEls.forEach((el) => {
      if (el) {
        gsap.set(el, { opacity: 0, scale: 0.62, y: 8, filter: 'blur(5px)' });
      }
    });
  }

  async function openSayHiModal(e: MouseEvent): Promise<void> {
    e.stopPropagation();
    triggerLinkDustBurst?.(e.clientX, e.clientY, 28);
    sayHiOpen = true;
    cppTypedChars = 0;
    iconsReady = false;
    hoveredChannelId = null;
    copiedMail = false;
    resetIconDustCondensation?.();

    await tick();

    sayHiTimeline?.kill();
    sayHiIconsTl?.kill();

    // Ensure all 4 icon buttons start completely invisible until the C++ code finishes running
    sayHiIconEls.forEach((el) => {
      if (el) {
        gsap.set(el, { opacity: 0, scale: 0.62, y: 8, filter: 'blur(5px)' });
      }
    });

    const tl = gsap.timeline({ defaults: { force3D: true } });
    sayHiTimeline = tl;

    if (sayHiBackdropEl) {
      tl.fromTo(
        sayHiBackdropEl,
        { opacity: 0 },
        { opacity: 1, duration: 0.34, ease: 'power2.out' },
        0
      );
    }

    if (sayHiEditorEl) {
      tl.fromTo(
        sayHiEditorEl,
        { opacity: 0, scale: 0.92, y: 24 },
        { opacity: 1, scale: 1, y: 0, duration: 0.54, ease: 'expo.out' },
        0.05
      );
    }
  }

  function closeSayHiModal(): void {
    if (!sayHiOpen) return;
    sayHiTimeline?.kill();
    sayHiIconsTl?.kill();
    resetIconDustCondensation?.();

    const tl = gsap.timeline({
      defaults: { force3D: true },
      onComplete: () => {
        sayHiOpen = false;
        iconsReady = false;
        hoveredChannelId = null;
      },
    });
    sayHiTimeline = tl;

    const visibleIcons = sayHiIconEls.filter((el): el is HTMLElement => el !== null);
    if (visibleIcons.length > 0 && iconsReady) {
      tl.to(
        visibleIcons,
        { opacity: 0, scale: 0.78, y: 10, duration: 0.18, stagger: 0.02, ease: 'power2.in' },
        0
      );
    }

    if (sayHiEditorEl) {
      tl.to(
        sayHiEditorEl,
        { opacity: 0, scale: 0.94, y: 16, duration: 0.24, ease: 'power2.in' },
        0.02
      );
    }
    if (sayHiBackdropEl) {
      tl.to(sayHiBackdropEl, { opacity: 0, duration: 0.26, ease: 'power2.in' }, 0.05);
    } else {
      sayHiOpen = false;
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
      // Native mailto href still executes
    }
  }

  function handleCvClick(e: MouseEvent): void {
    triggerLinkDustBurst?.(e.clientX, e.clientY, 26);
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
      maxInstances: 2800,
      width,
      height,
      maxDpr: Math.min(1.75, gpuTier.recommendedMaxDpr),
    });

    // Normalized vermilion-stage & modal palettes for InstancedMesh shader
    const CREAM_R = 245 / 255;
    const CREAM_G = 243 / 255;
    const CREAM_B = 234 / 255;
    const LEAD_R = 1.0;
    const LEAD_G = 253 / 255;
    const LEAD_B = 246 / 255;
    const DARK_R = 116 / 255;
    const DARK_G = 22 / 255;
    const DARK_B = 12 / 255;
    const RUBY_R = 122 / 255;
    const RUBY_G = 24 / 255;
    const RUBY_B = 14 / 255;
    const CRIMSON_R = 1.0;
    const CRIMSON_G = 69 / 255;
    const CRIMSON_B = 54 / 255;

    // =========================================================================
    // 1. VERMILION BINARY RAIN STREAMS (Flat TypedArrays — ZERO per-frame GC)
    // =========================================================================
    const CELL_H = 17;
    const MAX_LEN = 18;
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
        rainAlphaLut[base + b] = 0.035 + smooth * 0.165;
      }
    }

    let streamCount = 0;
    let streamX = new Int16Array(0);
    let streamHeadY = new Float32Array(0);
    let streamSpeed = new Float32Array(0);
    let streamLen = new Uint8Array(0);
    let streamIsDarkLead = new Uint8Array(0);
    let streamBits = new Uint8Array(0);

    // =========================================================================
    // 2. "Thank you" WORD CONDENSATION DUST PARTICLES (Built from Binary Rain)
    // =========================================================================
    const WORD_DUST_COUNT = Math.max(460, Math.round(980 * gpuTier.recommendedParticleScale));
    const wordDstNx = new Float32Array(WORD_DUST_COUNT);
    const wordDstNy = new Float32Array(WORD_DUST_COUNT);
    const wordSeed = new Float32Array(WORD_DUST_COUNT);
    const wordBit = new Uint8Array(WORD_DUST_COUNT);
    const wordDark = new Uint8Array(WORD_DUST_COUNT);

    function sampleThankYouWord(): void {
      const off = document.createElement('canvas');
      const sw = 720;
      const sh = 190;
      off.width = sw;
      off.height = sh;
      const octx = off.getContext('2d');
      if (!octx) return;

      octx.clearRect(0, 0, sw, sh);
      octx.fillStyle = '#ffffff';
      octx.textAlign = 'left';
      octx.textBaseline = 'middle';
      octx.font = '700 132px "Fraunces", Georgia, serif';
      octx.fillText('Thank you', 16, sh * 0.54);

      const data = octx.getImageData(0, 0, sw, sh).data;
      const pts: Array<{ nx: number; ny: number }> = [];
      for (let y = 0; y < sh; y += 2) {
        for (let x = 0; x < sw; x += 2) {
          if (data[(y * sw + x) * 4 + 3] > 110) {
            pts.push({ nx: x / sw, ny: y / sh });
          }
        }
      }

      if (pts.length === 0) {
        for (let i = 0; i < WORD_DUST_COUNT; i++) {
          wordDstNx[i] = (i % 50) / 50;
          wordDstNy[i] = Math.floor(i / 50) / (WORD_DUST_COUNT / 50);
          wordSeed[i] = ((i + 13) * 0.61803398875) % 1;
          wordBit[i] = i & 1;
          wordDark[i] = i % 7 === 0 ? 1 : 0;
        }
        return;
      }

      for (let i = 0; i < WORD_DUST_COUNT; i++) {
        const idx = Math.min(pts.length - 1, Math.floor((i / WORD_DUST_COUNT) * pts.length));
        const p = pts[idx];
        wordDstNx[i] = p.nx;
        wordDstNy[i] = p.ny;
        wordSeed[i] = ((i + 17) * 0.61803398875) % 1;
        wordBit[i] = i & 1;
        wordDark[i] = i % 9 === 0 ? 1 : 0;
      }
    }

    // =========================================================================
    // 3. INTERACTIVE AMBIENT BINARY DUST (Global Mouse Force Vector + Cursor Swirl)
    // =========================================================================
    const AMBIENT_DUST_COUNT = Math.max(88, Math.round(156 * gpuTier.recommendedParticleScale));
    const ambHomeNx = new Float32Array(AMBIENT_DUST_COUNT);
    const ambHomeNy = new Float32Array(AMBIENT_DUST_COUNT);
    const ambDispX = new Float32Array(AMBIENT_DUST_COUNT);
    const ambDispY = new Float32Array(AMBIENT_DUST_COUNT);
    const ambVelX = new Float32Array(AMBIENT_DUST_COUNT);
    const ambVelY = new Float32Array(AMBIENT_DUST_COUNT);
    const ambPhase = new Float32Array(AMBIENT_DUST_COUNT);
    const ambBit = new Uint8Array(AMBIENT_DUST_COUNT);
    const ambDark = new Uint8Array(AMBIENT_DUST_COUNT);

    for (let i = 0; i < AMBIENT_DUST_COUNT; i++) {
      const s1 = ((i * 73.137 + 19.7) % 1000) / 1000;
      const s2 = ((i * 197.41 + 43.3) % 1000) / 1000;
      ambHomeNx[i] = 0.03 + s1 * 0.94;
      ambHomeNy[i] = 0.04 + s2 * 0.92;
      ambPhase[i] = ((i * 0.61803398875) % 1) * Math.PI * 2;
      ambBit[i] = i & 1;
      ambDark[i] = i % 5 === 0 ? 1 : 0;
    }

    // =========================================================================
    // 4. LINK INTERACTION MICRO-BURST POOL (ZERO GC Ring Buffer)
    // =========================================================================
    const BURST_POOL = 96;
    const burstX = new Float32Array(BURST_POOL);
    const burstY = new Float32Array(BURST_POOL);
    const burstVx = new Float32Array(BURST_POOL);
    const burstVy = new Float32Array(BURST_POOL);
    const burstLife = new Float32Array(BURST_POOL);
    const burstMaxLife = new Float32Array(BURST_POOL);
    const burstBit = new Uint8Array(BURST_POOL);
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
        const speed = 38 + Math.random() * 110;
        burstX[idx] = lx + (Math.random() - 0.5) * 28;
        burstY[idx] = ly + (Math.random() - 0.5) * 12;
        burstVx[idx] = Math.cos(angle) * speed;
        burstVy[idx] = Math.sin(angle) * speed - 18;
        const maxL = 0.55 + Math.random() * 0.45;
        burstLife[idx] = maxL;
        burstMaxLife[idx] = maxL;
        burstBit[idx] = Math.random() > 0.5 ? 1 : 0;
      }
    };

    // Global mouse force vector state
    let pointerInside = false;
    let pointerPresence = 0;
    let pointerX = width * 0.5;
    let pointerY = height * 0.5;
    let prevPointerX = pointerX;
    let prevPointerY = pointerY;
    let hasPrevPointer = false;
    let lastMoveMs = 0;
    let rawForceX = 0;
    let rawForceY = 0;
    let smoothForceX = 0;
    let smoothForceY = 0;
    let smoothSpeed = 0;
    let swirlSign = 1;

    function initCanvasSize(): void {
      if (!canvas || !stage) return;
      width = Math.max(320, stage.clientWidth || window.innerWidth);
      height = Math.max(400, stage.clientHeight || window.innerHeight);
      mainGpu.resize(width, height, false);

      const colSpacing = width < 768 ? 28 : 24;
      const numCols = Math.ceil(width / colSpacing);
      streamCount = numCols;

      streamX = new Int16Array(streamCount);
      streamHeadY = new Float32Array(streamCount);
      streamSpeed = new Float32Array(streamCount);
      streamLen = new Uint8Array(streamCount);
      streamIsDarkLead = new Uint8Array(streamCount);
      streamBits = new Uint8Array(streamCount * MAX_LEN);

      const speedScale = reducedMotion ? 0.3 : 1;
      for (let i = 0; i < numCols; i++) {
        streamX[i] = Math.round(i * colSpacing + colSpacing * 0.5);
        const len = 8 + ((i * 5 + 3) % 9); // 8..16
        const span = height + len * CELL_H;
        streamLen[i] = len;
        streamHeadY[i] = ((i * 113) % Math.max(1, span)) - len * CELL_H * 0.3;
        streamSpeed[i] = (44 + ((i * 19) % 44)) * speedScale;
        streamIsDarkLead[i] = i % 5 === 0 ? 1 : 0;

        const base = i * MAX_LEN;
        for (let b = 0; b < MAX_LEN; b++) {
          streamBits[base + b] = ((i * 7 + b * 13) & 1) as 0 | 1;
        }
      }
    }

    initCanvasSize();
    sampleThankYouWord();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        sampleThankYouWord();
      });
    }

    function updateStagePointerSample(clientX: number, clientY: number): void {
      const now = performance.now();
      const rect = stage.getBoundingClientRect();
      const lx = clientX - rect.left;
      const ly = clientY - rect.top;
      pointerX = lx;
      pointerY = ly;
      pointerInside = true;

      if (hasPrevPointer) {
        const moveDt = Math.max(0.008, Math.min(0.08, (now - lastMoveMs) / 1000));
        const vx = (lx - prevPointerX) / moveDt;
        const vy = (ly - prevPointerY) / moveDt;
        const mag = Math.hypot(vx, vy);
        const cap = 1600;
        const sc = mag > cap ? cap / mag : 1;
        rawForceX = rawForceX * 0.35 + vx * sc * 0.65;
        rawForceY = rawForceY * 0.35 + vy * sc * 0.65;
        if (mag > 45) {
          const targetSign = vx * 0.7 - vy * 0.3 >= 0 ? 1 : -1;
          swirlSign += (targetSign - swirlSign) * 0.16;
        }
      }
      prevPointerX = lx;
      prevPointerY = ly;
      hasPrevPointer = true;
      lastMoveMs = now;
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      updateStagePointerSample(e.clientX, e.clientY);
    };

    const onPointerLeave = () => {
      pointerInside = false;
      hasPrevPointer = false;
      rawForceX = 0;
      rawForceY = 0;
    };

    const onStageTouchStart = (e: TouchEvent) => {
      if (sayHiOpen || e.touches.length === 0) return;
      hasPrevPointer = false;
      updateStagePointerSample(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onStageTouchMove = (e: TouchEvent) => {
      if (sayHiOpen || e.touches.length === 0) return;
      updateStagePointerSample(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onStageTouchEnd = () => {
      pointerInside = false;
      hasPrevPointer = false;
      rawForceX = 0;
      rawForceY = 0;
    };

    stage.addEventListener('pointermove', onPointerMove, { passive: true });
    stage.addEventListener('pointerleave', onPointerLeave, { passive: true });
    stage.addEventListener('touchstart', onStageTouchStart, { passive: true });
    stage.addEventListener('touchmove', onStageTouchMove, { passive: true });
    stage.addEventListener('touchend', onStageTouchEnd, { passive: true });
    stage.addEventListener('touchcancel', onStageTouchEnd, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      initCanvasSize();
    });
    resizeObserver.observe(stage);

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
    const rainSizePx = width < 640 ? 10.5 : 11.5;

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

    // =========================================================================
    // 5. MODAL BINARY DUST -> SOCIAL ICONS CONDENSATION ENGINE (ZERO GC)
    // Streams 320 binary dust motes from the floating C++ editor into the 4 icons
    // =========================================================================
    const ICON_DUST_PER_SLOT = 80;
    const ICON_DUST_TOTAL = ICON_DUST_PER_SLOT * 4;
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
      const originSpreadW = termRect ? termRect.width * 0.72 : 280;

      for (let slot = 0; slot < 4; slot++) {
        const iconEl = sayHiIconEls[slot];
        const iRect = iconEl?.getBoundingClientRect();
        const cx = iRect ? iRect.left + iRect.width * 0.5 : vw * 0.5 + (slot - 1.5) * 76;
        const cy = iRect ? iRect.top + iRect.height * 0.5 : originY + 64;
        const slotBaseDelay = slot * 0.12;

        for (let k = 0; k < ICON_DUST_PER_SLOT; k++) {
          const idx = slot * ICON_DUST_PER_SLOT + k;
          const seed = ((idx + 23) * 0.61803398875) % 1;
          const angle = (k / ICON_DUST_PER_SLOT) * Math.PI * 2 + seed * 1.4;
          const ringR = k < ICON_DUST_PER_SLOT * 0.45 ? 18 + seed * 10 : seed * 19;

          const sx = originCenterX + (seed - 0.5) * originSpreadW;
          const sy = originY + (((idx * 17) % 11) - 5) * 2.2;
          const dx = cx + Math.cos(angle) * ringR;
          const dy = cy + Math.sin(angle) * ringR;

          const swirlSignDir = (idx & 1) === 0 ? 1 : -1;
          const midX = (sx + dx) * 0.5 + swirlSignDir * (26 + seed * 54);
          const midY = (sy + dy) * 0.5 - 12 + (seed - 0.5) * 44;

          iconDustStartX[idx] = sx;
          iconDustStartY[idx] = sy;
          iconDustCtrlX[idx] = midX;
          iconDustCtrlY[idx] = midY;
          iconDustDstX[idx] = dx;
          iconDustDstY[idx] = dy;
          iconDustDelay[idx] = slotBaseDelay + seed * 0.16;
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
        mSparkRed[idx] = k % 3 === 0 ? 1 : 0;
      }
    };

    const renderLoop = (nowMs: number) => {
      if (isPaused) {
        rafId = 0;
        return;
      }

      const dt = Math.min((nowMs - lastMs) / 1000, 0.033);
      lastMs = nowMs;
      clock += dt;
      frameCounter++;

      smoothBuild += (buildProgress - smoothBuild) * (1 - Math.exp(-11 * dt));

      // Advance live C++ typing animation when the Say Hi floating editor is open
      if (sayHiOpen && cppTypedChars < TOTAL_SAY_HI_CHARS) {
        cppTypedChars = Math.min(TOTAL_SAY_HI_CHARS, cppTypedChars + dt * 145);
        if (cppTypedChars >= TOTAL_SAY_HI_CHARS && !iconsReady) {
          revealIconsFromBinaryDust();
        }
      }

      // Render GPU InstancedMesh modal binary dust condensation + icon hover sparks when Say Hi overlay is active
      if (sayHiOpen && modalGpuRenderer) {
        const mw = Math.max(320, window.innerWidth);
        const mh = Math.max(320, window.innerHeight);
        modalGpuRenderer.resize(mw, mh, false);
        modalGpuRenderer.beginFrame();

        const mTick = Math.floor(clock * 11);

        if (iconDustActive) {
          iconDustElapsed += dt;
          const travelDur = 0.64;
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
              modalGpuRenderer.push(px, py, 11.2, bit, CRIMSON_R, CRIMSON_G, CRIMSON_B, alpha);
            } else {
              modalGpuRenderer.push(px, py, 11.2, bit, CREAM_R, CREAM_G, CREAM_B, alpha);
            }
          }

          if (!anyAlive) {
            iconDustActive = false;
          }
        }

        // Icon hover / click binary dust sparks inside the Say Hi overlay
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
            modalGpuRenderer.push(
              mSparkX[i],
              mSparkY[i],
              10.5,
              bit,
              CRIMSON_R,
              CRIMSON_G,
              CRIMSON_B,
              alpha
            );
          } else {
            modalGpuRenderer.push(
              mSparkX[i],
              mSparkY[i],
              10.5,
              bit,
              CREAM_R,
              CREAM_G,
              CREAM_B,
              alpha
            );
          }
        }

        modalGpuRenderer.render();
      }

      // Skip heavy background WebGL draw work when Thank You section is completely scrolled out above
      if (smoothBuild < 0.008 && buildProgress < 0.008) {
        mainGpu.clear();
        rafId = requestAnimationFrame(renderLoop);
        return;
      }

      // Smooth global mouse force vector
      pointerPresence += ((pointerInside ? 1 : 0) - pointerPresence) * (1 - Math.exp(-5.0 * dt));
      const rawDecay = Math.exp(-7.2 * dt);
      rawForceX *= rawDecay;
      rawForceY *= rawDecay;
      const fLerp = 1 - Math.exp(-10.0 * dt);
      smoothForceX += (rawForceX - smoothForceX) * fLerp;
      smoothForceY += (rawForceY - smoothForceY) * fLerp;
      const curSpd = Math.min(1.8, Math.hypot(smoothForceX, smoothForceY) / 680);
      smoothSpeed += (curSpd - smoothSpeed) * (1 - Math.exp(-7.0 * dt));

      mainGpu.beginFrame();

      const rainAlphaEnv = Math.min(1, smoothBuild * 1.4);
      const tick = Math.floor(clock * 8);

      // Gently flip a few stream bits each odd frame
      if ((frameCounter & 1) === 0 && streamBits.length > 0) {
        for (let f = 0; f < 5; f++) {
          flipCursor = (flipCursor + 31) % streamBits.length;
          streamBits[flipCursor] ^= 1;
        }
      }

      // Soft exclusion band around the centered links so link copy stays ultra-crisp
      let linkLeft = width * 0.36;
      let linkRight = width * 0.64;
      let linkTop = height * 0.66;
      let linkBottom = height * 0.89;
      if (linksContainerEl) {
        const sRect = stage.getBoundingClientRect();
        const lRect = linksContainerEl.getBoundingClientRect();
        if (lRect.width > 0 && lRect.height > 0) {
          linkLeft = lRect.left - sRect.left - 34;
          linkRight = lRect.right - sRect.left + 34;
          linkTop = lRect.top - sRect.top - 18;
          linkBottom = lRect.bottom - sRect.top + 18;
        }
      }

      // 1) Draw Vermilion Binary Rain via GPU InstancedMesh
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
          const darkLead = streamIsDarkLead[i] === 1;

          for (let b = bStart; b <= bEnd; b++) {
            const bitY = headY - b * CELL_H;
            if (cx > linkLeft && cx < linkRight && bitY > linkTop && bitY < linkBottom) {
              continue;
            }
            const bitVal = (streamBits[bitOffset + b] & 1) as 0 | 1;
            if (b === 0) {
              if (darkLead) {
                mainGpu.push(cx, bitY, rainSizePx, bitVal, DARK_R, DARK_G, DARK_B, 0.36 * rainAlphaEnv);
              } else {
                mainGpu.push(cx, bitY, rainSizePx, bitVal, LEAD_R, LEAD_G, LEAD_B, 0.42 * rainAlphaEnv);
              }
            } else {
              const alpha = rainAlphaLut[lutBase + b] * rainAlphaEnv;
              mainGpu.push(cx, bitY, rainSizePx, bitVal, CREAM_R, CREAM_G, CREAM_B, alpha);
            }
          }
        }
      }

      // 2) Binary Dust Condensation of the static "Thank you" wordmark (active while entering 0.02..0.96)
      if (smoothBuild > 0.02 && smoothBuild < 0.96) {
        const cloudFadeOut = smoothBuild > 0.62 ? Math.max(0, 1 - (smoothBuild - 0.62) / 0.34) : 1;
        if (cloudFadeOut > 0.015) {
          let wordLeft = width * 0.08;
          let wordW = width * 0.84;
          let wordH = Math.min(height * 0.34, Math.max(100, width * 0.18));
          let wordTop = height * 0.22;

          if (anchorEl) {
            const sRect = stage.getBoundingClientRect();
            const aRect = anchorEl.getBoundingClientRect();
            if (aRect.width > 40 && aRect.height > 24) {
              wordLeft = aRect.left - sRect.left;
              wordTop = aRect.top - sRect.top;
              wordW = aRect.width;
              wordH = aRect.height;
            }
          }
          const colStep = 24;

          for (let i = 0; i < WORD_DUST_COUNT; i++) {
            const seed = wordSeed[i];
            const nx = wordDstNx[i];
            const ny = wordDstNy[i];
            const delay = nx * 0.18 + seed * 0.16;
            const localT = Math.max(0, Math.min(1, (smoothBuild - delay) / (0.82 - delay)));
            if (localT <= 0.006) continue;

            const ease = quinticSmooth(localT);
            const dstX = wordLeft + nx * wordW;
            const dstY = wordTop + ny * wordH;

            const srcX = Math.round((dstX + (seed - 0.5) * 90) / colStep) * colStep + colStep * 0.5;
            const srcY = dstY - (140 + seed * 220);
            const swirl = Math.sin(ease * Math.PI) * (seed - 0.5) * 42;

            const curX = srcX + (dstX - srcX) * ease + swirl;
            const curY = srcY + (dstY - srcY) * ease;

            const bitVal = (
              localT < 0.82 && (i + tick) % 9 === 0 ? wordBit[i] ^ 1 : wordBit[i]
            ) as 0 | 1;
            const alpha = Math.min(1, localT / 0.2) * cloudFadeOut * 0.92;
            if (alpha <= 0.025) continue;
            if (wordDark[i]) {
              mainGpu.push(curX, curY, dustSizePx, bitVal, RUBY_R, RUBY_G, RUBY_B, alpha * 0.72);
            } else {
              mainGpu.push(curX, curY, dustSizePx, bitVal, CREAM_R, CREAM_G, CREAM_B, alpha);
            }
          }
        }
      }

      // 3) Interactive Ambient Binary Dust Motes (Swirl around cursor via Global Force Vector)
      if (rainAlphaEnv > 0.05) {
        const swirlRadius = 185;
        const invTwoSigmaSq = 1 / (2 * swirlRadius * swirlRadius);
        const kSpring = 3.2;
        const damp = Math.exp(-3.8 * dt);
        const maxDisp = 115;
        const spin = swirlSign >= 0 ? Math.max(0.55, swirlSign) : Math.min(-0.55, swirlSign);
        const swirlGain = pointerPresence * (165 + smoothSpeed * 420);
        const globalGain = 0.24 * pointerPresence;

        for (let i = 0; i < AMBIENT_DUST_COUNT; i++) {
          const ph = ambPhase[i];
          const homeX = ambHomeNx[i] * width + Math.cos(clock * 0.42 + ph) * 14;
          const homeY = ambHomeNy[i] * height + Math.sin(clock * 0.55 + ph * 1.3) * 12;

          let dx = ambDispX[i];
          let dy = ambDispY[i];
          let vx = ambVelX[i];
          let vy = ambVelY[i];

          let ax = -dx * kSpring;
          let ay = -dy * kSpring;
          let boost = 0;

          if (pointerPresence > 0.003 && !reducedMotion) {
            const curX = homeX + dx;
            const curY = homeY + dy;
            const rx = curX - pointerX;
            const ry = curY - pointerY;
            const distSq = rx * rx + ry * ry;
            const dist = Math.sqrt(distSq) + 0.001;
            const prox = Math.exp(-distSq * invTwoSigmaSq);

            const gWeight = globalGain * (0.22 + 0.78 * prox);
            ax += smoothForceX * gWeight;
            ay += smoothForceY * gWeight;

            const invD = 1 / dist;
            const tx = -ry * invD * spin;
            const ty = rx * invD * spin;
            const sAccel = prox * swirlGain;
            ax += tx * sAccel;
            ay += ty * sAccel;

            if (dist < 62) {
              const push = (62 - dist) * 5.2 * prox * pointerPresence;
              ax += rx * invD * push;
              ay += ry * invD * push;
            }
            boost = prox * pointerPresence * (0.28 + smoothSpeed * 0.42);
          }

          vx = (vx + ax * dt) * damp;
          vy = (vy + ay * dt) * damp;
          dx += vx * dt;
          dy += vy * dt;

          const magSq = dx * dx + dy * dy;
          if (magSq > maxDisp * maxDisp) {
            const s = maxDisp / Math.sqrt(magSq);
            dx *= s;
            dy *= s;
            vx *= 0.72;
            vy *= 0.72;
          }

          ambDispX[i] = dx;
          ambDispY[i] = dy;
          ambVelX[i] = vx;
          ambVelY[i] = vy;

          const px = homeX + dx;
          const py = homeY + dy;
          if (px > linkLeft && px < linkRight && py > linkTop && py < linkBottom) continue;

          const twinkle = 0.55 + 0.45 * Math.sin(clock * 1.8 + ph);
          const alpha = rainAlphaEnv * Math.min(0.88, 0.16 + twinkle * 0.24 + boost);
          if (alpha <= 0.025) continue;
          const bitVal = ((i + tick) % 31 === 0 ? ambBit[i] ^ 1 : ambBit[i]) as 0 | 1;
          if (ambDark[i]) {
            mainGpu.push(px, py, dustSizePx * 0.96, bitVal, RUBY_R, RUBY_G, RUBY_B, alpha * 0.72);
          } else {
            mainGpu.push(px, py, dustSizePx * 0.96, bitVal, CREAM_R, CREAM_G, CREAM_B, alpha);
          }
        }
      }

      // 4) Micro-burst binary dust on link hover/click
      for (let i = 0; i < BURST_POOL; i++) {
        if (burstLife[i] <= 0) continue;
        burstLife[i] -= dt;
        if (burstLife[i] <= 0) continue;
        burstVx[i] *= Math.exp(-2.8 * dt);
        burstVy[i] = burstVy[i] * Math.exp(-2.4 * dt) + 28 * dt;
        burstX[i] += burstVx[i] * dt;
        burstY[i] += burstVy[i] * dt;
        const ratio = Math.max(0, burstLife[i] / Math.max(0.01, burstMaxLife[i]));
        const alpha = ratio * 0.85;
        if (alpha <= 0.025) continue;
        mainGpu.push(
          burstX[i],
          burstY[i],
          dustSizePx,
          (burstBit[i] & 1) as 0 | 1,
          CREAM_R,
          CREAM_G,
          CREAM_B,
          alpha
        );
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
      if (e.key === 'Escape' && sayHiOpen) {
        closeSayHiModal();
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
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerleave', onPointerLeave);
      stage.removeEventListener('touchstart', onStageTouchStart);
      stage.removeEventListener('touchmove', onStageTouchMove);
      stage.removeEventListener('touchend', onStageTouchEnd);
      stage.removeEventListener('touchcancel', onStageTouchEnd);
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

<div
  bind:this={stageEl}
  class="relative flex h-full w-full flex-col justify-between overflow-hidden bg-[#DF432B] text-[#F5F3EA]"
>
  <!-- Integrated Vermilion Binary Rain + Condensation Dust + Interactive Swirl Canvas -->
  <canvas
    bind:this={canvasEl}
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 z-0 block h-full w-full will-change-transform"
  ></canvas>

  <!-- Subtle top atmospheric gradient vignette for depth without clutter -->
  <div
    aria-hidden="true"
    class="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-[#C7351F]/35 to-transparent"
  ></div>

  <!-- STATIC GIANT "Thank you" EDITORIAL WORDMARK (Crystallizes from Binary Dust, stays cleanly static) -->
  <div class="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-10 sm:px-8 sm:pt-14">
    <h2
      bind:this={anchorEl}
      class="thankyou-wordmark text-center whitespace-nowrap select-none"
      style="opacity: {titleSolidOpacity.toFixed(3)}; transform: translate3d(0, {((1 - titleSolidOpacity) * 14).toFixed(1)}px, 0);"
    >
      Thank you
    </h2>
  </div>

  <!-- CENTERED MINIMALIST ACTION LINKS + QUIET COPYRIGHT -->
  <div class="relative z-10 flex flex-col items-center px-6 pb-8 sm:pb-10">
    <nav
      bind:this={linksContainerEl}
      aria-label="Connect and resume links"
      class="mb-12 flex flex-col items-center gap-2 sm:mb-14 sm:gap-2.5"
      style="opacity: {linksOpacity.toFixed(3)}; transform: translate3d(0, {linksTranslateY.toFixed(1)}px, 0); pointer-events: {linksOpacity > 0.2 ? 'auto' : 'none'};"
    >
      <!-- 1. Don't be shy, say hi! -> Opens Animated C++ Connect Card -->
      <button
        type="button"
        onpointerenter={handleLinkHover}
        onclick={openSayHiModal}
        class="group inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md px-4 py-1.5 font-sans text-[16px] font-medium tracking-[-0.01em] text-[#F5F3EA] transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5F3EA] sm:text-[17px]"
      >
        <span class="relative">
          Don't be shy, say hi!
          <span
            aria-hidden="true"
            class="absolute right-0 -bottom-0.5 left-0 h-[1px] origin-left scale-x-0 bg-[#F5F3EA]/80 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
          ></span>
        </span>
        <span
          aria-hidden="true"
          class="inline-block transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1"
        >
          →
        </span>
      </button>

      <!-- 2. Check my LinkedIn profile ↗ -->
      <a
        href="https://www.linkedin.com/in/iam-aryandas"
        target="_blank"
        rel="noopener noreferrer"
        onpointerenter={handleLinkHover}
        onclick={(e) => {
          e.stopPropagation();
          triggerLinkDustBurst?.(e.clientX, e.clientY, 22);
        }}
        class="group inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 py-1.5 font-sans text-[16px] font-medium tracking-[-0.01em] text-[#F5F3EA] transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5F3EA] sm:text-[17px]"
      >
        <span class="relative">
          Check my LinkedIn profile
          <span
            aria-hidden="true"
            class="absolute right-0 -bottom-0.5 left-0 h-[1px] origin-left scale-x-0 bg-[#F5F3EA]/80 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
          ></span>
        </span>
        <span
          aria-hidden="true"
          class="inline-block transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        >
          ↗
        </span>
      </a>

      <!-- 3. Download my CV ↓ (Direct link to attached Profile_585ff650.pdf) -->
      <a
        href={`${import.meta.env.BASE_URL}assets/aistudio/Profile_585ff650.pdf`}
        download="Aryan_Das_CV.pdf"
        onpointerenter={handleLinkHover}
        onclick={(e) => {
          e.stopPropagation();
          handleCvClick(e);
        }}
        class="group inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 py-1.5 font-sans text-[16px] font-medium tracking-[-0.01em] text-[#F5F3EA] transition-colors duration-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5F3EA] sm:text-[17px]"
      >
        <span class="relative">
          {cvDownloaded ? 'CV downloaded' : 'Download my CV'}
          <span
            aria-hidden="true"
            class="absolute right-0 -bottom-0.5 left-0 h-[1px] origin-left scale-x-0 bg-[#F5F3EA]/80 transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100"
          ></span>
        </span>
        <span
          aria-hidden="true"
          class="inline-block transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-y-1"
        >
          {cvDownloaded ? '✓' : '↓'}
        </span>
      </a>
    </nav>

    <p
      class="font-sans text-[12.5px] font-normal tracking-[0.01em] text-[#F5F3EA]/55 select-none"
      style="opacity: {footerOpacity.toFixed(3)};"
    >
      © 2026 Aryan Das
    </p>
  </div>

  <!-- ====================================================================== -->
  <!-- SAY HI FLOATING C++ EDITOR + BINARY-DUST MATERIALIZED SOCIAL ICONS     -->
  <!-- Clean floating editor first; social icons emerge from 0/1 dust AFTER!  -->
  <!-- ====================================================================== -->
  {#if sayHiOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={sayHiBackdropEl}
      onclick={closeSayHiModal}
      onpointerdown={(e) => e.stopPropagation()}
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0C0807]/88 p-3.5 sm:p-6"
      style="opacity: 0;"
    >
      <!-- Dedicated Binary Dust Canvas for Icon Materialization & Hover Sparks -->
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
        class="relative z-10 flex w-full max-w-[468px] flex-col items-center"
      >
        <!-- CLEAN FLOATING C++ CODE EDITOR BLOCK (ZERO OUTER WRAPPER CLUTTER) -->
        <div
          bind:this={sayHiEditorEl}
          class="w-full overflow-hidden rounded-2xl border border-white/14 bg-[#0B0E14] text-left shadow-[0_32px_90px_rgba(0,0,0,0.72)] will-change-transform"
          style="opacity: 0;"
        >
          <!-- Minimal Editor Titlebar -->
          <div class="flex items-center justify-between border-b border-white/8 bg-[#131820] px-4 py-2.5">
            <div class="flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full bg-[#ff5f56]"></span>
              <span class="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]"></span>
              <span class="h-2.5 w-2.5 rounded-full bg-[#27c93f]"></span>
              <span class="ml-2 font-mono text-[11.5px] font-medium tracking-tight text-[#E6EDF3]">
                say_hi.cpp
              </span>
            </div>

            <div class="flex items-center gap-3">
              <span class="font-mono text-[10.5px] text-[#8B949E]">
                {cppFinished ? 'exited 0' : 'running...'}
              </span>
              <button
                type="button"
                aria-label="Close"
                onclick={closeSayHiModal}
                class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-xs text-[#8B949E] transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F5F3EA]"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Live Syntax-Highlighted C++ Body -->
          <div
            bind:this={sayHiCodeScrollEl}
            class="overflow-x-auto px-3 py-3 font-mono text-[11px] leading-[1.6] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5 sm:py-4 sm:text-[12.5px] sm:leading-[1.68]"
          >
            {#each visibleSayHiCpp as line (line.lineNumber)}
              <div
                class="flex items-baseline rounded px-1 {line.isCursorLine && !cppFinished
                  ? 'bg-white/[0.04]'
                  : ''}"
              >
                <span
                  class="mr-3.5 w-4 shrink-0 text-right text-[10.5px] select-none {line.isCursorLine
                    ? 'text-[#E6EDF3]'
                    : 'text-[#545D68]'}"
                >
                  {line.lineNumber}
                </span>
                <span class="whitespace-pre">
                  {#each line.tokens as tok, tIdx (tIdx)}
                    <span style="color: {tok.color};">{tok.text}</span>
                  {/each}{#if line.isCursorLine}<span
                      class="ml-[1px] inline-block h-[13.5px] w-[6px] translate-y-[2px] bg-[#DF432B] animate-pulse"
                    ></span>{/if}
                </span>
              </div>
            {/each}
          </div>

          <!-- Crisp Terminal Execution Strip (Tap/Click to replay C++ + binary dust wave) -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            bind:this={sayHiTerminalEl}
            onclick={(e) => {
              e.stopPropagation();
              if (cppFinished) replaySayHiCpp(e.clientX, e.clientY);
            }}
            class="cursor-pointer border-t border-white/8 bg-[#080A0F] px-4 py-2.5 font-mono text-[11.5px] transition-opacity duration-300 sm:px-5"
            style="opacity: {cppFinished ? 1 : 0.32};"
          >
            <span class="text-[#DF432B]">$</span>
            <span class="ml-1.5 text-[#8B949E]">./say_hi</span>
            {#if cppFinished}
              <span class="ml-2 text-[#F5F3EA]">Hey! Let's connect &amp; build.</span>
            {/if}
          </div>
        </div>

        <!-- SOCIAL ICONS BAR (HIDDEN AT FIRST — MATERIALIZES FROM BINARY DUST AFTER C++ RUNS!) -->
        <div
          class="mt-6 flex flex-col items-center gap-3"
          style="pointer-events: {iconsReady ? 'auto' : 'none'};"
        >
          <div class="flex items-center justify-center gap-3 sm:gap-4">
            {#each CONNECT_CHANNELS as channel, idx (channel.id)}
              <a
                bind:this={sayHiIconEls[idx]}
                href={channel.href}
                target={channel.external ? '_blank' : undefined}
                rel={channel.external ? 'noopener noreferrer' : undefined}
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
                  } else {
                    e.stopPropagation();
                    emitModalIconBurst?.(e.clientX, e.clientY, 20);
                  }
                }}
                class="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/14 bg-[#0B0E14]/92 text-[#F5F3EA] shadow-[0_14px_34px_rgba(0,0,0,0.45)] transition-[transform,border-color,background-color,color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-[#DF432B]/75 hover:bg-[#141923] hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#F5F3EA] sm:h-[58px] sm:w-[58px]"
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

          <!-- Quiet Hover-Only Handle Caption (zero resting clutter) -->
          <div class="h-5 font-mono text-[12px] tracking-tight text-[#F5F3EA]/80">
            {#if copiedMail}
              <span class="text-[#F5F3EA]">Copied aryandas.original@gmail.com ✓</span>
            {:else if activeHoverChannel}
              <span>
                <span class="text-[#F5F3EA]/55">{activeHoverChannel.label}</span>
                <span class="mx-1.5 text-[#DF432B]">·</span>
                <span>{activeHoverChannel.handle}</span>
              </span>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .thankyou-wordmark {
    font-family: var(--font-editorial, "Fraunces", Georgia, serif);
    font-variation-settings: "SOFT" 100, "WONK" 1, "opsz" 144;
    font-weight: 700;
    font-size: clamp(2.85rem, 15.6vw, 15.8rem);
    line-height: 0.92;
    letter-spacing: -0.028em;
    color: #f5f3ea;
  }
</style>
