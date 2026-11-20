<script lang="ts">
  import { onMount } from 'svelte';

  let canvasEl = $state<HTMLCanvasElement | null>(null);

  onMount(() => {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    // Cap backdrop DPR at 1.5 for crisp ambient glyphs with ~40% less pixel fillrate on HiDPI screens
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Adaptive density + zero-allocation TypedArray state + pre-computed LUTs + inner-zone draw culling
    const CELL_HEIGHT = 16;
    const STREAMS_PER_COL = 2;
    const OPACITY_STEPS = 8;
    const TILE_SIZE = 16;
    const MAX_LENGTH = 20;

    // Pre-computed LUT: atlasRowLut[len * MAX_LENGTH + b] avoids per-bit float division in the hot loop
    const atlasRowLut = new Uint8Array((MAX_LENGTH + 1) * MAX_LENGTH);
    for (let len = 1; len <= MAX_LENGTH; len++) {
      const rowBase = len * MAX_LENGTH;
      for (let b = 1; b < len; b++) {
        atlasRowLut[rowBase + b] = Math.min(
          OPACITY_STEPS - 1,
          Math.floor(((len - b) / len) * OPACITY_STEPS)
        );
      }
    }

    // Pre-baked Glyph Sprite Atlas:
    // Row 0..7: Trail stone color (#8e8e86) at 8 opacity steps (Col 0 = '0', Col 1 = '1')
    // Row 8: Dark charcoal lead bit (#181816) (Col 0 = '0', Col 1 = '1')
    // Row 9: Bright red lead bit (#ff261b) (Col 0 = '0', Col 1 = '1')
    const TOTAL_ATLAS_ROWS = OPACITY_STEPS + 2;
    const srcTilePx = Math.round(TILE_SIZE * dpr);
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = srcTilePx * 2;
    atlasCanvas.height = srcTilePx * TOTAL_ATLAS_ROWS;
    const actx = atlasCanvas.getContext('2d');

    if (actx) {
      actx.scale(srcTilePx / TILE_SIZE, srcTilePx / TILE_SIZE);
      actx.font = '600 11.5px "JetBrains Mono", ui-monospace, monospace';
      actx.textAlign = 'center';
      actx.textBaseline = 'middle';

      for (let step = 0; step < OPACITY_STEPS; step++) {
        const ratio = (step + 1) / OPACITY_STEPS;
        const smooth = ratio * ratio * (3 - 2 * ratio);
        const alpha = 0.05 + smooth * 0.28;
        actx.fillStyle = `rgba(142, 142, 134, ${alpha.toFixed(3)})`;
        const cy = step * TILE_SIZE + TILE_SIZE * 0.5;
        actx.fillText('0', TILE_SIZE * 0.5, cy);
        actx.fillText('1', TILE_SIZE * 1.5, cy);
      }

      // Row 8: Charcoal lead bit
      const charcoalY = OPACITY_STEPS * TILE_SIZE + TILE_SIZE * 0.5;
      actx.fillStyle = 'rgba(24, 24, 22, 0.58)';
      actx.fillText('0', TILE_SIZE * 0.5, charcoalY);
      actx.fillText('1', TILE_SIZE * 1.5, charcoalY);

      // Row 9: Red lead bit
      const redY = (OPACITY_STEPS + 1) * TILE_SIZE + TILE_SIZE * 0.5;
      actx.fillStyle = 'rgba(255, 38, 27, 0.82)';
      actx.fillText('0', TILE_SIZE * 0.5, redY);
      actx.fillText('1', TILE_SIZE * 1.5, redY);
    }

    // Flat TypedArrays for all streams (zero object/GC overhead during animation loop)
    let streamCount = 0;
    let streamX = new Int16Array(0);
    let streamHeadY = new Float32Array(0);
    let streamSpeed = new Float32Array(0);
    let streamLen = new Uint8Array(0);
    let streamLeadRow = new Uint8Array(0);
    let streamBits = new Uint8Array(0);

    // Pre-allocated flat exclusion buffers (zero per-frame allocations):
    // [left, top, right, bottom] for feathered mask + inner opaque bounds for pre-draw culling
    const MAX_EXCLUSION_ZONES = 48;
    const exclusionRects = new Float32Array(MAX_EXCLUSION_ZONES * 4);
    const innerCullRects = new Float32Array(MAX_EXCLUSION_ZONES * 4);
    let exclusionCount = 0;
    let zonesDirty = true;
    let lastZoneSyncMs = 0;

    function initStreams(): void {
      if (!canvasEl || !ctx) return;
      width = window.innerWidth;
      height = window.innerHeight;

      canvasEl.width = Math.floor(width * dpr);
      canvasEl.height = Math.floor(height * dpr);
      canvasEl.style.width = `${width}px`;
      canvasEl.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      const colSpacing = width < 768 ? 24 : 20;
      const numCols = Math.ceil(width / colSpacing);
      streamCount = numCols * STREAMS_PER_COL;

      streamX = new Int16Array(streamCount);
      streamHeadY = new Float32Array(streamCount);
      streamSpeed = new Float32Array(streamCount);
      streamLen = new Uint8Array(streamCount);
      streamLeadRow = new Uint8Array(streamCount);
      streamBits = new Uint8Array(streamCount * MAX_LENGTH);

      const speedScale = reducedMotion ? 0.35 : 1;
      const halfTile = TILE_SIZE * 0.5;

      let idx = 0;
      for (let i = 0; i < numCols; i++) {
        const x = Math.round(i * colSpacing + colSpacing * 0.5 - halfTile);
        const baseSpeed = (56 + ((i * 23) % 54)) * speedScale;

        for (let s = 0; s < STREAMS_PER_COL; s++) {
          const len = 10 + ((i + s * 7) % 9); // 10..18
          const span = height + len * CELL_HEIGHT;
          const initialY =
            ((s / STREAMS_PER_COL) * span + ((i * 61) % Math.max(1, Math.floor(span * 0.5)))) %
              span -
            len * CELL_HEIGHT * 0.25;

          streamX[idx] = x;
          streamHeadY[idx] = initialY;
          streamSpeed[idx] = baseSpeed + s * 9 * speedScale;
          streamLen[idx] = len;
          streamLeadRow[idx] = (i + s) % 4 === 0 ? OPACITY_STEPS + 1 : OPACITY_STEPS;

          const baseBitOffset = idx * MAX_LENGTH;
          for (let b = 0; b < MAX_LENGTH; b++) {
            streamBits[baseBitOffset + b] = Math.random() > 0.5 ? 1 : 0;
          }
          idx++;
        }
      }
    }

    function updateExclusionZones(nowMs: number): void {
      zonesDirty = false;
      lastZoneSyncMs = nowMs;
      const elements = document.querySelectorAll<HTMLElement>('[data-binary-exclude]');
      let count = 0;

      for (let i = 0; i < elements.length && count < MAX_EXCLUSION_ZONES; i++) {
        const el = elements[i];
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;
        if (r.bottom < -30 || r.top > height + 30) continue;

        const padX = Number(el.dataset.excludePadX ?? 24);
        const padTop = Number(el.dataset.excludePadTop ?? 18);
        const padBottom = Number(el.dataset.excludePadBottom ?? 24);

        const left = r.left - padX;
        const top = r.top - padTop;
        const right = r.right + padX;
        const bottom = r.bottom + padBottom;

        const o = count * 4;
        exclusionRects[o] = left;
        exclusionRects[o + 1] = top;
        exclusionRects[o + 2] = right;
        exclusionRects[o + 3] = bottom;

        // Inner opaque core (safe inset where radial destination-out alpha is ~100%)
        // used to skip invisible drawImage calls entirely before compositing
        const insetX = Math.max(22, (right - left) * 0.24);
        const insetY = Math.max(18, (bottom - top) * 0.24);
        innerCullRects[o] = left + insetX;
        innerCullRects[o + 1] = top + insetY;
        innerCullRects[o + 2] = right - insetX;
        innerCullRects[o + 3] = bottom - insetY;
        count++;
      }

      exclusionCount = count;
    }

    // Pre-bake a soft-feathered radial mask sprite for destination-out exclusion zones
    const MASK_SIZE = 96;
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = MASK_SIZE;
    maskCanvas.height = MASK_SIZE;
    const mctx = maskCanvas.getContext('2d');
    if (mctx) {
      const grad = mctx.createRadialGradient(
        MASK_SIZE * 0.5,
        MASK_SIZE * 0.5,
        MASK_SIZE * 0.18,
        MASK_SIZE * 0.5,
        MASK_SIZE * 0.5,
        MASK_SIZE * 0.5
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
      grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.92)');
      grad.addColorStop(0.82, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mctx.fillStyle = grad;
      mctx.fillRect(0, 0, MASK_SIZE, MASK_SIZE);
    }

    initStreams();
    updateExclusionZones(performance.now());

    let rafId = 0;
    let isPaused = document.hidden;
    let lastMs = performance.now();
    let frameCounter = 0;
    let flipCursor = 0;

    const halfTile = TILE_SIZE * 0.5;
    const invCellH = 1 / CELL_HEIGHT;

    const renderLoop = (nowMs: number) => {
      if (isPaused) {
        rafId = 0;
        return;
      }

      const dt = Math.min((nowMs - lastMs) / 1000, 0.033);
      lastMs = nowMs;
      frameCounter++;

      // Sync exclusion zones immediately when scroll/DOM marks dirty (throttled to ~60ms),
      // or gently every 450ms as a low-cost fallback — eliminating per-8-frame layout thrashing!
      if ((zonesDirty && nowMs - lastZoneSyncMs >= 55) || nowMs - lastZoneSyncMs >= 450) {
        updateExclusionZones(nowMs);
      }

      // Subtle bit flips across streams (smooth cadence, zero allocations)
      const totalBits = streamBits.length;
      if ((frameCounter & 1) === 0 && totalBits > 0) {
        for (let f = 0; f < 6; f++) {
          flipCursor = (flipCursor + 37) % totalBits;
          streamBits[flipCursor] ^= 1;
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, width, height);

      const maxY = height + CELL_HEIGHT;

      for (let i = 0; i < streamCount; i++) {
        let headY = streamHeadY[i] + streamSpeed[i] * dt;
        const len = streamLen[i];

        if (headY - len * CELL_HEIGHT > height + 20) {
          headY = -CELL_HEIGHT * 2;
        }
        streamHeadY[i] = headY;

        // Compute exact visible bit index bounds [bStart, bEnd] — skip all offscreen iterations
        let bStart = Math.floor((headY - maxY) * invCellH);
        if (bStart < 0) bStart = 0;
        let bEnd = Math.floor((headY + CELL_HEIGHT) * invCellH);
        if (bEnd >= len) bEnd = len - 1;
        if (bStart > bEnd) continue;

        const x = streamX[i];
        const centerX = x + halfTile;
        const bitOffset = i * MAX_LENGTH;
        const lutBase = len * MAX_LENGTH;
        const leadRow = streamLeadRow[i];

        for (let b = bStart; b <= bEnd; b++) {
          const bitY = headY - b * CELL_HEIGHT;

          // Pre-cull bits fully hidden inside opaque center of any exclusion zone
          let occluded = false;
          for (let z = 0; z < exclusionCount; z++) {
            const o = z * 4;
            if (
              centerX > innerCullRects[o] &&
              centerX < innerCullRects[o + 2] &&
              bitY > innerCullRects[o + 1] &&
              bitY < innerCullRects[o + 3]
            ) {
              occluded = true;
              break;
            }
          }
          if (occluded) continue;

          const bitVal = streamBits[bitOffset + b];
          const atlasRow = b === 0 ? leadRow : atlasRowLut[lutBase + b];

          ctx.drawImage(
            atlasCanvas,
            bitVal * srcTilePx,
            atlasRow * srcTilePx,
            srcTilePx,
            srcTilePx,
            x,
            (bitY - halfTile) | 0,
            TILE_SIZE,
            TILE_SIZE
          );
        }
      }

      // Hardware-accelerated feathered exclusion zone masking (destination-out)
      if (exclusionCount > 0) {
        ctx.globalCompositeOperation = 'destination-out';
        for (let z = 0; z < exclusionCount; z++) {
          const o = z * 4;
          const left = exclusionRects[o];
          const top = exclusionRects[o + 1];
          const w = exclusionRects[o + 2] - left;
          const h = exclusionRects[o + 3] - top;
          ctx.drawImage(maskCanvas, (left - 24) | 0, (top - 18) | 0, (w + 48) | 0, (h + 36) | 0);
        }
        ctx.globalCompositeOperation = 'source-over';
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    const markZonesDirty = () => {
      zonesDirty = true;
    };

    const onResize = () => {
      initStreams();
      zonesDirty = true;
      updateExclusionZones(performance.now());
    };

    const onVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused && rafId === 0) {
        lastMs = performance.now();
        zonesDirty = true;
        rafId = requestAnimationFrame(renderLoop);
      } else if (isPaused && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    window.addEventListener('scroll', markZonesDirty, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    if (!isPaused) {
      rafId = requestAnimationFrame(renderLoop);
    }

    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', markZonesDirty);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });
</script>

<canvas
  bind:this={canvasEl}
  aria-hidden="true"
  class="pointer-events-none absolute inset-0 z-0 block h-full w-full will-change-transform"
></canvas>
