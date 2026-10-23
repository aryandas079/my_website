import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowUpRight, Globe, RotateCw } from 'lucide-react';
import { GitHubLogo } from './FooterIcons';
import { assetPath } from '../utils/assetPath';

export interface ProjectRoadmapItem {
  id: string;
  name: string;
  uppercaseName: string;
  subtitle: string;
  description: string;
  techStack: string[];
  githubUrl: string;
  repoLabel: string;
  websiteUrl?: string;
  websiteLabel?: string;
  walletStack: {
    y: number;
    scale: number;
    zIndex: number;
  };
  grid2x2: {
    col: 0 | 1; // 0 = left column, 1 = right column
    row: 0 | 1; // 0 = top row, 1 = bottom row
    zIndex: number;
  };
  renderLogo: (className?: string) => React.ReactNode;
}

const projectLogoCache = new Map<string, string>();
const projectLogoInflight = new Map<string, Promise<string>>();

function processTransparentLogo(src: string): Promise<string> {
  if (projectLogoCache.has(src)) {
    return Promise.resolve(projectLogoCache.get(src)!);
  }
  if (projectLogoInflight.has(src)) {
    return projectLogoInflight.get(src)!;
  }

  const promise = new Promise<string>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(src);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = src;

    img.onload = () => {
      try {
        const rawWidth = img.naturalWidth || 160;
        const rawHeight = img.naturalHeight || 160;
        const scale = Math.min(1, 160 / Math.max(rawWidth, rawHeight));
        const width = Math.max(1, Math.round(rawWidth * scale));
        const height = Math.max(1, Math.round(rawHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a === 0) continue;

          const minChannel = Math.min(r, g, b);
          const maxChannel = Math.max(r, g, b);
          const saturation = maxChannel - minChannel;

          if (minChannel > 236 && saturation < 18) {
            data[i + 3] = 0;
          } else if (minChannel > 210 && saturation < 24) {
            const factor = (236 - minChannel) / 26;
            data[i + 3] = Math.round(a * Math.max(0, Math.min(1, factor)));
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const cleanUrl = canvas.toDataURL('image/png');
        projectLogoCache.set(src, cleanUrl);
        resolve(cleanUrl);
      } catch {
        resolve(src);
      } finally {
        projectLogoInflight.delete(src);
      }
    };

    img.onerror = () => {
      projectLogoInflight.delete(src);
      resolve(src);
    };
  });

  projectLogoInflight.set(src, promise);
  return promise;
}

if (typeof window !== 'undefined') {
  processTransparentLogo(assetPath('/assets/projects/vibes-music.png'));
  processTransparentLogo(assetPath('/assets/projects/erms-leaf.png'));
}

/**
 * Strips near-white background pixels from an uploaded project logo PNG
 * while preserving original colors (e.g. ERMS green leaf) or crisp contrast.
 * Cached at module level for zero-jank 3D flip animations.
 */
const TransparentAssetLogo: React.FC<{
  src: string;
  alt: string;
  className?: string;
}> = ({ src, alt, className = 'w-7 h-7' }) => {
  const [cleanUrl, setCleanUrl] = useState<string | null>(
    () => projectLogoCache.get(src) || null
  );

  useEffect(() => {
    let isMounted = true;
    processTransparentLogo(src).then((url) => {
      if (isMounted) setCleanUrl(url);
    });
    return () => {
      isMounted = false;
    };
  }, [src]);

  return (
    <>
      <img src={src} alt={alt} referrerPolicy="no-referrer" className="sr-only" />
      <img
        src={cleanUrl || src}
        alt={alt}
        referrerPolicy="no-referrer"
        draggable={false}
        className={`${className} object-contain select-none`}
      />
    </>
  );
};

/**
 * 1. Haze Browser Logo (Three sweeping diagonal blades)
 */
const HazeBrowserLogo: React.FC<{ className?: string }> = ({
  className = 'w-7 h-7',
}) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M6.5 18.8C11.2 14.2 19.6 10.6 28.4 9.5C29.3 9.4 29.6 10.5 28.8 11C21.5 14.8 13.8 17.8 7.3 20.1C6.4 20.4 5.9 19.4 6.5 18.8Z"
      fill="#191919"
    />
    <path
      d="M8.2 23.2C13.4 18.8 21.4 15.4 29.8 14.2C30.6 14.1 30.9 15.1 30.1 15.6C23.1 19.2 15.5 22.1 9 24.4C8.1 24.7 7.6 23.7 8.2 23.2Z"
      fill="#191919"
      fillOpacity="0.62"
    />
    <path
      d="M10.2 27.3C15.2 23.3 22.6 20.1 30.4 18.9C31.2 18.8 31.5 19.8 30.7 20.3C24.1 23.6 17.1 26.3 11 28.5C10.1 28.8 9.6 27.8 10.2 27.3Z"
      fill="#191919"
      fillOpacity="0.34"
    />
  </svg>
);

/**
 * 2. Vibes Logo (Sine Wave & Magnifying Glass Icon)
 */
const VibesLogo: React.FC<{ className?: string }> = ({
  className = 'w-7 h-7',
}) => (
  <TransparentAssetLogo
    src={assetPath('/assets/projects/vibes-music.png')}
    alt="Vibes Sine & Magnify Logo"
    className={className}
  />
);

/**
 * 3. IDLE Logo (IDLE Icon)
 */
const IdleLogo: React.FC<{ className?: string }> = ({
  className = 'w-7 h-7',
}) => (
  <img
    src={assetPath('/assets/projects/idle-portfolio.png')}
    alt="IDLE Logo"
    referrerPolicy="no-referrer"
    draggable={false}
    className={`${className} rounded-lg object-contain select-none`}
  />
);

/**
 * 4. ERMS Logo (Green Leaf Icon)
 */
const ErmsLogo: React.FC<{ className?: string }> = ({
  className = 'w-7 h-7',
}) => (
  <TransparentAssetLogo
    src={assetPath('/assets/projects/erms-leaf.png')}
    alt="ERMS Green Leaf Logo"
    className={className}
  />
);

export const ROADMAP_PROJECTS: ProjectRoadmapItem[] = [
  {
    id: 'haze',
    name: 'Haze Browser',
    uppercaseName: 'HAZE BROWSER',
    subtitle: 'Privacy-Hardened Chromium Web Browser',
    description:
      'Ultra-fast, minimalist Chromium web browser powered by a custom dual-ABI Native Chromium Engine (Blink + V8), C++17 native threat filtering, and hardware-grade credential encryption.',
    techStack: ['C++17', 'Chromium Blink', 'V8 Engine', 'Kotlin', 'Android NDK'],
    githubUrl: 'https://github.com/aryandas079/haze',
    repoLabel: 'github.com/aryandas079/haze',
    websiteUrl: 'https://aryandas079.github.io/Haze_website',
    websiteLabel: 'aryandas079.github.io/Haze_website',
    walletStack: {
      y: -92,
      scale: 0.91,
      zIndex: 10,
    },
    grid2x2: {
      col: 0,
      row: 0,
      zIndex: 45,
    },
    renderLogo: (cls) => <HazeBrowserLogo className={cls} />,
  },
  {
    id: 'vibes',
    name: 'Vibes',
    uppercaseName: 'VIBES',
    subtitle: 'Android Music Discovery & Streaming Engine',
    description:
      'Native Android music discovery and streaming engine built with Kotlin and Jetpack Compose, unifying local audio playback, contextual recommendations, and real-time synchronized lyrics.',
    techStack: ['Kotlin', 'Jetpack Compose', 'Media3 ExoPlayer', 'Coroutines', 'Material 3'],
    githubUrl: 'https://github.com/aryandas079/vibes',
    repoLabel: 'github.com/aryandas079/vibes',
    walletStack: {
      y: -62,
      scale: 0.94,
      zIndex: 15,
    },
    grid2x2: {
      col: 1,
      row: 0,
      zIndex: 46,
    },
    renderLogo: (cls) => <VibesLogo className={cls} />,
  },
  {
    id: 'idle',
    name: 'IDLE',
    uppercaseName: 'IDLE',
    subtitle: 'Intelligent Detection Layer for Experience',
    description:
      'Privacy-first sensory protection architecture that detects potentially overwhelming digital stimuli in real time and applies user-controlled visual and auditory adjustments.',
    techStack: ['Python', 'Computer Vision', 'Signal Processing', 'Real-Time Filtering'],
    githubUrl: 'https://github.com/aryandas079/idle',
    repoLabel: 'github.com/aryandas079/idle',
    walletStack: {
      y: -32,
      scale: 0.97,
      zIndex: 20,
    },
    grid2x2: {
      col: 0,
      row: 1,
      zIndex: 47,
    },
    renderLogo: (cls) => <IdleLogo className={cls} />,
  },
  {
    id: 'erms',
    name: 'ERMS',
    uppercaseName: 'ERMS',
    subtitle: 'Environmental Risk Management System (SIH 2026)',
    description:
      'Sovereign All-India Multi-Hazard Early Warning & Disaster Command System powered by Dual Ensemble ML, React, and Python for Smart India Hackathon (SIH2026-26178).',
    techStack: ['React', 'TypeScript', 'Python', 'Ensemble ML', 'FastAPI'],
    githubUrl: 'https://github.com/aryandas079/sih26178',
    repoLabel: 'github.com/aryandas079/sih26178',
    websiteUrl: 'https://trinityerms.vercel.app',
    websiteLabel: 'trinityerms.vercel.app',
    walletStack: {
      y: -2,
      scale: 1,
      zIndex: 25,
    },
    grid2x2: {
      col: 1,
      row: 1,
      zIndex: 48,
    },
    renderLogo: (cls) => <ErmsLogo className={cls} />,
  },
];

export const ProjectsRoadmap: React.FC<{ isDark?: boolean }> = ({
  isDark = false,
}) => {
  const [selectedProject, setSelectedProject] =
    useState<ProjectRoadmapItem | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isScattered, setIsScattered] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(false);

  // Pre-warm project logo assets on mount so 3D card flips never block the main thread
  useEffect(() => {
    processTransparentLogo(assetPath('/assets/projects/vibes-music.png'));
    processTransparentLogo(assetPath('/assets/projects/erms-leaf.png'));
  }, []);

  useEffect(() => {
    const checkViewport = () => {
      setIsMobileView(window.innerWidth < 640);
    };
    checkViewport();
    window.addEventListener('resize', checkViewport, { passive: true });
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  const handleSelectProject = (project: ProjectRoadmapItem) => {
    setSelectedProject(project);
    setIsFlipped(false);
  };

  const handleCloseProject = () => {
    setIsFlipped(false);
    setSelectedProject(null);
  };

  const handleBackgroundClick = () => {
    if (selectedProject) {
      handleCloseProject();
    } else if (isScattered) {
      setIsScattered(false);
    }
  };

  // Folder is Liquid Glass before clicking, and becomes Tinted when clicked
  const isFolderTinted = isScattered || Boolean(selectedProject);

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center px-4 sm:px-8 py-6 overflow-hidden select-none"
      onClick={handleBackgroundClick}
    >
      {/* ===================================================================
          CENTERPIECE WALLET-STACKED FOLDER & 2x2 GRID ASSEMBLY
          - Before clicking folder: 4 Horizontal Rectangular White Cards stacked
            like a wallet inside the Liquid Glass folder
          - Hovering any card lifts it slightly from the folder
          - Clicking folder: Tints the folder & arranges the 4 cards into a
            clean, upright 2×2 grid (2 columns × 2 rows) using pure GPU transforms
          - Clicking any card: Pops it out -> Clicking again flips it 180° in 3D
      ==================================================================== */}
      <div
        className="relative z-10 flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Interactive Folder & Cards Stage */}
        <div className="relative w-[340px] sm:w-[600px] md:w-[680px] h-[320px] sm:h-[360px] flex items-end justify-center">
          {/* 1. Back Folder Plate */}
          <motion.div
            aria-hidden="true"
            animate={{
              scale: isScattered ? 0.92 : 1,
              opacity: isScattered ? 0.65 : 1,
            }}
            transition={{ type: 'spring', stiffness: 520, damping: 32, mass: 0.4 }}
            className={`absolute bottom-[16px] w-[268px] sm:w-[330px] md:w-[356px] h-[205px] sm:h-[232px] rounded-[28px] transition-colors duration-200 border transform-gpu ${
              isFolderTinted
                ? isDark
                  ? 'bg-[#3A3A42]/90 border-white/20 shadow-inner'
                  : 'bg-[#D2D2D7] border-black/10 shadow-inner'
                : isDark
                ? 'bg-[#E2E2E8]/85 border-white/35 shadow-inner'
                : 'bg-[#E6E6EB]/90 border-black/[0.08] shadow-inner'
            }`}
          />

          {/* 2. Four Horizontal Rectangular Project Cards:
                 - Wallet Stack inside folder when !isScattered
                 - Clean Upright 2×2 Grid (2 cols × 2 rows) when isScattered
                 - Fixed layout dimensions + pure GPU x/y/scale spring animation */}
          <div className="absolute inset-x-0 bottom-[32px] h-[260px] sm:h-[300px] flex items-end justify-center pointer-events-none">
            {ROADMAP_PROJECTS.map((project) => {
              const isPoppedOut = selectedProject?.id === project.id;
              const isHovered = hoveredCardId === project.id;

              // Exact 2x2 Grid coordinates (Col 0 = Left, Col 1 = Right | Row 0 = Top, Row 1 = Bottom)
              const gridXDesktop = project.grid2x2.col === 0 ? -156 : 156;
              const gridYDesktop = project.grid2x2.row === 0 ? -174 : 8;

              const gridXMobile = project.grid2x2.col === 0 ? -84 : 84;
              const gridYMobile = project.grid2x2.row === 0 ? -152 : -14;

              const targetX = isScattered
                ? isMobileView
                  ? gridXMobile
                  : gridXDesktop
                : 0;

              const baseTargetY = isScattered
                ? isMobileView
                  ? gridYMobile
                  : gridYDesktop
                : project.walletStack.y;

              const targetY = isPoppedOut
                ? baseTargetY - 28
                : isHovered
                ? baseTargetY - (isScattered ? 8 : 16)
                : baseTargetY;

              const baseScatteredScale = isMobileView ? 0.68 : 0.96;

              const targetScale = isPoppedOut
                ? baseScatteredScale * 0.92
                : isScattered
                ? isHovered
                  ? baseScatteredScale * 1.04
                  : baseScatteredScale
                : isHovered
                ? project.walletStack.scale + 0.025
                : project.walletStack.scale;

              const cardZIndex = isScattered
                ? isHovered
                  ? 60
                  : project.grid2x2.zIndex
                : project.walletStack.zIndex;

              return (
                <motion.button
                  key={project.id}
                  type="button"
                  onMouseEnter={() => setHoveredCardId(project.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                  onClick={() => handleSelectProject(project)}
                  initial={false}
                  animate={{
                    x: targetX,
                    y: targetY,
                    rotate: 0,
                    scale: targetScale,
                    opacity: isPoppedOut ? 0 : 1,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 520,
                    damping: 32,
                    mass: 0.42,
                  }}
                  style={{
                    zIndex: cardZIndex,
                    willChange: 'transform, opacity',
                  }}
                  aria-label={`Open ${project.name} project card`}
                  className="pointer-events-auto absolute bottom-0 w-[232px] sm:w-[292px] h-[140px] sm:h-[158px] rounded-[20px] bg-white border border-black/12 shadow-[0_12px_32px_rgba(0,0,0,0.16)] px-4 sm:px-5 pt-3.5 pb-4 flex flex-col items-center justify-start cursor-pointer transform-gpu transition-shadow duration-150 hover:shadow-[0_18px_40px_rgba(0,0,0,0.24)]"
                >
                  {/* Top Header Inside Horizontal Rectangular White Card: ONLY the Project Name in Uppercase Sans */}
                  <span className="w-full text-center font-sans font-bold text-[11px] sm:text-xs tracking-[0.09em] uppercase text-[#191919] truncate">
                    {project.uppercaseName}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* 3. Front Folder Pocket (Translucent Liquid Glass Before Clicking -> Tinted Glass When Clicked) */}
          <motion.div
            animate={{
              scale: isScattered ? 0.92 : 1,
              opacity: isScattered ? 0.72 : 1,
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 520, damping: 32, mass: 0.4 }}
            onClick={() => setIsScattered((prev) => !prev)}
            role="button"
            tabIndex={0}
            aria-label="Click folder to open project cards in 2x2 grid"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsScattered((prev) => !prev);
              }
            }}
            className="relative z-30 w-[288px] sm:w-[348px] md:w-[378px] h-[152px] sm:h-[172px] cursor-pointer transform-gpu drop-shadow-[0_20px_32px_rgba(0,0,0,0.18)]"
          >
            <svg
              viewBox="0 0 380 180"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="folder-glass-light" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255, 255, 255, 0.86)" />
                  <stop offset="48%" stopColor="rgba(244, 244, 250, 0.78)" />
                  <stop offset="85%" stopColor="rgba(250, 250, 254, 0.9)" />
                  <stop offset="100%" stopColor="rgba(255, 255, 255, 0.96)" />
                </linearGradient>
                <linearGradient id="folder-glass-dark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(236, 236, 242, 0.76)" />
                  <stop offset="48%" stopColor="rgba(222, 222, 230, 0.68)" />
                  <stop offset="85%" stopColor="rgba(240, 240, 246, 0.82)" />
                  <stop offset="100%" stopColor="rgba(252, 252, 255, 0.92)" />
                </linearGradient>
                <linearGradient id="folder-glass-tinted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(46, 46, 52, 0.9)" />
                  <stop offset="50%" stopColor="rgba(74, 74, 82, 0.86)" />
                  <stop offset="86%" stopColor="rgba(168, 168, 176, 0.92)" />
                  <stop offset="100%" stopColor="rgba(242, 242, 246, 0.98)" />
                </linearGradient>
              </defs>

              {/* Pure GPU-Composited SVG Folder Silhouette Fill (Zero foreignObject / backdrop-filter lag) */}
              <path
                d="M 0 26 C 0 11.64 11.64 0 26 0 L 146 0 C 162 0 170 8 180 20 C 190 32 200 38 218 38 L 354 38 C 368.36 38 380 49.64 380 64 L 380 152 C 380 167.46 367.46 180 352 180 L 28 180 C 12.54 180 0 167.46 0 152 Z"
                fill={
                  isFolderTinted
                    ? 'url(#folder-glass-tinted)'
                    : isDark
                    ? 'url(#folder-glass-dark)'
                    : 'url(#folder-glass-light)'
                }
              />

              {/* Specular Rim Border Around Folder Silhouette */}
              <path
                d="M 1 26 C 1 12.2 12.2 1 26 1 L 146 1 C 161.5 1 169.2 8.8 179.2 20.6 C 189.4 32.8 199.6 39 218 39 L 354 39 C 367.8 39 379 50.2 379 64 L 379 152 C 379 166.9 366.9 179 352 179 L 28 179 C 13.1 179 1 166.9 1 152 Z"
                stroke={
                  isFolderTinted
                    ? 'rgba(255, 255, 255, 0.95)'
                    : isDark
                    ? 'rgba(25, 25, 30, 0.22)'
                    : 'rgba(25, 25, 25, 0.16)'
                }
                strokeWidth="2"
                fill="none"
              />
            </svg>

            {/* Subtle Top-Left Folder Tab Label */}
            <div
              className={`absolute top-3.5 left-5 font-sans font-semibold text-[10px] sm:text-[11px] tracking-[0.06em] uppercase transition-colors duration-300 ${
                isFolderTinted ? 'text-white/95' : 'text-[#191919]/65'
              }`}
            >
              *ARYANDAS.
            </div>

            {/* Bottom-Right Dark Circular Arrow Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 560, damping: 30, mass: 0.35 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsScattered((prev) => !prev);
              }}
              aria-label="Toggle 2x2 project cards grid"
              className="pointer-events-auto absolute bottom-3.5 right-4 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#262626] hover:bg-black text-white border-[2.5px] border-white shadow-lg flex items-center justify-center cursor-pointer transition-colors"
            >
              <ArrowUpRight
                className={`w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5] transition-transform duration-150 ${
                  isScattered ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </motion.button>
          </motion.div>
        </div>

        {/* 4. Folder Title Below ("PROJECTS" in Uppercase Sans Only) */}
        <div className="mt-6 sm:mt-7 flex flex-col items-center text-center">
          <h2
            onClick={() => setIsScattered((prev) => !prev)}
            className={`font-sans font-medium tracking-[-0.02em] uppercase leading-none cursor-pointer transition-colors duration-200 ${
              isDark ? 'text-[#EAE0C8]' : 'text-[#191919]'
            }`}
            style={{ fontSize: 'clamp(2rem, 4.2vw, 3.35rem)' }}
          >
            PROJECTS
          </h2>
        </div>
      </div>

      {/* ===================================================================
          POPPED-OUT HORIZONTAL RECTANGULAR CARD OVERLAY
          - Front Side: Solid Blank White Background with Project Name in Uppercase Sans
          - When Clicked: Smooth 3D 180° Flip Animation Revealing Full Details
            (Logo, Title, Short Description, Tech Stack, Miniature Website Preview, GitHub & Website Links)
      ==================================================================== */}
      <AnimatePresence mode="popLayout">
        {selectedProject && (
          <motion.div
            key={selectedProject.id}
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            transition={{
              type: 'spring',
              stiffness: 540,
              damping: 34,
              mass: 0.42,
            }}
            onClick={handleCloseProject}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/[0.08] backdrop-blur-[2px]"
          >
            {/* 3D Perspective Stage for the Horizontal Rectangular Popped-Out Card */}
            <div
              className="relative w-full max-w-[460px] sm:max-w-[540px] h-[340px] sm:h-[370px]"
              style={{ perspective: '1600px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 30,
                  mass: 0.45,
                }}
                style={{
                  transformStyle: 'preserve-3d',
                  willChange: 'transform',
                }}
                className="relative w-full h-full"
              >
                {/* =========================================================
                    FRONT SIDE OF POPPED-OUT HORIZONTAL CARD:
                    Solid Blank White Background + Uppercase Project Name in Sans
                    (Clicking anywhere on this card flips it smoothly)
                ========================================================== */}
                <div
                  onClick={() => setIsFlipped(true)}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                  className="absolute inset-0 w-full h-full rounded-[28px] bg-white border border-black/12 shadow-[0_28px_70px_rgba(0,0,0,0.18)] p-6 sm:p-8 flex flex-col items-center justify-between cursor-pointer select-none"
                >
                  {/* Top Header: Project Name at Top + Close Button */}
                  <div className="w-full flex items-center justify-between">
                    <span className="font-sans font-bold text-xs tracking-[0.1em] uppercase text-[#191919]">
                      {selectedProject.uppercaseName}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseProject();
                      }}
                      aria-label="Return card to folder"
                      className="w-8 h-8 rounded-full bg-[#F4F4F6] hover:bg-black hover:text-white text-[#191919] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Center Blank White Space with Project Name Written in Uppercase Sans */}
                  <div className="my-auto flex flex-col items-center justify-center text-center px-2">
                    <h3
                      className="font-sans font-bold uppercase tracking-[-0.02em] text-[#191919]"
                      style={{ fontSize: 'clamp(1.85rem, 3.8vw, 2.75rem)' }}
                    >
                      {selectedProject.uppercaseName}
                    </h3>
                  </div>

                  {/* Subtle Bottom Flip Hint */}
                  <div className="w-full flex items-center justify-center gap-2 text-black/45 font-sans text-xs font-medium tracking-[0.08em] uppercase">
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Click card to flip</span>
                  </div>
                </div>

                {/* =========================================================
                    BACK SIDE OF FLIPPED HORIZONTAL CARD (Reveals Everything in Clean Sans):
                    - Project Logo & Title + Subtitle
                    - Short Description
                    - Tech Stack Pills
                    - Miniature Website Preview (for Haze & ERMS)
                    - GitHub Link & Live Website Link
                ========================================================== */}
                <div
                  onClick={() => setIsFlipped(false)}
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                  className="absolute inset-0 w-full h-full rounded-[28px] bg-white border border-black/12 shadow-[0_28px_70px_rgba(0,0,0,0.18)] p-5 sm:p-6 flex flex-col justify-between text-[#191919] cursor-pointer"
                >
                  {/* Top Header: Project Logo + Uppercase Sans Title & Subtitle + Close Button */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#F5F5F7] border border-black/8 flex items-center justify-center shrink-0">
                        {selectedProject.renderLogo('w-6 h-6 sm:w-7 sm:h-7')}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-sans font-bold text-sm sm:text-base uppercase tracking-[-0.01em] text-[#191919] truncate">
                          {selectedProject.uppercaseName}
                        </h3>
                        <p className="font-sans text-[11px] sm:text-xs text-black/60 truncate">
                          {selectedProject.subtitle}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseProject();
                      }}
                      aria-label="Close project card"
                      className="w-8 h-8 rounded-full bg-[#F4F4F6] hover:bg-black hover:text-white text-[#191919] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body: Description + Tech Stack (+ Compact Miniature Website Preview on Right when available) */}
                  <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 my-auto">
                    <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                      <p className="font-sans text-xs sm:text-[13px] text-[#2C2C2E] leading-relaxed line-clamp-3">
                        {selectedProject.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {selectedProject.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="px-2.5 py-0.5 rounded-lg bg-[#F4F4F6] font-sans font-medium text-[10px] sm:text-[11px] text-[#191919]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Very Small Live Website Preview Thumbnail on the Card */}
                    {selectedProject.websiteUrl && (
                      <a
                        href={selectedProject.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Open ${selectedProject.name} live website`}
                        className="group relative w-full sm:w-[156px] shrink-0 rounded-xl border border-black/12 bg-[#F5F5F7] overflow-hidden transition-all hover:border-black/35"
                      >
                        <div className="flex items-center justify-between px-2 py-1 bg-[#EBEBED] border-b border-black/8">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-black/25" />
                            <span className="w-1.5 h-1.5 rounded-full bg-black/25" />
                            <span className="ml-1 font-sans text-[9px] font-medium text-black/70 truncate">
                              {selectedProject.websiteLabel}
                            </span>
                          </div>
                          <ArrowUpRight className="w-2.5 h-2.5 text-black/70 shrink-0" />
                        </div>
                        <div className="relative w-full h-[64px] sm:h-[78px] bg-white overflow-hidden">
                          {isFlipped && (
                            <iframe
                              src={selectedProject.websiteUrl}
                              title={`${selectedProject.name} Live Preview`}
                              loading="lazy"
                              sandbox="allow-scripts allow-same-origin"
                              className="w-[400%] h-[400%] origin-top-left scale-[0.25] border-0 pointer-events-none select-none bg-white"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.03] transition-colors" />
                        </div>
                      </a>
                    )}
                  </div>

                  {/* Bottom Action Links: GitHub Link + Website Link (if applicable) */}
                  <div
                    className="pt-1 flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={selectedProject.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${selectedProject.name} GitHub Repository`}
                      className="bg-[#191919] hover:bg-black text-white flex-1 min-w-0 px-4 py-2 rounded-xl inline-flex items-center justify-between gap-2 font-sans text-xs font-medium transition-colors shadow-sm"
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        <GitHubLogo className="w-4 h-4 text-white shrink-0" />
                        <span className="truncate">
                          {selectedProject.repoLabel}
                        </span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-white/80 shrink-0" />
                    </a>

                    {selectedProject.websiteUrl && (
                      <a
                        href={selectedProject.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${selectedProject.name} Website`}
                        className="bg-[#F4F4F6] hover:bg-[#E5E5EA] text-[#191919] border border-black/10 px-3.5 py-2 rounded-xl inline-flex items-center justify-between gap-1.5 font-sans text-xs font-semibold transition-colors shrink-0"
                      >
                        <Globe className="w-3.5 h-3.5 text-[#191919] shrink-0" />
                        <span>Website</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-black/75 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
