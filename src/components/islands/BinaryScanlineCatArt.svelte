<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getSkillLogoImage,
    preloadAllSkillLogos,
    type TechSkillItem,
  } from '../../lib/skills/techStackCatalog';
  import {
    GITHUB_STATS_OPTIONS,
    INITIAL_ARYAN_GITHUB_STATS,
    fetchLiveGithubStatsOverlay,
    type GithubStatsCategory,
    type GithubStatsData,
  } from '../../lib/github/githubStatsData';
  import BinaryGithubStatsPanel from './BinaryGithubStatsPanel.svelte';

  interface Props {
    buildProgress: number;
    selectedSkill: TechSkillItem | null;
    activeHoverSkillName?: string;
    githubStatsOpen?: boolean;
    githubStatsTriggerToken?: number;
    onResetToCat?: () => void;
    onCloseGithubStats?: () => void;
    onclick?: (e: MouseEvent) => void;
  }

  let {
    buildProgress = 0,
    selectedSkill = null,
    activeHoverSkillName = 'C++',
    githubStatsOpen = false,
    githubStatsTriggerToken = 0,
    onResetToCat,
    onCloseGithubStats,
    onclick,
  }: Props = $props();

  let isHovered = $state(false);
  let pointerXRatio = $state(0.5);
  let pointerYRatio = $state(0.5);
  let stageCanvasEl = $state<HTMLCanvasElement | null>(null);

  type StageMode =
    | 'cat'
    | 'coding'
    | 'forming'
    | 'logo'
    | 'stats-hub-coding'
    | 'stats-hub'
    | 'stats-detail-coding'
    | 'stats-detail-forming'
    | 'stats-detail-view';

  // Stage orchestration inside the unified frame:
  // 'cat' (0/1 Schrödinger's Cat) -> Skill C++ -> Binary Logo OR GitHub Stats C++ -> Pop-up -> Category C++ -> Binary Rain -> Solid Binary Stats
  let stageMode = $state<StageMode>('cat');
  let activeStatsCategory = $state<GithubStatsCategory | null>(null);
  let githubStats = $state<GithubStatsData>(INITIAL_ARYAN_GITHUB_STATS);
  let cppTypedCount = $state(0);
  let codeHoldTimer = 0;
  let binaryFormProgress = $state(0);
  let catIntroProgress = 0;
  let lastTriggerKey = '';
  let lastStatsToken = 0;
  let probZero = $state(0.5);
  let probOne = $derived(Math.max(0, Math.min(1, 1 - probZero)));

  interface CppTok {
    text: string;
    color: string;
  }
  interface VisibleLine {
    lineNumber: number;
    tokens: CppTok[];
    isCursorLine: boolean;
  }

  function buildCppTemplateLines(skill: TechSkillItem): CppTok[][] {
    return [
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
      [],
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
        { text: `"${skill.cppOutputName}"`, color: '#a5d6ff' },
        { text: ' ', color: '#e6edf3' },
        { text: '<<', color: '#ff7b72' },
        { text: ' endl', color: '#79c0ff' },
        { text: ';', color: '#e6edf3' },
      ],
      [{ text: `  // ${skill.assetPath}`, color: '#8b949e' }],
      [
        { text: '  return', color: '#ff7b72' },
        { text: ' ', color: '#e6edf3' },
        { text: '0', color: '#79c0ff' },
        { text: ';', color: '#e6edf3' },
      ],
      [{ text: '}', color: '#e6edf3' }],
    ];
  }

  function sliceCppLines(lines: CppTok[][], charCount: number): VisibleLine[] {
    let rem = Math.max(0, Math.floor(charCount));
    const out: VisibleLine[] = [];
    for (let i = 0; i < lines.length; i++) {
      const toks = lines[i];
      if (toks.length === 0) {
        if (rem > 0) {
          out.push({ lineNumber: i + 1, tokens: [], isCursorLine: false });
        }
        continue;
      }
      const len = toks.reduce((s, t) => s + t.text.length, 0);
      if (rem >= len) {
        rem -= len;
        out.push({
          lineNumber: i + 1,
          tokens: toks,
          isCursorLine: i === lines.length - 1,
        });
      } else {
        const partial: CppTok[] = [];
        let lineRem = rem;
        for (const tok of toks) {
          if (lineRem <= 0) break;
          if (lineRem >= tok.text.length) {
            partial.push(tok);
            lineRem -= tok.text.length;
          } else {
            partial.push({ text: tok.text.slice(0, lineRem), color: tok.color });
            lineRem = 0;
          }
        }
        out.push({
          lineNumber: i + 1,
          tokens: partial,
          isCursorLine: true,
        });
        break;
      }
    }
    return out.length > 0
      ? out
      : [{ lineNumber: 1, tokens: [], isCursorLine: true }];
  }

  function buildGithubHubCppLines(): CppTok[][] {
    return [
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
      [],
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
        { text: '"GitHub Stats :: @aryandas079"', color: '#a5d6ff' },
        { text: ' ', color: '#e6edf3' },
        { text: '<<', color: '#ff7b72' },
        { text: ' endl', color: '#79c0ff' },
        { text: ';', color: '#e6edf3' },
      ],
      [
        {
          text: '  // modules: overall | languages | contributions | trophies',
          color: '#8b949e',
        },
      ],
      [
        { text: '  return', color: '#ff7b72' },
        { text: ' ', color: '#e6edf3' },
        { text: '0', color: '#79c0ff' },
        { text: ';', color: '#e6edf3' },
      ],
      [{ text: '}', color: '#e6edf3' }],
    ];
  }

  function buildGithubCategoryCppLines(cat: GithubStatsCategory): CppTok[][] {
    const meta =
      GITHUB_STATS_OPTIONS.find((o) => o.id === cat) ?? GITHUB_STATS_OPTIONS[0];
    return [
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
      [],
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
        { text: `"${meta.cppOutputText}"`, color: '#a5d6ff' },
        { text: ' ', color: '#e6edf3' },
        { text: '<<', color: '#ff7b72' },
        { text: ' endl', color: '#79c0ff' },
        { text: ';', color: '#e6edf3' },
      ],
      [{ text: `  // ${meta.assetRef}`, color: '#8b949e' }],
      [
        { text: '  return', color: '#ff7b72' },
        { text: ' ', color: '#e6edf3' },
        { text: '0', color: '#79c0ff' },
        { text: ';', color: '#e6edf3' },
      ],
      [{ text: '}', color: '#e6edf3' }],
    ];
  }

  let activeStatsOptionMeta = $derived(
    activeStatsCategory
      ? (GITHUB_STATS_OPTIONS.find((o) => o.id === activeStatsCategory) ?? null)
      : null
  );

  let cppLines = $derived(
    stageMode === 'stats-hub-coding'
      ? buildGithubHubCppLines()
      : stageMode === 'stats-detail-coding' && activeStatsCategory
        ? buildGithubCategoryCppLines(activeStatsCategory)
        : selectedSkill
          ? buildCppTemplateLines(selectedSkill)
          : []
  );

  let cppEditorFilename = $derived(
    stageMode === 'stats-hub-coding'
      ? 'github_stats.cpp'
      : stageMode === 'stats-detail-coding' && activeStatsOptionMeta
        ? activeStatsOptionMeta.cppFilename
        : 'skill_render.cpp'
  );

  let cppEditorRightTag = $derived(
    stageMode === 'stats-hub-coding'
      ? '@aryandas079'
      : stageMode === 'stats-detail-coding' && activeStatsOptionMeta
        ? activeStatsOptionMeta.assetRef
        : (selectedSkill?.assetPath ?? '')
  );

  let cppEditorCompiledMsg = $derived(
    stageMode === 'stats-hub-coding'
      ? 'Compiled → opening GitHub Stats menu...'
      : stageMode === 'stats-detail-coding' && activeStatsOptionMeta
        ? `Compiled → forming 0/1 binary stats for ${activeStatsOptionMeta.label}...`
        : `Compiled → rendering binary logo for ${selectedSkill?.assetPath ?? ''}...`
  );

  let isShowingCppOverlay = $derived(
    stageMode === 'coding' ||
      stageMode === 'stats-hub-coding' ||
      stageMode === 'stats-detail-coding'
  );

  let totalCppChars = $derived(
    cppLines.reduce(
      (sum, line) => sum + line.reduce((ls, t) => ls + t.text.length, 0),
      0
    )
  );
  let visibleCppLines = $derived(sliceCppLines(cppLines, cppTypedCount));

  interface BinaryLogoCell {
    dstX: number;
    dstY: number;
    srcX: number;
    srcY: number;
    bit: 0 | 1;
    colorRgb: string;
    inkWeight: number;
    seed: number;
    stepPx: number;
  }

  let logoCells: BinaryLogoCell[] = [];
  let cachedSkillId = '';
  let cachedStageW = 0;
  let cachedStageH = 0;
  let isSamplingLogo = false;

  // Binary rain condensation cells for each of the 4 GitHub Stats categories
  let statsFormCells: BinaryLogoCell[] = [];
  let cachedStatsCat: GithubStatsCategory | null = null;
  let cachedStatsW = 0;
  let cachedStatsH = 0;

  /**
   * Generates a crisp 0/1 binary silhouette point cloud for each GitHub Stats module
   * (A+ ring for Overall, stacked binary bars for Languages, 36-day streak ring for Contributions,
   * Trophy cup for Trophies) so binary rain visibly builds the stats before revealing the solid panel.
   */
  function buildStatsBinaryFormationGrid(
    cat: GithubStatsCategory,
    stageW: number,
    stageH: number
  ): void {
    const gridDim = 54;
    const off = document.createElement('canvas');
    off.width = gridDim;
    off.height = gridDim;
    const octx = off.getContext('2d');
    if (!octx) return;

    octx.clearRect(0, 0, gridDim, gridDim);
    octx.fillStyle = '#181816';
    octx.strokeStyle = '#181816';

    if (cat === 'overall') {
      // Bold ring + "A+" crest
      octx.lineWidth = 4.6;
      octx.beginPath();
      octx.arc(gridDim * 0.5, gridDim * 0.5, gridDim * 0.36, -Math.PI * 0.5, Math.PI * 1.18);
      octx.stroke();
      octx.fillStyle = '#ff261b';
      octx.font = '900 18px "Plus Jakarta Sans", sans-serif';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillText('A+', gridDim * 0.5, gridDim * 0.51);
    } else if (cat === 'languages') {
      // Horizontal stacked binary language bars
      const widths = [0.84, 0.56, 0.38, 0.32, 0.25, 0.19];
      for (let i = 0; i < widths.length; i++) {
        octx.fillStyle = i === 1 ? '#ff261b' : '#181816';
        octx.fillRect(5, 8 + i * 7, widths[i] * (gridDim - 10), 4.2);
      }
    } else if (cat === 'contributions') {
      // Streak ring + 36 center
      octx.strokeStyle = '#ff261b';
      octx.lineWidth = 4.2;
      octx.beginPath();
      octx.arc(gridDim * 0.5, gridDim * 0.52, gridDim * 0.34, 0, Math.PI * 2);
      octx.stroke();
      octx.fillStyle = '#181816';
      octx.font = '900 17px "Plus Jakarta Sans", sans-serif';
      octx.textAlign = 'center';
      octx.textBaseline = 'middle';
      octx.fillText('36', gridDim * 0.5, gridDim * 0.53);
    } else {
      // Trophy cup silhouette
      octx.fillStyle = '#181816';
      octx.beginPath();
      octx.roundRect(14, 10, 26, 20, 6);
      octx.fill();
      octx.fillRect(24, 30, 6, 10);
      octx.fillRect(16, 40, 22, 5);
      octx.lineWidth = 3;
      octx.beginPath();
      octx.arc(14, 19, 6, Math.PI * 0.5, Math.PI * 1.5);
      octx.arc(40, 19, 6, -Math.PI * 0.5, Math.PI * 0.5);
      octx.stroke();
      octx.fillStyle = '#ff261b';
      octx.fillRect(22, 15, 10, 10);
    }

    const imgData = octx.getImageData(0, 0, gridDim, gridDim).data;
    const size = Math.min(stageW * 0.8, stageH * 0.82);
    const originX = (stageW - size) * 0.5;
    const originY = (stageH - size) * 0.5;
    const step = size / gridDim;
    const out: BinaryLogoCell[] = [];

    let idx = 0;
    for (let gy = 0; gy < gridDim; gy++) {
      for (let gx = 0; gx < gridDim; gx++) {
        const offIdx = (gy * gridDim + gx) * 4;
        const a = imgData[offIdx + 3] / 255;
        if (a < 0.2) continue;
        const r = imgData[offIdx];
        const g = imgData[offIdx + 1];
        const b = imgData[offIdx + 2];

        const seed = ((idx + 23) * 0.61803398875) % 1;
        const dstX = originX + (gx + 0.5) * step;
        const dstY = originY + (gy + 0.5) * step;
        const colSnap = Math.round((dstX + (seed - 0.5) * 30) / 12) * 12 + 6;
        out.push({
          dstX,
          dstY,
          srcX: colSnap,
          srcY: -18 - seed * (stageH * 0.65),
          bit: (gx + gy) % 2 === 0 ? 1 : 0,
          colorRgb: `${r},${g},${b}`,
          inkWeight: Math.min(1, a * 1.15),
          seed,
          stepPx: step,
        });
        idx++;
      }
    }

    statsFormCells = out;
    cachedStatsCat = cat;
    cachedStatsW = stageW;
    cachedStatsH = stageH;
  }

  /**
   * High-definition 62x62 sub-pixel supersampled binary converter for official skill logos.
   * Preserves all fine vector paths, negative-space cutouts, Slonik elephant lines, and typography
   * using crisp '0' and '1' glyphs with zero blocky background rectangles.
   */
  async function buildBinaryLogoGrid(
    skill: TechSkillItem,
    stageW: number,
    stageH: number
  ): Promise<void> {
    if (isSamplingLogo) return;
    isSamplingLogo = true;
    try {
      const img = await getSkillLogoImage(skill);
      const gridDim = 62;
      const subSample = 4;
      const rasterSize = gridDim * subSample;

      const off = document.createElement('canvas');
      off.width = rasterSize;
      off.height = rasterSize;
      const octx = off.getContext('2d');
      if (!octx) return;

      octx.clearRect(0, 0, rasterSize, rasterSize);
      octx.drawImage(img, 0, 0, rasterSize, rasterSize);
      const data = octx.getImageData(0, 0, rasterSize, rasterSize).data;

      const logoSize = Math.min(stageW * 0.78, stageH * 0.84);
      const originX = (stageW - logoSize) * 0.5;
      const originY = (stageH - logoSize) * 0.5;
      const cellStep = logoSize / gridDim;
      const cells: BinaryLogoCell[] = [];

      let idx = 0;
      for (let gy = 0; gy < gridDim; gy++) {
        for (let gx = 0; gx < gridDim; gx++) {
          let sumInk = 0;
          let sumR = 0;
          let sumG = 0;
          let sumB = 0;
          let colorWeightSum = 0;

          for (let sy = 0; sy < subSample; sy++) {
            const py = gy * subSample + sy;
            for (let sx = 0; sx < subSample; sx++) {
              const px = gx * subSample + sx;
              const offIdx = (py * rasterSize + px) * 4;
              const r = data[offIdx];
              const g = data[offIdx + 1];
              const b = data[offIdx + 2];
              const a = data[offIdx + 3] / 255;

              if (a <= 0.05) continue;
              // Treat pure white internal cutouts (#FFFFFF) as negative space so inner letters & outlines stay sharp
              const whiteness = Math.min(r, g, b) / 255;
              const ink = a * (1 - Math.pow(whiteness, 3.4));
              if (ink > 0.05) {
                sumInk += ink;
                sumR += r * ink;
                sumG += g * ink;
                sumB += b * ink;
                colorWeightSum += ink;
              }
            }
          }

          const avgInk = sumInk / (subSample * subSample);
          if (avgInk < 0.16 || colorWeightSum <= 0) continue;

          const finalR = Math.round(sumR / colorWeightSum);
          const finalG = Math.round(sumG / colorWeightSum);
          const finalB = Math.round(sumB / colorWeightSum);

          const seed = ((idx + 17) * 0.61803398875) % 1;
          const dstX = originX + (gx + 0.5) * cellStep;
          const dstY = originY + (gy + 0.5) * cellStep;
          const colSnap =
            Math.round((dstX + (seed - 0.5) * 36) / 12) * 12 + 6;

          cells.push({
            dstX,
            dstY,
            srcX: colSnap,
            srcY: -20 - seed * (stageH * 0.72),
            bit: (gx + gy) % 2 === 0 ? 1 : 0,
            colorRgb: `${finalR},${finalG},${finalB}`,
            inkWeight: Math.min(1, avgInk * 1.22),
            seed,
            stepPx: cellStep,
          });
          idx++;
        }
      }

      if (selectedSkill?.id === skill.id) {
        logoCells = cells;
        cachedSkillId = skill.id;
        cachedStageW = stageW;
        cachedStageH = stageH;
      }
    } finally {
      isSamplingLogo = false;
    }
  }

  // Reusable offscreen buffer for evaluating the animated Schrödinger's Cat silhouette at 68x68 binary resolution
  let catGridCanvas: HTMLCanvasElement | null = null;
  const CAT_GRID_DIM = 66;

  /**
   * Renders a crystal-clear, animated moving Schrödinger's Cat formed 100% out of
   * razor-sharp '0' and '1' binary digits on a pure white canvas.
   * No cartoon box, no overlapping strings — every pixel of the cat's head, perked ears,
   * blinking gaze-tracking eyes, whiskers, sitting torso, paws, and swaying tail
   * is a precision-aligned '0' or '1' glyph.
   */
  function drawBinaryFormationSchrodingerCat(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    clock: number,
    introP: number,
    hoverX: number,
    hoverY: number,
    hovered: boolean
  ): void {
    if (!catGridCanvas) {
      catGridCanvas = document.createElement('canvas');
      catGridCanvas.width = CAT_GRID_DIM;
      catGridCanvas.height = CAT_GRID_DIM;
    }
    const gctx = catGridCanvas.getContext('2d');
    if (!gctx) return;

    // 1. Draw the high-contrast animated cat silhouette in normalized 1000x1000 coordinates
    gctx.save();
    gctx.setTransform(1, 0, 0, 1, 0, 0);
    gctx.clearRect(0, 0, CAT_GRID_DIM, CAT_GRID_DIM);
    gctx.scale(CAT_GRID_DIM / 1000, CAT_GRID_DIM / 1000);

    const breathY = Math.sin(clock * 2.2) * 12;
    const breathScaleX = 1 + Math.sin(clock * 2.2) * 0.018;
    const headTilt =
      Math.sin(clock * 1.45) * 0.055 + (hovered ? (hoverX - 0.5) * 0.14 : 0);
    const tailSway1 = Math.sin(clock * 2.35) * 68;
    const tailSway2 = Math.cos(clock * 1.95) * 44;
    const earTwitchL =
      Math.sin(clock * 2.7) > 0.9 ? Math.sin(clock * 24) * 0.11 : 0;
    const earTwitchR =
      Math.cos(clock * 2.3) > 0.92 ? -Math.sin(clock * 22) * 0.1 : 0;
    const isBlinking = clock % 3.5 > 3.33;

    // A. Animated Sweeping Fluffy Tail (Right side S-curve)
    gctx.strokeStyle = '#000000';
    gctx.lineWidth = 74;
    gctx.lineCap = 'round';
    gctx.beginPath();
    gctx.moveTo(545, 795);
    gctx.bezierCurveTo(
      735 + tailSway1 * 0.45,
      785,
      825 + tailSway1,
      540 + tailSway2 * 0.5,
      745 + tailSway2,
      325 + Math.sin(clock * 2.35) * 24
    );
    gctx.stroke();

    // B. Sculpted Sitting Cat Body & Haunches
    gctx.fillStyle = '#000000';
    gctx.save();
    gctx.translate(435, 650 + breathY * 0.4);
    gctx.scale(breathScaleX, 1);
    // Lower haunches
    gctx.beginPath();
    gctx.ellipse(0, 55, 172, 168, 0, 0, Math.PI * 2);
    gctx.fill();
    // Upper chest & shoulders
    gctx.beginPath();
    gctx.ellipse(0, -105, 128, 135, 0, 0, Math.PI * 2);
    gctx.fill();
    gctx.restore();

    // Four distinct paws along the bottom baseline (y = 858)
    const pawTap = Math.max(0, Math.sin(clock * 1.8) - 0.75) * -36;
    gctx.beginPath();
    // Left hind paw
    gctx.ellipse(278, 846, 48, 30, 0, 0, Math.PI * 2);
    // Left front paw
    gctx.ellipse(378, 864, 44, 28, 0, 0, Math.PI * 2);
    // Right front paw (with occasional playful tap)
    gctx.ellipse(492, 864 + pawTap, 44, 28, 0, 0, Math.PI * 2);
    // Right hind paw
    gctx.ellipse(588, 846, 48, 30, 0, 0, Math.PI * 2);
    gctx.fill();

    // Clean negative-space vertical separation slit between front legs & haunch contour
    gctx.save();
    gctx.globalCompositeOperation = 'destination-out';
    gctx.fillStyle = '#000000';
    // Center gap between front legs
    gctx.beginPath();
    gctx.roundRect(423, 625 + breathY * 0.4, 24, 245, 12);
    gctx.fill();
    // Subtle separation crease between hind haunches and front legs
    gctx.beginPath();
    gctx.roundRect(322, 725 + breathY * 0.4, 18, 125, 9);
    gctx.roundRect(530, 725 + breathY * 0.4, 18, 125, 9);
    gctx.fill();
    gctx.restore();

    // C. Animated Cat Head, Perked Ears, Whiskers & Expressive Eyes
    gctx.save();
    gctx.translate(435, 345 + breathY);
    gctx.rotate(headTilt);

    // Left Perked Triangular Ear
    gctx.save();
    gctx.translate(-105, -95);
    gctx.rotate(earTwitchL);
    gctx.fillStyle = '#000000';
    gctx.beginPath();
    gctx.moveTo(-58, 35);
    gctx.lineTo(-42, -165);
    gctx.lineTo(68, -22);
    gctx.closePath();
    gctx.fill();
    // Negative-space inner ear triangle cutout
    gctx.globalCompositeOperation = 'destination-out';
    gctx.beginPath();
    gctx.moveTo(-26, 2);
    gctx.lineTo(-22, -102);
    gctx.lineTo(32, -18);
    gctx.closePath();
    gctx.fill();
    gctx.restore();

    // Right Perked Triangular Ear
    gctx.save();
    gctx.translate(105, -95);
    gctx.rotate(earTwitchR);
    gctx.fillStyle = '#000000';
    gctx.beginPath();
    gctx.moveTo(-68, -22);
    gctx.lineTo(42, -165);
    gctx.lineTo(58, 35);
    gctx.closePath();
    gctx.fill();
    // Negative-space inner ear triangle cutout
    gctx.globalCompositeOperation = 'destination-out';
    gctx.beginPath();
    gctx.moveTo(-32, -18);
    gctx.lineTo(22, -102);
    gctx.lineTo(26, 2);
    gctx.closePath();
    gctx.fill();
    gctx.restore();

    // Round-cheeked Cat Head
    gctx.fillStyle = '#000000';
    gctx.beginPath();
    gctx.ellipse(0, -18, 168, 142, 0, 0, Math.PI * 2);
    gctx.fill();

    // Whiskers extending cleanly from both cheeks (drawn bold enough to form crisp 0/1 rows)
    gctx.strokeStyle = '#000000';
    gctx.lineWidth = 22;
    gctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      gctx.beginPath();
      gctx.moveTo(side * 145, -8);
      gctx.lineTo(side * 272, -32);
      gctx.moveTo(side * 148, 24);
      gctx.lineTo(side * 282, 24);
      gctx.moveTo(side * 142, 54);
      gctx.lineTo(side * 265, 76);
      gctx.stroke();
    }

    // Expressive Eye Cutouts + Nose Cutout (destination-out)
    gctx.save();
    gctx.globalCompositeOperation = 'destination-out';
    if (isBlinking) {
      // Closed happy/blinking eye slits
      gctx.strokeStyle = '#000000';
      gctx.lineWidth = 24;
      gctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        gctx.beginPath();
        gctx.arc(side * 72, -32, 34, 0.15 * Math.PI, 0.85 * Math.PI);
        gctx.stroke();
      }
    } else {
      // Large almond-round cat eyes
      for (const side of [-1, 1]) {
        gctx.beginPath();
        gctx.ellipse(side * 72, -32, 42, 36, side * -0.14, 0, Math.PI * 2);
        gctx.fill();
      }
    }

    // Cute inverted-triangle nose & W-mouth cutout
    gctx.beginPath();
    gctx.moveTo(-22, 22);
    gctx.lineTo(22, 22);
    gctx.lineTo(0, 46);
    gctx.closePath();
    gctx.fill();
    gctx.restore();

    // Dark vertical cat pupils inside the bright eye cutouts (tracking hover/gaze)
    if (!isBlinking) {
      const gazeX = hovered
        ? (hoverX - 0.5) * 28
        : Math.sin(clock * 0.95) * 14;
      const gazeY = hovered
        ? (hoverY - 0.5) * 18
        : Math.cos(clock * 0.75) * 8;
      gctx.fillStyle = '#000000';
      for (const side of [-1, 1]) {
        gctx.beginPath();
        gctx.ellipse(
          side * 72 + gazeX,
          -32 + gazeY,
          15,
          28,
          0,
          0,
          Math.PI * 2
        );
        gctx.fill();
      }
    }

    gctx.restore();
    gctx.restore();

    // 2. Sample the 66x66 offscreen cat buffer & render crystal-clear '0' and '1' digits
    // Positioned slightly higher to frame the computational Schrödinger's Equation cleanly below its paws
    const catPixels = gctx.getImageData(0, 0, CAT_GRID_DIM, CAT_GRID_DIM).data;
    const stageSize = Math.min(w * 0.78, h * 0.74);
    const originX = (w - stageSize) * 0.5;
    const originY = Math.max(4, (h - stageSize) * 0.16);
    const cellStep = stageSize / CAT_GRID_DIM;
    const fontSize = Math.max(6.4, Math.min(10.0, cellStep * 1.16));

    ctx.font = `800 ${fontSize.toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tick = Math.floor(clock * 7);
    // Gentle Schrödinger quantum wave sweeping vertically across the binary cat
    const waveCenterGy = ((clock * 0.38) % 1.4 - 0.2) * CAT_GRID_DIM;
    const hoverScreenX = hoverX * w;
    const hoverScreenY = hoverY * h;

    for (let gy = 0; gy < CAT_GRID_DIM; gy++) {
      const distFromWave = Math.abs(gy - waveCenterGy);
      const isWaveFront = distFromWave < 2.2;

      for (let gx = 0; gx < CAT_GRID_DIM; gx++) {
        const a = catPixels[(gy * CAT_GRID_DIM + gx) * 4 + 3] / 255;
        if (a < 0.14) continue;

        const seed = ((gx * 37 + gy * 13) * 0.61803398875) % 1;
        const delay = seed * 0.28;
        const formT = Math.max(0, Math.min(1, (introP - delay) / (1 - 0.28)));
        if (formT <= 0.01) continue;

        const easeT = formT * formT * (3 - 2 * formT);
        const dstX = originX + (gx + 0.5) * cellStep;
        const dstY = originY + (gy + 0.5) * cellStep;
        const srcY = -20 - seed * (h * 0.55);

        let drawX = dstX;
        let drawY = srcY + (dstY - srcY) * easeT;

        // Subtle quantum wave horizontal phase shift + pointer ripple
        if (isWaveFront && easeT > 0.95) {
          drawX += Math.sin(gx * 0.4 + clock * 10) * 1.2;
        }
        if (hovered && easeT > 0.95) {
          const dx = drawX - hoverScreenX;
          const dy = drawY - hoverScreenY;
          const dist = Math.hypot(dx, dy);
          if (dist < 56) {
            const push = (1 - dist / 56) * 3.2;
            drawX += (dx / Math.max(1, dist)) * push;
            drawY += (dy / Math.max(1, dist)) * push;
          }
        }

        const baseBit = (gx + gy) % 2 === 0 ? 1 : 0;
        const bitFlip =
          (isWaveFront && (gx + tick) % 3 === 0) ||
          ((gx * 19 + gy * 7 + tick) % 43 === 0);
        const bitChar = bitFlip
          ? baseBit === 1
            ? '0'
            : '1'
          : String(baseBit);

        const alpha = Math.min(1, a * 1.15) * Math.min(1, formT / 0.2);
        // Pure monochrome charcoal-black 0/1 formation with occasional quantum wave accent bit
        if (isWaveFront && (gx + gy) % 11 === 0 && formT > 0.95) {
          ctx.fillStyle = `rgba(255, 38, 27, ${alpha.toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(20, 20, 18, ${alpha.toFixed(3)})`;
        }

        ctx.fillText(bitChar, drawX, drawY);
      }
    }
  }

  let cardAlpha = $derived(
    Math.max(0, Math.min(1, (buildProgress - 0.16) / 0.52))
  );
  let translateY = $derived((1 - cardAlpha) * 22);

  let headerTitle = $derived(
    stageMode === 'stats-hub-coding' || stageMode === 'stats-hub'
      ? 'GitHub Statistics'
      : (stageMode === 'stats-detail-coding' ||
            stageMode === 'stats-detail-forming' ||
            stageMode === 'stats-detail-view') &&
          activeStatsOptionMeta
        ? `GitHub Statistics · ${activeStatsOptionMeta.label}`
        : selectedSkill
          ? `${selectedSkill.name} · ${selectedSkill.category}`
          : `Schrödinger's Cat · ${activeHoverSkillName}`
  );

  // Trigger state machine on skill selection change
  $effect(() => {
    const key = selectedSkill ? selectedSkill.id : '__cat__';
    if (key === lastTriggerKey) return;
    lastTriggerKey = key;

    if (!selectedSkill) {
      if (!githubStatsOpen) {
        stageMode = 'cat';
        activeStatsCategory = null;
        cppTypedCount = 0;
        codeHoldTimer = 0;
        binaryFormProgress = 0;
        catIntroProgress = 0;
      }
      logoCells = [];
      cachedSkillId = '';
      return;
    }

    // Skill clicked: switch to skill C++ -> binary logo flow
    activeStatsCategory = null;
    stageMode = 'coding';
    cppTypedCount = 0;
    codeHoldTimer = 0;
    binaryFormProgress = 0;
    cachedSkillId = '';
    logoCells = [];
  });

  // Trigger GitHub Stats C++ -> Pop-up Hub flow when "Show GitHub Stats" button is clicked
  $effect(() => {
    if (githubStatsTriggerToken === lastStatsToken) return;
    lastStatsToken = githubStatsTriggerToken;

    if (githubStatsOpen) {
      activeStatsCategory = null;
      stageMode = 'stats-hub-coding';
      cppTypedCount = 0;
      codeHoldTimer = 0;
      binaryFormProgress = 0;
    } else if (!selectedSkill) {
      activeStatsCategory = null;
      stageMode = 'cat';
      catIntroProgress = 0;
    }
  });

  function handleSelectStatsCategory(
    cat: GithubStatsCategory,
    e: MouseEvent
  ): void {
    e.stopPropagation();
    activeStatsCategory = cat;
    stageMode = 'stats-detail-coding';
    cppTypedCount = 0;
    codeHoldTimer = 0;
    binaryFormProgress = 0;
    cachedStatsCat = null;
    statsFormCells = [];
  }

  function handleBackToStatsHub(e: MouseEvent): void {
    e.stopPropagation();
    activeStatsCategory = null;
    stageMode = 'stats-hub';
  }

  function handleBackToCat(e: MouseEvent): void {
    e.stopPropagation();
    activeStatsCategory = null;
    stageMode = 'cat';
    catIntroProgress = 0;
    onCloseGithubStats?.();
    onResetToCat?.();
  }

  onMount(() => {
    preloadAllSkillLogos();
    fetchLiveGithubStatsOverlay(INITIAL_ARYAN_GITHUB_STATS).then((updated) => {
      githubStats = updated;
    });

    let rafId = 0;
    let lastMs = performance.now();
    let clock = 0;

    const step = (nowMs: number) => {
      rafId = requestAnimationFrame(step);
      const dt = Math.min((nowMs - lastMs) / 1000, 0.05);
      lastMs = nowMs;
      clock += dt;

      if (stageMode === 'cat') {
        if (buildProgress > 0.25 && catIntroProgress < 1) {
          catIntroProgress = Math.min(1, catIntroProgress + dt * 1.15);
        }
        // Live computational qubit superposition amplitude |ψ_bit⟩ = α|0⟩ + β|1⟩
        const targetP0 = isHovered
          ? 0.88 - pointerXRatio * 0.76
          : 0.5 + Math.sin(clock * 1.15) * 0.14;
        const nextP0 = probZero + (targetP0 - probZero) * Math.min(1, dt * 6);
        if (Math.abs(nextP0 - probZero) >= 0.005) {
          probZero = Math.round(nextP0 * 100) / 100;
        }
      } else if (stageMode === 'coding' && selectedSkill) {
        if (cppTypedCount < totalCppChars) {
          cppTypedCount = Math.min(totalCppChars, cppTypedCount + dt * 135);
        } else {
          codeHoldTimer += dt;
          if (codeHoldTimer >= 0.62) {
            stageMode = 'forming';
            binaryFormProgress = 0;
          }
        }
      } else if (stageMode === 'forming' && selectedSkill) {
        binaryFormProgress = Math.min(1, binaryFormProgress + dt * 0.96);
        if (binaryFormProgress >= 1) {
          stageMode = 'logo';
        }
      } else if (stageMode === 'stats-hub-coding') {
        if (cppTypedCount < totalCppChars) {
          cppTypedCount = Math.min(totalCppChars, cppTypedCount + dt * 165);
        } else {
          codeHoldTimer += dt;
          if (codeHoldTimer >= 0.45) {
            stageMode = 'stats-hub';
          }
        }
      } else if (stageMode === 'stats-detail-coding' && activeStatsCategory) {
        if (cppTypedCount < totalCppChars) {
          cppTypedCount = Math.min(totalCppChars, cppTypedCount + dt * 165);
        } else {
          codeHoldTimer += dt;
          if (codeHoldTimer >= 0.45) {
            stageMode = 'stats-detail-forming';
            binaryFormProgress = 0;
          }
        }
      } else if (stageMode === 'stats-detail-forming' && activeStatsCategory) {
        binaryFormProgress = Math.min(1, binaryFormProgress + dt * 1.18);
        if (binaryFormProgress >= 1) {
          stageMode = 'stats-detail-view';
        }
      }

      if (!stageCanvasEl) return;
      const rect = stageCanvasEl.getBoundingClientRect();
      const w = Math.max(240, Math.round(rect.width || 480));
      const h = Math.max(220, Math.round(rect.height || 400));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (
        stageCanvasEl.width !== Math.round(w * dpr) ||
        stageCanvasEl.height !== Math.round(h * dpr)
      ) {
        stageCanvasEl.width = Math.round(w * dpr);
        stageCanvasEl.height = Math.round(h * dpr);
      }

      const ctx = stageCanvasEl.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // 1. Default Stage: Crystal-Clear Binary Formation Schrödinger's Cat (100% 0 and 1)
      if (stageMode === 'cat') {
        drawBinaryFormationSchrodingerCat(
          ctx,
          w,
          h,
          clock,
          Math.max(0.15, catIntroProgress),
          pointerXRatio,
          pointerYRatio,
          isHovered
        );
        return;
      }

      // 2. GitHub Stats Category Binary Rain Condensation ('stats-detail-forming')
      if (
        (stageMode === 'stats-detail-coding' ||
          stageMode === 'stats-detail-forming') &&
        activeStatsCategory
      ) {
        if (
          cachedStatsCat !== activeStatsCategory ||
          Math.abs(cachedStatsW - w) > 8 ||
          Math.abs(cachedStatsH - h) > 8
        ) {
          buildStatsBinaryFormationGrid(activeStatsCategory, w, h);
        }

        if (stageMode === 'stats-detail-forming' && statsFormCells.length > 0) {
          const tick = Math.floor(clock * 9);
          const stepPx = statsFormCells[0]?.stepPx ?? 6.2;
          const fontSize = Math.max(6.2, Math.min(10.0, stepPx * 1.15));
          ctx.font = `800 ${fontSize.toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const p = binaryFormProgress;
          for (let i = 0; i < statsFormCells.length; i++) {
            const pt = statsFormCells[i];
            const delay = pt.seed * 0.24;
            const t = Math.max(0, Math.min(1, (p - delay) / (1 - 0.24)));
            if (t <= 0.01) continue;

            const easeT = t * t * t * (t * (t * 6 - 15) + 10);
            const cx =
              pt.srcX +
              (pt.dstX - pt.srcX) * easeT +
              Math.sin(easeT * Math.PI) * (pt.seed - 0.5) * 14;
            const cy = pt.srcY + (pt.dstY - pt.srcY) * easeT;
            const alpha = Math.min(1, t / 0.14) * pt.inkWeight;
            const bit =
              t < 0.8 && (i + tick) % 6 === 0
                ? pt.bit === 1
                  ? '0'
                  : '1'
                : String(pt.bit);

            if (t < 0.52) {
              ctx.fillStyle =
                i % 5 === 0
                  ? `rgba(255, 38, 27, ${alpha.toFixed(3)})`
                  : `rgba(24, 24, 22, ${alpha.toFixed(3)})`;
            } else {
              ctx.fillStyle = `rgba(${pt.colorRgb}, ${alpha.toFixed(3)})`;
            }
            ctx.fillText(bit, cx, cy);
          }
        }
        return;
      }

      if (
        stageMode === 'stats-hub-coding' ||
        stageMode === 'stats-hub' ||
        stageMode === 'stats-detail-view'
      ) {
        return;
      }

      // 3. Skill Logo Preload & Binary Condensation
      if (!selectedSkill) return;
      if (
        cachedSkillId !== selectedSkill.id ||
        Math.abs(cachedStageW - w) > 8 ||
        Math.abs(cachedStageH - h) > 8
      ) {
        void buildBinaryLogoGrid(selectedSkill, w, h);
      }

      if (stageMode === 'coding' || logoCells.length === 0) {
        return;
      }

      const tick = Math.floor(clock * 8);
      const sampleCellSize = logoCells[0]?.stepPx ?? 5.5;
      const fontSize = Math.max(5.8, Math.min(9.6, sampleCellSize * 1.16));
      ctx.font = `800 ${fontSize.toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (stageMode === 'forming') {
        const p = binaryFormProgress;
        for (let i = 0; i < logoCells.length; i++) {
          const pt = logoCells[i];
          const delay = pt.seed * 0.24;
          const t = Math.max(0, Math.min(1, (p - delay) / (1 - 0.24)));
          if (t <= 0.01) continue;

          const easeT = t * t * t * (t * (t * 6 - 15) + 10);
          const cx =
            pt.srcX +
            (pt.dstX - pt.srcX) * easeT +
            Math.sin(easeT * Math.PI) * (pt.seed - 0.5) * 12;
          const cy = pt.srcY + (pt.dstY - pt.srcY) * easeT;

          const alpha = Math.min(1, t / 0.14) * pt.inkWeight;
          const bit =
            t < 0.8 && (i + tick) % 7 === 0
              ? pt.bit === 1
                ? '0'
                : '1'
              : String(pt.bit);

          if (t < 0.55) {
            ctx.fillStyle =
              i % 5 === 0
                ? `rgba(255, 38, 27, ${alpha.toFixed(3)})`
                : `rgba(24, 24, 22, ${alpha.toFixed(3)})`;
          } else {
            ctx.fillStyle = `rgba(${pt.colorRgb}, ${alpha.toFixed(3)})`;
          }
          ctx.fillText(bit, cx, cy);
        }
      } else if (stageMode === 'logo') {
        const hoverX = pointerXRatio * w;
        const hoverY = pointerYRatio * h;

        for (let i = 0; i < logoCells.length; i++) {
          const pt = logoCells[i];

          let jitterBit = pt.bit;
          let drawX = pt.dstX;
          let drawY = pt.dstY;
          if (isHovered) {
            const dx = pt.dstX - hoverX;
            const dy = pt.dstY - hoverY;
            const dist = Math.hypot(dx, dy);
            if (dist < 56) {
              const force = (1 - dist / 56) * 3.0;
              drawX += (dx / Math.max(1, dist)) * force;
              drawY += (dy / Math.max(1, dist)) * force;
              if ((i + tick) % 3 === 0) jitterBit = pt.bit === 1 ? 0 : 1;
            }
          } else if ((i + tick) % 41 === 0) {
            jitterBit = pt.bit === 1 ? 0 : 1;
          }

          ctx.fillStyle = `rgba(${pt.colorRgb}, ${pt.inkWeight.toFixed(3)})`;
          ctx.fillText(String(jitterBit), drawX, drawY);
        }
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  });

  function handlePointerMove(e: PointerEvent): void {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    pointerXRatio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width))
    );
    pointerYRatio = Math.max(
      0,
      Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height))
    );
  }

  function handleFrameClick(e: MouseEvent): void {
    if (selectedSkill && stageMode === 'logo' && onResetToCat) {
      onResetToCat();
    }
    onclick?.(e);
  }
</script>

<!--
  Unified Large Quantum Schrödinger's Cat, Official Binary Skill Logo & GitHub Stats Frame
  Aligned flush with the right edge of the "skills" title above it.
-->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  data-binary-exclude={buildProgress > 0.65 ? '' : undefined}
  data-exclude-pad-x="28"
  data-exclude-pad-top="22"
  data-exclude-pad-bottom="24"
  onpointerenter={() => {
    isHovered = true;
  }}
  onpointermove={handlePointerMove}
  onpointerleave={() => {
    isHovered = false;
    pointerXRatio = 0.5;
    pointerYRatio = 0.5;
  }}
  onclick={handleFrameClick}
  style="opacity: {cardAlpha.toFixed(3)}; transform: translate3d(0, {translateY.toFixed(1)}px, 0);"
  class="group relative mx-auto flex w-full max-w-[540px] cursor-pointer flex-col overflow-hidden rounded-[24px] border border-[#181816]/14 bg-white p-4 shadow-[0_20px_54px_rgba(24,24,22,0.09)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] select-none sm:rounded-[28px] sm:p-5 lg:mr-0 lg:ml-auto xl:max-w-[580px]"
>
  <!-- Clean Top Header -->
  <div class="mb-3 flex items-center justify-between gap-3 border-b border-[#181816]/10 pb-2.5">
    <span class="truncate font-display text-sm font-extrabold tracking-[-0.02em] text-[#181816]">
      {headerTitle}
    </span>

    {#if stageMode === 'stats-hub'}
      <button
        type="button"
        onclick={handleBackToCat}
        class="cursor-pointer rounded-lg border border-[#181816]/16 bg-[#f7f7f5] px-2.5 py-1 font-sans text-[11px] font-semibold text-[#181816] transition-colors duration-200 hover:border-[#181816] hover:bg-[#181816] hover:text-white whitespace-nowrap shrink-0"
      >
        ← Cat
      </button>
    {/if}
  </div>

  <!-- Large Unified Frame Viewport (0/1 Schrödinger's Cat -> In-Frame GitHub Dark C++ -> Binary Rain -> Official 0/1 Logo OR GitHub Stats) -->
  <div class="relative h-[250px] w-full overflow-hidden rounded-2xl bg-white sm:h-[340px] lg:h-[370px] xl:h-[420px]">
    <!-- Live Canvas Layer (0/1 Animated Schrödinger's Cat + Binary Rain -> Official 0/1 Skill Logo / Binary Stats Condensation) -->
    <canvas
      bind:this={stageCanvasEl}
      class="absolute inset-0 h-full w-full"
    ></canvas>

    <!-- Computational Schrödinger's Equation directly beneath the 0/1 Schrödinger's Cat -->
    {#if stageMode === 'cat'}
      <div
        class="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex flex-col items-center justify-center gap-1.5 border-t border-[#181816]/8 bg-white/92 px-3 pt-2 pb-1 text-center sm:pt-2.5"
      >
        <!-- Time-Dependent Schrödinger's Equation for a Computer Bit / CPU Hamiltonian -->
        <div
          class="flex items-center justify-center gap-1.5 font-serif text-[14.5px] leading-none tracking-tight text-[#181816] sm:text-[18px]"
          aria-label="i h-bar partial derivative with respect to t of ket psi bit equals H-hat CPU acting on ket psi bit"
        >
          <span class="italic">i</span><span class="font-medium">ħ</span>
          <span class="inline-flex flex-col items-center justify-center px-0.5 text-[12px] leading-[1.05] sm:text-[13px]">
            <span class="border-b border-[#181816]/75 px-1 pb-[1px]">∂</span>
            <span class="pt-[1px]">∂<span class="italic">t</span></span>
          </span>
          <span class="font-normal text-[#181816]/75">|</span><span class="italic font-semibold text-[#ff261b]">ψ</span><sub class="-ml-0.5 font-mono text-[9.5px] font-bold not-italic text-[#181816]/65">bit</sub><span class="font-normal text-[#181816]/75">⟩</span>
          <span class="px-1 font-sans text-[15px] font-medium text-[#181816]/60">=</span>
          <span class="italic font-semibold text-[#181816]">Ĥ</span><sub class="-ml-0.5 font-mono text-[9.5px] font-bold not-italic text-[#ff261b]">CPU</sub>
          <span class="ml-0.5 font-normal text-[#181816]/75">|</span><span class="italic font-semibold text-[#ff261b]">ψ</span><sub class="-ml-0.5 font-mono text-[9.5px] font-bold not-italic text-[#181816]/65">bit</sub><span class="font-normal text-[#181816]/75">⟩</span>
        </div>

        <!-- Computing Qubit Basis Superposition linking the 0/1 Binary Cat to the Equation -->
        <div class="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 font-mono text-[10.5px] font-medium text-[#181816]/68 tabular-nums sm:text-[11px]">
          <span>
            |<span class="text-[#ff261b] font-semibold">ψ</span>⟩ = α|<span class="font-bold text-[#181816]">0</span>⟩ + β|<span class="font-bold text-[#181816]">1</span>⟩
          </span>
          <span aria-hidden="true" class="text-[#181816]/28">·</span>
          <span>
            P(<span class="font-bold text-[#181816]">0</span>)={probZero.toFixed(2)}
          </span>
          <span>
            P(<span class="font-bold text-[#ff261b]">1</span>)={probOne.toFixed(2)}
          </span>
        </div>
      </div>
    {/if}

    <!-- In-Frame GitHub Dark Theme C++ Code Execution Overlay -->
    {#if isShowingCppOverlay}
      <div
        onclick={(e) => e.stopPropagation()}
        class="absolute inset-0 z-30 flex flex-col justify-between bg-[#0d1117] text-left transition-opacity duration-300"
      >
        <div class="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-4 py-2.5">
          <div class="flex items-center gap-2">
            <span class="h-3 w-3 rounded-full bg-[#ff5f56]"></span>
            <span class="h-3 w-3 rounded-full bg-[#ffbd2e]"></span>
            <span class="h-3 w-3 rounded-full bg-[#27c93f]"></span>
            <span class="ml-2 font-mono text-xs font-semibold text-[#e6edf3]">
              {cppEditorFilename}
            </span>
          </div>
          <span class="font-mono text-[11px] text-[#8b949e]">
            {cppEditorRightTag}
          </span>
        </div>

        <div class="flex flex-1 flex-col justify-center overflow-x-auto px-3.5 py-2.5 font-mono text-[10.5px] leading-[1.55] sm:px-7 sm:py-4 sm:text-[13px] sm:leading-[1.68]">
          {#each visibleCppLines as line (line.lineNumber)}
            <div class="flex min-h-[21px] items-baseline rounded px-1.5 {line.isCursorLine ? 'bg-[#161b22]/85' : ''}">
              <span class="mr-3.5 w-5 shrink-0 text-right text-[11px] text-[#6e7681] select-none">
                {line.lineNumber}
              </span>
              <span class="whitespace-pre break-normal">
                {#each line.tokens as tok, tIdx (tIdx)}
                  <span style="color: {tok.color};">{tok.text}</span>
                {/each}{#if line.isCursorLine}<span
                    class="ml-[1px] inline-block h-[14px] w-[7px] translate-y-[2px] bg-[#58a6ff] animate-pulse"
                  ></span>{/if}
              </span>
            </div>
          {/each}
        </div>

        <div class="border-t border-[#30363d] bg-[#161b22]/90 px-4 py-2 font-mono text-[11px] text-[#8b949e]">
          {#if cppTypedCount >= totalCppChars}
            <span class="text-[#3fb950]">✓</span>
            <span class="ml-1.5 text-[#e6edf3]">
              {cppEditorCompiledMsg}
            </span>
          {:else}
            <span>$ g++ -std=c++20 {cppEditorFilename} -o render</span>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Solid Theme-Matched GitHub Stats Pop-up Hub & Binary Stats Sectional Block -->
    {#if stageMode === 'stats-hub'}
      <BinaryGithubStatsPanel
        mode="hub"
        category={null}
        stats={githubStats}
        onSelectCategory={handleSelectStatsCategory}
        onBackToHub={handleBackToStatsHub}
        onBackToCat={handleBackToCat}
      />
    {:else if stageMode === 'stats-detail-view' && activeStatsCategory}
      <BinaryGithubStatsPanel
        mode="detail"
        category={activeStatsCategory}
        stats={githubStats}
        onSelectCategory={handleSelectStatsCategory}
        onBackToHub={handleBackToStatsHub}
        onBackToCat={handleBackToCat}
      />
    {/if}
  </div>
</div>
