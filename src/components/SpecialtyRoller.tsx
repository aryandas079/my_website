import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';

export const SPECIALTIES: string[] = [
  'Innovation',
  'Development',
  'Coding',
  'Analytics',
  'Algorithms',
  'Engineering',
  'Intelligence',
  'Architecture',
  'Research',
  'Automation',
];

const VISIBLE_OFFSETS = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;

interface SpecialtyRollerProps {
  isDark?: boolean;
}

/**
 * Monochrome vertical specialty roller inspired by image_add5823f.png.
 * - The three dots on the left hold their position at the vertical center while wriggling like a smooth loading wave.
 * - The specialty words continuously scroll upward at a speed of 1 word every 1.5s.
 * - Styled in crisp black & white according to the active theme.
 */
export const SpecialtyRoller: React.FC<SpecialtyRollerProps> = ({
  isDark = false,
}) => {
  const [stepIndex, setStepIndex] = useState<number>(0);
  const isHoveredRef = useRef<boolean>(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Continuously scroll words upward at a speed of 1 word every 1.5s (1500ms)
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (isHoveredRef.current) return;
      setStepIndex((prev) => prev + 1);
    }, 1500);

    return () => window.clearInterval(interval);
  }, []);

  const total = SPECIALTIES.length;

  // Responsive metrics tuned so all rows and the 3 wriggling dots fit cleanly inside the 35% column
  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
  const rowSpacing = isMobile ? 26 : isTablet ? 46 : 62;
  const activeIndentX = isMobile ? 22 : isTablet ? 40 : 56;
  const preActiveIndentX = isMobile ? 9 : isTablet ? 16 : 23;

  return (
    <div
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
      }}
      className="relative w-full h-full flex items-center justify-start overflow-hidden select-none pl-0.5 sm:pl-2 lg:pl-4"
    >
      {/* Hidden reference asset */}
      <img
        src="/assets/aistudio/image_add5823f.png"
        alt="Specialty Vertical Roller Reference"
        referrerPolicy="no-referrer"
        className="sr-only"
      />

      {/* Vertical cylinder mask so words entering at bottom & leaving at top fade smoothly */}
      <div
        className="relative w-full h-[220px] sm:h-[360px] lg:h-[470px] flex items-center"
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)',
        }}
      >
        {/* FIXED THREE DOTS ON THE LEFT WITH SEAMLESS INVERSE-PHASE Y-AXIS PERIODIC MOTION */}
        <div
          aria-hidden="true"
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center transition-colors duration-200 ${
            isDark ? 'text-white' : 'text-[#191919]'
          }`}
        >
          <svg
            viewBox="0 0 42 28"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[17px] h-[12px] sm:w-[31px] sm:h-[21px] lg:w-[42px] lg:h-[28px] overflow-visible"
          >
            {/* Dot 1 (Left End) — Oscillates from top (-5.5) to bottom (+5.5) and back */}
            <motion.circle
              cx="5.5"
              cy="14"
              r="4.5"
              animate={{ y: [-5.5, 5.5, -5.5] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0,
              }}
            />
            {/* Dot 2 (Middle) — Reaches the exact same [-5.5, +5.5] Y level with quarter-period wave flow */}
            <motion.circle
              cx="19"
              cy="14"
              r="4.5"
              animate={{ y: [-5.5, 5.5, -5.5] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: -0.3,
              }}
            />
            {/* Dot 3 (Right End) — Exact inverse of Dot 1: goes down (+5.5) when Dot 1 goes up (-5.5) and vice versa */}
            <motion.circle
              cx="32.5"
              cy="14"
              r="4.5"
              animate={{ y: [5.5, -5.5, 5.5] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0,
              }}
            />
          </svg>
        </div>

        {/* ROLLING SPECIALTY WORDS COLUMN (Continuously scrolls upward 1 word every 1.5s) */}
        <div className="relative w-full h-full flex items-center">
          {VISIBLE_OFFSETS.map((relOffset) => {
            const virtualIndex = stepIndex + relOffset;
            const wordIndex = ((virtualIndex % total) + total) % total;
            const word = SPECIALTIES[wordIndex];

            const absOffset = Math.abs(relOffset);
            const isVisible = absOffset <= 3;

            // Vertical position based on signed slot offset (decreasing relOffset moves upward)
            const targetY = relOffset * rowSpacing;

            // Horizontal offset:
            // - Center active word (relOffset === 0) sits right beside the fixed 3 dots
            // - Word at relOffset === -1 has a subtle intermediate indent (matching "Result" in reference image)
            // - All other words align cleanly with the left edge of the 3 dots
            const targetX =
              relOffset === 0
                ? activeIndentX
                : relOffset === -1
                ? preActiveIndentX
                : 0;

            // Pure black/white monochrome opacity hierarchy matching image_add5823f.png
            const targetOpacity =
              relOffset === 0
                ? 1
                : relOffset === -1
                ? 0.72
                : relOffset === 1
                ? 0.64
                : absOffset === 2
                ? 0.42
                : absOffset === 3
                ? 0.22
                : 0;

            const targetScale =
              relOffset === 0 ? 1.02 : absOffset === 1 ? 0.98 : 0.95;

            return (
              <motion.div
                key={virtualIndex}
                initial={{
                  x: 0,
                  y: (relOffset + 1) * rowSpacing,
                  opacity: 0,
                  scale: 0.92,
                }}
                animate={{
                  x: targetX,
                  y: targetY,
                  opacity: targetOpacity,
                  scale: targetScale,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 310,
                  damping: 28,
                  mass: 0.48,
                }}
                onClick={() => {
                  if (relOffset !== 0) {
                    setStepIndex((prev) => prev + relOffset);
                  }
                }}
                style={{
                  willChange: 'transform, opacity',
                  pointerEvents: isVisible ? 'auto' : 'none',
                }}
                className={`absolute left-0 origin-left cursor-pointer font-sans font-bold tracking-[-0.03em] leading-none whitespace-nowrap transition-colors duration-200 ${
                  isDark ? 'text-white' : 'text-[#191919]'
                }`}
              >
                <span
                  style={{
                    fontSize: 'clamp(0.86rem, 3.1vw, 3.15rem)',
                  }}
                >
                  {word}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
