<script lang="ts">
  import { onMount } from 'svelte';
  import {
    InstancedBinaryDustRenderer,
    detectDeviceGpuTier,
  } from '../../lib/three/InstancedBinaryDust';

  interface Props {
    morphProgress: number;
    projectsMorphProgress?: number;
    skillsMorphProgress?: number;
    credentialsMorphProgress?: number;
    thankYouMorphProgress?: number;
    heroAnchorEl: HTMLElement | null;
    aboutAnchorEl: HTMLElement | null;
    projectsAnchorEl?: HTMLElement | null;
    skillsAnchorEl?: HTMLElement | null;
    credentialsAnchorEl?: HTMLElement | null;
    thankYouAnchorEl?: HTMLElement | null;
    topicBuildProgresses?: number[];
    topicEls?: Array<HTMLElement | null>;
    topicTexts?: string[];
    beyondEl?: HTMLElement | null;
    beyondBuildProgress?: number;
    everyLimitEl?: HTMLElement | null;
    everyLimitBuildProgress?: number;
    projectCardEls?: Array<HTMLElement | null>;
    cardsBuildProgress?: number;
    motiSkillsEl?: HTMLElement | null;
    motiSkillsBuildProgress?: number;
    skillBuildProgresses?: number[];
    skillEls?: Array<HTMLElement | null>;
    skillTexts?: string[];
    skillsArtEl?: HTMLElement | null;
    skillsArtBuildProgress?: number;
    credentialsStageEl?: HTMLElement | null;
    credentialsBuildProgress?: number;
  }

  let {
    morphProgress,
    projectsMorphProgress = 0,
    skillsMorphProgress = 0,
    credentialsMorphProgress = 0,
    thankYouMorphProgress = 0,
    heroAnchorEl,
    aboutAnchorEl,
    projectsAnchorEl = null,
    skillsAnchorEl = null,
    credentialsAnchorEl = null,
    thankYouAnchorEl = null,
    topicBuildProgresses = [],
    topicEls = [],
    topicTexts = [],
    beyondEl = null,
    beyondBuildProgress = 0,
    everyLimitEl = null,
    everyLimitBuildProgress = 0,
    projectCardEls = [],
    cardsBuildProgress = 0,
    motiSkillsEl = null,
    motiSkillsBuildProgress = 0,
    skillBuildProgresses = [],
    skillEls = [],
    skillTexts = [],
    skillsArtEl = null,
    skillsArtBuildProgress = 0,
    credentialsStageEl = null,
    credentialsBuildProgress = 0,
  }: Props = $props();

  let canvasEl = $state<HTMLCanvasElement | null>(null);

  interface NormMorphParticle {
    srcNx: number;
    srcNy: number;
    dstNx: number;
    dstNy: number;
    seed: number;
    swirlAmpX: number;
    swirlAmpY: number;
    bit: 0 | 1;
    isRedAccent: boolean;
  }

  interface DustPoint {
    nx: number;
    ny: number;
    seed: number;
    bit: 0 | 1;
    isRed: boolean;
  }

  interface TopicDustCloud {
    normPoints: DustPoint[];
  }

  const WORD_PARTICLE_COUNT = 1080;
  const TOPIC_PARTICLE_COUNT = 380;
  const PHRASE_PARTICLE_COUNT = 460;
  const CARD_PARTICLE_COUNT = 220;
  const RAIN_COL_SPACING = 18;
  const GLYPH_SIZE_PX = 10.5;

  // Brand palette normalized linear/sRGB RGB for InstancedMesh shader
  const RED_R = 1.0;
  const RED_G = 38 / 255;
  const RED_B = 27 / 255;
  const INK_R = 24 / 255;
  const INK_G = 24 / 255;
  const INK_B = 22 / 255;

  function quinticSmooth(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  onMount(() => {
    const canvas = canvasEl;
    if (!canvas) return;

    const gpuTier = detectDeviceGpuTier();
    const pScale = gpuTier.recommendedParticleScale;
    const scaledWordCount = Math.max(420, Math.round(WORD_PARTICLE_COUNT * pScale));
    const scaledTopicCount = Math.max(180, Math.round(TOPIC_PARTICLE_COUNT * pScale));
    const scaledPhraseCount = Math.max(220, Math.round(PHRASE_PARTICLE_COUNT * pScale));
    const scaledCardCount = Math.max(110, Math.round(CARD_PARTICLE_COUNT * pScale));

    let width = Math.max(320, window.innerWidth);
    let viewHeight = Math.max(320, window.innerHeight);

    const gpuRenderer = new InstancedBinaryDustRenderer({
      canvas,
      maxInstances: 6400,
      width,
      height: viewHeight,
      maxDpr: gpuTier.recommendedMaxDpr,
    });

    let heroToAboutParticles: NormMorphParticle[] = [];
    let aboutToProjectsParticles: NormMorphParticle[] = [];
    let projectsToSkillsParticles: NormMorphParticle[] = [];
    let skillsToCredentialsParticles: NormMorphParticle[] = [];
    let credentialsToThankYouParticles: NormMorphParticle[] = [];
    let topicClouds: TopicDustCloud[] = [];
    let skillClouds: TopicDustCloud[] = [];
    let beyondCloud: DustPoint[] = [];
    let everyLimitCloud: DustPoint[] = [];
    let cardDustTemplate: DustPoint[] = [];
    let motiSkillsCloud: DustPoint[] = [];

    // Exponentially damped progress state
    let smoothHeroP = 0;
    let smoothProjP = 0;
    let smoothSkillsMorphP = 0;
    let smoothCredentialsMorphP = 0;
    let smoothThankYouMorphP = 0;
    const smoothTopicP = [0, 0, 0, 0, 0];
    const smoothSkillP = [0, 0, 0, 0, 0];
    let smoothBeyondP = 0;
    let smoothEveryLimitP = 0;
    let smoothCardsP = 0;
    let smoothMotiSkillsP = 0;
    let smoothSkillsArtP = 0;
    let smoothCredentialsBuildP = 0;

    function sampleWordPoints(
      text: string,
      boxW: number,
      boxH: number,
      count: number
    ): Array<{ nx: number; ny: number }> {
      const off = document.createElement('canvas');
      const sampleW = Math.max(180, Math.min(760, Math.round(boxW)));
      const sampleH = Math.max(48, Math.min(240, Math.round(boxH)));
      off.width = sampleW;
      off.height = sampleH;
      const octx = off.getContext('2d');
      if (!octx) return [];

      octx.clearRect(0, 0, sampleW, sampleH);
      octx.fillStyle = '#ffffff';
      octx.textBaseline = 'middle';
      octx.textAlign = 'left';

      let fontSize = Math.floor(sampleH * 0.88);
      octx.font = `800 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
      const measured = octx.measureText(text).width;
      if (measured > 0) {
        fontSize = Math.floor(fontSize * ((sampleW * 0.94) / measured));
        octx.font = `800 ${fontSize}px "Plus Jakarta Sans", system-ui, sans-serif`;
      }

      octx.fillText(text, sampleW * 0.03, sampleH * 0.53);

      const img = octx.getImageData(0, 0, sampleW, sampleH).data;
      const candidates: Array<{ nx: number; ny: number }> = [];

      for (let y = 0; y < sampleH; y += 2) {
        for (let x = 0; x < sampleW; x += 2) {
          if (img[(y * sampleW + x) * 4 + 3] > 120) {
            candidates.push({ nx: x / sampleW, ny: y / sampleH });
          }
        }
      }

      if (candidates.length === 0) {
        return Array.from({ length: count }, (_, i) => ({
          nx: (i % 40) / 40,
          ny: Math.floor(i / 40) / Math.max(1, count / 40),
        }));
      }

      candidates.sort((a, b) => a.nx - b.nx + (a.ny - b.ny) * 0.15);
      const result: Array<{ nx: number; ny: number }> = [];
      for (let i = 0; i < count; i++) {
        const idx = Math.min(
          candidates.length - 1,
          Math.floor((i / count) * candidates.length)
        );
        result.push(candidates[idx]);
      }
      return result;
    }

    function buildCardDustTemplate(count: number): DustPoint[] {
      const pts: DustPoint[] = [];
      for (let i = 0; i < count; i++) {
        const seed = ((i + 19) * 0.61803398875) % 1;
        let nx = 0.5;
        let ny = 0.5;

        if (i < count * 0.42) {
          const t = i / (count * 0.42);
          const perim = t * 4;
          if (perim < 1) {
            nx = perim;
            ny = 0.02 + (seed - 0.5) * 0.03;
          } else if (perim < 2) {
            nx = 0.98 + (seed - 0.5) * 0.03;
            ny = perim - 1;
          } else if (perim < 3) {
            nx = 1 - (perim - 2);
            ny = 0.98 + (seed - 0.5) * 0.03;
          } else {
            nx = 0.02 + (seed - 0.5) * 0.03;
            ny = 1 - (perim - 3);
          }
        } else {
          const subIdx = i - Math.floor(count * 0.42);
          const cols = 12;
          const rows = Math.ceil((count * 0.58) / cols);
          const c = subIdx % cols;
          const r = Math.floor(subIdx / cols);
          nx = 0.08 + (c / Math.max(1, cols - 1)) * 0.84 + (seed - 0.5) * 0.03;
          ny = 0.08 + (r / Math.max(1, rows - 1)) * 0.84 + (seed - 0.5) * 0.03;
        }

        pts.push({
          nx: Math.max(0.01, Math.min(0.99, nx)),
          ny: Math.max(0.01, Math.min(0.99, ny)),
          seed,
          bit: i % 2 === 0 ? 1 : 0,
          isRed: i % 5 === 0,
        });
      }
      return pts;
    }

    function rebuildParticleMap(): void {
      width = Math.max(320, window.innerWidth);
      viewHeight = Math.max(320, window.innerHeight);
      gpuRenderer.resize(width, viewHeight, true);

      const swirlScale = Math.min(1, Math.max(0.55, width / 1100));

      const aryandasNorm = sampleWordPoints('aryandas', 680, 140, scaledWordCount);
      const aboutNorm = sampleWordPoints('about', 320, 100, scaledWordCount);
      const projectsNorm = sampleWordPoints('projects', 420, 100, scaledWordCount);
      const skillsNorm = sampleWordPoints('skills', 320, 100, scaledWordCount);
      const credentialsNorm = sampleWordPoints('credentials', 560, 100, scaledWordCount);
      const thankYouNorm = sampleWordPoints('ad', 680, 220, scaledWordCount);

      const buildTransition = (
        src: Array<{ nx: number; ny: number }>,
        dst: Array<{ nx: number; ny: number }>,
        seedOffset: number,
        spreadX: number,
        spreadY: number,
        redMod = 8
      ): NormMorphParticle[] => {
        const out: NormMorphParticle[] = new Array(scaledWordCount);
        for (let i = 0; i < scaledWordCount; i++) {
          const s = src[i];
          const d = dst[i];
          const seed = ((i + seedOffset) * 0.61803398875) % 1;
          out[i] = {
            srcNx: s.nx,
            srcNy: s.ny,
            dstNx: d.nx,
            dstNy: d.ny,
            seed,
            swirlAmpX: (seed - 0.5) * spreadX * swirlScale,
            swirlAmpY: (36 + seed * spreadY) * (0.75 + 0.25 * swirlScale),
            bit: i % 2 === 0 ? 1 : 0,
            isRedAccent: i % redMod !== 0,
          };
        }
        return out;
      };

      heroToAboutParticles = buildTransition(aryandasNorm, aboutNorm, 0, 165, 105, 8);
      aboutToProjectsParticles = buildTransition(aboutNorm, projectsNorm, 37, 175, 110, 8);
      projectsToSkillsParticles = buildTransition(projectsNorm, skillsNorm, 71, 175, 115, 8);
      skillsToCredentialsParticles = buildTransition(skillsNorm, credentialsNorm, 109, 195, 120, 8);
      credentialsToThankYouParticles = buildTransition(credentialsNorm, thankYouNorm, 149, 210, 125, 7);

      const nextClouds: TopicDustCloud[] = [];
      for (let tIdx = 0; tIdx < topicTexts.length; tIdx++) {
        const label = topicTexts[tIdx];
        const sampled = sampleWordPoints(label, Math.max(240, label.length * 18), 58, scaledTopicCount);
        nextClouds.push({
          normPoints: sampled.map((pt, i) => ({
            nx: pt.nx,
            ny: pt.ny,
            seed: ((i + tIdx * 17) * 0.61803398875) % 1,
            bit: (i + tIdx) % 2 === 0 ? 1 : 0,
            isRed: i % 4 === 0,
          })),
        });
      }
      topicClouds = nextClouds;

      const nextSkillClouds: TopicDustCloud[] = [];
      for (let sIdx = 0; sIdx < skillTexts.length; sIdx++) {
        const label = skillTexts[sIdx];
        const sampled = sampleWordPoints(label, Math.max(240, label.length * 18), 58, scaledTopicCount);
        nextSkillClouds.push({
          normPoints: sampled.map((pt, i) => ({
            nx: pt.nx,
            ny: pt.ny,
            seed: ((i + sIdx * 23 + 41) * 0.61803398875) % 1,
            bit: (i + sIdx) % 2 === 0 ? 1 : 0,
            isRed: i % 4 === 0,
          })),
        });
      }
      skillClouds = nextSkillClouds;

      const beyondSampled = sampleWordPoints('Beyond', 380, 105, scaledPhraseCount);
      beyondCloud = beyondSampled.map((pt, i) => ({
        nx: pt.nx,
        ny: pt.ny,
        seed: ((i + 53) * 0.61803398875) % 1,
        bit: i % 2 === 0 ? 1 : 0,
        isRed: i % 4 === 0,
      }));

      const everyLimitSampled = sampleWordPoints('every limit', 520, 105, scaledPhraseCount);
      everyLimitCloud = everyLimitSampled.map((pt, i) => ({
        nx: pt.nx,
        ny: pt.ny,
        seed: ((i + 89) * 0.61803398875) % 1,
        bit: i % 2 === 0 ? 0 : 1,
        isRed: i % 4 === 0,
      }));

      const skiTop = sampleWordPoints('SKI', 360, 140, Math.floor(scaledPhraseCount * 0.6));
      const llsBot = sampleWordPoints('LLS', 360, 140, Math.floor(scaledPhraseCount * 0.6));
      motiSkillsCloud = [
        ...skiTop.map((pt, i) => ({
          nx: pt.nx,
          ny: pt.ny * 0.48,
          seed: ((i + 31) * 0.61803398875) % 1,
          bit: (i % 2 === 0 ? 1 : 0) as 0 | 1,
          isRed: i % 6 === 0,
        })),
        ...llsBot.map((pt, i) => ({
          nx: pt.nx,
          ny: 0.52 + pt.ny * 0.48,
          seed: ((i + 67) * 0.61803398875) % 1,
          bit: (i % 2 === 0 ? 0 : 1) as 0 | 1,
          isRed: i % 6 === 0,
        })),
      ];

      cardDustTemplate = buildCardDustTemplate(scaledCardCount);
    }

    function pushWordDustCascade(
      particles: NormMorphParticle[],
      progress: number,
      srcEl: HTMLElement | null,
      dstEl: HTMLElement | null,
      clock: number,
      tick: number,
      fadeToWhite = false
    ): void {
      if (progress <= 0.002 || progress >= 0.998 || particles.length === 0) return;

      const sR = srcEl?.getBoundingClientRect();
      const dR = dstEl?.getBoundingClientRect();
      const sLeft = sR && sR.width > 4 ? sR.left : width * 0.06;
      const sTop = sR && sR.height > 4 ? sR.top : viewHeight * 0.65;
      const sW = sR && sR.width > 4 ? sR.width : width * 0.7;
      const sH = sR && sR.height > 4 ? sR.height : 120;

      const dLeft = dR && dR.width > 4 ? dR.left : width * 0.62;
      const dTop = dR && dR.height > 4 ? dR.top : viewHeight * 0.14;
      const dW = dR && dR.width > 4 ? dR.width : Math.min(300, width * 0.55);
      const dH = dR && dR.height > 4 ? dR.height : 88;

      const cloudAlpha =
        progress < 0.05
          ? progress / 0.05
          : progress > 0.88
            ? Math.max(0, (1 - progress) / 0.12)
            : 1;
      const dxSpan = dLeft - sLeft;
      const dySpan = dTop - sTop;
      const glyphBase = width < 640 ? 9.2 : GLYPH_SIZE_PX;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const delay = p.seed * 0.24;
        const rawT = (progress - delay) / 0.76;
        const t = rawT <= 0 ? 0 : rawT >= 1 ? 1 : rawT;

        const easeT = quinticSmooth(t);
        const midEnvelope = Math.sin(easeT * Math.PI);

        const sx = sLeft + p.srcNx * sW;
        const sy = sTop + p.srcNy * sH;
        const dx = dLeft + p.dstNx * dW;
        const dy = dTop + p.dstNy * dH;

        const screenX =
          sx +
          (dx - sx) * easeT +
          midEnvelope * (p.swirlAmpX + Math.sin(clock * 2.2 + p.seed * 12) * 10);
        const screenY = sy + (dy - sy) * easeT + midEnvelope * p.swirlAmpY;

        if (screenY < -20 || screenY > viewHeight + 20 || screenX < -24 || screenX > width + 24) {
          continue;
        }
        // Subtle safety check so pure stationary ends fade out
        if (dxSpan === 0 && dySpan === 0 && easeT <= 0.01) continue;

        const bitVal: 0 | 1 =
          midEnvelope > 0.2 && (i + tick) % 11 === 0
            ? p.bit === 1
              ? 0
              : 1
            : p.bit;
        const ptAlpha = cloudAlpha * (0.55 + 0.45 * midEnvelope);
        const sz = glyphBase * (0.9 + 0.24 * midEnvelope);

        const lightMix = fadeToWhite ? Math.max(0, Math.min(1, (easeT - 0.22) / 0.55)) : 0;
        if (p.isRedAccent) {
          gpuRenderer.push(screenX, screenY, sz, bitVal, RED_R, RED_G, RED_B, ptAlpha);
        } else {
          const r = INK_R + (1.0 - INK_R) * lightMix;
          const g = INK_G + (1.0 - INK_G) * lightMix;
          const b = INK_B + (1.0 - INK_B) * lightMix;
          gpuRenderer.push(screenX, screenY, sz, bitVal, r, g, b, ptAlpha);
        }
      }
    }

    function pushRainCondensationCloud(
      pts: DustPoint[],
      buildP: number,
      el: HTMLElement | null,
      padX: number,
      padY: number,
      tick: number,
      darkSurface = false
    ): void {
      if (buildP <= 0.004 || buildP >= 0.992 || !el || pts.length === 0) return;

      const rect = el.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      if (rect.bottom < -40 || rect.top > viewHeight + 40) return;

      const cloudFadeOut =
        buildP > 0.66 ? Math.max(0, 1 - (buildP - 0.66) / 0.32) : 1;
      const innerW = Math.max(8, rect.width - padX * 2);
      const innerH = Math.max(8, rect.height - padY * 2);
      const glyphSize = width < 640 ? 9.2 : 10.2;

      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        const delay = pt.nx * 0.2 + pt.seed * 0.14;
        const localT = Math.max(0, Math.min(1, (buildP - delay) / (0.86 - delay)));
        if (localT <= 0.005) continue;

        const easeT = quinticSmooth(localT);
        const dstX = rect.left + padX + pt.nx * innerW;
        const dstY = rect.top + padY + pt.ny * innerH;

        const snappedRainColX =
          Math.round((dstX + (pt.seed - 0.5) * 72) / RAIN_COL_SPACING) * RAIN_COL_SPACING +
          RAIN_COL_SPACING * 0.5;
        const rainOriginY = dstY - (110 + pt.seed * 155);

        const curX = snappedRainColX + (dstX - snappedRainColX) * easeT;
        const curY =
          rainOriginY +
          (dstY - rainOriginY) * easeT +
          Math.sin(easeT * Math.PI) * (pt.seed - 0.5) * 14;

        if (curY < -20 || curY > viewHeight + 20) continue;

        const bitVal: 0 | 1 =
          localT < 0.8 && (i + tick) % 9 === 0
            ? pt.bit === 1
              ? 0
              : 1
            : pt.bit;

        const fadeIn = Math.min(1, localT / 0.18);
        const ptAlpha = fadeIn * cloudFadeOut * 0.92;
        const red = pt.isRed && localT < 0.85;

        if (red) {
          gpuRenderer.push(curX, curY, glyphSize, bitVal, RED_R, RED_G, RED_B, ptAlpha);
        } else if (darkSurface) {
          gpuRenderer.push(curX, curY, glyphSize, bitVal, 0.94, 0.94, 0.96, ptAlpha);
        } else {
          gpuRenderer.push(curX, curY, glyphSize, bitVal, INK_R, INK_G, INK_B, ptAlpha);
        }
      }
    }

    requestAnimationFrame(() => {
      rebuildParticleMap();
    });

    let rafId = 0;
    let syncTimerId = 0;
    let disposed = false;
    let isPaused = document.hidden;
    let clock = 0;
    let lastMs = performance.now();

    const isMidRange = (v: number): boolean => v > 0.003 && v < 0.993;

    function afterDraw(cb: () => void): void {
      const glCtx = gpuRenderer.renderer.getContext() as WebGL2RenderingContext;
      const sync = glCtx.fenceSync?.(glCtx.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        syncTimerId = window.setTimeout(cb, 32);
        return;
      }
      glCtx.flush();
      const poll = () => {
        if (disposed) {
          glCtx.deleteSync(sync);
          return;
        }
        const status = glCtx.getSyncParameter(sync, glCtx.SYNC_STATUS);
        if (status === glCtx.UNSIGNALED) {
          syncTimerId = window.setTimeout(poll, 4);
        } else {
          glCtx.deleteSync(sync);
          syncTimerId = window.setTimeout(cb, 24);
        }
      };
      syncTimerId = window.setTimeout(poll, 4);
    }

    const render = (nowMs: number) => {
      if (isPaused || disposed) {
        rafId = 0;
        return;
      }

      const dt = Math.min((nowMs - lastMs) / 1000, 0.033);
      lastMs = nowMs;
      clock += dt;

      const smoothFactor = 1 - Math.exp(-14 * dt);
      smoothHeroP += (morphProgress - smoothHeroP) * smoothFactor;
      smoothProjP += (projectsMorphProgress - smoothProjP) * smoothFactor;
      smoothSkillsMorphP += (skillsMorphProgress - smoothSkillsMorphP) * smoothFactor;
      smoothCredentialsMorphP += (credentialsMorphProgress - smoothCredentialsMorphP) * smoothFactor;
      smoothThankYouMorphP += (thankYouMorphProgress - smoothThankYouMorphP) * smoothFactor;
      smoothBeyondP += (beyondBuildProgress - smoothBeyondP) * smoothFactor;
      smoothEveryLimitP += (everyLimitBuildProgress - smoothEveryLimitP) * smoothFactor;
      smoothCardsP += (cardsBuildProgress - smoothCardsP) * smoothFactor;
      smoothMotiSkillsP += (motiSkillsBuildProgress - smoothMotiSkillsP) * smoothFactor;
      smoothSkillsArtP += (skillsArtBuildProgress - smoothSkillsArtP) * smoothFactor;
      smoothCredentialsBuildP += (credentialsBuildProgress - smoothCredentialsBuildP) * smoothFactor;

      let anyActive =
        isMidRange(smoothHeroP) ||
        isMidRange(smoothProjP) ||
        isMidRange(smoothSkillsMorphP) ||
        isMidRange(smoothCredentialsMorphP) ||
        isMidRange(smoothThankYouMorphP) ||
        isMidRange(smoothBeyondP) ||
        isMidRange(smoothEveryLimitP) ||
        isMidRange(smoothCardsP) ||
        isMidRange(smoothMotiSkillsP) ||
        isMidRange(smoothSkillsArtP) ||
        isMidRange(smoothCredentialsBuildP);

      for (let k = 0; k < smoothTopicP.length; k++) {
        const targetVal = topicBuildProgresses[k] ?? 0;
        smoothTopicP[k] += (targetVal - smoothTopicP[k]) * smoothFactor;
        if (isMidRange(smoothTopicP[k])) anyActive = true;
      }

      for (let k = 0; k < smoothSkillP.length; k++) {
        const targetVal = skillBuildProgresses[k] ?? 0;
        smoothSkillP[k] += (targetVal - smoothSkillP[k]) * smoothFactor;
        if (isMidRange(smoothSkillP[k])) anyActive = true;
      }

      if (!anyActive) {
        gpuRenderer.clear();
        rafId = requestAnimationFrame(render);
        return;
      }

      gpuRenderer.beginFrame();
      const tick = Math.floor(clock * 8);

      pushWordDustCascade(heroToAboutParticles, smoothHeroP, heroAnchorEl, aboutAnchorEl, clock, tick);
      pushWordDustCascade(aboutToProjectsParticles, smoothProjP, aboutAnchorEl, projectsAnchorEl, clock, tick);
      pushWordDustCascade(projectsToSkillsParticles, smoothSkillsMorphP, projectsAnchorEl, skillsAnchorEl, clock, tick);
      pushWordDustCascade(skillsToCredentialsParticles, smoothCredentialsMorphP, skillsAnchorEl, credentialsAnchorEl, clock, tick, false);
      pushWordDustCascade(credentialsToThankYouParticles, smoothThankYouMorphP, credentialsAnchorEl, thankYouAnchorEl, clock, tick, false);

      for (let tIdx = 0; tIdx < smoothTopicP.length; tIdx++) {
        const cloud = topicClouds[tIdx];
        if (!cloud) continue;
        pushRainCondensationCloud(cloud.normPoints, smoothTopicP[tIdx], topicEls[tIdx] ?? null, 18, 8, tick);
      }

      pushRainCondensationCloud(beyondCloud, smoothBeyondP, beyondEl, 4, 4, tick);
      pushRainCondensationCloud(everyLimitCloud, smoothEveryLimitP, everyLimitEl, 4, 4, tick);

      if (smoothCardsP > 0.004 && smoothCardsP < 0.992) {
        for (let cIdx = 0; cIdx < projectCardEls.length; cIdx++) {
          const cardEl = projectCardEls[cIdx];
          if (!cardEl) continue;
          pushRainCondensationCloud(cardDustTemplate, smoothCardsP, cardEl, 6, 6, tick);
        }
      }

      pushRainCondensationCloud(motiSkillsCloud, smoothMotiSkillsP, motiSkillsEl, 12, 12, tick);

      for (let sIdx = 0; sIdx < smoothSkillP.length; sIdx++) {
        const cloud = skillClouds[sIdx];
        if (!cloud) continue;
        pushRainCondensationCloud(cloud.normPoints, smoothSkillP[sIdx], skillEls[sIdx] ?? null, 18, 8, tick);
      }

      pushRainCondensationCloud(cardDustTemplate, smoothSkillsArtP, skillsArtEl, 8, 8, tick);
      pushRainCondensationCloud(cardDustTemplate, smoothCredentialsBuildP, credentialsStageEl, 18, 18, tick, false);

      gpuRenderer.render();

      if (gpuRenderer.isSoftwareGl && gpuRenderer.batch.count > 0) {
        afterDraw(() => {
          if (!disposed && !isPaused) {
            rafId = requestAnimationFrame(render);
          }
        });
      } else {
        rafId = requestAnimationFrame(render);
      }
    };

    const onResize = () => {
      rebuildParticleMap();
    };

    const onVisibilityChange = () => {
      isPaused = document.hidden;
      if (!isPaused && rafId === 0) {
        lastMs = performance.now();
        rafId = requestAnimationFrame(render);
      } else if (isPaused && rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    if (!isPaused) {
      rafId = requestAnimationFrame(render);
    }

    return () => {
      disposed = true;
      if (rafId !== 0) cancelAnimationFrame(rafId);
      window.clearTimeout(syncTimerId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      gpuRenderer.dispose();
    };
  });
</script>

<canvas
  bind:this={canvasEl}
  aria-hidden="true"
  class="pointer-events-none fixed inset-0 z-35 block h-screen w-screen"
></canvas>
