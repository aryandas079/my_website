/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
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
import { assetPath } from './utils/assetPath';

const HERO_IMAGE_PATH = assetPath('/assets/aistudio/image_549e2055.png');
const NIT_SILCHAR_LOGO_PATH = assetPath('/assets/aistudio/image_3a90b951.png');
const GURUCHARAN_LOGO_PATH = assetPath('/assets/aistudio/image_8fe961f3.png');

type FooterPopoutId = 'mail' | 'nits' | 'gcc' | 'languages' | null;

const DOCK_CONTAINER_VARIANTS: Variants = {
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

const DOCK_ITEM_VARIANTS: Variants = {
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

const SKILLS_STAGE_VARIANTS: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.01,
      delayChildren: 0,
    },
  },
};

const SKILL_CAPSULE_VARIANTS: Variants = {
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

interface SkillCapsuleButtonProps {
  skill: SkillItem;
  isSelected: boolean;
  isDark: boolean;
  glassBtn: string;
  mobileSpan?: string;
  onHover: () => void;
  onSelect: () => void;
}

const SkillCapsuleButton: React.FC<SkillCapsuleButtonProps> = React.memo(
  ({
    skill,
    isSelected,
    isDark,
    glassBtn,
    mobileSpan = '',
    onHover,
    onSelect,
  }) => {
    const IconComponent = skill.Icon;

    return (
      <motion.button
        variants={SKILL_CAPSULE_VARIANTS}
        whileHover={{
          y: -4,
          scale: 1.07,
        }}
        whileTap={{ scale: 0.94 }}
        transition={{
          type: 'spring',
          stiffness: 560,
          damping: 24,
          mass: 0.22,
        }}
        type="button"
        onMouseEnter={onHover}
        onFocus={onHover}
        onClick={onSelect}
        aria-label={`${skill.name} (${skill.category})`}
        style={{ willChange: 'transform' }}
        className={`${mobileSpan} group relative w-full py-2.5 sm:py-3 lg:py-3.5 rounded-xl sm:rounded-2xl flex items-center justify-center cursor-pointer select-none transform-gpu transition-colors duration-150 ${
          isSelected
            ? isDark
              ? 'bg-[#EAE0C8] text-[#191919] shadow-[0_8px_22px_rgba(234,224,200,0.24)]'
              : 'bg-[#191919] text-white shadow-[0_8px_22px_rgba(0,0,0,0.28)]'
            : `${glassBtn} ${
                isDark ? 'text-white' : 'text-black'
              } opacity-90 hover:opacity-100 hover:shadow-md`
        }`}
      >
        <IconComponent
          className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 bg-transparent pointer-events-none transform-gpu transition-transform duration-200 ease-out group-hover:scale-110 ${
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
  }
);
SkillCapsuleButton.displayName = 'SkillCapsuleButton';

export default function App() {
  // Light theme is the default; only switches when the theme toggle button is clicked
  const [isDark, setIsDark] = useState<boolean>(false);

  // Page 2 state: whether the left-half "Skills" button is expanded to consume the full page
  const [isSkillsOpen, setIsSkillsOpen] = useState<boolean>(false);
  const [activeSkill, setActiveSkill] = useState<SkillItem | null>(null);

  // Single active pop-out state for the horizontal footer icon bar
  const [activePopout, setActivePopout] = useState<FooterPopoutId>(null);
  const [copiedDiscord, setCopiedDiscord] = useState<boolean>(false);

  // Direct DOM refs for 100% hardware-speed, zero-React-re-render responsiveness
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const heroPortraitRef = useRef<HTMLDivElement>(null);
  const heroHaloRef = useRef<HTMLDivElement>(null);

  // 100% Native Compositor Scrolling + Buttery Smooth Hero Portrait Enlarge & Disappear on Scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let rafId: number | null = null;
    let cachedVh = window.innerHeight || 800;
    let cachedMaxScroll = Math.max(1, container.scrollHeight - cachedVh);

    const updateMeasurements = () => {
      cachedVh = container.clientHeight || window.innerHeight || 800;
      cachedMaxScroll = Math.max(1, container.scrollHeight - cachedVh);
    };

    const updateScrollVisuals = () => {
      const scrollTop = container.scrollTop;

      // 1. Update top progress bar directly on GPU compositor layer
      if (progressBarRef.current) {
        const totalProgress = Math.max(0, Math.min(1, scrollTop / cachedMaxScroll));
        progressBarRef.current.style.transform = `scaleX(${totalProgress.toFixed(4)})`;
      }

      // 2. Enlarge & smoothly disappear the Hero portrait when scrolling down from Page 1
      const fadeDistance = cachedVh * 0.68;
      if (scrollTop <= fadeDistance * 1.25) {
        const rawT = Math.max(0, Math.min(1, scrollTop / fadeDistance));
        // Smooth cubic Hermite interpolation (smoothstep)
        const smoothT = rawT * rawT * (3 - 2 * rawT);
        const portraitScale = 1 + smoothT * 0.54; // Enlarges smoothly from 1.0x up to 1.54x
        const portraitOpacity = Math.max(0, 1 - smoothT * 1.08); // Smoothly disappears to 0
        const portraitTranslateY = -smoothT * 26;

        if (heroPortraitRef.current) {
          heroPortraitRef.current.style.transform = `translate3d(0, ${portraitTranslateY.toFixed(2)}px, 0) scale3d(${portraitScale.toFixed(4)}, ${portraitScale.toFixed(4)}, 1)`;
          heroPortraitRef.current.style.opacity = portraitOpacity.toFixed(4);
          heroPortraitRef.current.style.visibility =
            portraitOpacity <= 0.005 ? 'hidden' : 'visible';
        }

        if (heroHaloRef.current) {
          const haloScale = 1 + smoothT * 0.35;
          heroHaloRef.current.style.transform = `scale3d(${haloScale.toFixed(4)}, ${haloScale.toFixed(4)}, 1)`;
          heroHaloRef.current.style.opacity = (portraitOpacity * 0.65).toFixed(4);
        }
      } else {
        if (
          heroPortraitRef.current &&
          heroPortraitRef.current.style.visibility !== 'hidden'
        ) {
          heroPortraitRef.current.style.opacity = '0';
          heroPortraitRef.current.style.visibility = 'hidden';
        }
      }
    };

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        updateScrollVisuals();
        rafId = null;
      });
    };

    const onResize = () => {
      updateMeasurements();
      onScroll();
    };

    updateMeasurements();
    updateScrollVisuals();

    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  const scrollToNextSection = () => {
    const nextEl = document.getElementById('white-section');
    if (nextEl) {
      nextEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      style={{
        background: isDark
          ? 'radial-gradient(circle at 15% 15%, rgba(234, 224, 200, 0.08) 0%, #191919 55%)'
          : 'radial-gradient(circle at 15% 15%, rgba(255, 255, 255, 0.95) 0%, #F5F2EB 60%)',
      }}
      className={`smooth-scroll-container fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden font-sans select-none ${
        isDark ? 'text-[#EAE0C8]' : 'text-[#191919]'
      }`}
    >
      {/* Zero-Lag Direct-DOM Top Scroll Progress Line */}
      <div
        ref={progressBarRef}
        aria-hidden="true"
        style={{
          transform: 'scaleX(0)',
          willChange: 'transform',
        }}
        className={`fixed top-0 left-0 right-0 h-[2.5px] origin-left z-50 pointer-events-none ${
          isDark
            ? 'bg-gradient-to-r from-[#EAE0C8]/25 via-[#EAE0C8]/85 to-[#EAE0C8]/25'
            : 'bg-gradient-to-r from-[#191919]/20 via-[#191919]/75 to-[#191919]/20'
        }`}
      />

      {/* =====================================================================
          SECTION 1: UNIFIED HEADER + HERO SECTION
          When scrolled down, the Hero portrait smoothly enlarges & disappears.
      ====================================================================== */}
      <section
        id="hero-section"
        style={{ contain: 'layout style paint' }}
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
          {/* Top-Left: "Aspiring Data Scientist & ML Engineer" inside Liquid Glass Button */}
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
              src={assetPath('/assets/aistudio/image_29381f68.png')}
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
              {/* Subtle Circular Liquid Glass Halo Behind Portrait */}
              <div
                ref={heroHaloRef}
                aria-hidden="true"
                style={{ willChange: 'transform, opacity' }}
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

              {/* Layer 2: Middle Cutout Portrait (Enlarges & Smoothly Disappears on Scroll Down) */}
              <div
                ref={heroPortraitRef}
                style={{
                  willChange: 'transform, opacity',
                  transformOrigin: 'center 62%',
                }}
                className="relative z-20 w-full h-full flex items-end justify-center pointer-events-none"
              >
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
      </section>

      {/* =====================================================================
          SECTION 2: SKILLS & SPECIALTY ROLLER SECTION
          - Left 65%: Big Transparent Liquid Glass Button Named "Skills"
          - Right 35%: Vertical Specialty Roller with 3 Periodic Dots
      ====================================================================== */}
      <section
        id="white-section"
        style={{ contain: 'layout style paint' }}
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
                src={assetPath('/assets/aistudio/image_80f8f045.png')}
                alt="Skills Grid Reference"
                referrerPolicy="no-referrer"
                className="sr-only"
              />
              <img
                src={assetPath('/assets/aistudio/image_d9197c85.png')}
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
                          y: 3,
                          scale: 0.96,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                        }}
                        exit={{
                          opacity: 0,
                          y: -2,
                          scale: 0.96,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 650,
                          damping: 30,
                          mass: 0.22,
                        }}
                        className={`border shadow-lg px-4 sm:px-5 py-1.5 rounded-full flex items-center gap-2.5 transform-gpu ${
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
                      {SKILLS_PROGRAMMING_LANGUAGES.map((skill, idx) => (
                        <SkillCapsuleButton
                          key={skill.id}
                          skill={skill}
                          isSelected={activeSkill?.id === skill.id}
                          isDark={isDark}
                          glassBtn={glassBtn}
                          mobileSpan={
                            idx < 4
                              ? 'col-span-3 sm:col-span-1'
                              : 'col-span-4 sm:col-span-1'
                          }
                          onHover={() => setActiveSkill(skill)}
                          onSelect={() =>
                            setActiveSkill((prev) =>
                              prev?.id === skill.id ? null : skill
                            )
                          }
                        />
                      ))}
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
                        {SKILLS_WEB_AND_DB.map((skill) => (
                          <SkillCapsuleButton
                            key={skill.id}
                            skill={skill}
                            isSelected={activeSkill?.id === skill.id}
                            isDark={isDark}
                            glassBtn={glassBtn}
                            onHover={() => setActiveSkill(skill)}
                            onSelect={() =>
                              setActiveSkill((prev) =>
                                prev?.id === skill.id ? null : skill
                              )
                            }
                          />
                        ))}
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
                        {SKILLS_FRAMEWORKS.map((skill) => (
                          <SkillCapsuleButton
                            key={skill.id}
                            skill={skill}
                            isSelected={activeSkill?.id === skill.id}
                            isDark={isDark}
                            glassBtn={glassBtn}
                            onHover={() => setActiveSkill(skill)}
                            onSelect={() =>
                              setActiveSkill((prev) =>
                                prev?.id === skill.id ? null : skill
                              )
                            }
                          />
                        ))}
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
                      {SKILLS_PYTHON_LIBRARIES.map((skill, idx) => (
                        <SkillCapsuleButton
                          key={skill.id}
                          skill={skill}
                          isSelected={activeSkill?.id === skill.id}
                          isDark={isDark}
                          glassBtn={glassBtn}
                          mobileSpan={
                            idx < 4
                              ? 'col-span-3 sm:col-span-1'
                              : 'col-span-4 sm:col-span-1'
                          }
                          onHover={() => setActiveSkill(skill)}
                          onSelect={() =>
                            setActiveSkill((prev) =>
                              prev?.id === skill.id ? null : skill
                            )
                          }
                        />
                      ))}
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
                        {SKILLS_TOOLS.map((skill) => (
                          <SkillCapsuleButton
                            key={skill.id}
                            skill={skill}
                            isSelected={activeSkill?.id === skill.id}
                            isDark={isDark}
                            glassBtn={glassBtn}
                            onHover={() => setActiveSkill(skill)}
                            onSelect={() =>
                              setActiveSkill((prev) =>
                                prev?.id === skill.id ? null : skill
                              )
                            }
                          />
                        ))}
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
                        {SKILLS_DESIGN_TOOLS.map((skill) => (
                          <SkillCapsuleButton
                            key={skill.id}
                            skill={skill}
                            isSelected={activeSkill?.id === skill.id}
                            isDark={isDark}
                            glassBtn={glassBtn}
                            onHover={() => setActiveSkill(skill)}
                            onSelect={() =>
                              setActiveSkill((prev) =>
                                prev?.id === skill.id ? null : skill
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* =====================================================================
          SECTION 3: DEDICATED PROJECTS FOLDER SECTION
          - Frosted Liquid-Glass Folder Named "PROJECTS"
      ====================================================================== */}
      <section
        id="projects-section"
        style={{ contain: 'layout style paint' }}
        className="relative w-full h-screen min-h-[640px] overflow-hidden select-none transform-gpu"
      >
        {/* Full-Viewport Liquid Glass Stage Vessel */}
        <div
          className={`absolute inset-2.5 sm:inset-4 lg:inset-5 rounded-[28px] sm:rounded-[36px] pointer-events-none z-0 ${glassSurface}`}
        />

        <div className="relative z-10 w-full h-full flex items-center justify-center">
          <ProjectsRoadmap isDark={isDark} />
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: DEDICATED CREDENTIALS SECTION
          - Vertical Stepped Stack of Blurred Certificate Cards (image_c19289cb.png)
      ====================================================================== */}
      <section
        id="credentials-section"
        style={{ contain: 'layout style paint' }}
        className="relative w-full h-screen min-h-[640px] overflow-hidden select-none transform-gpu"
      >
        {/* Full-Viewport Liquid Glass Stage Vessel */}
        <div
          className={`absolute inset-2.5 sm:inset-4 lg:inset-5 rounded-[28px] sm:rounded-[36px] pointer-events-none z-0 ${glassSurface}`}
        />

        <div className="relative z-10 w-full h-full flex items-center justify-center">
          <CredentialsSection isDark={isDark} />
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: FOOTER SECTION
          - Interactive Sliced "ARYAN DAS" Typography + Social Links Dock
      ====================================================================== */}
      <footer
        id="footer-section"
        onClick={() => setActivePopout(null)}
        style={{ contain: 'layout style paint' }}
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
            src={assetPath('/assets/aistudio/image_ae9b3c4d.png')}
            alt="Footer Layout Reference"
            referrerPolicy="no-referrer"
            className="sr-only"
          />
          <img
            src={assetPath('/assets/aistudio/image_32fb019c.png')}
            alt="Links Tab Reference"
            referrerPolicy="no-referrer"
            className="sr-only"
          />
          <img
            src={assetPath('/assets/aistudio/image_64a6b47f.png')}
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
      </footer>
    </div>
  );
}

