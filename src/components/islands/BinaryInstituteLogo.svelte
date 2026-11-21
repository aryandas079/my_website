<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    logoSrc: string;
    altLabel: string;
    compact?: boolean;
    animateReveal?: boolean;
  }

  let {
    logoSrc,
    altLabel,
    compact = false,
    animateReveal = true,
  }: Props = $props();

  let canvasEl = $state<HTMLCanvasElement | null>(null);

  interface MaskCell {
    col: number;
    row: number;
    baseBit: 0 | 1;
    strength: number;
    swirlX: number;
    swirlY: number;
    delay: number;
  }

  function hashVal(n: number): number {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  onMount(() => {
    if (!canvasEl) return;
    const canvas = canvasEl;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let disposed = false;
    let rafId = 0;
    let isLoaded = false;
    let revealProgress = animateReveal ? 0 : 1;
    let clock = 0;
    let lastMs = performance.now();

    // Offscreen pre-cleaned transparent logo artwork (background removed, colors enriched)
    const artCanvas = document.createElement('canvas');
    const ART_SIZE = 512;
    artCanvas.width = ART_SIZE;
    artCanvas.height = ART_SIZE;
    const artCtx = artCanvas.getContext('2d', { willReadFrequently: true });

    // Offscreen compositing buffer so we paint crisp 0/1 glyphs and color them with exact logo pixels via source-in
    const compCanvas = document.createElement('canvas');
    const compCtx = compCanvas.getContext('2d');

    const COLS = compact ? 42 : 72;
    const ROWS = compact ? 38 : 68;
    let activeCells: MaskCell[] = [];

    const img = new Image();
    if (logoSrc.startsWith('http://') || logoSrc.startsWith('https://')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      if (disposed || !artCtx) return;

      artCtx.clearRect(0, 0, ART_SIZE, ART_SIZE);
      const pad = 14;
      const avail = ART_SIZE - pad * 2;
      const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
      let drawW = avail;
      let drawH = avail;
      if (aspect > 1) {
        drawH = avail / aspect;
      } else {
        drawW = avail * aspect;
      }
      const dx = (ART_SIZE - drawW) * 0.5;
      const dy = (ART_SIZE - drawH) * 0.5;
      artCtx.drawImage(img, dx, dy, drawW, drawH);

      // Cleanly key out background and map pixels strictly to Swiss White, Black & Red palette
      const imgData = artCtx.getImageData(0, 0, ART_SIZE, ART_SIZE);
      const px = imgData.data;

      for (let i = 0; i < px.length; i += 4) {
        const r = px[i];
        const g = px[i + 1];
        const b = px[i + 2];
        const a = px[i + 3];
        if (a < 20) {
          px[i + 3] = 0;
          continue;
        }
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const chroma = maxC - minC;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Key out near-white background pixels
        if (lum > 228 && chroma < 26) {
          px[i + 3] = 0;
          continue;
        }

        // Strict 3-color mapping:
        // Chromatic warm features (petals, flame, torch, red accents) -> Pure Red (#FF261B)
        // Text, rings, and line contours -> Rich Black (#111111)
        const isWarmAccent = chroma > 20 && (r > 110 || (r > b && r > g));
        if (isWarmAccent) {
          px[i] = 255;
          px[i + 1] = 38;
          px[i + 2] = 27;
          px[i + 3] = 255;
        } else {
          px[i] = 17;
          px[i + 1] = 17;
          px[i + 2] = 17;
          px[i + 3] = 255;
        }
      }
      artCtx.putImageData(imgData, 0, 0);

      // Build dense active binary glyph cells using 3x3 sub-sampling inside each glyph cell
      // so thin curved letters, petals, torch waves, and outlines NEVER drop out!
      const cells: MaskCell[] = [];
      const stepX = ART_SIZE / COLS;
      const stepY = ART_SIZE / ROWS;

      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          let maxAlpha = 0;
          let sumAlpha = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const sampleX = Math.min(
                ART_SIZE - 1,
                Math.floor((col + (sx + 0.5) / 3) * stepX)
              );
              const sampleY = Math.min(
                ART_SIZE - 1,
                Math.floor((row + (sy + 0.5) / 3) * stepY)
              );
              const aVal = px[(sampleY * ART_SIZE + sampleX) * 4 + 3] / 255;
              if (aVal > maxAlpha) maxAlpha = aVal;
              sumAlpha += aVal;
            }
          }
          const avgAlpha = sumAlpha / 9;
          const strength = Math.max(maxAlpha * 0.88, avgAlpha * 1.15);
          if (strength < 0.14) continue;

          const id = row * COLS + col;
          const h1 = hashVal(id * 1.13 + 7.1);
          const h2 = hashVal(id * 2.71 + 19.3);
          const angle = h1 * Math.PI * 2;
          const dist = 16 + h2 * 38;

          cells.push({
            col,
            row,
            baseBit: ((col * 7 + row * 11) & 1) === 1 ? 1 : 0,
            strength: Math.min(1, strength),
            swirlX: Math.cos(angle) * dist,
            swirlY: Math.sin(angle) * dist - 14,
            delay: hashVal(id * 3.17 + 5.7) * 0.34,
          });
        }
      }

      activeCells = cells;
      isLoaded = true;
    };
    img.src = logoSrc;

    const render = (nowMs: number) => {
      if (disposed) return;
      rafId = requestAnimationFrame(render);

      const dt = Math.min((nowMs - lastMs) / 1000, 0.05);
      lastMs = nowMs;
      clock += dt;

      if (isLoaded && revealProgress < 1) {
        revealProgress = Math.min(1, revealProgress + dt * 1.65);
      }

      const rect = canvas.getBoundingClientRect();
      const w = Math.max(70, Math.round(rect.width || 260));
      const h = Math.max(70, Math.round(rect.height || 260));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const pw = Math.round(w * dpr);
      const ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      if (compCanvas.width !== pw || compCanvas.height !== ph) {
        compCanvas.width = pw;
        compCanvas.height = ph;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (!isLoaded || activeCells.length === 0 || !compCtx) return;

      const size = Math.min(w, h);
      const offsetX = (w - size) * 0.5;
      const offsetY = (h - size) * 0.5;
      const cellW = size / COLS;
      const cellH = size / ROWS;
      const fontSize = Math.max(compact ? 3.2 : 5.2, Math.min(cellW * 1.48, cellH * 1.32));

      // 1. Subtle ultra-clean ink contour pass (24% alpha) strictly inside the crest silhouette
      //    so delicate Devanagari/English lettering and fine lines remain 100% legible without breaking
      const settledAlpha = Math.max(0, Math.min(1, (revealProgress - 0.45) / 0.55));
      if (settledAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = (compact ? 0.34 : 0.24) * settledAlpha;
        ctx.drawImage(artCanvas, offsetX, offsetY, size, size);
        ctx.restore();
      }

      // 2. Crisp dense 0 & 1 binary glyph matrix colored pixel-accurately by the official emblem!
      compCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      compCtx.clearRect(0, 0, w, h);
      compCtx.globalCompositeOperation = 'source-over';
      compCtx.font = `900 ${fontSize.toFixed(2)}px "JetBrains Mono", ui-monospace, monospace`;
      compCtx.textAlign = 'center';
      compCtx.textBaseline = 'middle';
      compCtx.fillStyle = '#000000';

      const tick = Math.floor(clock * 3.2);

      for (let i = 0; i < activeCells.length; i++) {
        const c = activeCells[i];
        const lt = Math.max(0, Math.min(1, (revealProgress - c.delay) / (1 - c.delay)));
        if (lt <= 0) continue;
        const ease = lt * lt * (3 - 2 * lt);

        const x = offsetX + (c.col + 0.5) * cellW + c.swirlX * (1 - ease);
        const y = offsetY + (c.row + 0.5) * cellH + c.swirlY * (1 - ease);

        // Occasional calm binary shimmer
        const flip = ((i + tick) % 79 === 0) ? 1 : 0;
        const ch = (c.baseBit ^ flip) === 1 ? '1' : '0';

        compCtx.globalAlpha = Math.min(1, (0.78 + c.strength * 0.22) * ease);
        compCtx.fillText(ch, x, y);
      }

      // Color every single rendered 0 and 1 glyph with exact full-resolution colors from the emblem!
      compCtx.globalAlpha = 1;
      compCtx.globalCompositeOperation = 'source-in';
      compCtx.drawImage(artCanvas, offsetX, offsetY, size, size);
      compCtx.globalCompositeOperation = 'source-over';

      // Draw crisp colored binary emblem onto the main canvas
      ctx.drawImage(compCanvas, 0, 0, w, h);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
    };
  });
</script>

<canvas
  bind:this={canvasEl}
  aria-label="{altLabel} rendered cleanly in binary 1 and 0 digits"
  class="block h-full w-full"
></canvas>
