<script lang="ts">
  import { onMount } from 'svelte';
  import { sharedCardBinaryShower } from '../../lib/three/SharedCardBinaryShower';

  interface Props {
    id: string;
    isCenter?: boolean;
    isHovered?: boolean;
    isVisible?: boolean;
    pointerNormX?: number;
    pointerNormY?: number;
  }

  let {
    id,
    isHovered = false,
    isVisible = true,
    pointerNormX = 0,
    pointerNormY = 0,
  }: Props = $props();

  let hostEl = $state<HTMLDivElement | null>(null);
  let canvasEl = $state<HTMLCanvasElement | null>(null);

  const PAD_X = 76;
  const PAD_TOP = 54;
  const PAD_BOTTOM = 165;

  $effect(() => {
    sharedCardBinaryShower.updateCardState(id, {
      isHovered,
      isVisible,
      pointerNormX,
      pointerNormY,
    });
  });

  onMount(() => {
    if (!hostEl || !canvasEl) return;
    const host = hostEl;
    const canvas = canvasEl;

    const getCardSize = () => ({
      w: Math.max(220, Math.round(host.offsetWidth)),
      h: Math.max(280, Math.round(host.offsetHeight)),
    });

    const initial = getCardSize();
    sharedCardBinaryShower.registerCard({
      id,
      canvas,
      cardW: initial.w,
      cardH: initial.h,
      padX: PAD_X,
      padTop: PAD_TOP,
      padBottom: PAD_BOTTOM,
    });

    sharedCardBinaryShower.updateCardState(id, {
      isHovered,
      isVisible,
      pointerNormX,
      pointerNormY,
    });

    const ro = new ResizeObserver(() => {
      const next = getCardSize();
      sharedCardBinaryShower.resizeCard(id, next.w, next.h);
    });
    ro.observe(host);

    return () => {
      ro.disconnect();
      sharedCardBinaryShower.unregisterCard(id);
    };
  });
</script>

<div
  bind:this={hostEl}
  class="pointer-events-none absolute inset-0"
  aria-hidden="true"
>
  <!-- GPU InstancedMesh Binary Shower layer around the card perimeter (activates cleanly on hover) -->
  <canvas
    bind:this={canvasEl}
    class="pointer-events-none absolute"
    style="left: -{PAD_X}px; top: -{PAD_TOP}px; z-index: 0;"
  ></canvas>

  <!-- Crisp rounded black card core sitting cleanly above the perimeter binary shower -->
  <div class="pointer-events-none absolute inset-0 z-[1] rounded-[28px] bg-[#080808]"></div>
</div>
