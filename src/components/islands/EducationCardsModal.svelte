<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import BinaryInstituteLogo from './BinaryInstituteLogo.svelte';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();

  let modalBackdropEl = $state<HTMLDivElement | null>(null);
  let modalContainerEl = $state<HTMLDivElement | null>(null);
  let binaryCanvasEl = $state<HTMLCanvasElement | null>(null);

  let isNitFlipped = $state(false);
  let isGcFlipped = $state(false);

  const nitLogoUrl = `${import.meta.env.BASE_URL}assets/education/nit_silchar_logo.png`;
  const gcLogoUrl = `${import.meta.env.BASE_URL}assets/education/gc_college_logo.png`;

  interface BinaryParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    char: '0' | '1';
    size: number;
    alpha: number;
    swayPhase: number;
    swaySpeed: number;
    isRed: boolean;
    flipCounter: number;
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  function closeModal(): void {
    if (!modalBackdropEl || !modalContainerEl) {
      onClose();
      return;
    }
    gsap.to(modalContainerEl, {
      scale: 0.94,
      y: 18,
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
    });
    gsap.to(modalBackdropEl, {
      opacity: 0,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        onClose();
      },
    });
  }

  onMount(() => {
    // 1. Entrance animation
    if (modalBackdropEl && modalContainerEl) {
      gsap.fromTo(
        modalBackdropEl,
        { opacity: 0 },
        { opacity: 1, duration: 0.32, ease: 'power2.out' }
      );
      gsap.fromTo(
        modalContainerEl,
        { scale: 0.94, opacity: 0, y: 24 },
        { scale: 1, opacity: 1, y: 0, duration: 0.44, ease: 'expo.out' }
      );
    }

    // 2. Binary Dust Field Canvas Animation (Swiss Light Theme: Black & Red digits)
    let disposed = false;
    let rafId = 0;
    const canvas = binaryCanvasEl;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let cw = window.innerWidth;
        let ch = window.innerHeight;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        const resize = () => {
          if (!canvas) return;
          cw = window.innerWidth;
          ch = window.innerHeight;
          canvas.width = Math.round(cw * dpr);
          canvas.height = Math.round(ch * dpr);
          canvas.style.width = `${cw}px`;
          canvas.style.height = `${ch}px`;
        };
        resize();
        window.addEventListener('resize', resize);

        const PARTICLE_COUNT = Math.min(130, Math.floor((cw * ch) / 8000));
        const particles: BinaryParticle[] = [];

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const isRed = Math.random() < 0.15;
          const alpha = isRed ? 0.35 + Math.random() * 0.45 : 0.12 + Math.random() * 0.35;
          particles.push({
            x: Math.random() * cw,
            y: Math.random() * ch,
            vx: (Math.random() - 0.5) * 0.35,
            vy: 0.3 + Math.random() * 0.85,
            char: Math.random() > 0.5 ? '1' : '0',
            size: Math.floor(11 + Math.random() * 5),
            alpha,
            swayPhase: Math.random() * Math.PI * 2,
            swaySpeed: 0.015 + Math.random() * 0.02,
            isRed,
            flipCounter: Math.floor(Math.random() * 110),
          });
        }

        const render = () => {
          if (disposed) return;
          rafId = requestAnimationFrame(render);

          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, cw, ch);

          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.swayPhase += p.swaySpeed;
            p.x += Math.sin(p.swayPhase) * 0.35 + p.vx;
            p.y += p.vy;

            if (p.y > ch + 20) {
              p.y = -20;
              p.x = Math.random() * cw;
            }
            if (p.x < -20) p.x = cw + 20;
            if (p.x > cw + 20) p.x = -20;

            p.flipCounter--;
            if (p.flipCounter <= 0) {
              p.char = p.char === '1' ? '0' : '1';
              p.flipCounter = Math.floor(60 + Math.random() * 120);
            }

            ctx.font = `800 ${p.size}px "JetBrains Mono", ui-monospace, monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (p.isRed) {
              ctx.fillStyle = `rgba(255, 38, 27, ${p.alpha.toFixed(3)})`;
            } else {
              ctx.fillStyle = `rgba(17, 17, 17, ${p.alpha.toFixed(3)})`;
            }
            ctx.fillText(p.char, p.x, p.y);
          }
        };

        rafId = requestAnimationFrame(render);

        return () => {
          disposed = true;
          cancelAnimationFrame(rafId);
          window.removeEventListener('resize', resize);
        };
      }
    }
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Fullscreen Modal Overlay with Binary Dust Veil (Strict 3 Colors: White, Black, Red) -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={modalBackdropEl}
  onclick={closeModal}
  class="fixed inset-0 z-[80] flex items-center justify-center bg-[#f5f5f2]/85 p-3 sm:p-6 backdrop-blur-xl"
  style="opacity: 0;"
>
  <!-- Interactive Binary Dust Background Canvas -->
  <canvas
    bind:this={binaryCanvasEl}
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 z-0 h-full w-full"
  ></canvas>

  <!-- Modal Main Container (Light Theme) -->
  <div
    bind:this={modalContainerEl}
    onclick={(e) => e.stopPropagation()}
    class="relative z-10 flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-black/10 bg-[#ffffff] text-black shadow-[0_32px_100px_rgba(0,0,0,0.22)]"
  >
    <!-- Modal Header Bar (Clean White, Black, Red) -->
    <div
      class="sticky top-0 z-20 flex items-center justify-between border-b border-black/8 bg-white/95 px-6 py-4 backdrop-blur-md sm:px-8 sm:py-5"
    >
      <div class="flex items-center gap-2.5">
        <span class="h-2.5 w-2.5 rounded-full bg-[#ff261b]"></span>
        <h2 class="font-display text-xl font-black tracking-tight text-black sm:text-2xl">
          Education
        </h2>
      </div>

      <button
        type="button"
        onclick={closeModal}
        aria-label="Close Education Modal"
        class="group inline-flex items-center gap-2 rounded-full border border-black/15 bg-black/5 px-4 py-2 font-display text-xs font-bold text-black transition-all hover:border-black/30 hover:bg-black hover:text-white active:scale-95 sm:text-sm"
      >
        <span>Close</span>
        <span class="text-black/50 group-hover:text-white">✕</span>
      </button>
    </div>

    <!-- Scrollable Body with Two Clean Light-Theme 3D Flip Cards -->
    <!-- On desktop: side-by-side (left and right). On mobile: stacked (up and down) -->
    <div
      class="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8"
    >
      <div
        class="flex flex-col items-center justify-center gap-6 sm:gap-8 md:flex-row md:items-stretch"
      >
        <!-- ============================================================== -->
        <!-- CARD 1: NIT SILCHAR (National Institute of Technology Silchar) -->
        <!-- ============================================================== -->
        <div
          class="card-perspective relative h-[480px] w-full max-w-[340px] sm:max-w-[360px] md:h-[500px] md:w-[370px] lg:w-[410px] shrink-0"
        >
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            onclick={() => (isNitFlipped = !isNitFlipped)}
            class="card-inner relative h-full w-full select-none cursor-pointer rounded-[26px] {isNitFlipped
              ? 'is-flipped'
              : ''}"
          >
            <!-- FRONT FACE: Clean and clear emblem made of zeroes and ones -->
            <div
              class="card-face card-front absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[26px] border border-black/10 bg-[#ffffff] p-6 text-center shadow-[0_12px_36px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-black/25 hover:shadow-[0_20px_48px_rgba(0,0,0,0.12)] sm:p-8"
            >
              <!-- Center Logo: Decent in size, crystal clear, made of 0s & 1s in Black and Red -->
              <div
                class="flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72"
              >
                <BinaryInstituteLogo
                  logoSrc={nitLogoUrl}
                  altLabel="NIT Silchar Logo in zeroes and ones"
                />
              </div>
            </div>

            <!-- BACK FACE: Clean Details strictly without Problem Solving/MATLAB -->
            <div
              class="card-face card-back absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[26px] border border-black/15 bg-[#ffffff] p-8 text-center shadow-[0_12px_36px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-black/30 hover:shadow-[0_20px_48px_rgba(0,0,0,0.12)] sm:p-10"
            >
              <div class="flex flex-col items-center justify-center px-2">
                <h3
                  class="font-display text-2xl font-black leading-tight tracking-tight text-black sm:text-3xl"
                >
                  National Institute of Technology Silchar
                </h3>

                <p class="mt-4 font-sans text-base font-semibold leading-relaxed text-black/85 sm:text-lg">
                  Bachelor of Technology - BTech, Electrical Engineering
                </p>

                <p class="mt-4 font-mono text-sm font-bold text-[#ff261b] sm:text-base">
                  Aug 2025 – Sep 2029
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- ============================================================== -->
        <!-- CARD 2: GURUCHARAN COLLEGE (GC College, Silchar)               -->
        <!-- ============================================================== -->
        <div
          class="card-perspective relative h-[480px] w-full max-w-[340px] sm:max-w-[360px] md:h-[500px] md:w-[370px] lg:w-[410px] shrink-0"
        >
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            onclick={() => (isGcFlipped = !isGcFlipped)}
            class="card-inner relative h-full w-full select-none cursor-pointer rounded-[26px] {isGcFlipped
              ? 'is-flipped'
              : ''}"
          >
            <!-- FRONT FACE: Clean and clear emblem made of zeroes and ones -->
            <div
              class="card-face card-front absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[26px] border border-black/10 bg-[#ffffff] p-6 text-center shadow-[0_12px_36px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-black/25 hover:shadow-[0_20px_48px_rgba(0,0,0,0.12)] sm:p-8"
            >
              <!-- Center Logo: Decent in size, crystal clear, made of 0s & 1s in Black and Red -->
              <div
                class="flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72"
              >
                <BinaryInstituteLogo
                  logoSrc={gcLogoUrl}
                  altLabel="Gurucharan College Logo in zeroes and ones"
                />
              </div>
            </div>

            <!-- BACK FACE: Clean Details strictly without Activities/Societies or Problem Solving -->
            <div
              class="card-face card-back absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[26px] border border-black/15 bg-[#ffffff] p-8 text-center shadow-[0_12px_36px_rgba(0,0,0,0.06)] transition-all duration-300 hover:border-black/30 hover:shadow-[0_20px_48px_rgba(0,0,0,0.12)] sm:p-10"
            >
              <div class="flex flex-col items-center justify-center px-2">
                <h3
                  class="font-display text-2xl font-black leading-tight tracking-tight text-black sm:text-3xl"
                >
                  Gurucharan College (GC College), Silchar
                </h3>

                <p class="mt-4 font-sans text-base font-semibold leading-relaxed text-black/85 sm:text-lg">
                  Higher Secondary (Class 11 & 12), Science, Physics, Chemistry and Mathematics
                </p>

                <p class="mt-4 font-mono text-sm font-bold text-[#ff261b] sm:text-base">
                  Aug 2023 – Mar 2025
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .card-perspective {
    perspective: 1200px;
  }

  .card-inner {
    transform-style: preserve-3d;
    transition: transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .card-inner.is-flipped {
    transform: rotateY(180deg);
  }

  .card-face {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  .card-front {
    transform: rotateY(0deg);
    z-index: 2;
  }

  .card-back {
    transform: rotateY(180deg);
    z-index: 1;
  }

  .card-inner.is-flipped .card-front {
    pointer-events: none;
    z-index: 1;
  }

  .card-inner.is-flipped .card-back {
    pointer-events: auto;
    z-index: 2;
  }

  /* Custom scrollbar for modal content */
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.04);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 9999px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.35);
  }
</style>
