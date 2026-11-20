<script lang="ts">
  import { onMount } from 'svelte';
  import {
    GITHUB_STATS_OPTIONS,
    type GithubStatsCategory,
    type GithubStatsData,
  } from '../../lib/github/githubStatsData';

  interface Props {
    mode: 'hub' | 'detail';
    category: GithubStatsCategory | null;
    stats: GithubStatsData;
    onSelectCategory: (cat: GithubStatsCategory, e: MouseEvent) => void;
    onBackToHub: (e: MouseEvent) => void;
    onBackToCat: (e: MouseEvent) => void;
  }

  let {
    mode = 'hub',
    category = null,
    stats,
    onSelectCategory,
    onBackToHub,
    onBackToCat,
  }: Props = $props();

  let badgeCanvasEl = $state<HTMLCanvasElement | null>(null);

  // Deterministic contribution intensity grid (16 cols x 5 rows) for the Contributions binary matrix
  const CONTRIB_GRID: number[][] = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 16 }, (_, col) => {
      const v = (col * 17 + row * 31 + col * row * 7) % 11;
      if (col >= 12) return v > 2 ? 3 : 2;
      if (v <= 2) return 0;
      if (v <= 5) return 1;
      if (v <= 8) return 2;
      return 3;
    })
  );

  // Clean animated 0/1 binary ring renderer for Overall "A+" Rank and Contributions "36" Streak
  onMount(() => {
    let rafId = 0;
    let lastMs = performance.now();
    let clock = 0;

    const drawBinaryRing = (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      progress: number,
      centerText: string,
      subText: string,
      accentFlame: boolean
    ) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.5;
      const cy = h * 0.5 + (accentFlame ? 5 : 0);
      const outerR = Math.min(w, h) * 0.42;
      const innerR = outerR * 0.74;
      const tick = Math.floor(clock * 5);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const rings = [
        { r: outerR, count: 32, size: 8.5 },
        { r: (outerR + innerR) * 0.5, count: 24, size: 7.8 },
        { r: innerR, count: 18, size: 7.2 },
      ];

      const startAngle = -Math.PI * 0.5;
      const activeSweep = Math.PI * 2 * progress;

      for (let ri = 0; ri < rings.length; ri++) {
        const ring = rings[ri];
        ctx.font = `700 ${ring.size}px "JetBrains Mono", ui-monospace, monospace`;

        for (let i = 0; i < ring.count; i++) {
          const frac = i / ring.count;
          const angle = startAngle + frac * Math.PI * 2;
          const x = cx + Math.cos(angle) * ring.r;
          const y = cy + Math.sin(angle) * ring.r;

          const isActive = frac * Math.PI * 2 <= activeSweep;
          const bit =
            ((i + ri + ((i + tick) % 23 === 0 ? 1 : 0)) & 1) === 1 ? '1' : '0';

          if (isActive) {
            const distToHead = Math.abs(frac - progress);
            if (distToHead < 0.08 || (ri === 0 && i % 5 === 0)) {
              ctx.fillStyle = '#ff261b';
            } else {
              ctx.fillStyle = '#181816';
            }
          } else {
            ctx.fillStyle = 'rgba(24, 24, 22, 0.14)';
          }
          ctx.fillText(bit, x, y);
        }
      }

      if (accentFlame) {
        ctx.font = '800 8px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillStyle = '#ff261b';
        const flameY = cy - outerR - 8;
        ctx.fillText('1', cx, flameY - 5);
        ctx.fillText('010', cx, flameY + 2);
      }

      ctx.font = `800 ${Math.round(Math.min(w, h) * 0.24)}px "Plus Jakarta Sans", system-ui, sans-serif`;
      ctx.fillStyle = '#181816';
      ctx.fillText(centerText, cx, cy - 3);

      ctx.font = '700 8.5px "JetBrains Mono", ui-monospace, monospace';
      ctx.fillStyle = '#ff261b';
      ctx.fillText(subText, cx, cy + Math.round(Math.min(w, h) * 0.16));
    };

    const step = (nowMs: number) => {
      rafId = requestAnimationFrame(step);
      const dt = Math.min((nowMs - lastMs) / 1000, 0.05);
      lastMs = nowMs;
      clock += dt;

      if (mode !== 'detail' || !badgeCanvasEl) return;
      if (category !== 'overall' && category !== 'contributions') return;

      const rect = badgeCanvasEl.getBoundingClientRect();
      const w = Math.max(96, Math.round(rect.width || 136));
      const h = Math.max(96, Math.round(rect.height || 136));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (
        badgeCanvasEl.width !== Math.round(w * dpr) ||
        badgeCanvasEl.height !== Math.round(h * dpr)
      ) {
        badgeCanvasEl.width = Math.round(w * dpr);
        badgeCanvasEl.height = Math.round(h * dpr);
      }

      const ctx = badgeCanvasEl.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (category === 'overall') {
        drawBinaryRing(
          ctx,
          w,
          h,
          stats.overall.rankProgress,
          stats.overall.rank,
          '01000001+',
          false
        );
      } else if (category === 'contributions') {
        drawBinaryRing(
          ctx,
          w,
          h,
          0.92,
          String(stats.contributions.currentStreak),
          '100100d',
          true
        );
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  });

  // Clean stepped monochrome + signature red palette for the language distribution bar
  const LANG_BAR_COLORS = [
    '#181816',
    '#ff261b',
    '#40403c',
    '#63635d',
    '#82827c',
    '#9e9e97',
    '#b8b8b1',
    '#cfcfc9',
    '#deded8',
    '#ebebe6',
  ];
</script>

<!-- Crisp, Pure White Theme-Matched GitHub Statistics Menu & Detail Views -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  onclick={(e) => e.stopPropagation()}
  class="absolute inset-0 z-20 flex flex-col bg-white text-left text-[#181816]"
>
  {#if mode === 'hub'}
    <!-- ================================================================ -->
    <!-- ULTRA-CLEAN MINIMAL MENU (PURE WHITE, ZERO EXTRA TEXT)           -->
    <!-- ================================================================ -->
    <div class="flex h-full w-full items-center justify-center overflow-y-auto p-2.5 sm:p-5">
      <div class="grid w-full grid-cols-1 gap-2.5 min-[330px]:grid-cols-2 sm:gap-4">
        {#each GITHUB_STATS_OPTIONS as opt (opt.id)}
          <button
            type="button"
            onclick={(e) => onSelectCategory(opt.id, e)}
            class="group/tile flex min-h-[82px] h-[clamp(86px,17dvh,154px)] cursor-pointer flex-col items-start justify-between rounded-2xl border border-[#181816]/12 bg-[#f7f7f5] p-3 text-left transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[#181816] hover:bg-[#181816] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff261b] sm:p-5"
          >
            <!-- Clean Minimal Icon -->
            <div
              class="flex h-8 w-8 items-center justify-center rounded-xl border border-[#181816]/10 bg-white text-[#181816] transition-colors duration-200 group-hover/tile:border-[#ff261b] group-hover/tile:bg-[#ff261b] group-hover/tile:text-white sm:h-10 sm:w-10"
            >
              {#if opt.id === 'overall'}
                <svg
                  class="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3.5 2" />
                </svg>
              {:else if opt.id === 'languages'}
                <svg
                  class="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              {:else if opt.id === 'contributions'}
                <svg
                  class="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="3" width="6" height="6" rx="1.5" />
                  <rect x="15" y="3" width="6" height="6" rx="1.5" />
                  <rect x="3" y="15" width="6" height="6" rx="1.5" />
                  <rect x="15" y="15" width="6" height="6" rx="1.5" />
                </svg>
              {:else}
                <svg
                  class="h-4 w-4 sm:h-5 sm:w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              {/if}
            </div>

            <!-- Clean Title + Subtle Arrow Only -->
            <div class="flex w-full items-end justify-between gap-2">
              <span
                class="font-display text-[13.5px] leading-snug font-extrabold tracking-[-0.025em] text-[#181816] transition-colors duration-200 group-hover/tile:text-white sm:text-[17px]"
              >
                {opt.label}
              </span>
              <span
                aria-hidden="true"
                class="shrink-0 font-mono text-xs font-bold text-[#181816]/35 transition-all duration-200 group-hover/tile:translate-x-0.5 group-hover/tile:text-[#ff261b] sm:text-sm"
              >
                →
              </span>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {:else if category}
    <!-- ================================================================ -->
    <!-- CRISP, CLEAN SOLID BINARY STATS VIEWS (ZERO BACKGROUND CLUTTER)  -->
    <!-- ================================================================ -->
    <div class="flex h-full flex-col justify-between overflow-hidden px-1 py-1 sm:px-2 sm:py-1.5">
      <!-- Clean Top Navigation Switcher -->
      <div class="flex shrink-0 items-center justify-between gap-2 border-b border-[#181816]/10 pb-2">
        <div class="focus-scroll-pane flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl bg-[#f5f5f2] p-1">
          {#each GITHUB_STATS_OPTIONS as opt (opt.id)}
            <button
              type="button"
              onclick={(e) => onSelectCategory(opt.id, e)}
              class="min-h-[28px] cursor-pointer rounded-lg px-2 py-1 font-sans text-[10.5px] font-semibold tracking-tight transition-colors duration-200 whitespace-nowrap shrink-0 sm:px-2.5 sm:text-[11px] {category === opt.id
                ? 'bg-[#181816] text-white'
                : 'text-[#181816]/70 hover:text-[#181816]'}"
            >
              {opt.shortLabel}
            </button>
          {/each}
        </div>

        <div class="flex items-center gap-1 shrink-0 sm:gap-1.5">
          <button
            type="button"
            onclick={onBackToHub}
            class="min-h-[28px] cursor-pointer rounded-lg border border-[#181816]/14 bg-white px-2 py-1 font-sans text-[10.5px] font-semibold text-[#181816] transition-colors hover:border-[#181816] hover:bg-[#181816] hover:text-white whitespace-nowrap shrink-0 sm:px-2.5 sm:text-[11px]"
          >
            Menu
          </button>
          <button
            type="button"
            onclick={onBackToCat}
            class="min-h-[28px] cursor-pointer rounded-lg border border-[#181816]/14 bg-white px-2 py-1 font-sans text-[10.5px] font-semibold text-[#ff261b] transition-colors hover:border-[#ff261b] hover:bg-[#ff261b] hover:text-white whitespace-nowrap shrink-0 sm:px-2.5 sm:text-[11px]"
          >
            Cat
          </button>
        </div>
      </div>

      <!-- BODY BY SELECTED CATEGORY (Scrollable on compact/car/foldable screens) -->
      <div class="my-auto w-full flex-1 overflow-y-auto py-2">
        {#if category === 'overall'}
          <div class="grid grid-cols-1 items-center gap-3 sm:grid-cols-12 sm:gap-4">
            <!-- Left: Clean High-Contrast Metric List -->
            <div class="flex flex-col sm:col-span-7">
              <div class="mb-2 font-display text-sm font-extrabold tracking-[-0.025em] text-[#181816] sm:mb-3 sm:text-base">
                {stats.displayName}
              </div>

              <div class="divide-y divide-[#181816]/8 rounded-2xl border border-[#181816]/10 bg-[#f8f8f6] px-3 sm:px-3.5">
                {#each [
                  { bits: '001', label: 'Total Stars Earned', value: String(stats.overall.totalStars), accent: false },
                  { bits: '010', label: `Total Commits (${stats.overall.commitYearLabel})`, value: String(stats.overall.totalCommitsYear), accent: true },
                  { bits: '011', label: 'Total PRs', value: String(stats.overall.totalPRs), accent: false },
                  { bits: '100', label: 'Total Issues', value: String(stats.overall.totalIssues), accent: false },
                  { bits: '101', label: 'Contributed to (yr)', value: String(stats.overall.contributedToLastYear), accent: false },
                ] as row (row.bits)}
                  <div class="flex items-center justify-between gap-2 py-2 sm:py-2.5">
                    <div class="flex min-w-0 items-center gap-2">
                      <span class="shrink-0 font-mono text-[9.5px] font-semibold text-[#ff261b] tabular-nums sm:text-[10px]">
                        {row.bits}
                      </span>
                      <span class="truncate font-sans text-[11px] font-medium text-[#181816]/85 sm:text-xs">
                        {row.label}
                      </span>
                    </div>
                    <span class="shrink-0 font-mono text-xs font-bold tabular-nums sm:text-sm {row.accent ? 'text-[#ff261b]' : 'text-[#181816]'}">
                      {row.value}
                    </span>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Right: Crisp Live 0/1 Binary A+ Rank Ring -->
            <div class="flex flex-col items-center justify-center rounded-2xl border border-[#181816]/10 bg-[#f8f8f6] p-3 sm:col-span-5 sm:p-4">
              <canvas
                bind:this={badgeCanvasEl}
                class="h-[116px] w-[116px] sm:h-[146px] sm:w-[146px] lg:h-[164px] lg:w-[164px]"
              ></canvas>
            </div>
          </div>
        {:else if category === 'languages'}
          <div class="flex flex-col gap-2.5 sm:gap-3">
            <div class="font-display text-sm font-extrabold tracking-[-0.025em] text-[#181816] sm:text-base">
              Most Used Languages
            </div>

            <!-- Clean Full-Width Segmented Distribution Bar -->
            <div class="flex h-2.5 w-full overflow-hidden rounded-full bg-[#f0f0ec] sm:h-3">
              {#each stats.languages as lang, lIdx (lang.name)}
                <div
                  title="{lang.name} {lang.percent.toFixed(2)}%"
                  class="h-full first:rounded-l-full last:rounded-r-full"
                  style="width: {Math.max(lang.percent, 0.8)}%; background-color: {LANG_BAR_COLORS[lIdx] ?? '#d8d8d2'};"
                ></div>
              {/each}
            </div>

            <!-- Crisp 1/2-Column Language Breakdown (All 10 Languages, Zero Clipped Text) -->
            <div class="grid grid-cols-1 gap-x-3 gap-y-1.5 min-[360px]:grid-cols-2 sm:gap-y-2">
              {#each stats.languages as lang, lIdx (lang.name)}
                {@const barFillPct = Math.max(4, Math.min(100, (lang.percent / 48) * 100))}
                <div class="flex flex-col gap-1 rounded-xl border border-[#181816]/10 bg-[#f8f8f6] px-2.5 py-1.5 sm:gap-1.5 sm:px-3 sm:py-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="truncate font-sans text-[11px] font-semibold text-[#181816] sm:text-xs">
                      {lang.name}
                    </span>
                    <span class="shrink-0 font-mono text-[10.5px] font-bold tabular-nums sm:text-[11px] {lIdx < 2 ? 'text-[#ff261b]' : 'text-[#181816]/80'}">
                      {lang.percent.toFixed(2)}%
                    </span>
                  </div>
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-[#e9e9e4]">
                    <div
                      class="h-full rounded-full {lIdx === 1 ? 'bg-[#ff261b]' : 'bg-[#181816]'}"
                      style="width: {barFillPct.toFixed(1)}%;"
                    ></div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {:else if category === 'contributions'}
          <div class="flex flex-col gap-3">
            <!-- Crisp Responsive Contributions & Streak Strip -->
            <div class="grid grid-cols-1 items-stretch gap-2 min-[420px]:grid-cols-3 sm:gap-2.5">
              <div class="flex flex-col items-center justify-center rounded-2xl border border-[#181816]/10 bg-[#f8f8f6] px-2 py-2.5 text-center sm:px-2.5 sm:py-3.5">
                <span class="font-display text-2xl font-extrabold tracking-[-0.04em] text-[#ff261b] tabular-nums sm:text-3xl">
                  {stats.contributions.totalContributions}
                </span>
                <span class="mt-1 font-sans text-[10.5px] font-semibold text-[#181816] sm:mt-1.5 sm:text-[11px]">
                  Total Contributions
                </span>
                <span class="mt-0.5 font-mono text-[9px] text-[#181816]/55 sm:text-[9.5px]">
                  {stats.contributions.totalRange}
                </span>
              </div>

              <div class="flex flex-col items-center justify-center rounded-2xl border border-[#181816]/14 bg-[#f8f8f6] px-2 py-2 text-center">
                <canvas
                  bind:this={badgeCanvasEl}
                  class="h-[88px] w-[88px] sm:h-[104px] sm:w-[104px]"
                ></canvas>
                <span class="font-sans text-[10.5px] font-semibold text-[#181816] sm:text-[11px]">
                  Current Streak
                </span>
                <span class="font-mono text-[9px] text-[#181816]/55 sm:text-[9.5px]">
                  {stats.contributions.currentStreakRange}
                </span>
              </div>

              <div class="flex flex-col items-center justify-center rounded-2xl border border-[#181816]/10 bg-[#f8f8f6] px-2 py-2.5 text-center sm:px-2.5 sm:py-3.5">
                <span class="font-display text-2xl font-extrabold tracking-[-0.04em] text-[#181816] tabular-nums sm:text-3xl">
                  {stats.contributions.longestStreak}
                </span>
                <span class="mt-1 font-sans text-[10.5px] font-semibold text-[#181816] sm:mt-1.5 sm:text-[11px]">
                  Longest Streak
                </span>
                <span class="mt-0.5 font-mono text-[9px] text-[#181816]/55 sm:text-[9.5px]">
                  {stats.contributions.longestStreakRange}
                </span>
              </div>
            </div>

            <!-- Crisp 0/1 Binary Contribution Matrix -->
            <div class="overflow-x-auto rounded-2xl border border-[#181816]/10 bg-[#f8f8f6] p-2.5 sm:p-3">
              <div class="grid min-w-[260px] grid-cols-[repeat(16,minmax(0,1fr))] gap-1">
                {#each CONTRIB_GRID as row, rIdx (rIdx)}
                  {#each row as lvl, cIdx (cIdx)}
                    <div
                      class="flex h-4 items-center justify-center rounded-[4px] font-mono text-[8px] font-bold select-none sm:h-4.5 sm:text-[8.5px] {lvl === 3
                        ? 'bg-[#ff261b] text-white'
                        : lvl === 2
                          ? 'bg-[#181816] text-white'
                          : lvl === 1
                            ? 'bg-[#181816]/20 text-[#181816]'
                            : 'bg-white text-[#181816]/25'}"
                    >
                      {(rIdx + cIdx + lvl) % 2 === 0 ? '1' : '0'}
                    </div>
                  {/each}
                {/each}
              </div>
            </div>
          </div>
        {:else if category === 'trophies'}
          <div class="flex flex-col gap-2.5 sm:gap-3">
            <div class="flex items-baseline justify-between">
              <span class="font-display text-sm font-extrabold tracking-[-0.025em] text-[#181816] sm:text-base">
                GitHub Trophies
              </span>
              <span class="font-mono text-[10.5px] font-semibold text-[#181816]/60 tabular-nums sm:text-[11px]">
                {stats.trophies.length} Unlocked
              </span>
            </div>

            <!-- Crisp Responsive Trophy Grid -->
            <div class="grid grid-cols-1 gap-2 min-[330px]:grid-cols-2 sm:grid-cols-3 sm:gap-2.5">
              {#each stats.trophies as tr (tr.id)}
                <div class="flex flex-col items-center justify-between rounded-2xl border border-[#181816]/10 bg-[#f8f8f6] px-2.5 py-2.5 text-center sm:px-3 sm:py-3">
                  <span class="font-sans text-[10.5px] font-bold tracking-tight text-[#181816] sm:text-[11px]">
                    {tr.category}
                  </span>

                  <div class="my-1.5 flex flex-col items-center sm:my-2">
                    <div
                      class="flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-sm font-black sm:h-10 sm:w-10 sm:text-base {tr.rank === 'S'
                        ? 'border-[#ff261b] bg-[#ff261b] text-white'
                        : tr.rank === 'A'
                          ? 'border-[#181816] bg-[#181816] text-white'
                          : 'border-[#181816]/80 bg-white text-[#181816]'}"
                    >
                      {tr.rank}
                    </div>
                  </div>

                  <div class="w-full">
                    <div class="truncate font-sans text-[10.5px] font-semibold text-[#181816] sm:text-[11px]">
                      {tr.title}
                    </div>
                    <div class="mt-0.5 font-mono text-[9.5px] font-medium text-[#181816]/55 tabular-nums sm:text-[10px]">
                      {tr.points}
                    </div>
                    <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#e8e8e3]">
                      <div
                        class="h-full rounded-full {tr.rank === 'S' ? 'bg-[#ff261b]' : 'bg-[#181816]'}"
                        style="width: {Math.round(tr.fillRatio * 100)}%;"
                      ></div>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="h-0.5"></div>
    </div>
  {/if}
</div>
