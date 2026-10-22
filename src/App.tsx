/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useMotionValue,
} from 'motion/react';
import { ExternalLink, Check, Copy, X, Sun, Moon } from 'lucide-react';
import { PROFILE } from './data/portfolioData';
import { CutoutPortrait } from './components/HeroBlobPortrait';
import {
  TransparentLogoImage,
  LinkedInLogo,
  InstagramLogo,
  GitHubLogo,
  XLogo,
  DiscordLogo,
  MailLogo,
  LanguageGlyphIcon,
  OrcidLogo,
} from './components/FooterIcons';
import { ALL_SKILLS, SkillItem } from './components/SkillIcons';
import { ProjectsRoadmap } from './components/ProjectsRoadmap';
import { CredentialsSection } from './components/CredentialsSection';
import { SlicedNameRoller } from './components/SlicedNameRoller';
import { SpecialtyRoller } from './components/SpecialtyRoller';

const HERO_IMAGE_PATH = '/assets/aistudio/image_549e2055.png';
const NIT_SILCHAR_LOGO_PATH = '/assets/aistudio/image_3a90b951.png';
const GURUCHARAN_LOGO_PATH = '/assets/aistudio/image_8fe961f3.png';

type FooterPopoutId = 'mail' | 'nits' | 'gcc' | 'languages' | null;

const DOCK_CONTAINER_VARIANTS = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.018,
      delayChildren: 0,
    },
  },
};

const DOCK_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 10, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 520,
      damping: 30,
      mass: 0.4,
    },
  },
};

const SKILLS_STAGE_VARIANTS = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.01,
      delayChildren: 0,
    },
  },
};

const SKILL_CAPSULE_VARIANTS = {
  hidden: { opacity: 0, y: 10, scale: 0.92 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 540,
      damping: 32,
      mass: 0.4,
    },
  },
};

// Segregated skill categories (27 skills total, Canva removed)
const SKILLS_PROGRAMMING_LANGUAGES: SkillItem[] = ALL_SKILLS.slice(0, 7); // C, C++, C#, Python, Kotlin, JavaScript, TypeScript
const SKILLS_WEB_AND_DB: SkillItem[] = [
  ...ALL_SKILLS.slice(7, 10), // HTML5, CSS3, TailwindCSS
  ALL_SKILLS[21], // PostgreSQL
];
const SKILLS_FRAMEWORKS: SkillItem[] = ALL_SKILLS.slice(10, 14); // Node.js, Express.js, React, Next.js
const SKILLS_PYTHON_LIBRARIES: SkillItem[] = ALL_SKILLS.slice(14, 21); // PyTorch, NumPy, Pandas, Matplotlib, Seaborn, SciPy, Scikit-Learn
const SKILLS_TOOLS: SkillItem[] = ALL_SKILLS.slice(22, 25); // Git, GitHub, VS Code
const SKILLS_DESIGN_TOOLS: SkillItem[] = ALL_SKILLS.slice(25, 29); // Photoshop, Lightroom, Premiere Pro, Figma

export default function App() {
  // Light theme is the default; only switches when the theme toggle button is clicked
  const [isDark, setIsDark] = useState<boolean>(false);

  // Page 2 state: whether the left-half "Skills" button is expanded to consume the full page
  const [isSkillsOpen, setIsSkillsOpen] = useState<boolean>(false);
  const [activeSkill, setActiveSkill] = useState<SkillItem | null>(null);

  // Single active pop-out state for the horizontal footer icon bar
  const [activePopout, setActivePopout] = useState<FooterPopoutId>(null);
  const [copiedDiscord, setCopiedDiscord] = useState<boolean>(false);

  // Custom Tailless Black Triangular Cursor state (Calibrated to 90% of Maximum Sensitivity)
  const MOUSE_SENSITIVITY = 0.9;
  const SCROLL_SENSITIVITY = 0.9;

  const [cursorVisible, setCursorVisible] = useState<boolean>(false);
  const [cursorPressed, setCursorPressed] = useState<boolean>(false);
  const cursorVisibleRef = useRef<boolean>(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const smoothCursorX = useSpring(cursorX, {
    stiffness: 2200 * MOUSE_SENSITIVITY,
    damping: 54,
    mass: 0.11,
    restDelta: 0.01,
  });
  const smoothCursorY = useSpring(cursorY, {
    stiffness: 2200 * MOUSE_SENSITIVITY,
    damping: 54,
    mass: 0.11,
    restDelta: 0.01,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPhysicsRef = useRef<{
    targetY: number;
    currentY: number;
    rafId: number | null;
    isAnimating: boolean;
  }>({
    targetY: 0,
    currentY: 0,
    rafId: null,
    isAnimating: false,
  });

  // Smooth spring-damped scroll progress across the continuous webpage
  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
  });

  const smoothScrollProgress = useSpring(scrollYProgress, {
    stiffness: 340,
    damping: 34,
    mass: 0.22,
    restDelta: 0.0005,
  });

  // Ultra-smooth continuous scrolling calibrated to 90% of maximum sensitivity
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const state = scrollPhysicsRef.current;
    state.currentY = container.scrollTop;
    state.targetY = container.scrollTop;

    const stepScroll = () => {
      const maxScroll = Math.max(
        0,
        container.scrollHeight - container.clientHeight
      );
      state.targetY = Math.max(0, Math.min(maxScroll, state.targetY));

      const diff = state.targetY - state.currentY;
      if (Math.abs(diff) > 0.35) {
        // High-responsiveness glide (90% sensitivity feel)
        state.currentY += diff * 0.34;
        container.scrollTop = state.currentY;
        state.rafId = requestAnimationFrame(stepScroll);
      } else {
        state.currentY = state.targetY;
        container.scrollTop = state.targetY;
        state.isAnimating = false;
        state.rafId = null;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Allow nested scrollable overlays (like full-page Skills modal on small screens) to scroll natively
      const targetEl = e.target as HTMLElement | null;
      if (targetEl) {
        const nestedScrollable = targetEl.closest('[data-nested-scroll="true"]');
        if (
          nestedScrollable &&
          nestedScrollable.scrollHeight > nestedScrollable.clientHeight
        ) {
          return;
        }
      }

      e.preventDefault();

      // Normalize wheel delta across pixel/line/page modes and apply 90% maximum sensitivity
      const rawDelta =
        e.deltaMode === 1
          ? e.deltaY * 36
          : e.deltaMode === 2
          ? e.deltaY * window.innerHeight * 0.85
          : e.deltaY;

      const maxScroll = Math.max(
        0,
        container.scrollHeight - container.clientHeight
      );

      if (!state.isAnimating) {
        state.currentY = container.scrollTop;
        state.targetY = container.scrollTop;
      }

      state.targetY = Math.max(
        0,
        Math.min(maxScroll, state.targetY + rawDelta * SCROLL_SENSITIVITY)
      );

      if (!state.isAnimating) {
        state.isAnimating = true;
        state.rafId = requestAnimationFrame(stepScroll);
      }
    };

    const handleNativeScroll = () => {
      if (!state.isAnimating) {
        state.currentY = container.scrollTop;
        state.targetY = container.scrollTop;
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('scroll', handleNativeScroll, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('scroll', handleNativeScroll);
      if (state.rafId !== null) {
        cancelAnimationFrame(state.rafId);
        state.rafId = null;
      }
      state.isAnimating = false;
    };
  }, [SCROLL_SENSITIVITY]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (!cursorVisibleRef.current) {
        cursorVisibleRef.current = true;
        cursorX.jump(e.clientX);
        cursorY.jump(e.clientY);
        smoothCursorX.jump(e.clientX);
        smoothCursorY.jump(e.clientY);
        setCursorVisible(true);
      } else {
        cursorX.set(e.clientX);
        cursorY.set(e.clientY);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      setCursorPressed(true);
    };
    const handlePointerUp = () => setCursorPressed(false);
    const handleMouseLeave = () => {
      cursorVisibleRef.current = false;
      setCursorVisible(false);
    };
    const handleMouseEnter = () => {
      cursorVisibleRef.current = true;
      setCursorVisible(true);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [cursorX, cursorY, smoothCursorX, smoothCursorY]);

  const scrollToNextSection = () => {
    const container = scrollContainerRef.current;
    const nextEl = document.getElementById('white-section');
    if (container && nextEl) {
      const state = scrollPhysicsRef.current;
      state.currentY = container.scrollTop;
      state.targetY = nextEl.offsetTop;
      if (!state.isAnimating) {
        state.isAnimating = true;
        const animateToSection = () => {
          const diff = state.targetY - state.currentY;
          if (Math.abs(diff) > 0.5) {
            state.currentY += diff * 0.24;
            container.scrollTop = state.currentY;
            state.rafId = requestAnimationFrame(animateToSection);
          } else {
            state.currentY = state.targetY;
            container.scrollTop = state.targetY;
            state.isAnimating = false;
            state.rafId = null;
          }
        };
        state.rafId = requestAnimationFrame(animateToSection);
      }
    }
  };

  const togglePopout = (id: Exclude<FooterPopoutId, null>) => {
    setActivePopout((prev) => (prev === id ? null : id));
  };

  const handleCopyDiscord = () => {
    navigator.clipboard?.writeText('@iam_aryandas');
    setCopiedDiscord(true);
    setTimeout(() => setCopiedDiscord(false), 2000);
  };

  const glassSurface = isDark ? 'liquid-glass-dark' : 'liquid-glass-light';
  const glassBtn = isDark ? 'liquid-glass-btn-dark' : 'liquid-glass-btn-light';

  return (
    <div
      ref={scrollContainerRef}
      className={`smooth-scroll-container fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden font-sans select-none transition-colors duration-200 ${
        isDark
          ? 'bg-[#191919] text-[#EAE0C8]'
          : 'bg-[#F5F2EB] text-[#191919]'
      }`}
    >
      {/* Unified Fixed GPU-Composited Ambient Liquid Glass Caustics Across All Sections */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu"
      >
        <div
          className={`absolute -top-24 -left-24 w-[48vw] h-[48vw] rounded-full blur-3xl transition-colors duration-200 ${
            isDark ? 'bg-[#EAE0C8]/10' : 'bg-white/90'
          }`}
        />
        <div
          className={`absolute -bottom-28 -right-20 w-[52vw] h-[52vw] rounded-full blur-3xl transition-colors duration-200 ${
            isDark ? 'bg-[#EAE0C8]/8' : 'bg-amber-100/60'
          }`}
        />
      </div>

      {/* Custom Tailless Black Triangular Cursor (90% of Maximum Sensitivity) */}
      <motion.div
        aria-hidden="true"
        style={{
          x: smoothCursorX,
          y: smoothCursorY,
          willChange: 'transform, opacity',
        }}
        animate={{
          opacity: cursorVisible ? 1 : 0,
          scale: cursorPressed ? 0.86 : 1,
        }}
        transition={{
          opacity: { duration: 0.08 },
          scale: { type: 'spring', stiffness: 750, damping: 30, mass: 0.25 },
        }}
        className="fixed top-0 left-0 z-[100] pointer-events-none transform-gpu"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="-translate-x-[2px] -translate-y-[2px] drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
        >
          {/* Tailless Black Triangular Pointer */}
          <path
            d="M2 2L4.2 20.5L10.4 15.4L19.5 12.2L2 2Z"
            fill="#000000"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="1.25"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>

      {/* Hidden SVG Liquid Refraction Filter Definition */}
      <svg className="sr-only" aria-hidden="true">
        <defs>
          <filter
            id="liquid-refraction"
            x="-10%"
            y="-10%"
            width="120%"
            height="120%"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="4"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Smooth Spring-Damped Top Liquid Scroll Progress Line */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: smoothScrollProgress }}
        className={`fixed top-0 left-0 right-0 h-[2.5px] origin-left z-50 pointer-events-none transition-colors duration-200 ${
          isDark
            ? 'bg-gradient-to-r from-[#EAE0C8]/25 via-[#EAE0C8]/85 to-[#EAE0C8]/25'
            : 'bg-gradient-to-r from-[#191919]/20 via-[#191919]/75 to-[#191919]/20'
        }`}
      />

      {/* =====================================================================
          SECTION 1: UNIFIED HEADER + HERO SECTION
      ====================================================================== */}
      <motion.section
        id="hero-section"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.15 }}
        transition={{
          type: 'spring',
          stiffness: 320,
          damping: 30,
          mass: 0.45,
        }}
        className="relative w-full h-screen min-h-[640px] overflow-hidden transform-gpu"
      >
        {/* Full-Viewport Liquid Glass Stage Vessel */}
        <div
          className={`absolute inset-2.5 sm:inset-4 lg:inset-5 rounded-[28px] sm:rounded-[36px] pointer-events-none z-0 ${glassSurface}`}
        />

        {/* Top Row: Liquid Glass Header Capsules (Role on Left + Long Arrow on Right) */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 480,
            damping: 30,
            mass: 0.4,
          }}
          className="absolute top-6 sm:top-8 lg:top-10 left-6 right-6 sm:left-10 sm:right-10 lg:left-14 lg:right-14 z-40 flex flex-row items-center justify-between gap-3"
        >
          {/* Top-Left Role Title inside Liquid Glass Pill */}
          <motion.div
            whileHover={{ scale: 1.02, y: -1 }}
            transition={{ type: 'spring', stiffness: 550, damping: 28, mass: 0.35 }}
            className={`${glassBtn} px-3.5 sm:px-5 py-2 rounded-2xl font-sans font-normal tracking-tight whitespace-nowrap`}
            style={{ fontSize: 'clamp(0.72rem, 1.3vw, 1.15rem)' }}
          >
            Aspiring Data Scientist &amp; ML Engineer
          </motion.div>

          {/* Top-Right Controls: Theme Toggle (Sun/Moon) + Long Horizontal Arrow inside Liquid Glass Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {/* Hidden reference asset for theme toggle placement */}
            <img
              src="/assets/aistudio/image_29381f68.png"
              alt="Theme Toggle Placement Reference"
              referrerPolicy="no-referrer"
              className="sr-only"
            />

            {/* Theme Toggle Button with Sun / Moon Icon */}
            <motion.button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              whileHover={{ scale: 1.06, y: -1 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 600, damping: 28, mass: 0.3 }}
              className={`${glassBtn} inline-flex items-center justify-center p-2 sm:p-2.5 rounded-2xl cursor-pointer shrink-0 focus-visible:outline-none`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                  <motion.span
                    key="sun-icon"
                    initial={{ opacity: 0, rotate: -60, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 60, scale: 0.7 }}
                    transition={{ duration: 0.11, ease: 'easeOut' }}
                    className="flex items-center justify-center"
                  >
                    <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="moon-icon"
                    initial={{ opacity: 0, rotate: 60, scale: 0.7 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: -60, scale: 0.7 }}
                    transition={{ duration: 0.11, ease: 'easeOut' }}
                    className="flex items-center justify-center"
                  >
                    <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2]" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Long Horizontal Arrow inside Liquid Glass Button */}
            <motion.button
              type="button"
              onClick={scrollToNextSection}
              aria-label="Scroll to next section"
              whileHover={{ scale: 1.04, x: 3 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 580, damping: 28, mass: 0.35 }}
              className={`${glassBtn} group inline-flex items-center px-3.5 sm:px-5 py-2.5 rounded-2xl cursor-pointer shrink-0 focus-visible:outline-none`}
            >
              <svg
                viewBox="0 0 130 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 sm:h-4.5 transition-transform duration-200 ease-out group-hover:translate-x-1.5"
                style={{ width: 'clamp(3.25rem, 7.5vw, 7.25rem)' }}
              >
                <line
                  x1="0"
                  y1="12"
                  x2="126"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <polyline
                  points="114,4 127,12 114,20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.button>
          </div>
        </motion.header>

        {/* Center Stage: Strictly Fixed Portrait + Solid & Wireframe "PORTFOLIO" */}
        <div className="absolute inset-x-0 top-16 bottom-16 flex items-center justify-center pointer-events-none">
          <div className="relative w-full flex items-center justify-center">
            {/* Portrait Container (Bigger on Mobile: 88vw, Balanced on Tablet & Desktop) */}
            <div className="relative w-[88vw] max-w-[410px] sm:w-[60vw] sm:max-w-[470px] md:w-[54vw] md:max-w-[500px] lg:w-[44vw] lg:max-w-[560px] max-h-[66vh] aspect-square flex items-center justify-center">
              {/* Subtle Circular Liquid Glass Halo Behind Portrait (Fixed) */}
              <div
                aria-hidden="true"
                className={`absolute w-[76%] h-[76%] rounded-full pointer-events-none opacity-65 ${glassSurface}`}
              />

              {/* Layer 1: Back Solid PORTFOLIO Text (Fixed at 55% height of Portrait Box) */}
              <div
                aria-hidden="true"
                className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-screen z-10 text-center pointer-events-none px-3"
              >
                <span
                  className={`block w-full text-center font-display uppercase leading-[0.82] tracking-[0.01em] whitespace-nowrap transition-colors duration-200 ${
                    isDark ? 'text-[#EAE0C8]' : 'text-[#191919]'
                  }`}
                  style={{
                    fontSize: 'clamp(3.85rem, min(18.8vw, 28vh), 19rem)',
                    textShadow: isDark
                      ? '0 10px 30px rgba(0, 0, 0, 0.45)'
                      : '0 8px 24px rgba(25, 25, 25, 0.08)',
                  }}
                >
                  PORTFOLIO
                </span>
              </div>

              {/* Layer 2: Middle Cutout Portrait (Strictly Fixed, Does Not Move) */}
              <div className="relative z-20 w-full h-full flex items-end justify-center pointer-events-none">
                <CutoutPortrait
                  imageSrc={HERO_IMAGE_PATH}
                  alt="Aryan Das"
                  className="w-full h-full object-contain object-bottom"
                />
              </div>

              {/* Layer 3: Front Hollow Wireframe Stroke PORTFOLIO Text (Strictly Fixed) */}
              <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-screen z-30 text-center pointer-events-none px-3">
                <h1
                  className={`w-full text-center font-display uppercase leading-[0.82] tracking-[0.01em] whitespace-nowrap ${
                    isDark ? 'portfolio-stroke-dark' : 'portfolio-stroke-light'
                  }`}
                  style={{
                    fontSize: 'clamp(3.85rem, min(18.8vw, 28vh), 19rem)',
                  }}
                >
                  PORTFOLIO
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Liquid Glass Capsules (Name on Left in Inter + Email on Right) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 480,
            damping: 30,
            mass: 0.4,
          }}
          className="absolute bottom-6 sm:bottom-8 lg:bottom-10 left-6 right-6 sm:left-10 sm:right-10 lg:left-14 lg:right-14 z-40 flex flex-row items-center justify-between gap-3"
        >
          {/* Bottom-Left: Aryan Das in Inter font inside Liquid Glass Capsule */}
          <motion.div
            whileHover={{ scale: 1.03, y: -1 }}
            transition={{ type: 'spring', stiffness: 550, damping: 28, mass: 0.35 }}
            className={`${glassBtn} px-4 sm:px-5 py-2 rounded-2xl font-sans font-normal tracking-tight whitespace-nowrap`}
            style={{ fontSize: 'clamp(0.75rem, 1.35vw, 1.15rem)' }}
          >
            {PROFILE.name}
          </motion.div>

          {/* Bottom-Right: Email Link aryandas.original@gmail.com inside Liquid Glass Capsule */}
          <motion.a
            href="mailto:aryandas.original@gmail.com"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 550, damping: 28, mass: 0.35 }}
            className={`${glassBtn} px-4 sm:px-5 py-2 rounded-2xl font-sans font-normal tracking-tight whitespace-nowrap`}
            style={{ fontSize: 'clamp(0.75rem, 1.35vw, 1.15rem)' }}
          >
            aryandas.original@gmail.com
          </motion.a>
        </motion.div>
      </motion.section>

      {/* =====================================================================
          SECTION 2: SKILLS & SPECIALTY ROLLER SECTION
          - Left 65%: Big Transparent Liquid Glass Button Named "Skills"
          - Right 35%: Vertical Specialty Roller with 3 Periodic Dots
          - Smooth scroll-reveal animation on viewport entry
      ====================================================================== */}
      <motion.section
        id="white-section"
        initial={{ opacity: 0, y: 40, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: false, amount: 0.18 }}
        transition={{
          type: 'spring',
          stiffness: 310,
          damping: 30,
          mass: 0.45,
        }}
        className="relative w-full h-screen min-h-[640px] overflow-hidden select-none transform-gpu"
      >
        {/* Full-Viewport Liquid Glass Stage Vessel */}
        <div
          className={`absolute inset-2.5 sm:inset-4 lg:inset-5 rounded-[28px] sm:rounded-[36px] pointer-events-none z-0 ${glassSurface}`}
        />

        {/* 65% Skills Button Tab Part (Left) + 35% Specialty Rolling Section (Right) */}
        <div className="relative z-10 w-full h-full px-5 sm:px-8 lg:px-12 py-6 sm:py-8 lg:py-10 flex flex-row items-center justify-between gap-3 sm:gap-6 lg:gap-10">
          {/* Left 65%: Large Transparent Liquid Glass Button Tab Named "Skills" */}
          <div className="w-[65%] h-full flex items-center justify-center">
            <motion.button
              type="button"
              onClick={() => {
                setActiveSkill(null);
                setIsSkillsOpen(true);
              }}
              whileHover={{ scale: 1.012, y: -2 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: 'spring', stiffness: 520, damping: 30, mass: 0.4 }}
              aria-label="Open Skills in full page"
              className={`${glassBtn} relative w-full h-[72%] sm:h-[78%] lg:h-[82%] rounded-[24px] sm:rounded-[32px] lg:rounded-[36px] flex flex-col items-center justify-center overflow-hidden group cursor-pointer`}
            >
              {/* Translucent inner Liquid Glass halo */}
              <div
                aria-hidden="true"
                className={`w-28 h-28 sm:w-44 sm:h-44 lg:w-64 lg:h-64 rounded-full ${glassSurface} opacity-65 transition-transform duration-200 group-hover:scale-110 flex items-center justify-center`}
              />
              <span
                className={`absolute font-sans font-semibold tracking-[-0.03em] transition-colors duration-200 ${
                  isDark ? 'text-white' : 'text-[#191919]'
                }`}
                style={{ fontSize: 'clamp(1.85rem, 5vw, 4.5rem)' }}
              >
                Skills
              </span>
            </motion.button>
          </div>

          {/* Right 35%: Vertical Specialty Roller with Stationary 3 Dots on Left */}
          <div className="w-[35%] h-full flex items-center justify-start">
            <SpecialtyRoller isDark={isDark} />
          </div>
        </div>

        {/* FULL-PAGE SKILLS OVERLAY (Consumes the entire section with a solid opaque background when "Skills" is clicked) */}
        <AnimatePresence>
          {isSkillsOpen && (
            <motion.div
              key="full-page-skills"
              data-nested-scroll="true"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 6 }}
              transition={{
                type: 'spring',
                stiffness: 540,
                damping: 34,
                mass: 0.42,
              }}
              onClick={() => {
                setActiveSkill(null);
                setIsSkillsOpen(false);
              }}
              className={`absolute inset-2.5 sm:inset-4 lg:inset-5 rounded-[28px] sm:rounded-[36px] z-40 border flex flex-col items-center justify-center p-3.5 sm:p-6 lg:p-8 overflow-y-auto smooth-scroll-container transform-gpu transition-colors duration-200 ${
                isDark
                  ? 'bg-[#1F1F1F] text-[#EAE0C8] border-white/20 shadow-[0_24px_64px_rgba(0,0,0,0.65)]'
                  : 'bg-white text-[#191919] border-black/15 shadow-[0_24px_64px_rgba(0,0,0,0.16)]'
              }`}
            >
              {/* Hidden reference assets for skills segregation */}
              <img
                src="/assets/aistudio/image_80f8f045.png"
                alt="Skills Grid Reference"
                referrerPolicy="no-referrer"
                className="sr-only"
              />
              <img
                src="/assets/aistudio/image_d9197c85.png"
                alt="Skills Segregation Reference"
                referrerPolicy="no-referrer"
                className="sr-only"
              />

              {/* Top-Right Close Button to return to Skills View */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveSkill(null);
                  setIsSkillsOpen(false);
                }}
                aria-label="Close full-page Skills view"
                className={`border transition-colors absolute top-3.5 right-3.5 sm:top-6 sm:right-6 p-2 sm:p-2.5 rounded-2xl z-50 shadow-sm cursor-pointer ${
                  isDark
                    ? 'bg-[#2A2A2A] hover:bg-[#EAE0C8] hover:text-[#191919] text-[#EAE0C8] border-white/15'
                    : 'bg-[#F5F2EB] hover:bg-[#191919] hover:text-white text-[#191919] border-black/15'
                }`}
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </motion.button>

              {/* Center Full-Width Container for Segregated Liquid-Glass Skill Grid */}
              <div
                className="relative z-20 w-full max-w-[1120px] my-auto flex flex-col items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Floating Solid Pop-out Badge (Appears when hovering or clicking an icon capsule) */}
                <div className="h-9 sm:h-11 flex items-center justify-center mb-2 sm:mb-3 shrink-0">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {activeSkill ? (
                      <motion.div
                        key={activeSkill.id}
                        initial={{
                          opacity: 0,
                          y: 4,
                          scale: 0.95,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                        }}
                        exit={{
                          opacity: 0,
                          y: 2,
                          scale: 0.96,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 620,
                          damping: 34,
                          mass: 0.32,
                        }}
                        className={`border shadow-lg px-4 sm:px-5 py-1.5 rounded-full flex items-center gap-2.5 ${
                          isDark
                            ? 'bg-[#EAE0C8] text-[#191919] border-white/20'
                            : 'bg-[#191919] text-white border-black'
                        }`}
                      >
                        <activeSkill.Icon
                          className={`w-4 h-4 shrink-0 ${
                            isDark ? 'text-[#191919]' : 'text-white'
                          }`}
                        />
                        <span className="font-sans font-semibold text-xs sm:text-sm tracking-tight">
                          {activeSkill.name}
                        </span>
                        <span className="opacity-40">·</span>
                        <span className="font-mono text-[11px] sm:text-xs opacity-80">
                          {activeSkill.category}
                        </span>
                      </motion.div>
                    ) : (
                      <span
                        className={`font-sans font-semibold text-xs sm:text-sm tracking-[0.08em] uppercase ${
                          isDark ? 'text-[#EAE0C8]/55' : 'text-black/45'
                        }`}
                      >
                        Skills &amp; Expertise
                      </span>
                    )}
                  </AnimatePresence>
                </div>

                {/* COMPLETELY FILLED SEGREGATED SKILLS GRID (Desktop, Tablet & Mobile) */}
                <motion.div
                  variants={SKILLS_STAGE_VARIANTS}
                  initial="hidden"
                  animate="visible"
                  className="w-full flex flex-col gap-2.5 sm:gap-3.5 lg:gap-4"
                >
                  {/* 1. PROGRAMMING LANGUAGES (7 Skills — 100% Full-Width Row on Desktop/Tablet, 4+3 Full-Width on Mobile) */}
                  <div
                    className={`w-full rounded-2xl sm:rounded-3xl border p-2.5 sm:p-3.5 lg:p-4 flex flex-col gap-2 transition-colors duration-500 ${
                      isDark
                        ? 'bg-[#262626] border-white/10'
                        : 'bg-[#F8F8FA] border-black/[0.08]'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between px-1">
                      <span
                        className={`font-sans font-semibold text-[11px] sm:text-xs tracking-[0.04em] ${
                          isDark ? 'text-[#EAE0C8]' : 'text-[#191919]'
                        }`}
                      >
                        Programming Languages
                      </span>
                    </div>
                    <div className="w-full grid grid-cols-12 sm:grid-cols-7 gap-1.5 sm:gap-2.5 lg:gap-3">
                      {SKILLS_PROGRAMMING_LANGUAGES.map((skill, idx) => {
                        const isSelected = activeSkill?.id === skill.id;
                        const IconComponent = skill.Icon;
                        const mobileSpan =
                          idx < 4
                            ? 'col-span-3 sm:col-span-1'
                            : 'col-span-4 sm:col-span-1';
                        return (
                          <motion.button
                            key={skill.id}
                            variants={SKILL_CAPSULE_VARIANTS}
                            whileHover={{ y: -3, scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                            type="button"
                            onMouseEnter={() => setActiveSkill(skill)}
                            onClick={() =>
                              setActiveSkill((prev) =>
                                prev?.id === skill.id ? null : skill
                              )
                            }
                            aria-label={`${skill.name} (${skill.category})`}
                            className={`${mobileSpan} w-full py-2.5 sm:py-3 lg:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#EAE0C8] text-[#191919] shadow-md scale-[1.02]'
                                  : 'bg-[#191919] text-white shadow-md scale-[1.02]'
                                : `${glassBtn} ${
                                    isDark ? 'text-white' : 'text-black'
                                  } opacity-90 hover:opacity-100`
                            }`}
                          >
                            <IconComponent
                              className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 bg-transparent ${
                                isSelected
                                  ? isDark
                                    ? 'text-[#191919]'
                                    : 'text-white'
                                  : isDark
                                  ? 'text-white'
                                  : 'text-black'
                              }`}
                            />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. MIDDLE SYMMETRICAL ROW:
                         Left: Web Technologies (3) & Databases (1) in the Same Horizontal Label Row (4 cols total)
                         Right: Frameworks & Libraries (4 cols total) */}
                  <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5 lg:gap-4">
                    {/* Web Technologies & Databases Combined Horizontal Section (4 Equal Columns) */}
                    <div
                      className={`w-full rounded-2xl sm:rounded-3xl border p-2.5 sm:p-3.5 lg:p-4 flex flex-col gap-2 transition-colors duration-500 ${
                        isDark
                          ? 'bg-[#262626] border-white/10'
                          : 'bg-[#F8F8FA] border-black/[0.08]'
                      }`}
                    >
                      {/* Shared Horizontal Label Row: Web Technologies (over cols 1-3) + Database (over col 4) */}
                      <div className="w-full grid grid-cols-4 gap-1.5 sm:gap-2.5 lg:gap-3 px-1">
                        <span
                          className={`col-span-3 font-sans font-semibold text-[11px] sm:text-xs tracking-[0.04em] truncate ${
                            isDark ? 'text-[#EAE0C8]' : 'text-[#191919]'
                          }`}
                        >
                          Web Technologies
                        </span>
                        <span
                          className={`col-span-1 font-sans font-semibold text-[11px] sm:text-xs tracking-[0.04em] text-center sm:text-left truncate ${
                            isDark ? 'text-[#EAE0C8]' : 'text-[#191919]'
                          }`}
                        >
                          Database
                        </span>
                      </div>
                      <div className="w-full grid grid-cols-4 gap-1.5 sm:gap-2.5 lg:gap-3">
                        {SKILLS_WEB_AND_DB.map((skill) => {
                          const isSelected = activeSkill?.id === skill.id;
                          const IconComponent = skill.Icon;
                          return (
                            <motion.button
                              key={skill.id}
                              variants={SKILL_CAPSULE_VARIANTS}
                              whileHover={{ y: -3, scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              onMouseEnter={() => setActiveSkill(skill)}
                              onClick={() =>
                                setActiveSkill((prev) =>
                                  prev?.id === skill.id ? null : skill
                                )
                              }
                              aria-label={`${skill.name} (${skill.category})`}
                              className={`w-full py-2.5 sm:py-3 lg:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? isDark
                                    ? 'bg-[#EAE0C8] text-[#191919] shadow-md scale-[1.02]'
                                    : 'bg-[#191919] text-white shadow-md scale-[1.02]'
                                  : `${glassBtn} ${
                                      isDark ? 'text-white' : 'text-black'
                                    } opacity-90 hover:opacity-100`
                              }`}
                            >
                              <IconComponent
                                className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 bg-transparent ${
                                  isSelected
                                    ? isDark
                                      ? 'text-[#191919]'
                                      : 'text-white'
                                    : isDark
                                    ? 'text-white'
                                    : 'text-black'
                                }`}
                              />
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Frameworks & Libraries Section (4 Equal Columns) */}
                    <div
                      className={`w-full rounded-2xl sm:rounded-3xl border p-2.5 sm:p-3.5 lg:p-4 flex flex-col gap-2 transition-colors duration-500 ${
                        isDark
                          ? 'bg-[#262626] border-white/10'
                          : 'bg-[#F8F8FA] border-black/[0.08]'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between px-1">
                        <span
                          className={`font-sans font-semibold text-[11px] sm:text-xs tracking-[0.04em] ${
                            isDark ? 'text-[#EAE0C8]' : 'text-[#191919]'
                          }`}
                        >
                          Frameworks &amp; Libraries
                        </span>
                      </div>
                      <div className="w-full grid grid-cols-4 gap-1.5 sm:gap-2.5 lg:gap-3">
                        {SKILLS_FRAMEWORKS.map((skill) => {
                          const isSelected = activeSkill?.id === skill.id;
                          const IconComponent = skill.Icon;
                          return (
                            <motion.button
                              key={skill.id}
                              variants={SKILL_CAPSULE_VARIANTS}
                              whileHover={{ y: -3, scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              onMouseEnter={() => setActiveSkill(skill)}
                              onClick={() =>
                                setActiveSkill((prev) =>
                                  prev?.id === skill.id ? null : skill
                                )
                              }
                              aria-label={`${skill.name} (${skill.category})`}
                              className={`w-full py-2.5 sm:py-3 lg:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? isDark
                                    ? 'bg-[#EAE0C8] text-[#191919] shadow-md scale-[1.02]'
                                    : 'bg-[#191919] text-white shadow-md scale-[1.02]'
                                  : `${glassBtn} ${
                                      isDark ? 'text-white' : 'text-black'
                                    } opacity-90 hover:opacity-100`
                              }`}
                            >
                              <IconComponent
                                className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 bg-transparent ${
                                  isSelected
                                    ? isDark
                                      ? 'text-[#191919]'
                                      : 'text-white'
                                    : isDark
                                    ? 'text-white'
                                    : 'text-black'
                                }`}
                              />
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 3. PYTHON LIBRARIES (7 Skills — 100% Full-Width Row on Desktop/Tablet, 4+3 Full-Width on Mobile) */}
                  <div
                    className={`w-full rounded-2xl sm:rounded-3xl border p-2.5 sm:p-3.5 lg:p-4 flex flex-col gap-2 transition-colors duration-500 ${
                      isDark
                        ? 'bg-[#262626] border-white/10'
                        : 'bg-[#F8F8FA] border-black/[0.08]'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between px-1">
                      <span
                        className={`font-sans font-semibold text-[11px] sm:text-xs tracking-[0.04em] ${
                          isDark ? 'text-[#EAE0C8]' : 'text-[#191919]'
                        }`}
                      >
                        Python Libraries
                      </span>
                    </div>
                    <div className="w-full grid grid-cols-12 sm:grid-cols-7 gap-1.5 sm:gap-2.5 lg:gap-3">
                      {SKILLS_PYTHON_LIBRARIES.map((skill, idx) => {
                        const isSelected = activeSkill?.id === skill.id;
                        const IconComponent = skill.Icon;
                        const mobileSpan =
                          idx < 4
                            ? 'col-span-3 sm:col-span-1'
                            : 'col-span-4 sm:col-span-1';
                        return (
                          <motion.button
                            key={skill.id}
                            variants={SKILL_CAPSULE_VARIANTS}
                            whileHover={{ y: -3, scale: 1.03 }}
                            whileTap={{ scale: 0.96 }}
                            type="button"
                            onMouseEnter={() => setActiveSkill(skill)}
                            onClick={() =>
                              setActiveSkill((prev) =>
                                prev?.id === skill.id ? null : skill
                              )
                            }
                            aria-label={`${skill.name} (${skill.category})`}
                            className={`${mobileSpan} w-full py-2.5 sm:py-3 lg:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? isDark
                                  ? 'bg-[#EAE0C8] text-[#191919] shadow-md scale-[1.02]'
                                  : 'bg-[#191919] text-white shadow-md scale-[1.02]'
                                : `${glassBtn} ${
                                    isDark ? 'text-white' : 'text-black'
                                  } opacity-90 hover:opacity-100`
                            }`}
                          >
                            <IconComponent
                              className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 bg-transparent ${
                                isSelected
                                  ? isDark
                                    ? 'text-[#191919]'
                                    : 'text-white'
                                  : isDark
                                  ? 'text-white'
                                  : 'text-black'
                              }`}
                            />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. BOTTOM ROW:
                         Left: Tools (3 cols) + Right: Design & Creative Tools (4 cols) -> 7 Equal Columns Total */}
                  <div className="w-full grid grid-cols-1 sm:grid-cols-7 gap-2.5 sm:gap-3.5 lg:gap-4">
                    {/* Tools Section (3 Equal Columns) */}
                    <div
                      className={`sm:col-span-3 w-full rounded-2xl sm:rounded-3xl border p-2.5 sm:p-3.5 lg:p-4 flex flex-col gap-2 transition-colors duration-500 ${
                        isDark
                          ? 'bg-[#262626] border-white/10'
                          : 'bg-[#F8F8FA] border-black/[0.08]'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between px-1">
                        <span
                          className={`font-sans font-semibold text-[11px] sm:text-xs tracking-[0.04em] ${
                            isDark ? 'text-[#EAE0C8]' : 'text-[#191919]'
                          }`}
                        >
                          Tools
                        </span>
                      </div>
                      <div className="w-full grid grid-cols-3 gap-1.5 sm:gap-2.5 lg:gap-3">
                        {SKILLS_TOOLS.map((skill) => {
                          const isSelected = activeSkill?.id === skill.id;
                          const IconComponent = skill.Icon;
                          return (
                            <motion.button
                              key={skill.id}
                              variants={SKILL_CAPSULE_VARIANTS}
                              whileHover={{ y: -3, scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              onMouseEnter={() => setActiveSkill(skill)}
                              onClick={() =>
                                setActiveSkill((prev) =>
                                  prev?.id === skill.id ? null : skill
                                )
                              }
                              aria-label={`${skill.name} (${skill.category})`}
                              className={`w-full py-2.5 sm:py-3 lg:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? isDark
                                    ? 'bg-[#EAE0C8] text-[#191919] shadow-md scale-[1.02]'
                                    : 'bg-[#191919] text-white shadow-md scale-[1.02]'
                                  : `${glassBtn} ${
                                      isDark ? 'text-white' : 'text-black'
                                    } opacity-90 hover:opacity-100`
                              }`}
                            >
                              <IconComponent
                                className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 bg-transparent ${
                                  isSelected
                                    ? isDark
                                      ? 'text-[#191919]'
                                      : 'text-white'
                                    : isDark
                                    ? 'text-white'
                                    : 'text-black'
                                }`}
                              />
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Design & Creative Tools Section (4 Equal Columns) */}
                    <div
                      className={`sm:col-span-4 w-full rounded-2xl sm:rounded-3xl border p-2.5 sm:p-3.5 lg:p-4 flex flex-col gap-2 transition-colors duration-500 ${
                        isDark
                          ? 'bg-[#262626] border-white/10'
                          : 'bg-[#F8F8FA] border-black/[0.08]'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between px-1">
                        <span
                          className={`font-sans font-semibold text-[11px] sm:text-xs tracking-[0.04em] ${
                            isDark ? 'text-[#EAE0C8]' : 'text-[#191919]'
                          }`}
                        >
                          Design &amp; Creative Tools
                        </span>
                      </div>
                      <div className="w-full grid grid-cols-4 gap-1.5 sm:gap-2.5 lg:gap-3">
                        {SKILLS_DESIGN_TOOLS.map((skill) => {
                          const isSelected = activeSkill?.id === skill.id;
                          const IconComponent = skill.Icon;
                          return (
                            <motion.button
                              key={skill.id}
                              variants={SKILL_CAPSULE_VARIANTS}
                              whileHover={{ y: -3, scale: 1.03 }}
                              whileTap={{ scale: 0.96 }}
                              type="button"
                              onMouseEnter={() => setActiveSkill(skill)}
                              onClick={() =>
                                setActiveSkill((prev) =>
                                  prev?.id === skill.id ? null : skill
                                )
                              }
                              aria-label={`${skill.name} (${skill.category})`}
                              className={`w-full py-2.5 sm:py-3 lg:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? isDark
                                    ? 'bg-[#EAE0C8] text-[#191919] shadow-md scale-[1.02]'
                                    : 'bg-[#191919] text-white shadow-md scale-[1.02]'
                                  : `${glassBtn} ${
                                      isDark ? 'text-white' : 'text-black'
                                    } opacity-90 hover:opacity-100`
                              }`}
                            >
                              <IconComponent
                                className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 bg-transparent ${
                                  isSelected
                                    ? isDark
                                      ? 'text-[#191919]'
                                      : 'text-white'
                                    : isDark
                                    ? 'text-white'
                                    : 'text-black'
                                }`}
                              />
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* =====================================================================
          SECTION 3: DEDICATED PROJECTS FOLDER SECTION
          - Frosted Liquid-Glass Folder Named "PROJECTS"
          - Smooth scroll-reveal animation on viewport entry
      ====================================================================== */}
      <motion.section
        id="projects-section"
        initial={{ opacity: 0, y: 40, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: false, amount: 0.18 }}
        transition={{
          type: 'spring',
          stiffness: 310,
          damping: 30,
          mass: 0.45,
        }}
        className="relative w-full h-screen min-h-[640px] overflow-hidden select-none transform-gpu"
      >
        {/* Full-Viewport Liquid Glass Stage Vessel */}
        <div
          className={`absolute inset-2.5 sm:inset-4 lg:inset-5 rounded-[28px] sm:rounded-[36px] pointer-events-none z-0 ${glassSurface}`}
        />

        <div className="relative z-10 w-full h-full flex items-center justify-center">
          <ProjectsRoadmap isDark={isDark} />
        </div>
      </motion.section>

      {/* =====================================================================
          SECTION 4: DEDICATED CREDENTIALS SECTION
          - Vertical Stepped Stack of Blurred Certificate Cards (image_c19289cb.png)
          - Smooth scroll-reveal animation on viewport entry
      ====================================================================== */}
      <motion.section
        id="credentials-section"
        initial={{ opacity: 0, y: 40, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: false, amount: 0.18 }}
        transition={{
          type: 'spring',
          stiffness: 310,
          damping: 30,
          mass: 0.45,
        }}
        className="relative w-full h-screen min-h-[640px] overflow-hidden select-none transform-gpu"
      >
        {/* Full-Viewport Liquid Glass Stage Vessel */}
        <div
          className={`absolute inset-2.5 sm:inset-4 lg:inset-5 rounded-[28px] sm:rounded-[36px] pointer-events-none z-0 ${glassSurface}`}
        />

        <div className="relative z-10 w-full h-full flex items-center justify-center">
          <CredentialsSection isDark={isDark} />
        </div>
      </motion.section>

      {/* =====================================================================
          SECTION 5: FOOTER SECTION
          - Interactive Sliced "ARYAN DAS" Typography + Social Links Dock
          - Smooth scroll-reveal animation on viewport entry
      ====================================================================== */}
      <motion.footer
        id="footer-section"
        onClick={() => setActivePopout(null)}
        initial={{ opacity: 0, y: 40, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: false, amount: 0.18 }}
        transition={{
          type: 'spring',
          stiffness: 310,
          damping: 30,
          mass: 0.45,
        }}
        className="relative w-full h-screen min-h-[640px] flex flex-col items-center justify-center overflow-hidden transform-gpu"
      >
        {/* Full-Viewport Liquid Glass Stage Vessel */}
        <div
          className={`absolute inset-2.5 sm:inset-4 lg:inset-5 rounded-[28px] sm:rounded-[36px] pointer-events-none z-0 ${glassSurface}`}
        />

        {/* Center Interactive Area: Sliced "ARYAN DAS" Typography Above + Social Links Dock Below */}
        <div
          className="relative z-20 w-full max-w-[1100px] h-full px-4 sm:px-8 py-6 sm:py-10 flex flex-col items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hidden reference assets for the footer typography & layout */}
          <img
            src="/assets/aistudio/image_ae9b3c4d.png"
            alt="Footer Layout Reference"
            referrerPolicy="no-referrer"
            className="sr-only"
          />
          <img
            src="/assets/aistudio/image_32fb019c.png"
            alt="Links Tab Reference"
            referrerPolicy="no-referrer"
            className="sr-only"
          />
          <img
            src="/assets/aistudio/image_64a6b47f.png"
            alt="Sliced Typography Reference"
            referrerPolicy="no-referrer"
            className="sr-only"
          />

          {/* TOP / CENTER: INTERACTIVE SLICED CYLINDRICAL DISPLAY TYPOGRAPHY — "ARYAN DAS"
              Scrollable with mouse cursor/wheel and swipable with touch */}
          <SlicedNameRoller />

          {/* BOTTOM DOCK AREA: Floating Solid Pop-out Card + Social Links Dock */}
          <div className="relative w-full flex flex-col items-center justify-end shrink-0">
            {/* Floating Solid Pop-out Card when clicked (For Mail, NIT Silchar, Gurucharan College, and Languages) */}
            <div className="absolute bottom-full mb-3 sm:mb-4 w-full flex items-end justify-center z-30 pointer-events-none">
              <AnimatePresence mode="popLayout">
                {activePopout === 'mail' && (
                  <motion.div
                    key="mail"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{
                      type: 'spring',
                      stiffness: 580,
                      damping: 34,
                      mass: 0.36,
                    }}
                    className={`pointer-events-auto transform-gpu ${
                      isDark
                        ? 'bg-[#1F1F1F] text-[#EAE0C8] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.65)]'
                        : 'bg-white text-[#191919] border border-black/15 shadow-[0_20px_50px_rgba(0,0,0,0.14)]'
                    } px-5 py-3.5 rounded-2xl flex items-center gap-3.5`}
                  >
                    <a
                      href="mailto:aryandas.original@gmail.com"
                      className="inline-flex items-center gap-2.5 text-sm sm:text-base font-sans hover:opacity-80 transition-opacity"
                    >
                      <span className="font-semibold">Mail</span>
                      <span className="font-mono opacity-80">
                        aryandas.original@gmail.com
                      </span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setActivePopout(null)}
                      aria-label="Close pop-out"
                      className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {activePopout === 'nits' && (
                  <motion.div
                    key="nits"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{
                      type: 'spring',
                      stiffness: 580,
                      damping: 34,
                      mass: 0.36,
                    }}
                    className={`pointer-events-auto transform-gpu ${
                      isDark
                        ? 'bg-[#1F1F1F] text-[#EAE0C8] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.65)]'
                        : 'bg-white text-[#191919] border border-black/15 shadow-[0_20px_50px_rgba(0,0,0,0.14)]'
                    } px-5 py-3.5 rounded-2xl flex items-center gap-3.5`}
                  >
                    <div className="text-sm sm:text-base font-sans">
                      <span className="font-semibold">
                        BTech Electrical Engineering
                      </span>{' '}
                      <span className="font-mono opacity-80 tabular-nums">
                        2025-2029
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePopout(null)}
                      aria-label="Close NIT Silchar pop-out"
                      className="p-1 opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {activePopout === 'gcc' && (
                  <motion.div
                    key="gcc"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{
                      type: 'spring',
                      stiffness: 580,
                      damping: 34,
                      mass: 0.36,
                    }}
                    className={`pointer-events-auto transform-gpu ${
                      isDark
                        ? 'bg-[#1F1F1F] text-[#EAE0C8] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.65)]'
                        : 'bg-white text-[#191919] border border-black/15 shadow-[0_20px_50px_rgba(0,0,0,0.14)]'
                    } px-5 py-3.5 rounded-2xl flex items-center gap-3.5 text-center sm:text-left`}
                  >
                    <div className="text-sm sm:text-base font-sans">
                      <span className="font-semibold">
                        Higher Secondary Physics, Chemistry, Mathematics
                      </span>{' '}
                      <span className="font-mono opacity-80 tabular-nums">
                        2023-2025
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePopout(null)}
                      aria-label="Close Gurucharan College pop-out"
                      className="p-1 opacity-60 hover:opacity-100 cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {activePopout === 'languages' && (
                  <motion.div
                    key="languages"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{
                      type: 'spring',
                      stiffness: 580,
                      damping: 34,
                      mass: 0.36,
                    }}
                    className={`pointer-events-auto transform-gpu ${
                      isDark
                        ? 'bg-[#1F1F1F] text-[#EAE0C8] border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.65)]'
                        : 'bg-white text-[#191919] border border-black/15 shadow-[0_20px_50px_rgba(0,0,0,0.14)]'
                    } px-6 py-4 rounded-2xl flex items-start gap-4`}
                  >
                    <div className="space-y-1.5 text-sm sm:text-base font-sans">
                      <div className="flex items-center justify-between gap-6">
                        <span className="font-semibold">Bengali</span>
                        <span className="font-mono text-xs sm:text-sm opacity-80">
                          Native
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <span className="font-semibold">English</span>
                        <span className="font-mono text-xs sm:text-sm opacity-80">
                          Professional
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-6">
                        <span className="font-semibold">Spanish and German</span>
                        <span className="font-mono text-xs sm:text-sm opacity-80">
                          Elementary
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePopout(null)}
                      aria-label="Close Languages pop-out"
                      className="p-1 opacity-60 hover:opacity-100 cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 5 + 5 Spacious Grid on Mobile & Tablet (<1024px) | Single Horizontal Row on Desktop (>=1024px) */}
            <motion.div
              variants={DOCK_CONTAINER_VARIANTS}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: false, amount: 0.35 }}
              className={`${glassSurface} w-full max-w-[420px] sm:max-w-[580px] lg:max-w-none lg:w-auto px-7 sm:px-12 lg:px-11 py-6 sm:py-8 lg:py-6 rounded-[28px] sm:rounded-[34px] grid grid-cols-5 lg:flex lg:flex-row items-center justify-items-center justify-center gap-x-5 gap-y-6 sm:gap-x-10 sm:gap-y-8 lg:gap-10`}
            >
            {/* 1. LinkedIn — Opens directly in a new tab */}
            <motion.a
              variants={DOCK_ITEM_VARIANTS}
              whileHover={{ y: -5, scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              href="https://www.linkedin.com/in/iam-aryandas"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn @iam-aryandas"
              className={`bg-transparent p-1.5 opacity-85 hover:opacity-100 ${
                isDark ? 'text-white' : 'text-black'
              }`}
            >
              <LinkedInLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            </motion.a>

            {/* 2. Instagram — Opens directly in a new tab */}
            <motion.a
              variants={DOCK_ITEM_VARIANTS}
              whileHover={{ y: -5, scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              href="https://www.instagram.com/iam_aryandas"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram @iam_aryandas"
              className={`bg-transparent p-1.5 opacity-85 hover:opacity-100 ${
                isDark ? 'text-white' : 'text-black'
              }`}
            >
              <InstagramLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            </motion.a>

            {/* 3. GitHub — Opens directly in a new tab */}
            <motion.a
              variants={DOCK_ITEM_VARIANTS}
              whileHover={{ y: -5, scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              href="https://github.com/aryandas079"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub @aryandas079"
              className={`bg-transparent p-1.5 opacity-85 hover:opacity-100 ${
                isDark ? 'text-white' : 'text-black'
              }`}
            >
              <GitHubLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            </motion.a>

            {/* 4. X — Opens directly in a new tab */}
            <motion.a
              variants={DOCK_ITEM_VARIANTS}
              whileHover={{ y: -5, scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              href="https://x.com/iam_aryandas"
              target="_blank"
              rel="noreferrer"
              aria-label="X @iam_aryandas"
              className={`bg-transparent p-1.5 opacity-85 hover:opacity-100 ${
                isDark ? 'text-white' : 'text-black'
              }`}
            >
              <XLogo className="w-6 h-6 sm:w-7 sm:h-7" />
            </motion.a>

            {/* 5. Discord — Opens directly in a new tab */}
            <motion.a
              variants={DOCK_ITEM_VARIANTS}
              whileHover={{ y: -5, scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              href="https://discord.com/users/iam_aryandas"
              target="_blank"
              rel="noreferrer"
              aria-label="Discord @iam_aryandas"
              className={`bg-transparent p-1.5 opacity-85 hover:opacity-100 ${
                isDark ? 'text-white' : 'text-black'
              }`}
            >
              <DiscordLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            </motion.a>

            {/* 6. Mail — Opens Solid pop-out when clicked */}
            <motion.button
              variants={DOCK_ITEM_VARIANTS}
              whileHover={{ y: -5, scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => togglePopout('mail')}
              aria-label="Mail aryandas.original@gmail.com"
              aria-expanded={activePopout === 'mail'}
              className={`p-2 rounded-xl cursor-pointer transition-all ${
                activePopout === 'mail'
                  ? isDark
                    ? 'bg-[#2A2A2A] shadow-md scale-110 opacity-100'
                    : 'bg-white shadow-md scale-110 opacity-100'
                  : 'bg-transparent opacity-85 hover:opacity-100'
              } ${isDark ? 'text-white' : 'text-black'}`}
            >
              <MailLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            </motion.button>

            {/* 7. First Education Logo: NIT Silchar — Opens Solid pop-out when clicked */}
            <motion.button
              variants={DOCK_ITEM_VARIANTS}
              whileHover={{ y: -5, scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => togglePopout('nits')}
              aria-label="NIT Silchar — BTech Electrical Engineering 2025-2029"
              aria-expanded={activePopout === 'nits'}
              className={`p-1.5 rounded-xl cursor-pointer transition-all ${
                activePopout === 'nits'
                  ? isDark
                    ? 'bg-[#2A2A2A] shadow-md scale-110 opacity-100'
                    : 'bg-white shadow-md scale-110 opacity-100'
                  : 'bg-transparent opacity-90 hover:opacity-100'
              }`}
            >
              <TransparentLogoImage
                src={NIT_SILCHAR_LOGO_PATH}
                alt="NIT Silchar"
                isDark={isDark}
                className="w-9 h-9 sm:w-11 sm:h-11"
              />
            </motion.button>

            {/* 8. Second Education Logo: Gurucharan College — Opens Solid pop-out when clicked */}
            <motion.button
              variants={DOCK_ITEM_VARIANTS}
              whileHover={{ y: -5, scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => togglePopout('gcc')}
              aria-label="Gurucharan College — Higher Secondary Physics, Chemistry, Mathematics 2023-2025"
              aria-expanded={activePopout === 'gcc'}
              className={`p-1.5 rounded-xl cursor-pointer transition-all ${
                activePopout === 'gcc'
                  ? isDark
                    ? 'bg-[#2A2A2A] shadow-md scale-110 opacity-100'
                    : 'bg-white shadow-md scale-110 opacity-100'
                  : 'bg-transparent opacity-90 hover:opacity-100'
              }`}
            >
              <TransparentLogoImage
                src={GURUCHARAN_LOGO_PATH}
                alt="Gurucharan College"
                isDark={isDark}
                className="w-9 h-9 sm:w-11 sm:h-11"
              />
            </motion.button>

            {/* 9. Language Icon Button — Opens Solid pop-out when clicked */}
            <motion.button
              variants={DOCK_ITEM_VARIANTS}
              whileHover={{ y: -5, scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => togglePopout('languages')}
              aria-label="Languages Known"
              aria-expanded={activePopout === 'languages'}
              className={`p-2 rounded-xl cursor-pointer transition-all ${
                activePopout === 'languages'
                  ? isDark
                    ? 'bg-[#2A2A2A] shadow-md scale-110 opacity-100'
                    : 'bg-white shadow-md scale-110 opacity-100'
                  : 'bg-transparent opacity-85 hover:opacity-100'
              } ${isDark ? 'text-white' : 'text-black'}`}
            >
              <LanguageGlyphIcon className="w-7 h-7 sm:w-8 sm:h-8" />
            </motion.button>

            {/* 10. ORCID iD (At the last position) — Opens https://orcid.org/0009-0009-9012-4034 directly in a new tab */}
            <motion.a
              variants={DOCK_ITEM_VARIANTS}
              whileHover={{ y: -5, scale: 1.15 }}
              whileTap={{ scale: 0.92 }}
              href="https://orcid.org/0009-0009-9012-4034"
              target="_blank"
              rel="noreferrer"
              aria-label="ORCID iD 0009-0009-9012-4034"
              className={`bg-transparent p-1.5 opacity-85 hover:opacity-100 ${
                isDark ? 'text-white' : 'text-black'
              }`}
            >
              <OrcidLogo className="w-7 h-7 sm:w-8 sm:h-8" />
            </motion.a>
            </motion.div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}

