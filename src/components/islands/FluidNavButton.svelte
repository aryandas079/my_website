<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    id: string;
    label: string;
    active?: boolean;
    alwaysDripping?: boolean;
    compact?: boolean;
    lightRim?: boolean;
    onclick?: (e: MouseEvent) => void;
  }

  let {
    id,
    label,
    active = false,
    alwaysDripping = false,
    compact = false,
    lightRim = false,
    onclick,
  }: Props = $props();

  let buttonEl = $state<HTMLButtonElement | null>(null);
  let isHovered = $state(false);

  // Canvas padding around the button to give room for sweeping black fluid strands & falling drops
  const PAD_X = 82;
  const PAD_TOP = 20;
  const PAD_BOTTOM = 128;

  let btnW = $state(compact ? 108 : 148);
  let btnH = $state(compact ? 40 : 48);

  let svgW = $derived(btnW + PAD_X * 2);
  let svgH = $derived(btnH + PAD_TOP + PAD_BOTTOM);

  // Capsule coordinates in SVG space
  let capLeft = $derived(PAD_X);
  let capTop = $derived(PAD_TOP);
  let capBottomY = $derived(PAD_TOP + btnH - 4);

  interface Droplet {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    stretch: number;
    alpha: number;
  }

  interface StrandRender {
    d: string;
    width: number;
    baseX: number;
    baseBumpR: number;
    midX: number;
    midY: number;
    midR: number;
  }

  let focalX = $state(0);
  let focalY = $state(0);
  let targetFocalX = 0;
  let targetFocalY = 0;
  let pointerOffsetNormX = 0;
  let pointerOffsetNormY = 0;

  // 0 = settled unhovered, 1 = extended fluid on hover
  let fluidTension = $state(0);
  let recoilWave = $state(0);
  let simTime = $state(0);

  let strands = $state<StrandRender[]>([]);
  let droplets = $state<Droplet[]>([]);
  let nextDropId = 1;
  let lastDropSpawnMs = 0;
  let wakeLoop: (() => void) | null = null;

  const ANCHOR_RATIOS = [0.14, 0.28, 0.42, 0.56, 0.7, 0.86];

  function handlePointerEnter(e: PointerEvent): void {
    isHovered = true;
    updatePointerTarget(e);
    wakeLoop?.();
  }

  function handlePointerMove(e: PointerEvent): void {
    if (!isHovered) isHovered = true;
    updatePointerTarget(e);
    wakeLoop?.();
  }

  function handlePointerLeave(): void {
    isHovered = false;
    wakeLoop?.();
  }

  function updatePointerTarget(e: PointerEvent): void {
    if (!buttonEl) return;
    const rect = buttonEl.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;

    pointerOffsetNormX = Math.max(-1.35, Math.min(1.35, (relX / Math.max(rect.width, 1)) * 2 - 1));
    pointerOffsetNormY = Math.max(-0.5, Math.min(1.5, relY / Math.max(rect.height, 1)));
  }

  onMount(() => {
    let rafId = 0;
    let isRunning = false;
    let lastMs = performance.now();

    const measure = () => {
      if (!buttonEl) return;
      btnW = Math.max(compact ? 78 : 120, Math.round(buttonEl.offsetWidth));
      btnH = Math.max(compact ? 36 : 44, Math.round(buttonEl.offsetHeight));
    };

    measure();
    focalX = PAD_X + btnW * 0.55;
    focalY = capBottomY + 40;
    targetFocalX = focalX;
    targetFocalY = focalY;

    const ro = new ResizeObserver(measure);
    if (buttonEl) ro.observe(buttonEl);

    const step = (nowMs: number) => {
      const dt = Math.min((nowMs - lastMs) / 1000, 0.05);
      lastMs = nowMs;
      simTime += dt;

      const minTension = alwaysDripping ? 0.78 : 0;
      const desiredTension = isHovered ? 1 : minTension;

      if (isHovered || alwaysDripping) {
        fluidTension += (desiredTension - fluidTension) * Math.min(1, dt * 9.5);
        recoilWave *= Math.pow(0.05, dt);
      } else {
        if (fluidTension > 0.15) {
          recoilWave = Math.min(1, recoilWave + dt * 5.5);
        } else {
          recoilWave *= Math.pow(0.04, dt);
        }
        fluidTension += (0 - fluidTension) * Math.min(1, dt * 7.5);
      }

      const idleSweepX = Math.sin(simTime * 2.5) * (btnW * 0.24) + Math.cos(simTime * 1.3) * 12;
      const idleBobY = Math.sin(simTime * 3.2) * 6 + Math.cos(simTime * 2.0) * 3;

      if (isHovered) {
        targetFocalX =
          PAD_X +
          btnW * 0.5 +
          pointerOffsetNormX * (btnW * 0.44) +
          idleSweepX * 0.5;
        targetFocalY =
          capBottomY +
          38 +
          Math.abs(pointerOffsetNormX) * 6 +
          pointerOffsetNormY * 12 +
          idleBobY;
      } else if (alwaysDripping) {
        targetFocalX = PAD_X + btnW * 0.5 + idleSweepX * 0.85;
        targetFocalY = capBottomY + 34 + idleBobY;
      } else {
        targetFocalX = PAD_X + btnW * 0.5 + idleSweepX * 0.18;
        targetFocalY = capBottomY + 3;
      }

      focalX += (targetFocalX - focalX) * Math.min(1, dt * 10.5);
      focalY += (targetFocalY - focalY) * Math.min(1, dt * 10.5);

      if (fluidTension > 0.01 || recoilWave > 0.02) {
        const newStrands: StrandRender[] = [];

        for (let i = 0; i < ANCHOR_RATIOS.length; i++) {
          const ratio = ANCHOR_RATIOS[i];
          const phase = simTime * 3.6 + i * 1.1;
          const anchorWaveX = Math.sin(phase) * 3.0 * fluidTension;
          const ax = capLeft + btnW * ratio + anchorWaveX;
          const ay = capBottomY - 3;

          const indivTension = Math.max(
            0,
            Math.min(1, fluidTension * (1.06 - Math.abs(ratio - 0.5) * 0.18))
          );

          const ex = ax + (focalX - ax) * indivTension;
          const ey =
            ay +
            (focalY - ay) * indivTension +
            Math.sin(simTime * 5.2 + i * 1.4) * 4.5 * recoilWave;

          const sagY = ay + (ey - ay) * 0.6 + Math.sin(phase * 0.9) * 3.5 * indivTension;
          const c1x = ax + (ex - ax) * 0.2;
          const c1y = sagY;
          const c2x = ax + (ex - ax) * 0.68;
          const c2y = ey + 1.5 * indivTension;

          const width =
            (7.2 + Math.sin(phase) * 1.4 + (i % 2 === 0 ? 1.1 : 0)) *
            (0.45 + 0.55 * indivTension);

          const baseBumpR =
            (7.8 + Math.sin(simTime * 5.8 + i * 1.6) * 2.0) *
            Math.max(indivTension, recoilWave * 0.85);

          const midX = 0.125 * ax + 0.375 * c1x + 0.375 * c2x + 0.125 * ex;
          const midY = 0.125 * ay + 0.375 * c1y + 0.375 * c2y + 0.125 * ey;
          const midR = width * 0.48;

          newStrands.push({
            d: `M ${ax.toFixed(1)} ${ay.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`,
            width,
            baseX: ax,
            baseBumpR,
            midX,
            midY,
            midR,
          });
        }

        strands = newStrands;
      } else if (strands.length > 0) {
        strands = [];
      }

      const spawnInterval = isHovered ? 200 : 280;
      if ((isHovered || alwaysDripping) && fluidTension > 0.5 && nowMs - lastDropSpawnMs > spawnInterval) {
        lastDropSpawnMs = nowMs;
        droplets.push({
          id: nextDropId++,
          x: focalX + (Math.random() - 0.5) * 6,
          y: focalY + 5,
          vx: (targetFocalX - focalX) * 0.3 + (Math.random() - 0.5) * 7,
          vy: 26 + Math.random() * 20,
          r: 4.8 + Math.random() * 2.0,
          stretch: 1.15,
          alpha: 1,
        });
      }

      if (droplets.length > 0) {
        const updatedDrops: Droplet[] = [];
        for (const d of droplets) {
          const ny = d.y + d.vy * dt;
          const nx = d.x + d.vx * dt;
          const nvy = d.vy + 165 * dt;
          const distFromFocal = ny - focalY;
          const nStretch = Math.min(1.6, 1.05 + nvy * 0.0038);
          const nAlpha = distFromFocal > 52 ? Math.max(0, 1 - (distFromFocal - 52) / 26) : 1;
          const nr = d.r * 0.996;

          if (nAlpha > 0.05 && ny < svgH - 8) {
            updatedDrops.push({
              ...d,
              x: nx,
              y: ny,
              vy: nvy,
              r: nr,
              stretch: nStretch,
              alpha: nAlpha,
            });
          }
        }
        droplets = updatedDrops;
      }

      const shouldKeepRunning =
        isHovered ||
        alwaysDripping ||
        fluidTension > 0.004 ||
        recoilWave > 0.004 ||
        droplets.length > 0;

      if (shouldKeepRunning) {
        rafId = requestAnimationFrame(step);
      } else {
        isRunning = false;
      }
    };

    wakeLoop = () => {
      if (!isRunning) {
        isRunning = true;
        lastMs = performance.now();
        rafId = requestAnimationFrame(step);
      }
    };

    if (alwaysDripping) {
      wakeLoop();
    }

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  });
</script>

<div
  class="relative inline-flex items-center justify-center select-none transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] {active
    ? 'z-30 scale-[1.24]'
    : 'z-10 scale-100'}"
>
  <!-- SVG Fluid & Gooey Metaball Layer positioned directly around the button -->
  <svg
    width={svgW}
    height={svgH}
    viewBox="0 0 {svgW} {svgH}"
    class="pointer-events-none absolute"
    style="left: -{PAD_X}px; top: -{PAD_TOP}px; z-index: 1;"
    aria-hidden="true"
  >
    <defs>
      <!-- High-Speed Gooey Metaball Filter -->
      <filter id="goo-{id}" x="-25%" y="-25%" width="150%" height="165%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
        <feColorMatrix
          in="blur"
          mode="matrix"
          values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            0 0 0 19 -7"
          result="goo"
        />
      </filter>

      <!-- Capsule Top Tapered Rim Highlight Gradient (eliminates harsh flat bar on dark backdrops) -->
      <linearGradient id="top-rim-{id}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
        <stop offset="22%" stop-color="#ffffff" stop-opacity={lightRim ? '0.32' : '0.45'} />
        <stop offset="50%" stop-color="#ffffff" stop-opacity={lightRim ? '0.52' : '0.68'} />
        <stop offset="78%" stop-color="#ffffff" stop-opacity={lightRim ? '0.32' : '0.45'} />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>

      <!-- Capsule Top Soft Curved Glass Reflection Gradient -->
      <linearGradient id="gloss-band-{id}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
        <stop offset="18%" stop-color="#ffffff" stop-opacity={lightRim ? '0.24' : '0.36'} />
        <stop offset="50%" stop-color="#ffffff" stop-opacity={lightRim ? '0.12' : '0.18'} />
        <stop offset="82%" stop-color="#ffffff" stop-opacity={lightRim ? '0.22' : '0.32'} />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>

      <!-- Subtle Vertical Top Glass Dome Sheen -->
      <linearGradient id="dome-sheen-{id}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity={lightRim ? '0.16' : '0.22'} />
        <stop offset="55%" stop-color="#ffffff" stop-opacity="0.03" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- GOOEY METABALL GROUP: Capsule Base + Meniscus Anchors + Solid Black Strands + Focal Bulb + Droplets -->
    <g filter="url(#goo-{id})">
      <!-- Main Black Capsule Body -->
      <rect
        x={capLeft}
        y={capTop}
        width={btnW}
        height={btnH}
        rx={btnH / 2}
        ry={btnH / 2}
        fill="#080808"
      />

      {#each strands as strand, idx (idx)}
        <!-- Meniscus Anchor Bulb along bottom of capsule -->
        <circle
          cx={strand.baseX}
          cy={capBottomY}
          r={strand.baseBumpR}
          fill="#080808"
        />
        <!-- Mid-curve liquid node to ensure smooth continuous black strand thickness -->
        <circle
          cx={strand.midX}
          cy={strand.midY}
          r={strand.midR}
          fill="#080808"
        />
        <!-- Solid Black Viscous Liquid Tendril -->
        <path
          d={strand.d}
          fill="none"
          stroke="#080808"
          stroke-width={strand.width}
          stroke-linecap="round"
        />
      {/each}

      <!-- Coalesced Focal Fluid Bulb where tendrils converge -->
      {#if fluidTension > 0.08}
        <circle
          cx={focalX}
          cy={focalY}
          r={(8.2 + Math.sin(simTime * 6.2) * 1.1) * fluidTension}
          fill="#080808"
        />
      {/if}

      <!-- Continuously Dripping Teardrop Droplets -->
      {#each droplets as drop (drop.id)}
        <g
          transform="translate({drop.x}, {drop.y}) scale(1, {drop.stretch})"
          opacity={drop.alpha}
        >
          <circle cx="0" cy="0" r={drop.r} fill="#080808" />
          <polygon
            points="{-drop.r * 0.7},0 {drop.r * 0.7},0 0,{-drop.r * 1.9}"
            fill="#080808"
          />
        </g>
      {/each}
    </g>

    <!-- Soft Curved Top Glass Dome Overlay Strictly Inside the Pill -->
    <rect
      x={capLeft + 1.5}
      y={capTop + 1.5}
      width={Math.max(10, btnW - 3)}
      height={Math.max(10, btnH * 0.52)}
      rx={(btnH - 3) / 2}
      ry={(btnH - 3) / 2}
      fill="url(#dome-sheen-{id})"
    />

    {#if lightRim}
      <rect
        x={capLeft + 0.75}
        y={capTop + 0.75}
        width={btnW - 1.5}
        height={btnH - 1.5}
        rx={(btnH - 1.5) / 2}
        ry={(btnH - 1.5) / 2}
        fill="none"
        stroke="rgba(255,255,255,0.24)"
        stroke-width="1"
      />
    {/if}

    <!-- 3D GLOSSY SPECULAR HIGHLIGHTS FOLLOWING THE CAPSULE CURVATURE -->
    <path
      d="M {capLeft + btnH * 0.48} {capTop + 1.8} L {capLeft + btnW - btnH * 0.48} {capTop + 1.8}"
      stroke="url(#top-rim-{id})"
      stroke-width="1.25"
      stroke-linecap="round"
    />

    <path
      d="M {capLeft + 13} {capTop + 13.5} Q {capLeft + 18} {capTop + 6.8} {capLeft + 27} {capTop + 6.8} L {capLeft + btnW - 27} {capTop + 6.8} Q {capLeft + btnW - 18} {capTop + 6.8} {capLeft + btnW - 13} {capTop + 13.5}"
      fill="none"
      stroke="url(#gloss-band-{id})"
      stroke-width={compact ? '2.4' : '3.4'}
      stroke-linecap="round"
    />

    <ellipse
      cx={capLeft + 19}
      cy={capTop + 8.5}
      rx="2.6"
      ry="1.2"
      transform="rotate(-18 {capLeft + 19} {capTop + 8.5})"
      fill="#ffffff"
      opacity={lightRim ? '0.68' : '0.88'}
    />
  </svg>

  <!-- Interactive Button Hit Area & Crisp Label -->
  <button
    bind:this={buttonEl}
    type="button"
    onpointerenter={handlePointerEnter}
    onpointermove={handlePointerMove}
    onpointerleave={handlePointerLeave}
    onclick={onclick}
    class="relative z-10 inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-full font-display font-semibold tracking-[-0.01em] text-[#f5f5f2] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff261b] {compact
      ? 'h-[38px] min-w-[82px] px-3.5 text-[12.5px] min-[380px]:h-[40px] min-[380px]:min-w-[92px] min-[380px]:px-4 min-[380px]:text-[13px]'
      : 'h-[48px] min-w-[132px] px-7 text-[15px]'}"
  >
    <span class="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
      {label}
    </span>
  </button>
</div>
