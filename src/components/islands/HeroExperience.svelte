<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { Big3DCursorController } from '../../lib/three/Big3DCursor';
  import {
    INITIAL_GITHUB_PINS,
    areGithubPinsEqual,
    fetchLiveGithubPins,
    fetchLiveRepoReadme,
    renderGithubReadmeHtml,
    type GithubPinCard,
  } from '../../lib/github/liveRepos';
  import BinaryRainBackdrop from './BinaryRainBackdrop.svelte';
  import BinaryDustWordMorph from './BinaryDustWordMorph.svelte';
  import FluidNavButton from './FluidNavButton.svelte';
  import FerroFluidCardDrips from './FerroFluidCardDrips.svelte';
  import MotiClaySkillsWord from './MotiClaySkillsWord.svelte';
  import BinaryScanlineCatArt from './BinaryScanlineCatArt.svelte';
  import NeuralCredentialsStage from './NeuralCredentialsStage.svelte';
  import ThankYouFinaleStage from './ThankYouFinaleStage.svelte';
  import {
    TECH_STACK_SKILLS,
    type TechSkillItem,
  } from '../../lib/skills/techStackCatalog';

  type NavTabId = 'about' | 'projects' | 'skills' | 'certifications' | 'connect';

  interface AboutTopic {
    id: string;
    headline: string;
    baseIndentPx: number;
    phaseOffset: number;
    preferredPointerAngle: number;
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

  const NAV_ITEMS: Array<{ id: NavTabId; label: string }> = [
    { id: 'about', label: 'About' },
    { id: 'projects', label: 'Projects' },
    { id: 'skills', label: 'Skills' },
    { id: 'certifications', label: 'Credentials' },
    { id: 'connect', label: 'Connect' },
  ];

  const ABOUT_TOPICS: AboutTopic[] = [
    {
      id: 'ee-nits',
      headline: 'Electrical Engineering at NIT Silchar',
      baseIndentPx: 142,
      phaseOffset: 0.0,
      preferredPointerAngle: -0.05,
    },
    {
      id: 'programmer',
      headline: 'Programmer',
      baseIndentPx: 162,
      phaseOffset: 1.2,
      preferredPointerAngle: 0.04,
    },
    {
      id: 'developer',
      headline: 'Developer',
      baseIndentPx: 148,
      phaseOffset: 2.4,
      preferredPointerAngle: -0.04,
    },
    {
      id: 'engineer',
      headline: 'Engineer',
      baseIndentPx: 168,
      phaseOffset: 3.6,
      preferredPointerAngle: 0.05,
    },
    {
      id: 'data-scientist',
      headline: 'Data Scientist',
      baseIndentPx: 154,
      phaseOffset: 4.8,
      preferredPointerAngle: -0.03,
    },
  ];

  const TOPIC_TEXTS = ABOUT_TOPICS.map((t) => t.headline);

  // Live-synced 6 Pinned Repositories from @aryandas079 on GitHub
  let githubPins = $state<GithubPinCard[]>(INITIAL_GITHUB_PINS);

  // Focus View state when clicking any of the 6 cards (GSAP 3D card flip -> View Project -> Scroll down for full README)
  let focusedCardIdx = $state<number | null>(null);
  let focusedReadmeHtml = $state<string>('');
  let focusScrollTop = $state(0);
  let focusScrollContainer = $state<HTMLElement | null>(null);
  let focusBackdropEl = $state<HTMLElement | null>(null);
  let focusFlipStageEl = $state<HTMLElement | null>(null);
  let focusHeroStageEl = $state<HTMLElement | null>(null);
  let focusViewBtnEl = $state<HTMLElement | null>(null);
  let focusReadmeContainerEl = $state<HTMLElement | null>(null);
  let focusFlipTimeline: gsap.core.Timeline | null = null;
  let focusedPin = $derived(
    focusedCardIdx !== null ? (githubPins[focusedCardIdx] ?? null) : null
  );
  // README only appears once the user scrolls down inside the flipped card
  let readmeRevealOpacity = $derived(
    Math.max(0, Math.min(1, (focusScrollTop - 16) / 110))
  );

  // Interactive ferrofluid hover state for each of the 6 project cards
  let hoveredCardIdx = $state<number | null>(null);
  let cardPointerNormX = $state(0);
  let cardPointerNormY = $state(0);

  // GitHub Dark theme C++ syntax-highlighted bio code that types out live when photo is clicked
  const CPP_BIO_LINES: CppToken[][] = [
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
      { text: '"An Electrical Engineering student at NIT Silchar "', color: '#a5d6ff' },
    ],
    [
      { text: '       ', color: '#e6edf3' },
      { text: '<<', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: '"and Google Student Ambassador 2026, I bridge the "', color: '#a5d6ff' },
    ],
    [
      { text: '       ', color: '#e6edf3' },
      { text: '<<', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: '"gap between hardware fundamentals and intelligent "', color: '#a5d6ff' },
    ],
    [
      { text: '       ', color: '#e6edf3' },
      { text: '<<', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: '"software. Armed with a CS50x foundation, I am "', color: '#a5d6ff' },
    ],
    [
      { text: '       ', color: '#e6edf3' },
      { text: '<<', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: '"sharpening my skills in C++ (DSA), Machine Learning, "', color: '#a5d6ff' },
    ],
    [
      { text: '       ', color: '#e6edf3' },
      { text: '<<', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: '"and Full-Stack Web Development—driven by a passion "', color: '#a5d6ff' },
    ],
    [
      { text: '       ', color: '#e6edf3' },
      { text: '<<', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: '"for Generative AI, data analytics, and crafting "', color: '#a5d6ff' },
    ],
    [
      { text: '       ', color: '#e6edf3' },
      { text: '<<', color: '#ff7b72' },
      { text: ' ', color: '#e6edf3' },
      { text: '"clean, design-forward user experiences."', color: '#a5d6ff' },
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
    [
      { text: '}', color: '#e6edf3' },
    ],
  ];

  const TOTAL_CPP_CHARS = CPP_BIO_LINES.reduce(
    (sum, line) => sum + line.reduce((lineSum, tok) => lineSum + tok.text.length, 0),
    0
  );

  let activeTab = $state<NavTabId | null>(null);

  // Exponentially smoothed scroll coordinate for 60/120fps fluid transitions
  let targetScrollY = 0;
  let smoothScrollY = $state(0);
  let viewportH = $state(800);
  let viewportW = $state(1280);
  let isCarOrShortLandscape = $derived(viewportH <= 580 && viewportW >= 680);
  let isNarrowMobile = $derived(viewportW < 400);
  let isTvScreen = $derived(viewportW >= 2200 && viewportH >= 1100);
  let sayHiModalOpen = $state(false);
  let isModalOverlayOpen = $derived(focusedCardIdx !== null || sayHiModalOpen);
  let desktopCursorMargin = $derived(
    isCarOrShortLandscape
      ? 0.22
      : isTvScreen
        ? 1.15
        : viewportW >= 1280
          ? 1.0
          : viewportW >= 1024
            ? 0.62
            : 0
  );

  // Dynamic responsive 3D Projects carousel & Skills drum geometry
  let projectCardW = $derived(
    isCarOrShortLandscape
      ? Math.min(285, Math.max(200, Math.round(viewportH * 0.48)))
      : isTvScreen
        ? Math.min(430, Math.round(viewportW * 0.14))
        : Math.min(340, Math.max(208, viewportW - 48))
  );
  let projectCardH = $derived(
    isCarOrShortLandscape
      ? Math.min(250, Math.max(175, Math.round(viewportH * 0.46)))
      : isTvScreen
        ? Math.min(540, Math.round(viewportH * 0.46))
        : Math.min(
            435,
            Math.max(235, Math.round(Math.min(viewportH * 0.46, projectCardW * 1.26)))
          )
  );
  let cardSpreadX = $derived(
    isCarOrShortLandscape
      ? Math.max(180, Math.min(290, Math.round(viewportW * 0.28)))
      : isTvScreen
        ? Math.min(450, Math.round(viewportW * 0.16))
        : Math.max(185, Math.min(340, Math.round(viewportW * 0.42)))
  );
  let cardSpreadZ = $derived(
    isTvScreen ? 235 : viewportW < 640 || isCarOrShortLandscape ? 135 : 195
  );
  let drumHeight = $derived(
    isCarOrShortLandscape
      ? Math.min(235, Math.max(155, Math.round(viewportH * 0.45)))
      : isTvScreen
        ? Math.min(500, Math.round(viewportH * 0.42))
        : Math.min(385, Math.max(175, Math.round(viewportH * 0.34)))
  );
  let drumStepY = $derived(
    isTvScreen
      ? 64
      : isCarOrShortLandscape || viewportW < 640 || viewportH < 720
        ? 36
        : 52
  );

  // 1. Scroll progress from Page 1 (Hero: 0vh) to Page 2 (About locked at 100vh)
  let dustMorphProgress = $derived(
    Math.max(0, Math.min(1, (smoothScrollY - viewportH * 0.02) / (viewportH * 0.88)))
  );

  // Opacity of solid "aryandas" on Page 1 (fades out smoothly as it turns into tiny 1 & 0 dust)
  let heroSolidOpacity = $derived(
    Math.max(0, 1 - dustMorphProgress * 2.5)
  );

  // 3. Scroll progress from Page 2 ("about" title) to Page 3 ("projects" title: 425vh -> 530vh)
  let projectsMorphProgress = $derived(
    Math.max(0, Math.min(1, (smoothScrollY - viewportH * 4.25) / (viewportH * 1.05)))
  );

  // 5. Scroll progress from Page 3 ("projects" title) to Page 4 ("skills" title: 985vh -> 1090vh)
  let skillsMorphProgress = $derived(
    Math.max(0, Math.min(1, (smoothScrollY - viewportH * 9.85) / (viewportH * 1.05)))
  );

  // 7. Scroll progress from Page 4 ("skills" top-right) to Page 5 ("credentials" top-left: 1505vh -> 1610vh)
  let credentialsMorphProgress = $derived(
    Math.max(0, Math.min(1, (smoothScrollY - viewportH * 15.05) / (viewportH * 1.05)))
  );

  // 8. Scroll progress from Page 5 ("credentials") to Page 6 ("AD" Connect finale: 1745vh -> 1845vh)
  let thankYouMorphProgress = $derived(
    Math.max(0, Math.min(1, (smoothScrollY - viewportH * 17.45) / (viewportH * 1.0)))
  );

  // Opacity of solid "about" title at top-right of Page 2 (crystallizes from aryandas dust, dissolves into projects dust)
  let aboutTitleSolidOpacity = $derived(
    Math.max(0, Math.min(1, (dustMorphProgress - 0.65) / 0.32)) *
      Math.max(0, 1 - projectsMorphProgress * 2.5)
  );

  // Opacity of solid "projects" title at top-right of Page 3 (crystallizes from about dust, dissolves into skills dust)
  let projectsTitleSolidOpacity = $derived(
    Math.max(0, Math.min(1, (projectsMorphProgress - 0.65) / 0.32)) *
      Math.max(0, 1 - skillsMorphProgress * 2.5)
  );

  // Opacity of solid "skills" title at top-right of Page 4 (crystallizes from projects dust, dissolves into credentials dust)
  let skillsTitleSolidOpacity = $derived(
    Math.max(0, Math.min(1, (skillsMorphProgress - 0.65) / 0.32)) *
      Math.max(0, 1 - credentialsMorphProgress * 2.5)
  );

  // Opacity of solid "credentials" title at top-left of Page 5 (crystallizes from skills dust, dissolves into AD dust)
  let credentialsTitleSolidOpacity = $derived(
    Math.max(0, Math.min(1, (credentialsMorphProgress - 0.65) / 0.32)) *
      Math.max(0, 1 - thankYouMorphProgress * 2.4)
  );

  // Smooth entrance opacity for the right-side portrait on the About page
  let aboutPhotoOpacity = $derived(
    Math.max(0, Math.min(1, (smoothScrollY - viewportH * 0.5) / (viewportH * 0.42)))
  );

  // 2. Pinned scroll progress within the About page (while stopped on the About screen: 100vh -> 425vh)
  let aboutPinnedProgress = $derived(
    Math.max(0, Math.min(1, (smoothScrollY - viewportH * 0.88) / (viewportH * 3.3)))
  );

  // 4. Pinned scroll progress within the Projects page (while stopped on the Projects screen: 505vh -> 960vh)
  let projectsPinnedProgress = $derived(
    Math.max(0, Math.min(1, (smoothScrollY - viewportH * 5.05) / (viewportH * 4.4)))
  );

  // 6. Pinned scroll progress within the Skills page (while stopped on the Skills screen: 1075vh -> 1500vh)
  let skillsPinnedProgress = $derived(
    Math.max(0, Math.min(1, (smoothScrollY - viewportH * 10.75) / (viewportH * 4.15)))
  );

  // Dissolve progress for Stage 1 Moti Clay "SKI / LLS" centerpiece — completes 100% BEFORE Stage 2 appears
  let motiSkillsDissolveProgress = $derived(
    selectedTechSkill !== null || githubStatsOpen
      ? 1
      : Math.max(0, Math.min(1, (skillsPinnedProgress - 0.13) / 0.08))
  );

  // Continuous, time-smoothed build progresses (0..1) for each of the 5 About points
  let topicBuildProgresses = $state<number[]>([0, 0, 0, 0, 0]);

  // Continuous, time-smoothed build progresses (0..1) for Projects page elements built from binary rain:
  // 1) "Beyond" (far left top), 2) "every limit" (far right end), 3) the 6 GitHub Pinned Cards
  let beyondBuildProgress = $state(0);
  let everyLimitBuildProgress = $state(0);
  let cardsBuildProgress = $state(0);

  // Continuous, time-smoothed build progresses (0..1) for Skills page:
  // Stage 1: Center Black & White "Moti" 3D clay writing; Stage 2: Scrolling Tech Stack Drum on Left + Cat/Logo Art on Right
  let motiSkillsBuildProgress = $state(0);
  let skillsArtBuildProgress = $state(0);
  let credentialsBuildProgress = $state(0);
  let thankYouBuildProgress = $state(0);

  // Continuous scrolling drum index (0..TECH_STACK_SKILLS.length-1) & clicked skill / GitHub Stats state
  let smoothSkillIndex = $state(1); // C++ centered initially
  let manualSkillIndex = $state<number | null>(null);
  let selectedTechSkill = $state<TechSkillItem | null>(null);
  let githubStatsOpen = $state(false);
  let githubStatsTriggerToken = $state(0);
  let skillsDrumAlpha = $derived(
    Math.max(0, Math.min(1, (skillsArtBuildProgress - 0.18) / 0.55))
  );
  let activeSkillDrumIdx = $derived(
    Math.max(0, Math.min(TECH_STACK_SKILLS.length - 1, Math.round(smoothSkillIndex)))
  );

  // Continuous 3D carousel index (0..5) for the 6 GitHub pinned project cards
  let smoothCardIndex = $state(0);
  let manualCardIndex = $state<number | null>(null);
  let carouselTouchStartX = 0;
  let carouselTouchStartY = 0;

  function handleCarouselTouchStart(e: TouchEvent): void {
    const t = e.touches[0];
    if (!t) return;
    carouselTouchStartX = t.clientX;
    carouselTouchStartY = t.clientY;
  }

  function handleCarouselTouchEnd(e: TouchEvent): void {
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - carouselTouchStartX;
    const dy = t.clientY - carouselTouchStartY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.15) {
      const current = Math.round(smoothCardIndex);
      const next =
        dx < 0
          ? Math.min(githubPins.length - 1, current + 1)
          : Math.max(0, current - 1);
      manualCardIndex = next;
    }
  }

  // Index (0..4) of the headline currently pointed at while scrolling through the pinned About screen
  let pointedTopicIdx = $state<number | null>(null);
  let manualTopicIdx = $state<number | null>(null);
  let showPhotoBio = $state(false);
  let cppTypedChars = $state(0);

  function getVisibleCppLines(charCount: number): VisibleCppLine[] {
    let remaining = Math.max(0, Math.floor(charCount));
    const result: VisibleCppLine[] = [];

    for (let i = 0; i < CPP_BIO_LINES.length; i++) {
      const lineTokens = CPP_BIO_LINES[i];
      const lineLen = lineTokens.reduce((acc, t) => acc + t.text.length, 0);

      if (remaining >= lineLen) {
        remaining -= lineLen;
        const isLastLineDone = i === CPP_BIO_LINES.length - 1 && remaining >= 0;
        result.push({
          lineNumber: i + 1,
          tokens: lineTokens,
          isCursorLine: isLastLineDone,
        });
      } else {
        const partialTokens: CppToken[] = [];
        let lineRem = remaining;
        for (const tok of lineTokens) {
          if (lineRem <= 0) break;
          if (lineRem >= tok.text.length) {
            partialTokens.push(tok);
            lineRem -= tok.text.length;
          } else {
            partialTokens.push({
              text: tok.text.slice(0, lineRem),
              color: tok.color,
            });
            lineRem = 0;
          }
        }
        result.push({
          lineNumber: i + 1,
          tokens: partialTokens,
          isCursorLine: true,
        });
        break;
      }
    }

    if (result.length === 0) {
      result.push({
        lineNumber: 1,
        tokens: [],
        isCursorLine: true,
      });
    }

    return result;
  }

  let visibleCppLines = $derived(getVisibleCppLines(cppTypedChars));

  let cursorCanvasMount = $state<HTMLDivElement | null>(null);
  let heroAnchorEl = $state<HTMLElement | null>(null);
  let aboutAnchorEl = $state<HTMLElement | null>(null);
  let projectsAnchorEl = $state<HTMLElement | null>(null);
  let skillsAnchorEl = $state<HTMLElement | null>(null);
  let credentialsAnchorEl = $state<HTMLElement | null>(null);
  let thankYouAnchorEl = $state<HTMLElement | null>(null);
  let connectButtonEl = $state<HTMLElement | null>(null);
  let aboutSectionEl = $state<HTMLElement | null>(null);
  let nextSectionEl = $state<HTMLElement | null>(null);
  let skillsSectionEl = $state<HTMLElement | null>(null);
  let credentialsSectionEl = $state<HTMLElement | null>(null);
  let connectSectionEl = $state<HTMLElement | null>(null);
  let beyondEl = $state<HTMLElement | null>(null);
  let everyLimitEl = $state<HTMLElement | null>(null);
  let projectCardEls = $state<Array<HTMLElement | null>>([null, null, null, null, null, null]);
  let motiSkillsEl = $state<HTMLElement | null>(null);
  let skillDrumCenterEl = $state<HTMLElement | null>(null);
  let skillItemEls = $state<Record<number, HTMLElement | null>>({});
  let skillsArtEl = $state<HTMLElement | null>(null);
  let credentialsStageEl = $state<HTMLElement | null>(null);
  let cursorController: Big3DCursorController | null = null;
  let topicEls = $state<Array<HTMLElement | null>>([null, null, null, null, null]);

  $effect(() => {
    cursorController?.setPaused(isModalOverlayOpen);
  });

  function animateHomeScreenReveal(): void {
    gsap.fromTo(
      '[data-build="navbar"]',
      { y: -18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' }
    );
    gsap.fromTo(
      '[data-build="hero-name"]',
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.75, ease: 'power4.out', delay: 0.06 }
    );
  }

  function syncArcProgress(p: number): void {
    const clamped = Math.max(0.04, Math.min(0.96, p));
    if (heroAnchorEl) {
      const r = heroAnchorEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        cursorController?.setScrollArcProgress(
          clamped,
          r.left + r.width * 0.45,
          r.top + r.height * 0.42
        );
        return;
      }
    }
    cursorController?.setScrollArcProgress(clamped);
  }

  function handleNavClick(id: NavTabId, e: MouseEvent): void {
    e.stopPropagation();
    activeTab = activeTab === id ? null : id;

    if (id === 'about' && aboutSectionEl) {
      manualTopicIdx = null;
      window.scrollTo({ top: viewportH * 0.98, behavior: 'smooth' });
      return;
    }

    if (id === 'projects' && nextSectionEl) {
      window.scrollTo({ top: viewportH * 6.85, behavior: 'smooth' });
      return;
    }

    if (id === 'skills' && skillsSectionEl) {
      window.scrollTo({ top: viewportH * 10.95, behavior: 'smooth' });
      return;
    }

    if (id === 'certifications' && credentialsSectionEl) {
      window.scrollTo({ top: viewportH * 16.24, behavior: 'smooth' });
      return;
    }

    if (id === 'connect' && connectSectionEl) {
      const connectEntryScroll = Math.min(
        Math.round(viewportH * 18.62),
        Math.max(0, document.documentElement.scrollHeight - viewportH)
      );
      window.scrollTo({ top: connectEntryScroll, behavior: 'smooth' });
      return;
    }
  }

  function handleNeuralNodeInteract(_clientX: number, _clientY: number): void {
    // 3D cursor remains locked to heading choreography rather than chasing pointer taps
  }

  function selectSkillFromDrum(idx: number, e: MouseEvent): void {
    e.stopPropagation();
    const clampedIdx = Math.max(0, Math.min(TECH_STACK_SKILLS.length - 1, idx));
    manualSkillIndex = clampedIdx;
    githubStatsOpen = false;
    const clickedSkill = TECH_STACK_SKILLS[clampedIdx] ?? null;
    selectedTechSkill =
      selectedTechSkill?.id === clickedSkill?.id ? null : clickedSkill;
  }

  function handleOpenGithubStats(e: MouseEvent): void {
    e.stopPropagation();
    selectedTechSkill = null;
    githubStatsOpen = true;
    githubStatsTriggerToken += 1;
  }

  let readmeSlideAnimated = false;

  function handleFocusScroll(e: Event): void {
    const el = e.currentTarget as HTMLElement;
    const nextScroll = el.scrollTop;
    focusScrollTop = nextScroll;

    if (!focusReadmeContainerEl) return;

    const progress = Math.max(0, Math.min(1, (nextScroll - 8) / 105));
    if (progress > 0.02 && !readmeSlideAnimated) {
      readmeSlideAnimated = true;
      gsap.fromTo(
        focusReadmeContainerEl,
        { y: 56, opacity: 0.08 },
        {
          y: 0,
          opacity: 1,
          duration: 0.68,
          ease: 'expo.out',
          force3D: true,
          overwrite: 'auto',
        }
      );
    } else {
      gsap.to(focusReadmeContainerEl, {
        y: (1 - progress) * 42,
        opacity: progress,
        duration: 0.42,
        ease: 'power3.out',
        force3D: true,
        overwrite: 'auto',
      });
      if (progress <= 0.01) {
        readmeSlideAnimated = false;
      }
    }
  }

  async function openCardFocusView(idx: number, e: MouseEvent): Promise<void> {
    e.stopPropagation();
    manualCardIndex = idx;
    focusedCardIdx = idx;
    focusScrollTop = 0;
    readmeSlideAnimated = false;

    const pin = githubPins[idx];
    if (pin) {
      focusedReadmeHtml = renderGithubReadmeHtml(pin.readmeMarkdown, pin);
    }

    // Trigger buttery-smooth GSAP 3D 180-degree card flip & slide-up entrance transitions
    requestAnimationFrame(() => {
      if (focusScrollContainer) {
        focusScrollContainer.scrollTop = 0;
      }

      focusFlipTimeline?.kill();
      const tl = gsap.timeline({ defaults: { force3D: true } });
      focusFlipTimeline = tl;

      if (focusBackdropEl) {
        tl.fromTo(
          focusBackdropEl,
          { opacity: 0 },
          { opacity: 1, duration: 0.42, ease: 'power2.out' },
          0
        );
      }

      if (focusFlipStageEl) {
        tl.fromTo(
          focusFlipStageEl,
          {
            rotateY: 0,
            rotateX: 9,
            scale: 0.88,
            y: 54,
          },
          {
            rotateY: 180,
            rotateX: 0,
            scale: 1,
            y: 0,
            duration: 0.88,
            ease: 'expo.out',
          },
          0
        );
      }

      if (focusHeroStageEl) {
        tl.fromTo(
          focusHeroStageEl,
          { opacity: 0, y: 34 },
          { opacity: 1, y: 0, duration: 0.64, ease: 'expo.out' },
          0.32
        );
      }

      if (focusViewBtnEl) {
        tl.fromTo(
          focusViewBtnEl,
          { opacity: 0, y: 22, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.58, ease: 'expo.out' },
          0.4
        );
      }

      if (focusReadmeContainerEl) {
        tl.fromTo(
          focusReadmeContainerEl,
          { opacity: 0, y: 68 },
          { opacity: 0, y: 42, duration: 0.72, ease: 'expo.out' },
          0.36
        );
      }
    });

    if (pin) {
      const liveMd = await fetchLiveRepoReadme(pin);
      if (focusedCardIdx === idx) {
        focusedReadmeHtml = renderGithubReadmeHtml(liveMd, pin);
      }
    }
  }

  function closeCardFocusView(): void {
    focusFlipTimeline?.kill();
    const tl = gsap.timeline({
      defaults: { force3D: true },
      onComplete: () => {
        focusedCardIdx = null;
      },
    });
    focusFlipTimeline = tl;

    if (focusReadmeContainerEl) {
      tl.to(
        focusReadmeContainerEl,
        {
          opacity: 0,
          y: 48,
          duration: 0.32,
          ease: 'power2.in',
        },
        0
      );
    }

    if (focusFlipStageEl) {
      tl.to(
        focusFlipStageEl,
        {
          rotateY: 0,
          rotateX: -5,
          scale: 0.88,
          y: 32,
          duration: 0.56,
          ease: 'expo.inOut',
        },
        0
      );
    }

    if (focusBackdropEl) {
      tl.to(
        focusBackdropEl,
        {
          opacity: 0,
          duration: 0.42,
          ease: 'power2.inOut',
        },
        0.12
      );
    } else {
      focusedCardIdx = null;
    }
  }

  onMount(() => {
    viewportH = Math.max(window.innerHeight, 240);
    viewportW = Math.max(window.innerWidth, 260);

    targetScrollY = window.scrollY;
    smoothScrollY = targetScrollY;

    // Mount physics-driven 3D cursor across mobile, tablet, and desktop viewports
    if (cursorCanvasMount) {
      cursorController = new Big3DCursorController(cursorCanvasMount);
      cursorController.setPaused(isModalOverlayOpen);
    }

    requestAnimationFrame(() => {
      animateHomeScreenReveal();
      syncArcProgress(0.22);
    });

    // Live-sync @aryandas079 GitHub pinned repositories on mount, focus, visibility, and 20s poll
    let isSyncingPins = false;
    const syncGithubData = async () => {
      if (isSyncingPins) return;
      isSyncingPins = true;
      try {
        const nextPins = await fetchLiveGithubPins(githubPins);
        if (nextPins.length > 0 && !areGithubPinsEqual(githubPins, nextPins)) {
          githubPins = nextPins;
          const maxIdx = Math.max(0, nextPins.length - 1);
          if (smoothCardIndex > maxIdx) smoothCardIndex = maxIdx;
          if (focusedCardIdx !== null && focusedCardIdx > maxIdx) {
            focusedCardIdx = maxIdx;
          }
        }
      } finally {
        isSyncingPins = false;
      }
    };
    syncGithubData();

    const pinSyncTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncGithubData();
      }
    }, 20_000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncGithubData();
      }
    };

    const onWindowFocus = () => {
      syncGithubData();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusedCardIdx !== null) {
        closeCardFocusView();
        return;
      }

      if (isModalOverlayOpen) return;
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;

      const vh = Math.max(window.innerHeight, 240);
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - vh);
      const sectionStops = [
        0,
        Math.round(vh * 0.98),
        Math.round(vh * 5.28),
        Math.round(vh * 10.95),
        Math.round(vh * 16.24),
        Math.min(Math.round(vh * 18.62), maxScroll),
      ];

      // TV Remote / Keyboard PageDown & PageUp jump cleanly between full sections
      if (e.key === 'PageDown' || e.key === 'PageUp') {
        e.preventDefault();
        const curY = window.scrollY;
        if (e.key === 'PageDown') {
          const next = sectionStops.find((s) => s > curY + vh * 0.25);
          if (next !== undefined) {
            window.scrollTo({ top: next, behavior: 'smooth' });
          }
        } else {
          for (let i = sectionStops.length - 1; i >= 0; i--) {
            if (sectionStops[i] < curY - vh * 0.25) {
              window.scrollTo({ top: sectionStops[i], behavior: 'smooth' });
              break;
            }
          }
        }
        return;
      }

      if (e.key === 'Home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (e.key === 'End') {
        e.preventDefault();
        window.scrollTo({ top: maxScroll, behavior: 'smooth' });
        return;
      }

      // TV D-pad / Keyboard ArrowLeft & ArrowRight step Projects carousel or Skills drum
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        if (smoothScrollY >= vh * 4.75 && smoothScrollY < vh * 10.55) {
          e.preventDefault();
          const cur = Math.round(smoothCardIndex);
          manualCardIndex = Math.max(0, Math.min(githubPins.length - 1, cur + delta));
        } else if (smoothScrollY >= vh * 10.35 && smoothScrollY < vh * 15.75) {
          e.preventDefault();
          const cur = Math.round(smoothSkillIndex);
          manualSkillIndex = Math.max(
            0,
            Math.min(TECH_STACK_SKILLS.length - 1, cur + delta)
          );
        }
      }
    };

    let rafId = 0;
    let lastMs = performance.now();
    let lastPointedIdx = -1;
    let lastProjectsStage = '';
    let lastSkillsStage = '';
    let lastCredentialsStage = '';
    let lastThankYouStage = '';
    let snapTimer = 0;
    let finaleResumeRoamTimer = 0;
    let isTouchActive = false;
    let isClickPointOverride = false;
    let lastRawScrollY = window.scrollY;
    let scrollDirection: 'down' | 'up' = 'down';

    /**
     * Finds the nearest visible page heading within magnetic capture range (<= 115px)
     * so clicking near any heading snaps the 3D cursor smoothly into a centered GSAP lock!
     */
    const findNearbyHeadingForClick = (
      clientX: number,
      clientY: number
    ): { rect: DOMRect; key: string } | null => {
      const candidates: Array<{ el: HTMLElement | null; key: string; minOpacity?: number }> = [
        { el: heroAnchorEl, key: 'hero-title' },
        { el: aboutAnchorEl, key: 'about-title' },
        { el: projectsAnchorEl, key: 'projects-title' },
        { el: beyondEl, key: 'projects-beyond' },
        { el: everyLimitEl, key: 'projects-everylimit' },
        { el: skillsAnchorEl, key: 'skills-title' },
        { el: motiSkillsEl, key: 'skills-moti' },
        { el: skillItemEls[activeSkillDrumIdx] ?? null, key: `skill-drum-${activeSkillDrumIdx}` },
        { el: credentialsAnchorEl, key: 'credentials-title' },
        { el: connectButtonEl, key: 'connect-cta' },
      ];
      for (let i = 0; i < topicEls.length; i++) {
        if ((topicBuildProgresses[i] ?? 0) > 0.35) {
          candidates.push({ el: topicEls[i], key: `about-topic-${i}` });
        }
      }

      let best: { rect: DOMRect; key: string } | null = null;
      let bestDist = 115;

      for (const c of candidates) {
        if (!c.el) continue;
        const style = window.getComputedStyle(c.el);
        if (parseFloat(style.opacity || '1') < 0.25) continue;
        const r = c.el.getBoundingClientRect();
        if (r.width < 12 || r.height < 12) continue;
        if (r.bottom < 0 || r.top > viewportH || r.right < 0 || r.left > viewportW) continue;

        const clampedX = Math.max(r.left, Math.min(r.right, clientX));
        const clampedY = Math.max(r.top, Math.min(r.bottom, clientY));
        const dist = Math.hypot(clientX - clampedX, clientY - clampedY);
        if (dist < bestDist) {
          bestDist = dist;
          best = { rect: r, key: c.key };
        }
      }
      return best;
    };

    /**
     * Click-anywhere 360-degree arbitrary movement:
     * Clicking ANY pixel on screen launches the 3D cursor along an arbitrary curved trajectory
     * with a full 360° spin so its exact sharp apex tip points straight at the clicked pixel
     * (or magnetically locks onto a nearby heading). Desktop mouse-hover tracking stays OFF.
     */
    const handleWindowPointerDown = (e: PointerEvent) => {
      if (isModalOverlayOpen || !cursorController) return;
      isClickPointOverride = true;
      window.clearTimeout(finaleResumeRoamTimer);
      const nearby = findNearbyHeadingForClick(e.clientX, e.clientY);
      cursorController.pointAndMoveToPixel(e.clientX, e.clientY, nearby);

      // On the last page, hold at the clicked pixel briefly then resume sweeping all over the page
      if (smoothScrollY > viewportH * 17.55) {
        finaleResumeRoamTimer = window.setTimeout(() => {
          if (!isModalOverlayOpen && smoothScrollY > viewportH * 17.55) {
            isClickPointOverride = false;
          }
        }, 2200);
      }
    };

    const onWindowTouchStart = () => {
      isTouchActive = true;
      window.clearTimeout(snapTimer);
    };

    const onWindowTouchEnd = () => {
      isTouchActive = false;
      scheduleSectionSnap();
    };

    /**
     * Scroll-snap settle controller between Home, About, Projects, and Skills sections
     * so each section and card settles cleanly when the viewer pauses scrolling.
     */
    const scheduleSectionSnap = () => {
      window.clearTimeout(snapTimer);
      if (focusedCardIdx !== null || isTouchActive) return;

      snapTimer = window.setTimeout(() => {
        if (focusedCardIdx !== null || isTouchActive) return;
        const y = window.scrollY;
        const vh = Math.max(window.innerHeight, 240);

        // 1. Transition zone between Home (0vh) and About Entry (0.96vh)
        if (y > 4 && y < vh * 0.94) {
          const snapToAbout =
            scrollDirection === 'down' ? y >= vh * 0.16 : y >= vh * 0.68;
          window.scrollTo({
            top: snapToAbout ? Math.round(vh * 0.96) : 0,
            behavior: 'smooth',
          });
          return;
        }

        // 2. Transition zone between About Exit (4.20vh) and Projects Entry (5.26vh)
        if (y > vh * 4.2 && y < vh * 5.22) {
          const snapToProjects =
            scrollDirection === 'down' ? y >= vh * 4.35 : y >= vh * 4.92;
          window.scrollTo({
            top: snapToProjects
              ? Math.round(vh * 5.26)
              : Math.round(vh * 4.12),
            behavior: 'smooth',
          });
          return;
        }

        // 3. Inside Projects 3D Card Carousel zone (6.80vh .. 9.45vh):
        // Settle onto the nearest integer card stop so 1 card is always centered cleanly
        const cardZoneStart = vh * 6.81;
        const cardZoneSpan = vh * 2.464;
        if (y >= cardZoneStart && y <= cardZoneStart + cardZoneSpan + vh * 0.15) {
          const rawCardProgress = Math.max(
            0,
            Math.min(1, (y - cardZoneStart) / cardZoneSpan)
          );
          const nearestCard = Math.round(
            rawCardProgress * (githubPins.length - 1)
          );
          const snappedY = Math.round(
            cardZoneStart +
              (nearestCard / Math.max(1, githubPins.length - 1)) * cardZoneSpan
          );
          if (Math.abs(y - snappedY) > 8) {
            window.scrollTo({ top: snappedY, behavior: 'smooth' });
          }
          return;
        }

        // 4. Transition zone between Projects Exit (9.80vh) and Skills Entry (10.92vh)
        if (y > vh * 9.8 && y < vh * 10.88) {
          const snapToSkills =
            scrollDirection === 'down' ? y >= vh * 9.95 : y >= vh * 10.55;
          window.scrollTo({
            top: snapToSkills
              ? Math.round(vh * 10.92)
              : Math.round(vh * 9.28),
            behavior: 'smooth',
          });
          return;
        }

        // 5. Transition zone between Skills Exit (15.00vh) and Credentials Entry (16.22vh)
        if (y > vh * 15.0 && y < vh * 16.18) {
          const snapToCredentials =
            scrollDirection === 'down' ? y >= vh * 15.16 : y >= vh * 15.84;
          window.scrollTo({
            top: snapToCredentials
              ? Math.round(vh * 16.22)
              : Math.round(vh * 14.85),
            behavior: 'smooth',
          });
          return;
        }

        // 6. Transition zone between Credentials Exit (17.42vh) and Connect Finale (18.55vh+)
        if (y > vh * 17.42 && y < vh * 18.55) {
          const snapToThankYou =
            scrollDirection === 'down' ? y >= vh * 17.58 : y >= vh * 18.22;
          const finaleTarget = Math.min(
            Math.round(vh * 18.62),
            Math.max(0, document.documentElement.scrollHeight - vh)
          );
          window.scrollTo({
            top: snapToThankYou ? finaleTarget : Math.round(vh * 16.4),
            behavior: 'smooth',
          });
          return;
        }
      }, 170);
    };

    const onScroll = () => {
      const currentY = window.scrollY;
      if (Math.abs(currentY - lastRawScrollY) > 1) {
        scrollDirection = currentY >= lastRawScrollY ? 'down' : 'up';
        lastRawScrollY = currentY;
        // Scrolling immediately resumes magnetic headline choreography
        isClickPointOverride = false;
      }
      targetScrollY = currentY;
      viewportH = Math.max(window.innerHeight, 240);
      manualTopicIdx = null;
      manualCardIndex = null;
      manualSkillIndex = null;
      scheduleSectionSnap();
    };

    const onResize = () => {
      viewportH = Math.max(window.innerHeight, 240);
      viewportW = Math.max(window.innerWidth, 260);
      targetScrollY = window.scrollY;
      if (!cursorController && cursorCanvasMount) {
        cursorController = new Big3DCursorController(cursorCanvasMount);
        cursorController.setPaused(isModalOverlayOpen);
      }
    };

    const updateFrame = (nowMs: number) => {
      const dt = Math.min((nowMs - lastMs) / 1000, 0.033);
      lastMs = nowMs;

      // Exponentially damp smoothScrollY toward targetScrollY for 60/120fps silkiness
      const scrollDiff = targetScrollY - smoothScrollY;
      if (Math.abs(scrollDiff) > 0.04) {
        const scrollLerp = 1 - Math.exp(-13.5 * dt);
        smoothScrollY += scrollDiff * scrollLerp;
      } else if (smoothScrollY !== targetScrollY) {
        smoothScrollY = targetScrollY;
      }

      // Update active navbar tab based on smoothed scroll position
      const desiredTab: NavTabId | null =
        smoothScrollY >= viewportH * 0.65 && smoothScrollY < viewportH * 4.55
          ? 'about'
          : smoothScrollY >= viewportH * 4.55 && smoothScrollY < viewportH * 10.15
            ? 'projects'
            : smoothScrollY >= viewportH * 10.15 && smoothScrollY < viewportH * 15.35
              ? 'skills'
              : smoothScrollY >= viewportH * 15.35 && smoothScrollY < viewportH * 17.75
                ? 'certifications'
                : smoothScrollY >= viewportH * 17.75
                  ? 'connect'
                  : null;
      if (activeTab !== desiredTab) {
        activeTab = desiredTab;
      }

      if (smoothScrollY < viewportH * 0.62) {
        if (pointedTopicIdx !== null) pointedTopicIdx = null;
        lastPointedIdx = -1;
        lastProjectsStage = '';
        lastSkillsStage = '';
        lastCredentialsStage = '';
        lastThankYouStage = '';
        if (!isClickPointOverride) {
          const heroArc = 0.14 + (smoothScrollY / Math.max(viewportH * 0.62, 1)) * 0.72;
          syncArcProgress(heroArc);
        }
      } else if (smoothScrollY <= viewportH * 4.65) {
        lastProjectsStage = '';
        lastSkillsStage = '';
        lastCredentialsStage = '';
        lastThankYouStage = '';
        if (manualTopicIdx !== null) {
          if (pointedTopicIdx !== manualTopicIdx) {
            pointedTopicIdx = manualTopicIdx;
          }
        } else if (aboutPinnedProgress < 0.04) {
          if (pointedTopicIdx !== null) pointedTopicIdx = null;
        } else {
          const p = Math.max(
            0,
            Math.min(0.999, (aboutPinnedProgress - 0.04) / 0.96)
          );
          const idx = Math.min(
            ABOUT_TOPICS.length - 1,
            Math.floor(p * ABOUT_TOPICS.length)
          );
          if (pointedTopicIdx !== idx) {
            pointedTopicIdx = idx;
          }
        }
      } else if (smoothScrollY <= viewportH * 10.25) {
        if (pointedTopicIdx !== null) pointedTopicIdx = null;
        lastPointedIdx = -1;
        lastSkillsStage = '';
        lastCredentialsStage = '';
        lastThankYouStage = '';
      } else if (smoothScrollY <= viewportH * 15.45) {
        if (pointedTopicIdx !== null) pointedTopicIdx = null;
        lastPointedIdx = -1;
        lastProjectsStage = '';
        lastCredentialsStage = '';
        lastThankYouStage = '';
      } else if (smoothScrollY <= viewportH * 17.55) {
        if (pointedTopicIdx !== null) pointedTopicIdx = null;
        lastPointedIdx = -1;
        lastProjectsStage = '';
        lastSkillsStage = '';
        lastThankYouStage = '';
      } else {
        if (pointedTopicIdx !== null) pointedTopicIdx = null;
        lastPointedIdx = -1;
        lastProjectsStage = '';
        lastSkillsStage = '';
        lastCredentialsStage = '';
      }

      // Smoothly advance or reverse each About topic's binary build progress
      const bandSize = 1 / ABOUT_TOPICS.length;
      for (let i = 0; i < ABOUT_TOPICS.length; i++) {
        const triggerThreshold = i * bandSize - 0.02;
        const isTriggered = smoothScrollY >= viewportH * 0.82 && aboutPinnedProgress >= triggerThreshold;
        const cur = topicBuildProgresses[i];
        if (isTriggered && cur < 1) {
          topicBuildProgresses[i] = Math.min(1, cur + dt * 1.35);
        } else if (!isTriggered && cur > 0) {
          topicBuildProgresses[i] = Math.max(0, cur - dt * 1.85);
        }
      }

      // Smoothly advance or reverse Projects page binary rain builds:
      // 1) "Beyond" (far left top), 2) "every limit" (far right end), 3) 6 GitHub Pinned Cards
      const inProjectsZone = smoothScrollY >= viewportH * 4.75 && smoothScrollY < viewportH * 10.55;
      const beyondTriggered = inProjectsZone && projectsPinnedProgress >= 0.08;
      if (beyondTriggered && beyondBuildProgress < 1) {
        beyondBuildProgress = Math.min(1, beyondBuildProgress + dt * 1.35);
      } else if (!beyondTriggered && beyondBuildProgress > 0) {
        beyondBuildProgress = Math.max(0, beyondBuildProgress - dt * 1.85);
      }

      const everyLimitTriggered = inProjectsZone && projectsPinnedProgress >= 0.21;
      if (everyLimitTriggered && everyLimitBuildProgress < 1) {
        everyLimitBuildProgress = Math.min(1, everyLimitBuildProgress + dt * 1.35);
      } else if (!everyLimitTriggered && everyLimitBuildProgress > 0) {
        everyLimitBuildProgress = Math.max(0, everyLimitBuildProgress - dt * 1.85);
      }

      const cardsTriggered = inProjectsZone && projectsPinnedProgress >= 0.14;
      if (cardsTriggered && cardsBuildProgress < 1) {
        cardsBuildProgress = Math.min(1, cardsBuildProgress + dt * 1.15);
      } else if (!cardsTriggered && cardsBuildProgress > 0) {
        cardsBuildProgress = Math.max(0, cardsBuildProgress - dt * 1.85);
      }

      // Snap desiredCardIdx to integer card stops (0..5) so a single active card always settles cleanly in the center!
      const scrollCardSpan = Math.max(0, Math.min(1, (projectsPinnedProgress - 0.4) / 0.56));
      const desiredCardIdx =
        manualCardIndex !== null
          ? manualCardIndex
          : Math.round(scrollCardSpan * (githubPins.length - 1));
      const cardDiff = desiredCardIdx - smoothCardIndex;
      if (Math.abs(cardDiff) > 0.002) {
        smoothCardIndex += cardDiff * (1 - Math.exp(-9.5 * dt));
      } else if (smoothCardIndex !== desiredCardIdx) {
        smoothCardIndex = desiredCardIdx;
      }

      // Smoothly advance or reverse Skills page builds with strict non-overlapping windows:
      // Stage 1 (0.00..0.21): Center Black & White "Moti" writing (SKI / LLS) — dissolves 100% by 0.21
      // Stage 2 (0.23..1.00): Left-side Scrolling Tech Stack Drum + Right-side Cat / Binary Logo / GitHub Stats
      const inSkillsZone =
        smoothScrollY >= viewportH * 10.35 && smoothScrollY < viewportH * 15.75;
      const motiTriggered =
        inSkillsZone &&
        skillsPinnedProgress < 0.2 &&
        selectedTechSkill === null &&
        !githubStatsOpen;
      if (motiTriggered && motiSkillsBuildProgress < 1) {
        motiSkillsBuildProgress = Math.min(1, motiSkillsBuildProgress + dt * 1.45);
      } else if (!motiTriggered && motiSkillsBuildProgress > 0) {
        motiSkillsBuildProgress = Math.max(0, motiSkillsBuildProgress - dt * 2.6);
      }

      const artTriggered =
        inSkillsZone &&
        (skillsPinnedProgress >= 0.23 ||
          selectedTechSkill !== null ||
          githubStatsOpen);
      if (artTriggered && skillsArtBuildProgress < 1) {
        skillsArtBuildProgress = Math.min(1, skillsArtBuildProgress + dt * 1.35);
      } else if (!artTriggered && skillsArtBuildProgress > 0) {
        skillsArtBuildProgress = Math.max(0, skillsArtBuildProgress - dt * 2.2);
      }

      // Smoothly advance or reverse Credentials neural network stage build from binary dust
      const inCredentialsZone =
        smoothScrollY >= viewportH * 15.55 && smoothScrollY < viewportH * 18.4;
      if (inCredentialsZone && credentialsBuildProgress < 1) {
        credentialsBuildProgress = Math.min(1, credentialsBuildProgress + dt * 1.15);
      } else if (!inCredentialsZone && credentialsBuildProgress > 0) {
        credentialsBuildProgress = Math.max(0, credentialsBuildProgress - dt * 2.0);
      }

      // Smoothly advance or reverse Thank You crimson finale built from binary rain & dust
      const inThankYouZone = smoothScrollY >= viewportH * 17.52;
      if (inThankYouZone && thankYouBuildProgress < 1) {
        thankYouBuildProgress = Math.min(1, thankYouBuildProgress + dt * 1.18);
      } else if (!inThankYouZone && thankYouBuildProgress > 0) {
        thankYouBuildProgress = Math.max(0, thankYouBuildProgress - dt * 2.1);
      }

      // Continuous vertical scrolling motion across all 29 Tech Stack skills
      const scrollSkillSpan = Math.max(0, Math.min(1, (skillsPinnedProgress - 0.26) / 0.7));
      const desiredSkillIdx =
        manualSkillIndex !== null
          ? manualSkillIndex
          : 1 + scrollSkillSpan * (TECH_STACK_SKILLS.length - 2);
      const skillDiff = desiredSkillIdx - smoothSkillIndex;
      if (Math.abs(skillDiff) > 0.002) {
        smoothSkillIndex += skillDiff * (1 - Math.exp(-9.5 * dt));
      } else if (smoothSkillIndex !== desiredSkillIdx) {
        smoothSkillIndex = desiredSkillIdx;
      }

      // Advance C++ GitHub Dark live code input when photo bio editor is open
      if (showPhotoBio && cppTypedChars < TOTAL_CPP_CHARS) {
        cppTypedChars = Math.min(TOTAL_CPP_CHARS, cppTypedChars + dt * 220);
      }

      // 3D Pointer Cursor Physics + GSAP Magnetic Heading Choreography (active whenever user scrolls)
      if (!isClickPointOverride && cursorController) {
        // 1) About Page: "about" heading -> 5 About topic headings
        if (smoothScrollY >= viewportH * 0.62 && smoothScrollY <= viewportH * 4.65) {
          if (pointedTopicIdx === null) {
            if (aboutAnchorEl) {
              const r = aboutAnchorEl.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                lastPointedIdx = -1;
                cursorController.pointAtHeadingRect(r, {
                  targetKey: 'about-title',
                  preferredSide: 'left',
                  fallbackSides: ['bottom', 'top'],
                  preferredAngleOffsetRad: -0.04,
                  scale: 0.78,
                  allowFullRoll: true,
                });
              }
            }
          } else {
            const idx = pointedTopicIdx;
            const targetEl = topicEls[idx];
            if (targetEl) {
              const rect = targetEl.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                const switched = lastPointedIdx !== idx;
                lastPointedIdx = idx;

                cursorController.pointAtHeadingRect(rect, {
                  targetKey: `about-topic-${idx}`,
                  preferredSide: viewportW >= 1024 ? 'left' : 'right',
                  fallbackSides:
                    viewportW >= 1024
                      ? ['right', 'top', 'bottom']
                      : ['top', 'bottom', 'left'],
                  preferredAngleOffsetRad: ABOUT_TOPICS[idx].preferredPointerAngle,
                  scale: 0.76,
                  allowFullRoll: switched,
                  forceImpulse: switched,
                });
              }
            }
          }
        }

        // 2) Projects Page: "projects" -> "Beyond" -> "every limit" -> Active project card
        if (smoothScrollY > viewportH * 4.65 && smoothScrollY <= viewportH * 10.25) {
          if (projectsPinnedProgress < 0.08) {
            if (projectsAnchorEl) {
              const r = projectsAnchorEl.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                const switched = lastProjectsStage !== 'title';
                lastProjectsStage = 'title';
                cursorController.pointAtHeadingRect(r, {
                  targetKey: 'projects-title',
                  preferredSide: 'left',
                  fallbackSides: ['bottom', 'top'],
                  preferredAngleOffsetRad: -0.05,
                  scale: 0.78,
                  allowFullRoll: switched,
                  forceImpulse: switched,
                });
              }
            }
          } else if (projectsPinnedProgress < 0.21) {
            if (beyondEl) {
              const r = beyondEl.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                const switched = lastProjectsStage !== 'beyond';
                lastProjectsStage = 'beyond';
                cursorController.pointAtHeadingRect(r, {
                  targetKey: 'projects-beyond',
                  preferredSide: 'right',
                  fallbackSides: ['bottom', 'top'],
                  preferredAngleOffsetRad: 0.05,
                  scale: 0.78,
                  allowFullRoll: switched,
                  forceImpulse: switched,
                });
              }
            }
          } else if (projectsPinnedProgress < 0.36) {
            if (everyLimitEl) {
              const r = everyLimitEl.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                const switched = lastProjectsStage !== 'everylimit';
                lastProjectsStage = 'everylimit';
                cursorController.pointAtHeadingRect(r, {
                  targetKey: 'projects-everylimit',
                  preferredSide: 'left',
                  fallbackSides: ['top', 'bottom'],
                  preferredAngleOffsetRad: -0.04,
                  scale: 0.78,
                  allowFullRoll: switched,
                  forceImpulse: switched,
                });
              }
            }
          } else {
            const activeIdx = Math.round(smoothCardIndex);
            const cardEl = projectCardEls[activeIdx];
            if (cardEl) {
              const r = cardEl.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                const stageKey = `card-${activeIdx}`;
                const switched = lastProjectsStage !== stageKey;
                lastProjectsStage = stageKey;
                cursorController.pointAtHeadingRect(r, {
                  targetKey: `projects-${stageKey}`,
                  preferredSide: 'left',
                  fallbackSides: ['right', 'top', 'bottom'],
                  preferredAngleOffsetRad: -0.03,
                  scale: 0.74,
                  allowFullRoll: switched,
                  forceImpulse: switched,
                });
              }
            }
          }
        }

        // 3) Skills Page: "skills" -> "SKI/LLS" -> Active scrolling skill headline
        if (smoothScrollY > viewportH * 10.25 && smoothScrollY <= viewportH * 15.45) {
          if (skillsPinnedProgress < 0.09) {
            if (skillsAnchorEl) {
              const r = skillsAnchorEl.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                const switched = lastSkillsStage !== 'skills-title';
                lastSkillsStage = 'skills-title';
                cursorController.pointAtHeadingRect(r, {
                  targetKey: 'skills-title',
                  preferredSide: 'left',
                  fallbackSides: ['bottom', 'top'],
                  preferredAngleOffsetRad: -0.04,
                  scale: 0.78,
                  allowFullRoll: switched,
                  forceImpulse: switched,
                });
              }
            }
          } else if (skillsPinnedProgress < 0.22 && selectedTechSkill === null && !githubStatsOpen) {
            if (motiSkillsEl) {
              const r = motiSkillsEl.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                const switched = lastSkillsStage !== 'moti-center';
                lastSkillsStage = 'moti-center';
                cursorController.pointAtScreenElement(
                  r.left + r.width * (viewportW < 640 ? 0.5 : 0.24),
                  r.top + r.height * (viewportW < 640 ? 0.22 : 0.5),
                  {
                    targetKey: 'skills-moti',
                    preferredAngleRad: viewportW < 640 ? -Math.PI * 0.5 + 0.06 : -0.03,
                    scale: 0.78,
                    allowFullRoll: switched,
                    forceSwoop: switched,
                  }
                );
              }
            }
          } else {
            const activeSkillEl =
              skillItemEls[activeSkillDrumIdx] ?? skillDrumCenterEl;
            if (activeSkillEl) {
              const r = activeSkillEl.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                const stageKey = `skill-drum-${activeSkillDrumIdx}`;
                const enteredDrumFromTitle = !lastSkillsStage.startsWith('skill-drum-');
                lastSkillsStage = stageKey;
                cursorController.pointAtHeadingRect(r, {
                  targetKey: stageKey,
                  preferredSide: viewportW >= 1024 ? 'left' : 'right',
                  fallbackSides:
                    viewportW >= 1024
                      ? ['right', 'top', 'bottom']
                      : ['top', 'bottom', 'left'],
                  preferredAngleOffsetRad:
                    -0.02 + ((activeSkillDrumIdx % 3) - 1) * 0.02,
                  scale: 0.74,
                  allowFullRoll: enteredDrumFromTitle,
                  forceImpulse: enteredDrumFromTitle,
                });
              }
            }
          }
        }

        // 4) Credentials Page: "credentials" heading
        if (smoothScrollY > viewportH * 15.45 && smoothScrollY <= viewportH * 17.55) {
          if (credentialsAnchorEl) {
            const r = credentialsAnchorEl.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              const enteredCredentials = lastCredentialsStage !== 'credentials-title';
              lastCredentialsStage = 'credentials-title';
              cursorController.pointAtHeadingRect(r, {
                targetKey: 'credentials-title',
                preferredSide: 'right',
                fallbackSides: ['bottom', 'top', 'left'],
                preferredAngleOffsetRad: 0.04,
                scale: 0.78,
                allowFullRoll: enteredCredentials,
                forceImpulse: enteredCredentials,
              });
            }
          }
        }

        // 5) Connect Finale Page: let the 3D cursor glide freely all over the entire last page
        if (smoothScrollY > viewportH * 17.55) {
          lastThankYouStage = 'finale-full-roam';
          cursorController.setFinaleRoamMode(0.88);
        } else if (lastThankYouStage !== '') {
          lastThankYouStage = '';
        }
      }

      rafId = requestAnimationFrame(updateFrame);
    };

    rafId = requestAnimationFrame(updateFrame);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('pointerdown', handleWindowPointerDown, {
      passive: true,
      capture: true,
    });
    window.addEventListener('touchstart', onWindowTouchStart, { passive: true });
    window.addEventListener('touchend', onWindowTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onWindowTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(snapTimer);
      window.clearTimeout(finaleResumeRoamTimer);
      window.clearInterval(pinSyncTimer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', handleWindowPointerDown, { capture: true });
      window.removeEventListener('touchstart', onWindowTouchStart);
      window.removeEventListener('touchend', onWindowTouchEnd);
      window.removeEventListener('touchcancel', onWindowTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cursorController?.dispose();
      cursorController = null;
    };
  });
</script>

<!-- ====================================================================== -->
<!-- FIXED GLOBAL LAYERS:                                                   -->
<!-- 1. Binary Rain Backdrop (z-0)                                          -->
<!-- 2. 3D Pointer Cursor WebGL Layer (z-[60], floats smoothly over all UI) -->
<!-- 3. 1 & 0 Micro-Dust Word & Point Builder Layer (z-25)                  -->
<!-- ====================================================================== -->
<div class="pointer-events-none fixed inset-0 z-0">
  <BinaryRainBackdrop />
</div>

<div
  bind:this={cursorCanvasMount}
  aria-hidden="true"
  class="pointer-events-none fixed inset-0 z-[60] transition-opacity duration-300 {isModalOverlayOpen ? 'opacity-0' : 'opacity-100'}"
></div>

<BinaryDustWordMorph
  morphProgress={dustMorphProgress}
  {projectsMorphProgress}
  {skillsMorphProgress}
  {credentialsMorphProgress}
  {thankYouMorphProgress}
  {heroAnchorEl}
  {aboutAnchorEl}
  {projectsAnchorEl}
  {skillsAnchorEl}
  {credentialsAnchorEl}
  {thankYouAnchorEl}
  {topicBuildProgresses}
  {topicEls}
  topicTexts={TOPIC_TEXTS}
  {beyondEl}
  {beyondBuildProgress}
  {everyLimitEl}
  {everyLimitBuildProgress}
  {projectCardEls}
  {cardsBuildProgress}
  {motiSkillsEl}
  {motiSkillsBuildProgress}
  {skillsArtEl}
  {skillsArtBuildProgress}
  {credentialsStageEl}
  {credentialsBuildProgress}
/>

<!-- ====================================================================== -->
<!-- PAGE 1: HOME SCREEN                                                    -->
<!-- Giant red "aryandas" wordmark that dissolves into tiny 1 & 0 dust      -->
<!-- going down the screen when scrolling to the About page                 -->
<!-- ====================================================================== -->
<section
  id="home-page"
  class="stage-viewport relative z-10 flex h-[100dvh] w-full flex-col justify-end px-4 pb-12 sm:px-8 sm:pb-20 md:pb-24 lg:pb-28"
>
  {#if dustMorphProgress < 0.18}
    <header
      class="pointer-events-none absolute inset-x-0 z-40 mx-auto flex w-full max-w-[1680px] items-center justify-center px-3 sm:px-6"
      style="top: max(0.75rem, env(safe-area-inset-top)); opacity: {Math.max(0, 1 - dustMorphProgress * 6.0).toFixed(3)}; transform: translate3d(0, -{(dustMorphProgress * 36).toFixed(1)}px, 0);"
    >
      <nav
        data-build="navbar"
        data-binary-exclude
        data-exclude-pad-x="42"
        data-exclude-pad-top="24"
        data-exclude-pad-bottom="96"
        aria-label="Primary navigation"
        class="pointer-events-auto flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap sm:gap-3.5 lg:gap-5"
      >
        <div class="flex items-center justify-center gap-1.5 sm:contents">
          {#each NAV_ITEMS.slice(0, 3) as item (item.id)}
            <FluidNavButton
              id={item.id}
              label={item.label}
              active={activeTab === item.id}
              compact={viewportW < 640 || isCarOrShortLandscape}
              onclick={(e) => handleNavClick(item.id, e)}
            />
          {/each}
        </div>
        <div class="flex items-center justify-center gap-1.5 sm:contents">
          {#each NAV_ITEMS.slice(3) as item (item.id)}
            <FluidNavButton
              id={item.id}
              label={item.label}
              active={activeTab === item.id}
              compact={viewportW < 640 || isCarOrShortLandscape}
              onclick={(e) => handleNavClick(item.id, e)}
            />
          {/each}
        </div>
      </nav>
    </header>
  {/if}

  <div class="mx-auto w-full max-w-[1680px]">
    <div
      bind:this={heroAnchorEl}
      data-build="hero-name"
      data-binary-exclude
      data-exclude-pad-x="28"
      data-exclude-pad-top="22"
      data-exclude-pad-bottom="22"
      class="relative inline-block max-w-full"
      style="opacity: {heroSolidOpacity.toFixed(3)};"
    >
      <h1
        class="font-display text-[clamp(2.2rem,min(13.2vw,20dvh),14.5rem)] leading-[0.88] font-extrabold tracking-[-0.055em] text-[#ff261b] select-none break-normal whitespace-nowrap"
      >
        aryandas
      </h1>
    </div>
  </div>
</section>

<!-- ====================================================================== -->
<!-- PAGE 2: ABOUT SCREEN (Stops/Locks at this exact screen for 340vh while -->
<!-- each of the 5 points builds up from the background binary rain dust    -->
<!-- and the 3D cursor points at every point one-by-one before moving on)   -->
<!-- ====================================================================== -->
<section
  id="about-page"
  bind:this={aboutSectionEl}
  class="relative z-10 h-[440vh] w-full"
>
  <div class="stage-viewport sticky top-0 flex h-[100dvh] w-full flex-col justify-between overflow-hidden px-4 pt-5 pb-4 sm:px-10 sm:pt-14 sm:pb-8 lg:pt-20">
    <div class="mx-auto flex h-full w-full max-w-[1680px] flex-col justify-between">
      <!-- TOP-RIGHT RED "about" PAGE TITLE (Destination of the 1 & 0 binary dust) -->
      <div class="flex w-full justify-end">
        <div
          bind:this={aboutAnchorEl}
          data-binary-exclude
          data-exclude-pad-x="24"
          data-exclude-pad-top="14"
          data-exclude-pad-bottom="14"
          class="relative inline-block"
          style="opacity: {aboutTitleSolidOpacity.toFixed(3)};"
        >
          <h2
            class="font-display text-[clamp(2rem,min(7.6vw,12dvh),7.2rem)] leading-[0.86] font-extrabold tracking-[-0.05em] text-[#ff261b] select-none"
          >
            about
          </h2>
        </div>
      </div>

      <!-- MAIN ABOUT CONTENT: 5 Points Built from Binary Dust on Left + Portrait Photo on Right -->
      <div
        class="fold-split-grid my-auto grid w-full items-center {isCarOrShortLandscape
          ? 'grid-cols-12 gap-4'
          : 'grid-cols-1 gap-3 sm:gap-5 md:grid-cols-12 lg:gap-8'}"
      >
        <!-- LEFT / CENTER: Clean Headlines that build one-by-one from background binary rain dust -->
        <div
          class="flex flex-col {isCarOrShortLandscape
            ? 'col-span-7 gap-1'
            : 'gap-1.5 sm:gap-3 md:col-span-7'}"
        >
          {#each ABOUT_TOPICS as topic, idx (topic.id)}
            {@const buildP = topicBuildProgresses[idx] ?? 0}
            {@const isPointed = pointedTopicIdx === idx && buildP > 0.15}
            {@const textOpacity = Math.max(0, Math.min(1, (buildP - 0.34) / 0.52))}
            {@const offsetX = Math.round(topic.baseIndentPx * desktopCursorMargin) + (isPointed ? 8 : 0)}

            <div
              bind:this={topicEls[idx]}
              role="button"
              tabindex="0"
              data-binary-exclude={buildP > 0.72 ? '' : undefined}
              data-exclude-pad-x="16"
              data-exclude-pad-top="6"
              data-exclude-pad-bottom="6"
              onclick={(e) => {
                e.stopPropagation();
                manualTopicIdx = idx;
                pointedTopicIdx = idx;
              }}
              onkeydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  manualTopicIdx = idx;
                  pointedTopicIdx = idx;
                }
              }}
              class="relative cursor-pointer self-start rounded-2xl px-3 py-1 transition-[transform,background-color,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-5 sm:py-2 lg:px-6 lg:py-3 {isPointed
                ? 'border border-[#181816]/15 bg-[#181816]/[0.055]'
                : 'border border-transparent bg-transparent'}"
              style="opacity: {textOpacity.toFixed(3)}; transform: translate3d({offsetX}px, 0, 0);"
            >
              <div
                class="font-display text-[clamp(0.98rem,min(3.2vw,4.5dvh),2.45rem)] leading-[1.12] font-extrabold tracking-[-0.03em] transition-colors duration-300 {isPointed
                  ? 'text-[#181816]'
                  : 'text-[#181816]/62'}"
              >
                {topic.headline}
              </div>
            </div>
          {/each}
        </div>

        <!-- RIGHT PART OF THE SCREEN: Clickable Aryan Das Portrait Photo + GitHub Dark C++ Live Coding Bio -->
        <div
          class="flex flex-col items-center justify-center {isCarOrShortLandscape
            ? 'col-span-5 items-end'
            : 'md:col-span-5 md:items-end'}"
          style="opacity: {aboutPhotoOpacity.toFixed(3)}; transform: translate3d(0, {((1 - aboutPhotoOpacity) * 20).toFixed(1)}px, 0);"
        >
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            data-binary-exclude
            data-exclude-pad-x="24"
            data-exclude-pad-top="20"
            data-exclude-pad-bottom="20"
            onclick={(e) => {
              e.stopPropagation();
              showPhotoBio = !showPhotoBio;
              if (showPhotoBio) {
                cppTypedChars = 0;
              }
            }}
            class="group relative flex w-full cursor-pointer flex-col items-center {isCarOrShortLandscape ? 'items-end' : 'md:items-end'}"
          >
            <div
              class="relative overflow-hidden rounded-[22px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] sm:rounded-[28px] {showPhotoBio
                ? isCarOrShortLandscape
                  ? 'w-full max-w-[68px]'
                  : 'w-full max-w-[74px] sm:max-w-[140px]'
                : isCarOrShortLandscape
                  ? 'w-full max-w-[min(210px,38dvh)]'
                  : 'w-full max-w-[min(170px,42vw)] sm:max-w-[min(250px,34dvh)] md:max-w-[min(320px,46dvh)] lg:max-w-[min(390px,54dvh)]'}"
            >
              <img
                src={`${import.meta.env.BASE_URL}assets/aistudio/newProfile_ec248e2f.png`}
                alt="Aryan Das"
                class="h-auto w-full object-contain transition-transform duration-500 select-none group-hover:scale-[1.02]"
              />
            </div>

            <div
              class="w-full max-w-[520px] overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] {showPhotoBio
                ? 'mt-2 max-h-[54dvh] translate-y-0 opacity-100 sm:mt-3 sm:max-h-[440px]'
                : 'mt-0 max-h-0 -translate-y-2 opacity-0 pointer-events-none'}"
            >
              <!-- GitHub Dark Theme C++ Code Editor Window (Fixed, Zero Scrollbars) -->
              <div
                class="overflow-hidden rounded-xl border border-[#30363d] bg-[#0d1117] text-left shadow-[0_22px_50px_rgba(13,17,23,0.45)]"
              >
                <!-- GitHub Dark Header / Tab Bar -->
                <div
                  class="flex items-center justify-between border-b border-[#30363d] bg-[#161b22] px-3 py-1.5 sm:px-3.5 sm:py-2"
                >
                  <div class="flex items-center gap-2">
                    <span class="h-2.5 w-2.5 rounded-full bg-[#ff5f56]"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]"></span>
                    <span class="h-2.5 w-2.5 rounded-full bg-[#27c93f]"></span>
                    <span class="ml-1.5 font-mono text-[10.5px] font-medium tracking-tight text-[#e6edf3] sm:text-[11px]">
                      aryan_das.cpp
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-[9.5px] text-[#8b949e] sm:text-[10px]">
                      {cppTypedChars < TOTAL_CPP_CHARS ? 'typing...' : 'C++20 · UTF-8'}
                    </span>
                  </div>
                </div>

                <!-- GitHub Dark Code Body (Fixed Wrapping Layout, Zero Vertical or Horizontal Scrollbars) -->
                <div class="overflow-hidden px-2.5 py-2 font-mono text-[clamp(8.5px,2.15vw,11.5px)] leading-[1.38] sm:px-3 sm:py-2.5 sm:text-[11.5px] sm:leading-[1.48]">
                  {#each visibleCppLines as line (line.lineNumber)}
                    <div
                      class="flex items-baseline rounded px-1 {line.isCursorLine
                        ? 'bg-[#161b22]/90'
                        : ''}"
                    >
                      <span
                        class="mr-2 w-4 shrink-0 text-right text-[9.5px] select-none sm:mr-3 sm:w-5 sm:text-[10.5px] {line.isCursorLine
                          ? 'text-[#e6edf3]'
                          : 'text-[#6e7681]'}"
                      >
                        {line.lineNumber}
                      </span>
                      <span class="min-w-0 flex-1 whitespace-pre-wrap break-words">
                        {#each line.tokens as tok, tIdx (tIdx)}
                          <span style="color: {tok.color};">{tok.text}</span>
                        {/each}{#if line.isCursorLine}<span
                            class="ml-[1px] inline-block h-[11px] w-[5.5px] translate-y-[2px] bg-[#58a6ff] animate-pulse sm:h-[13px] sm:w-[6.5px]"
                          ></span>{/if}
                      </span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="h-1"></div>
    </div>
  </div>
</section>

<!-- ====================================================================== -->
<!-- PAGE 3: PROJECTS SCREEN (Pinned stage where cursor points at projects, -->
<!-- then "Beyond" on far left top & "every limit" on far right end build   -->
<!-- from binary rain, followed by the 6 @aryandas079 GitHub Pinned Cards   -->
<!-- in a smooth 3D perspective carousel built from the binary rain)        -->
<!-- ====================================================================== -->
<section
  id="next-page"
  bind:this={nextSectionEl}
  class="relative z-10 h-[560vh] w-full"
>
  <div class="stage-viewport sticky top-0 flex h-[100dvh] w-full flex-col justify-between overflow-hidden px-4 pt-5 pb-4 sm:px-10 sm:pt-12 sm:pb-7 lg:pt-16 lg:pb-10">
    <div class="mx-auto flex h-full w-full max-w-[1680px] flex-col justify-between">
      <!-- TOP ROW: "Beyond" on Far Left Top + Red "projects" Title on Top Right -->
      <div class="flex w-full items-start justify-between gap-4">
        <!-- FAR LEFT TOP: "Beyond" built from binary rain -->
        <div
          bind:this={beyondEl}
          data-binary-exclude={beyondBuildProgress > 0.72 ? '' : undefined}
          data-exclude-pad-x="20"
          data-exclude-pad-top="12"
          data-exclude-pad-bottom="12"
          class="relative inline-block pt-1"
          style="opacity: {Math.max(0, Math.min(1, (beyondBuildProgress - 0.32) / 0.54)).toFixed(3)};"
        >
          <span
            class="font-display text-[clamp(1.65rem,min(6.2vw,9.5dvh),6.4rem)] leading-[0.88] font-extrabold tracking-[-0.05em] text-[#181816] select-none"
          >
            Beyond
          </span>
        </div>

        <!-- TOP RIGHT: Red "projects" Page Title -->
        <div
          bind:this={projectsAnchorEl}
          data-binary-exclude
          data-exclude-pad-x="24"
          data-exclude-pad-top="14"
          data-exclude-pad-bottom="14"
          class="relative inline-block"
          style="opacity: {projectsTitleSolidOpacity.toFixed(3)};"
        >
          <h2
            class="font-display text-[clamp(2rem,min(7.4vw,11dvh),7rem)] leading-[0.86] font-extrabold tracking-[-0.05em] text-[#ff261b] select-none"
          >
            projects
          </h2>
        </div>
      </div>

      <!-- CENTER STAGE: 3D Perspective Rotating Carousel of 6 GitHub Pinned Cards (@aryandas079) -->
      <div class="relative my-auto flex w-full items-center justify-center py-1 sm:py-2">
        <!-- 3D PERSPECTIVE CAROUSEL STAGE (6 GitHub Pinned Cards built from binary rain) -->
        <div
          ontouchstart={handleCarouselTouchStart}
          ontouchend={handleCarouselTouchEnd}
          class="relative z-10 flex w-full touch-pan-y items-center justify-center"
          style="perspective: 1400px; transform-style: preserve-3d; height: {projectCardH + 24}px;"
        >
          {#each githubPins as pin, cIdx (pin.id)}
            {@const rel = cIdx - smoothCardIndex}
            {@const absRel = Math.abs(rel)}
            {@const isCenter = absRel < 0.45}
            {@const cardSolidAlpha = Math.max(0, Math.min(1, (cardsBuildProgress - 0.15) / 0.5))}
            {@const depthOpacity = Math.max(0, 1 - Math.max(0, absRel - 1.15) * 1.2) * cardSolidAlpha}
            {@const tx = rel * cardSpreadX}
            {@const ty = absRel * 8}
            {@const tz = -absRel * cardSpreadZ + (isCenter ? 32 : 0)}
            {@const rotY = Math.max(-48, Math.min(48, rel * -40)) + (isCenter ? -3.2 : 0)}
            {@const rotZ = isCenter ? -1.4 + rel * 1.2 : rel * 1.8}
            {@const scaleVal = Math.max(0.74, 1 - absRel * 0.14)}
            {@const zOrder = 30 - Math.round(absRel * 10)}

            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              bind:this={projectCardEls[cIdx]}
              data-binary-exclude={cardsBuildProgress > 0.72 && absRel < 1.3 ? '' : undefined}
              data-exclude-pad-x="36"
              data-exclude-pad-top="32"
              data-exclude-pad-bottom="85"
              onpointerenter={(e) => {
                hoveredCardIdx = cIdx;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                cardPointerNormX = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
                cardPointerNormY = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
              }}
              onpointermove={(e) => {
                hoveredCardIdx = cIdx;
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                cardPointerNormX = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
                cardPointerNormY = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
              }}
              onpointerleave={() => {
                if (hoveredCardIdx === cIdx) hoveredCardIdx = null;
              }}
              onclick={(e) => {
                if (!isCenter) {
                  e.stopPropagation();
                  manualCardIndex = cIdx;
                  return;
                }
                openCardFocusView(cIdx, e);
              }}
              class="group absolute flex cursor-pointer flex-col justify-between overflow-visible rounded-[24px] p-5 text-left will-change-transform select-none sm:rounded-[28px] sm:p-7 lg:p-8 text-[#f5f5f2]"
              style="width: {projectCardW}px; height: {projectCardH}px; z-index: {zOrder}; opacity: {depthOpacity.toFixed(3)}; transform: translate3d({tx.toFixed(1)}px, {ty.toFixed(1)}px, {tz.toFixed(1)}px) rotateY({rotY.toFixed(2)}deg) rotateZ({rotZ.toFixed(2)}deg) scale({scaleVal.toFixed(3)}); pointer-events: {depthOpacity > 0.15 ? 'auto' : 'none'};"
            >
              <!-- INTERACTIVE BINARY SHOWER HOVER EFFECT AROUND EACH CARD -->
              <FerroFluidCardDrips
                id={pin.id}
                {isCenter}
                isHovered={hoveredCardIdx === cIdx}
                isVisible={cardsBuildProgress > 0.08 && depthOpacity > 0.05 && focusedCardIdx === null}
                pointerNormX={hoveredCardIdx === cIdx ? cardPointerNormX : 0}
                pointerNormY={hoveredCardIdx === cIdx ? cardPointerNormY : 0}
              />

              <!-- Inner Rounded Surface Mask for Gloss & Subtle Monochrome Light -->
              <div class="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px] border border-white/15 sm:rounded-[28px]">
                <div
                  class="pointer-events-none absolute inset-0 opacity-95 transition-opacity duration-500 group-hover:opacity-100"
                  style="background: {pin.glowGradient};"
                ></div>

                <div
                  class="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.01)_45%,rgba(0,0,0,0.22)_100%)]"
                ></div>
              </div>

              <!-- NEAT & CLEAN TOP BAR: Language Pill on Left + @aryandas079 on Right -->
              <div class="relative z-10 flex min-w-0 max-w-full items-center justify-between gap-2">
                <span
                  class="inline-flex min-w-0 items-center gap-1.5 truncate rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-[10.5px] font-medium text-white/95 backdrop-blur-md sm:text-[11px]"
                >
                  <span
                    class="h-2 w-2 shrink-0 rounded-full"
                    style="background-color: {pin.langColor};"
                  ></span>
                  <span class="truncate">{pin.language}</span>
                  {#if pin.stars > 0}
                    <span class="shrink-0 text-white/60">· ★ {pin.stars}</span>
                  {/if}
                </span>

                <span class="shrink-0 font-mono text-[10.5px] font-semibold tracking-tight text-white/75 sm:text-[11px]">
                  @aryandas079
                </span>
              </div>

              <!-- NEAT & CLEAN BOTTOM SECTION: Bold Repo Title + Live GitHub Description -->
              <div class="relative z-10 mt-auto flex min-w-0 max-w-full flex-col gap-2 overflow-hidden sm:gap-2.5">
                <h3
                  class="w-full break-words [overflow-wrap:anywhere] font-display leading-[1.12] font-extrabold tracking-[-0.035em] text-white {pin.repoName.length > 15
                    ? 'text-[1.15rem] sm:text-[1.46rem]'
                    : 'text-[1.35rem] sm:text-[1.84rem]'}"
                >
                  {pin.repoName.replace(/_/g, '_\u200B')}
                </h3>

                <p class="line-clamp-3 w-full break-words font-sans text-xs leading-relaxed text-white/75 sm:text-[13.5px]">
                  {pin.description}
                </p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- BOTTOM ROW: Centered Ferrofluid "View all projects" Button + "every limit" at Bottom-Right End -->
      <div
        class="relative z-20 flex w-full items-center justify-between gap-2 {isCarOrShortLandscape
          ? 'flex-row items-end gap-3'
          : 'flex-col-reverse md:flex-row md:items-end md:gap-4'}"
      >
        <!-- Left spacer for balanced symmetry -->
        <div class="hidden flex-1 lg:block"></div>

        <!-- Center: 6-Card Selector Dots + Ferrofluid "View all projects" Button -->
        <div
          class="flex flex-col items-center justify-center gap-1.5 sm:gap-3"
          style="opacity: {Math.max(0, Math.min(1, (cardsBuildProgress - 0.45) / 0.5)).toFixed(3)};"
        >
          <div class="flex items-center gap-1">
            {#each githubPins as pin, dotIdx (pin.id)}
              {@const isActiveDot = Math.round(smoothCardIndex) === dotIdx}
              <button
                type="button"
                aria-label="Select {pin.repoName}"
                onclick={(e) => {
                  e.stopPropagation();
                  manualCardIndex = dotIdx;
                }}
                class="flex min-h-[28px] cursor-pointer items-center justify-center px-1"
              >
                <span
                  class="block h-2 rounded-full transition-all duration-300 {isActiveDot
                    ? 'w-7 bg-[#ff261b]'
                    : 'w-2 bg-[#181816]/25 hover:bg-[#181816]/50'}"
                ></span>
              </button>
            {/each}
          </div>

          <div
            data-binary-exclude={cardsBuildProgress > 0.75 ? '' : undefined}
            data-exclude-pad-x="36"
            data-exclude-pad-top="18"
            data-exclude-pad-bottom="75"
          >
            <FluidNavButton
              id="view-all-projects"
              label="View all projects"
              compact={viewportW < 640 || isCarOrShortLandscape}
              onclick={(e) => {
                e.stopPropagation();
                const anchor = document.createElement('a');
                anchor.href = 'https://github.com/aryandas079?tab=repositories';
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.click();
              }}
            />
          </div>
        </div>

        <!-- FAR RIGHT BOTTOM END OF THE SCREEN: "every limit" built from binary rain (matching "Beyond" position) -->
        <div class="flex {isCarOrShortLandscape ? 'flex-1' : 'w-full md:flex-1'} justify-end">
          <div
            bind:this={everyLimitEl}
            data-binary-exclude={everyLimitBuildProgress > 0.72 ? '' : undefined}
            data-exclude-pad-x="20"
            data-exclude-pad-top="12"
            data-exclude-pad-bottom="12"
            class="relative inline-block pb-0.5 text-right sm:pb-1"
            style="opacity: {Math.max(0, Math.min(1, (everyLimitBuildProgress - 0.32) / 0.54)).toFixed(3)};"
          >
            <span
              class="font-display text-[clamp(1.65rem,min(6.2vw,9.5dvh),6.4rem)] leading-[0.88] font-extrabold tracking-[-0.05em] text-[#181816] select-none"
            >
              every limit
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ====================================================================== -->
<!-- PAGE 4: SKILLS SCREEN                                                  -->
<!-- - Top-right "skills" title written from binary dust like "projects"    -->
<!-- - Stage 1 (At first): Sculpted 3D Black & White "Moti" Clay Writing    -->
<!--   (SKI / LLS) built from the binary rain                               -->
<!-- - Stage 2 (On scrolling): Transitions like About — Creative Skills     -->
<!--   Matrix on the LEFT of the screen built from binary rain +            -->
<!--   Black & White Horizontal Scanline Artwork on the RIGHT               -->
<!-- ====================================================================== -->
<section
  id="skills-page"
  bind:this={skillsSectionEl}
  class="relative z-10 h-[520vh] w-full"
>
  <div class="stage-viewport sticky top-0 flex h-[100dvh] w-full flex-col justify-between overflow-hidden px-4 pt-5 pb-4 sm:px-10 sm:pt-12 sm:pb-7">
    <div class="mx-auto flex h-full w-full max-w-[1680px] flex-col justify-between">
      <!-- TOP-RIGHT RED "skills" PAGE TITLE (Written the exact same way as "projects" & "about" from 1 & 0 binary dust) -->
      <div class="flex w-full justify-end">
        <div
          bind:this={skillsAnchorEl}
          data-binary-exclude
          data-exclude-pad-x="24"
          data-exclude-pad-top="14"
          data-exclude-pad-bottom="14"
          class="relative inline-block"
          style="opacity: {skillsTitleSolidOpacity.toFixed(3)};"
        >
          <h2
            class="font-display text-[clamp(2rem,min(7.4vw,11dvh),7rem)] leading-[0.86] font-extrabold tracking-[-0.05em] text-[#ff261b] select-none"
          >
            skills
          </h2>
        </div>
      </div>

      <!-- MAIN SKILLS STAGE -->
      <div class="relative my-auto flex w-full items-center justify-center">
        <!-- STAGE 1 (AT FIRST): Black & White Sculpted 3D Clay "Moti Writing" (SKI / LLS) — unmounts strictly before Stage 2 -->
        {#if motiSkillsDissolveProgress < 0.99 && skillsArtBuildProgress < 0.05}
          <div
            bind:this={motiSkillsEl}
            data-binary-exclude={motiSkillsBuildProgress > 0.68 && motiSkillsDissolveProgress < 0.35 ? '' : undefined}
            data-exclude-pad-x="36"
            data-exclude-pad-top="28"
            data-exclude-pad-bottom="28"
            class="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center"
          >
            <MotiClaySkillsWord
              buildProgress={motiSkillsBuildProgress}
              dissolveProgress={motiSkillsDissolveProgress}
            />
          </div>
        {/if}

        <!-- STAGE 2 (ON SCROLLING): Clean Vertical Scrolling Tech Stack Drum + Show GitHub Stats Button on LEFT + Large Schrödinger's Cat / 0-1 Logo / GitHub Stats Frame on RIGHT -->
        <div
          class="fold-split-grid grid w-full items-center {isCarOrShortLandscape
            ? 'grid-cols-12 gap-4'
            : 'grid-cols-1 gap-3 sm:gap-5 md:grid-cols-12 lg:gap-8'}"
          style="pointer-events: {skillsDrumAlpha > 0.15 ? 'auto' : 'none'};"
        >
          <!-- LEFT OF THE SCREEN: Vertical Scrolling Skills Typography Drum + Show GitHub Stats Button Below -->
          <div
            class="relative flex flex-col items-start justify-center {isCarOrShortLandscape
              ? 'col-span-5 gap-2'
              : 'gap-2.5 sm:gap-4 md:col-span-5'}"
            style="opacity: {skillsDrumAlpha.toFixed(3)}; transform: translate3d(0, {((1 - skillsDrumAlpha) * 20).toFixed(1)}px, 0);"
          >
            <div
              data-binary-exclude={skillsArtBuildProgress > 0.68 ? '' : undefined}
              data-exclude-pad-x="36"
              data-exclude-pad-top="24"
              data-exclude-pad-bottom="24"
              class="relative w-full max-w-[540px] overflow-hidden select-none"
              style="height: {drumHeight}px;"
            >
              <!-- Invisible center fallback anchor aligned to the active skill headline -->
              <div
                bind:this={skillDrumCenterEl}
                aria-hidden="true"
                class="pointer-events-none absolute top-1/2 h-12 w-56 -translate-y-1/2"
                style="left: {Math.round(160 * desktopCursorMargin)}px;"
              ></div>

              {#each TECH_STACK_SKILLS as skill, sIdx (skill.id)}
                {@const rel = sIdx - smoothSkillIndex}
                {@const absRel = Math.abs(rel)}
                {#if absRel <= 3.6}
                  {@const yOffset = rel * drumStepY}
                  {@const baseDrumIndent = Math.round(156 * desktopCursorMargin)}
                  {@const curveX = Math.max(8, baseDrumIndent - Math.min(28, absRel * absRel * 2.2) + (absRel < 0.45 ? 16 : 0))}
                  {@const itemOpacity = Math.max(0, 1 - absRel * 0.255)}
                  {@const itemScale = Math.max(0.84, 1 - absRel * 0.045)}
                  {@const isCentered = sIdx === activeSkillDrumIdx}
                  {@const isClickedSelected = selectedTechSkill?.id === skill.id}
                  <button
                    bind:this={skillItemEls[sIdx]}
                    type="button"
                    onclick={(e) => selectSkillFromDrum(sIdx, e)}
                    class="group absolute top-1/2 left-0 flex -translate-y-1/2 cursor-pointer items-center gap-2 text-left transition-colors duration-200 sm:gap-3.5"
                    style="opacity: {itemOpacity.toFixed(3)}; transform: translate3d({curveX.toFixed(1)}px, {yOffset.toFixed(1)}px, 0) scale({itemScale.toFixed(3)}); transform-origin: left center;"
                  >
                    <!-- Three-dot active indicator -->
                    <span
                      class="flex w-5 shrink-0 items-center justify-end gap-[3px] transition-opacity duration-200 sm:w-7"
                      style="opacity: {isCentered ? 1 : 0};"
                    >
                      <span class="h-[4px] w-[4px] rounded-full sm:h-[4.5px] sm:w-[4.5px] {isClickedSelected ? 'bg-[#ff261b]' : 'bg-[#181816]'}"></span>
                      <span class="h-[5px] w-[5px] -translate-y-[1.5px] rounded-full sm:h-[5.5px] sm:w-[5.5px] {isClickedSelected ? 'bg-[#ff261b]' : 'bg-[#181816]'}"></span>
                      <span class="h-[4px] w-[4px] rounded-full sm:h-[4.5px] sm:w-[4.5px] {isClickedSelected ? 'bg-[#ff261b]' : 'bg-[#181816]'}"></span>
                    </span>

                    <span
                      class="font-display text-[clamp(1.2rem,min(4.2vw,4.8dvh),2.7rem)] leading-none font-extrabold tracking-[-0.04em] transition-colors duration-200 {isClickedSelected
                        ? 'text-[#ff261b]'
                        : isCentered
                          ? 'text-[#181816]'
                          : 'text-[#181816]/80 group-hover:text-[#181816]'}"
                    >
                      {skill.name}
                    </span>
                  </button>
                {/if}
              {/each}
            </div>

            <!-- Show GitHub Stats Button directly beneath the Skills drum (red-marked region) -->
            <div
              data-binary-exclude={skillsArtBuildProgress > 0.68 ? '' : undefined}
              data-exclude-pad-x="36"
              data-exclude-pad-top="18"
              data-exclude-pad-bottom="75"
              class="relative z-20 pt-0.5 sm:pt-1"
              style="padding-left: {Math.max(8, Math.round(156 * desktopCursorMargin))}px;"
            >
              <FluidNavButton
                id="show-github-stats"
                label="Show GitHub Stats"
                compact={viewportW < 640 || isCarOrShortLandscape}
                onclick={handleOpenGithubStats}
              />
            </div>
          </div>

          <!-- RIGHTMOST PART OF THE SCREEN (Aligned flush with the right edge of the "skills" title above it) -->
          <div
            bind:this={skillsArtEl}
            class="flex w-full flex-col items-center justify-center {isCarOrShortLandscape
              ? 'col-span-7 items-end'
              : 'md:col-span-7 md:items-end lg:-mt-2'}"
          >
            <BinaryScanlineCatArt
              buildProgress={skillsArtBuildProgress}
              selectedSkill={selectedTechSkill}
              activeHoverSkillName={TECH_STACK_SKILLS[activeSkillDrumIdx]?.name ?? 'C++'}
              {githubStatsOpen}
              {githubStatsTriggerToken}
              onResetToCat={() => {
                selectedTechSkill = null;
              }}
              onCloseGithubStats={() => {
                githubStatsOpen = false;
              }}
              onclick={(e) => {
                e.stopPropagation();
              }}
            />
          </div>
        </div>
      </div>

      <div class="h-1"></div>
    </div>
  </div>
</section>

<!-- ====================================================================== -->
<!-- PAGE 5: CREDENTIALS SCREEN (PURE WHITE + SIMPLIFIED 2D NEURAL NETWORK) -->
<!-- - Top-left red "credentials" title + clean minimal 2D neural graph     -->
<!-- ====================================================================== -->
<section
  id="credentials-page"
  bind:this={credentialsSectionEl}
  class="relative z-10 h-[230vh] w-full bg-[#FFFFFF] text-[#141412]"
>
  <div class="sticky top-0 flex h-[100dvh] w-full flex-col overflow-hidden bg-[#FFFFFF]">
    <!-- TOP-LEFT RED "credentials" PAGE TITLE (Written from 1 & 0 binary dust & pointed by 3D cursor) -->
    <div
      class="pointer-events-none relative z-30 mx-auto flex w-full max-w-[1680px] justify-start px-4 sm:px-10"
      style="padding-top: max(1.25rem, env(safe-area-inset-top), var(--tv-overscan-y)); padding-left: max(1rem, env(safe-area-inset-left), var(--tv-overscan-x));"
    >
      <div
        bind:this={credentialsAnchorEl}
        data-binary-exclude
        data-exclude-pad-x="24"
        data-exclude-pad-top="14"
        data-exclude-pad-bottom="14"
        class="relative inline-block"
        style="opacity: {credentialsTitleSolidOpacity.toFixed(3)};"
      >
        <h2
          class="font-display text-[clamp(1.9rem,min(7vw,11dvh),6.6rem)] leading-[0.86] font-extrabold tracking-[-0.05em] text-[#ff261b] select-none"
        >
          credentials
        </h2>
      </div>
    </div>

    <!-- FULL-SCREEN SIMPLIFIED WHITE 2D NEURAL NETWORK CREDENTIALS STAGE -->
    <div
      bind:this={credentialsStageEl}
      class="absolute inset-0 z-10 h-full w-full"
    >
      <NeuralCredentialsStage
        buildProgress={credentialsBuildProgress}
        onNodeInteract={handleNeuralNodeInteract}
      />
    </div>
  </div>
</section>

<!-- ====================================================================== -->
<!-- PAGE 6: CONNECT FINALE SCREEN (Black, White & Red Swiss Poster)        -->
<!-- - Single top-left 00 CONNECT button (pops C++ coding animation + links -->
<!--   + 3D Cluster Topology explorer) + monumental red 'ad' monogram       -->
<!-- ====================================================================== -->
<section
  id="connect-page"
  bind:this={connectSectionEl}
  class="relative z-25 h-[180vh] w-full"
>
  <div class="sticky top-0 h-[100dvh] w-full overflow-hidden">
    <ThankYouFinaleStage
      buildProgress={thankYouBuildProgress}
      bind:anchorEl={thankYouAnchorEl}
      bind:connectButtonEl={connectButtonEl}
      bind:sayHiOpen={sayHiModalOpen}
    />
  </div>
</section>

<!-- ====================================================================== -->
<!-- FOCUS VIEW MODAL: Pure Black & White GSAP 3D Card Flip                 -->
<!-- First View (Full Card Height): Title, Description & "View Project"     -->
<!-- Scroll Down: Reveals Full Clean Black & White Project README           -->
<!-- ====================================================================== -->
{#if focusedPin}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={focusBackdropEl}
    onclick={closeCardFocusView}
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/84 p-2.5 sm:p-6"
    style="opacity: 0;"
  >
    <div
      onclick={(e) => e.stopPropagation()}
      class="relative h-[88dvh] max-h-[760px] w-full max-w-[min(860px,94vw)]"
      style="perspective: 2200px;"
    >
      <!-- GSAP 3D Flipping Card Container (0deg Front -> 180deg Back) -->
      <div
        bind:this={focusFlipStageEl}
        class="relative h-full w-full will-change-transform"
        style="transform-style: preserve-3d; transform: rotateY(0deg);"
      >
        <!-- FRONT FACE (Visible during the first half of the GSAP 3D flip) -->
        <div
          class="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-[28px] border border-white/15 bg-[#0a0a0a] p-8 text-left text-white shadow-[0_36px_90px_rgba(0,0,0,0.85)] sm:p-10"
          style="backface-visibility: hidden; -webkit-backface-visibility: hidden;"
        >
          <div class="relative z-10 flex items-center justify-between">
            <span class="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-1 font-mono text-xs font-medium text-white">
              <span class="h-2 w-2 rounded-full bg-white"></span>
              <span>{focusedPin.language}</span>
            </span>
            <span class="font-mono text-xs font-semibold text-white/75">@aryandas079</span>
          </div>
          <div class="relative z-10 mt-auto min-w-0 max-w-full">
            <h3 class="w-full break-words [overflow-wrap:anywhere] font-display text-3xl leading-[1.08] font-extrabold tracking-tight text-white sm:text-4xl">
              {focusedPin.repoName.replace(/_/g, '_\u200B')}
            </h3>
            <p class="mt-3 max-w-lg break-words font-sans text-sm leading-relaxed text-white/75">
              {focusedPin.description}
            </p>
          </div>
        </div>

        <!-- BACK FACE (Flipped 180° Focus View — Pure Black & White, Zero Clutter) -->
        <div
          bind:this={focusScrollContainer}
          onscroll={handleFocusScroll}
          class="focus-scroll-pane absolute inset-0 overflow-y-auto scroll-smooth rounded-[28px] border border-white/18 bg-[#0a0a0a] text-left text-white shadow-[0_36px_100px_rgba(0,0,0,0.92)]"
          style="backface-visibility: hidden; -webkit-backface-visibility: hidden; transform: rotateY(180deg);"
        >
          <!-- Top-Right Ferro-Fluid Close Button -->
          <div class="sticky top-0 z-30 flex justify-end p-5 pointer-events-none">
            <div class="pointer-events-auto">
              <FluidNavButton
                id="focus-close-btn"
                label="Close"
                compact={true}
                lightRim={true}
                onclick={(e) => {
                  e.stopPropagation();
                  closeCardFocusView();
                }}
              />
            </div>
          </div>

          <!-- STAGE 1 (100% Full Initial View): Clean Title, Description & Black-and-White "View Project" Button -->
          <div class="-mt-21 flex min-h-full flex-col items-center justify-center px-7 py-14 text-center sm:px-14">
            <div
              bind:this={focusHeroStageEl}
              class="flex w-full max-w-full flex-col items-center will-change-transform"
            >
              <h3 class="w-full max-w-full break-words [overflow-wrap:anywhere] font-display text-3xl leading-[1.06] font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
                {focusedPin.repoName.replace(/_/g, '_\u200B')}
              </h3>

              <p class="mt-5 max-w-[520px] break-words font-sans text-sm leading-relaxed text-white/75 sm:text-base">
                {focusedPin.description}
              </p>

              <!-- Pure Black & White "View Project" Button -->
              <div
                bind:this={focusViewBtnEl}
                class="mt-9 flex items-center justify-center will-change-transform"
              >
                <a
                  href={focusedPin.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-3.5 font-sans text-sm font-bold tracking-tight text-[#0a0a0a] transition-all duration-200 hover:scale-[1.03] hover:bg-white/90"
                >
                  <span>View Project</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          </div>

          <!-- STAGE 2 (Appears ONLY When Scrolled Down with Smooth GSAP Slide-Up): Clean Black & White Project README -->
          <div
            bind:this={focusReadmeContainerEl}
            class="border-t border-white/12 bg-[#0a0a0a] px-6 py-10 text-white will-change-transform sm:px-12 sm:py-12"
            style="opacity: 0; transform: translate3d(0, 42px, 0); pointer-events: {readmeRevealOpacity > 0.08 ? 'auto' : 'none'};"
          >
            <div class="gh-readme-body">
              {@html focusedReadmeHtml}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Hide native scrollbar inside Focus View for a clean editorial feel */
  :global(.focus-scroll-pane) {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  :global(.focus-scroll-pane::-webkit-scrollbar) {
    display: none;
  }

  :global(.gh-readme-body),
  :global(.gh-readme-body *) {
    font-family: var(
      --font-mono,
      'JetBrains Mono',
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      monospace
    );
  }

  :global(.gh-readme-body) {
    color: #f5f5f2;
    line-height: 1.72;
    font-size: 0.865rem;
    letter-spacing: -0.01em;
  }

  :global(.gh-readme-body div[align='center']),
  :global(.gh-readme-body p[align='center']),
  :global(.gh-readme-body h1[align='center']),
  :global(.gh-readme-body h2[align='center']),
  :global(.gh-readme-body h3[align='center']) {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  :global(.gh-readme-body div[align='center'] > p),
  :global(.gh-readme-body p[align='center']) {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.45rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }

  :global(.gh-readme-body h1) {
    font-size: 1.55rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #ffffff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    padding-bottom: 0.65rem;
    margin-top: 0.75rem;
    margin-bottom: 1rem;
    width: 100%;
  }

  :global(.gh-readme-body h2) {
    font-size: 1.18rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #ffffff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    padding-bottom: 0.45rem;
    margin-top: 1.75rem;
    margin-bottom: 0.85rem;
    width: 100%;
  }

  :global(.gh-readme-body h3),
  :global(.gh-readme-body h4) {
    font-size: 0.98rem;
    font-weight: 700;
    color: #ffffff;
    margin-top: 0.65rem;
    margin-bottom: 0.65rem;
  }

  :global(.gh-readme-body p) {
    color: rgba(255, 255, 255, 0.8);
    margin-top: 0.55rem;
    margin-bottom: 0.75rem;
  }

  :global(.gh-readme-body a),
  :global(.gh-readme-body .gh-readme-link) {
    color: #ff261b;
    text-decoration: underline;
    text-decoration-color: rgba(255, 38, 27, 0.45);
    text-underline-offset: 3px;
    font-weight: 600;
    transition:
      color 0.2s ease,
      text-decoration-color 0.2s ease;
  }

  :global(.gh-readme-body a:hover),
  :global(.gh-readme-body .gh-readme-link:hover) {
    color: #ff473d;
    text-decoration-color: #ff261b;
  }

  :global(.gh-readme-body img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    display: inline-block;
    filter: grayscale(1) contrast(1.06);
  }

  :global(.gh-readme-body ul),
  :global(.gh-readme-body ol) {
    margin-top: 0.5rem;
    margin-bottom: 1rem;
    padding-left: 1.4rem;
    color: rgba(255, 255, 255, 0.8);
  }

  :global(.gh-readme-body ul) {
    list-style-type: disc;
  }

  :global(.gh-readme-body ol) {
    list-style-type: decimal;
  }

  :global(.gh-readme-body li) {
    margin-bottom: 0.45rem;
  }

  :global(.gh-readme-body li strong) {
    color: #ffffff;
  }

  :global(.gh-readme-body code) {
    font-size: 0.81rem;
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    padding: 0.15rem 0.4rem;
    border-radius: 5px;
  }

  :global(.gh-readme-body .gh-code-block) {
    margin-top: 0.9rem;
    margin-bottom: 1.15rem;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: #121212;
    overflow: hidden;
  }

  :global(.gh-readme-body .gh-code-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0.85rem;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 700;
  }

  :global(.gh-readme-body .gh-code-block pre) {
    margin: 0;
    padding: 0.95rem 1.1rem;
    overflow-x: auto;
  }

  :global(.gh-readme-body .gh-code-block code) {
    background: transparent;
    padding: 0;
    color: #ffffff;
    font-size: 0.8rem;
    line-height: 1.65;
  }

  :global(.gh-readme-body blockquote) {
    border-left: 3px solid #ffffff;
    padding-left: 1rem;
    margin: 0.9rem 0;
    color: rgba(255, 255, 255, 0.65);
    font-style: italic;
  }

  :global(.gh-readme-body hr) {
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    margin: 1.5rem 0;
    width: 100%;
  }

  :global(.gh-readme-body .gh-table-wrap) {
    overflow-x: auto;
    margin: 1rem 0;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  :global(.gh-readme-body table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  :global(.gh-readme-body th),
  :global(.gh-readme-body td) {
    padding: 0.6rem 0.85rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    text-align: left;
  }

  :global(.gh-readme-body th) {
    background: rgba(255, 255, 255, 0.06);
    color: #ffffff;
    font-weight: 700;
  }
</style>
