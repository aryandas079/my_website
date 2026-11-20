<script lang="ts">
  import { onMount } from 'svelte';
  import {
    CLUSTER_NODES,
    ClusterTopologyController,
    type ComputeNodeSpec,
  } from '../../lib/three/ClusterTopologyController';

  interface Props {
    onClose?: () => void;
    compact?: boolean;
  }

  let { onClose, compact = false }: Props = $props();

  let mountEl = $state<HTMLDivElement | null>(null);
  let controller: ClusterTopologyController | null = null;
  let selectedNode = $state<ComputeNodeSpec | null>(null);
  let hoveredNode = $state<ComputeNodeSpec | null>(null);
  let draggedNode = $state<ComputeNodeSpec | null>(null);
  let isDragging = $state(false);
  let snapToGrid = $state(true);
  let hasCustomLayout = $state(false);

  let activeNode = $derived(draggedNode ?? selectedNode ?? hoveredNode);

  function toggleSnap(): void {
    snapToGrid = !snapToGrid;
    controller?.setSnapToGrid(snapToGrid);
  }

  function handleResetAll(): void {
    controller?.resetLayout();
    controller?.resetCameraView();
  }

  onMount(() => {
    if (!mountEl) return;
    controller = new ClusterTopologyController(mountEl, {
      onSelectNode: (node) => {
        selectedNode = node;
      },
      onHoverNode: (node) => {
        hoveredNode = node;
      },
      onDragNode: (node, dragging) => {
        draggedNode = dragging ? node : null;
        isDragging = dragging;
      },
      onLayoutChange: (custom) => {
        hasCustomLayout = custom;
      },
    });
    controller.setSnapToGrid(snapToGrid);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedNode) {
          controller?.resetCameraView();
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      controller?.dispose();
      controller = null;
    };
  });
</script>

<div
  class="relative flex h-full w-full flex-col overflow-hidden bg-[#050505] text-[#F5F5F2] select-none"
>
  <!-- Interactive Three.js 3D Cluster Topology Viewport -->
  <div bind:this={mountEl} class="absolute inset-0 z-0 h-full w-full"></div>

  <!-- Clean Top Bar (Minimal Title + Snap/Zoom/Reset/Close Controls) -->
  <div
    class="pointer-events-none relative z-10 flex items-start justify-between gap-2 px-[max(0.875rem,env(safe-area-inset-left))] pt-[max(0.875rem,env(safe-area-inset-top))] pb-2 sm:px-[max(1.5rem,env(safe-area-inset-left))] sm:pt-[max(1.5rem,env(safe-area-inset-top))]"
  >
    <div class="pointer-events-auto min-w-0 flex flex-col gap-0.5">
      <div class="flex items-center gap-2">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full bg-[#FF261B]"></span>
        <h3 class="truncate font-display text-sm font-extrabold tracking-[-0.02em] text-white uppercase sm:text-lg">
          Cluster Topology
        </h3>
      </div>
      <p class="hidden font-mono text-[11px] tracking-tight text-white/55 sm:block">
        Drag any node to reconfigure · Drag space to rotate · Tap node to inspect
      </p>
    </div>

    <div class="pointer-events-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        aria-pressed={snapToGrid}
        title="Snap dragged nodes to spatial grid (hold Shift for horizontal XZ plane)"
        onclick={toggleSnap}
        class="inline-flex h-10 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl border px-2.5 font-mono text-[10.5px] font-semibold tracking-[0.06em] uppercase transition-colors duration-150 sm:h-11 sm:px-3 sm:text-[11px] {snapToGrid
          ? 'border-[#FF261B] bg-[#FF261B]/18 text-white'
          : 'border-white/14 bg-[#0A0A0C]/90 text-white/60 hover:border-white/40 hover:text-white'}"
      >
        Snap
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        onclick={() => controller?.zoomByFactor(0.76)}
        class="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/14 bg-[#0A0A0C]/90 font-mono text-base font-semibold text-white transition-colors duration-150 hover:border-[#FF261B] hover:text-[#FF261B] sm:h-11 sm:w-11"
      >
        +
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onclick={() => controller?.zoomByFactor(1.3)}
        class="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/14 bg-[#0A0A0C]/90 font-mono text-base font-semibold text-white transition-colors duration-150 hover:border-[#FF261B] hover:text-[#FF261B] sm:h-11 sm:w-11"
      >
        −
      </button>
      <button
        type="button"
        onclick={handleResetAll}
        class="inline-flex h-10 cursor-pointer items-center justify-center whitespace-nowrap rounded-xl border px-2.5 font-mono text-[10.5px] font-semibold tracking-[0.06em] uppercase transition-colors duration-150 sm:h-11 sm:px-3.5 sm:text-[11px] {hasCustomLayout
          ? 'border-[#FF261B]/75 bg-[#0A0A0C]/95 text-[#FF261B] hover:bg-[#FF261B] hover:text-white'
          : 'border-white/14 bg-[#0A0A0C]/90 text-white hover:border-[#FF261B] hover:text-[#FF261B]'}"
      >
        {hasCustomLayout ? 'Reset Layout' : 'Reset'}
      </button>
      {#if onClose}
        <button
          type="button"
          aria-label="Close cluster topology"
          onclick={onClose}
          class="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[#FF261B]/55 bg-[#0A0A0C]/95 font-mono text-sm text-white transition-colors duration-150 hover:bg-[#FF261B] hover:text-white sm:h-11 sm:w-11"
        >
          ✕
        </button>
      {/if}
    </div>
  </div>

  <!-- Live Spatial Coordinates Readout while Dragging a Node -->
  {#if isDragging && draggedNode}
    <div
      class="pointer-events-none absolute top-[max(4.5rem,calc(env(safe-area-inset-top)+3.75rem))] left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-[#FF261B]/65 bg-[#09090B]/95 px-3.5 py-1.5 font-mono text-[11px] text-white shadow-[0_14px_36px_rgba(0,0,0,0.7)]"
    >
      <span class="h-2 w-2 rounded-full bg-[#FF261B]"></span>
      <span class="font-semibold text-white">{draggedNode.label}</span>
      <span class="text-white/40">|</span>
      <span class="tabular-nums text-white/85">
        X {draggedNode.position[0].toFixed(1)} · Y {draggedNode.position[1].toFixed(1)} · Z {draggedNode.position[2].toFixed(1)}
      </span>
    </div>
  {/if}

  <!-- Bottom Overlay: Quick Compute Node Selector + Active Node Inspector -->
  <div
    class="pointer-events-none relative z-10 mt-auto flex flex-col justify-end gap-2.5 px-[max(0.875rem,env(safe-area-inset-left))] pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-end sm:justify-between sm:px-[max(1.5rem,env(safe-area-inset-left))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
  >
    <!-- Compact Node Selector Rail -->
    {#if !compact}
      <div
        class="pointer-events-auto flex max-w-full items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-w-[56%] sm:flex-wrap"
      >
        {#each CLUSTER_NODES as node (node.id)}
          {@const isSelected = selectedNode?.id === node.id}
          <button
            type="button"
            onclick={() => controller?.focusNodeById(node.id)}
            class="min-h-[38px] shrink-0 cursor-pointer whitespace-nowrap rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-medium tracking-tight transition-colors duration-150 {isSelected
              ? 'border-[#FF261B] bg-[#FF261B] text-white'
              : 'border-white/14 bg-[#0A0A0C]/90 text-white/75 hover:border-[#FF261B]/70 hover:text-white'}"
          >
            {node.label}
          </button>
        {/each}
      </div>
    {/if}

    <!-- Selected / Hovered / Dragged Compute Node Card -->
    {#if activeNode}
      <div
        class="pointer-events-auto max-h-[42dvh] w-full overflow-y-auto rounded-2xl border border-white/15 bg-[#09090B]/95 p-3.5 text-left shadow-[0_24px_64px_rgba(0,0,0,0.85)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-[320px] sm:p-4"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-[10.5px] font-semibold tracking-[0.12em] text-[#FF261B] uppercase">
            {activeNode.tier} · {activeNode.region}
          </span>
          {#if selectedNode}
            <button
              type="button"
              onclick={() => controller?.resetCameraView()}
              class="cursor-pointer whitespace-nowrap font-mono text-[10.5px] text-white/55 transition-colors hover:text-white"
            >
              overview ↗
            </button>
          {/if}
        </div>
        <div class="mt-1 font-display text-base font-extrabold tracking-[-0.02em] text-white sm:text-lg">
          {activeNode.label}
        </div>
        <div class="mt-0.5 font-sans text-xs text-white/75">
          {activeNode.role}
        </div>
        <div class="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2 font-mono text-[10.5px] text-white/60 tabular-nums">
          <span>POS</span>
          <span class="text-white/90">
            [{activeNode.position[0].toFixed(1)}, {activeNode.position[1].toFixed(1)}, {activeNode.position[2].toFixed(1)}]
          </span>
        </div>
        <div class="mt-1.5 border-t border-white/10 pt-1.5 font-mono text-[11px] text-white/65">
          {activeNode.spec}
        </div>
        <div class="mt-2 flex flex-wrap gap-1.5">
          {#each activeNode.neighbors as neighborId (neighborId)}
            <button
              type="button"
              onclick={() => controller?.focusNodeById(neighborId)}
              class="min-h-[30px] cursor-pointer whitespace-nowrap rounded-md border border-white/12 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-white/70 transition-colors hover:border-[#FF261B] hover:text-white"
            >
              → {neighborId}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
