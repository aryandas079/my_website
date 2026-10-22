import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export interface CredentialCardItem {
  id: string;
  index: string;
  title: string;
  issuer: string;
  issuedDate: string;
  credentialId: string;
  skills: string[];
  image: string;
}

export const CREDENTIAL_CARDS: CredentialCardItem[] = [
  {
    id: 'ml-specialization',
    index: '01',
    title: 'Machine Learning Specialization',
    issuer: 'DeepLearning.AI, Stanford Online',
    issuedDate: 'Issued Aug 2026',
    credentialId: 'Credential ID XKX383ZHB6N5',
    skills: [
      'Unsupervised Learning',
      'Supervised Learning',
      'Recommender Systems',
      'Reinforcement Learning',
    ],
    image: '/assets/aistudio/image_ff85ff3b.png',
  },
  {
    id: 'data-scientist-associate',
    index: '02',
    title: 'Data Scientist Associate',
    issuer: 'DataCamp',
    issuedDate: 'Issued Apr 2026 · Expires Apr 2028',
    credentialId: 'Credential ID DSA0010107575598',
    skills: ['Data Visualization', 'Data Science', 'Exploratory Data Analysis'],
    image: '/assets/aistudio/image_c16992d5.png',
  },
  {
    id: 'full-stack-development',
    index: '03',
    title: 'Full Stack Development Certification',
    issuer: 'Scrimba',
    issuedDate: 'Issued Jun 2026',
    credentialId: '108.4 Hours · 2055 Lessons',
    skills: [
      'Full-Stack Development',
      'React',
      'Node.js',
      'JavaScript',
      'TypeScript',
    ],
    image: '/assets/aistudio/image_ea791bfa.png',
  },
  {
    id: 'cs50x-harvard',
    index: '04',
    title: 'CS50x: Introduction to Computer Science',
    issuer: 'Harvard University',
    issuedDate: 'Issued 2026',
    credentialId: 'Credential ID 0fb4aed9-507f-48a5-9a77-e47d29103931',
    skills: [
      'Computer Science',
      'C & C++',
      'Python',
      'SQL',
      'Data Structures & Algorithms',
    ],
    image: '/assets/aistudio/image_318648ab.png',
  },
  {
    id: 'ai-fluency-students',
    index: '05',
    title: 'AI Fluency for students',
    issuer: 'Anthropic',
    issuedDate: 'Issued 2026',
    credentialId: 'Anthropic · UCC · Ringling College · HEA',
    skills: [
      'Artificial Intelligence',
      'AI Fluency',
      'Responsible AI Integration',
    ],
    image: '/assets/aistudio/image_35410e10.png',
  },
  {
    id: 'career-essentials-genai',
    index: '06',
    title: 'Career Essentials in Generative AI',
    issuer: 'Microsoft & LinkedIn Learning',
    issuedDate: 'Issued Dec 2025',
    credentialId: 'Certificate ID d8cb877f1de1e8ff59425ac0d6473047',
    skills: ['Microsoft Copilot', 'Generative AI', 'Responsible AI'],
    image: '/assets/aistudio/image_bff95422.png',
  },
  {
    id: 'gemini-certified-student',
    index: '07',
    title: 'Gemini Certified Student',
    issuer: 'Google for Education',
    issuedDate: 'Issued Nov 2025 · Expires Nov 2028',
    credentialId: 'University Qualification · Google AI',
    skills: ['Google Gemini', 'Generative AI', 'Google AI Competency'],
    image: '/assets/aistudio/image_8e600cfe.png',
  },
];

interface CredentialsSectionProps {
  isDark?: boolean;
}

// Preload all credential certificate photos into browser cache on module evaluation
if (typeof window !== 'undefined') {
  for (const item of CREDENTIAL_CARDS) {
    const img = new Image();
    img.decoding = 'async';
    img.src = item.image;
  }
}

/**
 * Computes the continuous stepped-stack pose for any card based on its
 * signed circular offset `relOffset` in [-3, -2, -1, 0, 1, 2, 3].
 * Every card stays mounted so cycling is a seamless 60/120fps spring glide.
 */
function getSteppedCardPose(relOffset: number) {
  switch (relOffset) {
    case 0:
      // Main center card
      return {
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        zIndex: 30,
      };
    case -1:
      // First top peeking card
      return {
        y: -52,
        scaleX: 0.78,
        scaleY: 0.86,
        opacity: 0.92,
        zIndex: 20,
      };
    case -2:
      // Second top peeking card
      return {
        y: -82,
        scaleX: 0.58,
        scaleY: 0.78,
        opacity: 0.75,
        zIndex: 12,
      };
    case 1:
      // First bottom peeking card
      return {
        y: 54,
        scaleX: 0.84,
        scaleY: 0.88,
        opacity: 0.95,
        zIndex: 22,
      };
    case 2:
      // Second bottom peeking card
      return {
        y: 86,
        scaleX: 0.68,
        scaleY: 0.8,
        opacity: 0.84,
        zIndex: 14,
      };
    case 3:
      // Third bottom peeking card
      return {
        y: 114,
        scaleX: 0.52,
        scaleY: 0.74,
        opacity: 0.7,
        zIndex: 8,
      };
    default:
      // Back-most wrapped card (-3) smoothly tucked behind the deck
      return {
        y: -96,
        scaleX: 0.44,
        scaleY: 0.7,
        opacity: 0,
        zIndex: 2,
      };
  }
}

export const CredentialsSection: React.FC<CredentialsSectionProps> = ({
  isDark = false,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  // Default: false (only the name is shown over the blurred certificate)
  // Swiped: true (shows the clean LinkedIn details in white shadowed text over the blurred card)
  const [showDetails, setShowDetails] = useState<boolean>(false);
  // Clicked: true (reveals the unblurred original certificate photo directly inside the card itself)
  const [isPhotoRevealed, setIsPhotoRevealed] = useState<boolean>(false);
  // Pause automatic slow scrolling while hovering or inspecting photo/details
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const pointerStartRef = useRef<{
    x: number;
    y: number;
    active: boolean;
  }>({
    x: 0,
    y: 0,
    active: false,
  });

  const lastWheelTimeRef = useRef<number>(0);
  const total = CREDENTIAL_CARDS.length;

  // Slow automatic card scrolling animation (smoothly cycles every 3.8s when idle)
  useEffect(() => {
    if (isHovered || isPhotoRevealed || showDetails) return;

    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
      setShowDetails(false);
      setIsPhotoRevealed(false);
    }, 3800);

    return () => window.clearInterval(interval);
  }, [isHovered, isPhotoRevealed, showDetails, total]);

  const handleSelectOffset = (offset: number) => {
    if (offset === 0) return;
    const nextIdx = (((activeIndex + offset) % total) + total) % total;
    setActiveIndex(nextIdx);
    setShowDetails(false);
    setIsPhotoRevealed(false);
  };

  // Pointer / Touch handlers on the main card:
  // - Horizontal Swipe -> reveals/toggles the LinkedIn details over the blurred card
  // - Vertical Swipe -> smoothly advances/reverses the stepped card stack
  // - Click / Tap -> reveals the original certificate photo directly inside the card itself
  const handlePointerDown = (clientX: number, clientY: number) => {
    pointerStartRef.current = {
      x: clientX,
      y: clientY,
      active: true,
    };
  };

  const handlePointerUp = (clientX: number, clientY: number) => {
    const start = pointerStartRef.current;
    if (!start.active) return;
    pointerStartRef.current.active = false;

    const dx = clientX - start.x;
    const dy = clientY - start.y;
    const dist = Math.hypot(dx, dy);

    // Swipe gesture (> 14px)
    if (dist > 14) {
      if (Math.abs(dy) > Math.abs(dx) * 1.25 && Math.abs(dy) > 24) {
        // Vertical swipe cycles the stack smoothly
        if (dy < 0) {
          handleSelectOffset(1);
        } else {
          handleSelectOffset(-1);
        }
      } else {
        // Horizontal swipe toggles clean LinkedIn details on the blurred card
        if (isPhotoRevealed) {
          setIsPhotoRevealed(false);
          setShowDetails(true);
        } else {
          setShowDetails((prev) => !prev);
        }
      }
      return;
    }

    // Clean click -> toggle unblurred photo directly inside the card itself
    setIsPhotoRevealed((prev) => !prev);
  };

  const handleCardWheel = (e: React.WheelEvent) => {
    const now = performance.now();
    if (Math.abs(e.deltaX) > 10 && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.stopPropagation();
      if (now - lastWheelTimeRef.current < 320) return;
      lastWheelTimeRef.current = now;
      setIsPhotoRevealed(false);
      setShowDetails((prev) => !prev);
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center px-4 sm:px-8 py-6 overflow-hidden select-none"
      onClick={() => {
        if (isPhotoRevealed || showDetails) {
          setIsPhotoRevealed(false);
          setShowDetails(false);
        }
      }}
    >
      {/* Hidden reference assets */}
      <img
        src="/assets/aistudio/image_c19289cb.png"
        alt="Credentials Stack Layout Reference"
        referrerPolicy="no-referrer"
        className="sr-only"
      />
      <img
        src="/assets/aistudio/www.linkedin.com_in_iam-aryandas_details_certifications__1213d12c.png"
        alt="LinkedIn Licenses & Certifications Details Reference"
        referrerPolicy="no-referrer"
        className="sr-only"
      />

      {/* =====================================================================
          CENTER CONTINUOUS STEPPED STACK OF BLURRED CERTIFICATE CARDS
          - All 7 cards stay mounted and smoothly glide through stepped slots
          - Default: Only the Credential Name in clean white shadowed text
          - Swiped: Clean LinkedIn certification details in white shadowed text
          - Clicked: Unblurs and shows the original certificate photo inside the card itself
      ====================================================================== */}
      <div
        className="relative z-10 w-full max-w-[540px] h-[420px] sm:h-[480px] flex items-center justify-center"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => e.stopPropagation()}
      >
        {CREDENTIAL_CARDS.map((card, idx) => {
          // Signed circular offset in [-3, -2, -1, 0, 1, 2, 3]
          let relOffset = (idx - activeIndex) % total;
          if (relOffset > 3) relOffset -= total;
          if (relOffset < -3) relOffset += total;

          const isMain = relOffset === 0;
          const pose = getSteppedCardPose(relOffset);

          return (
            <motion.div
              key={card.id}
              initial={false}
              animate={{
                y: pose.y,
                scaleX: pose.scaleX,
                scaleY: pose.scaleY,
                opacity: pose.opacity,
              }}
              whileHover={
                isMain
                  ? { scaleX: 1.01, scaleY: 1.01 }
                  : relOffset < 0
                  ? { y: pose.y - 4 }
                  : { y: pose.y + 4 }
              }
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 32,
                mass: 0.48,
              }}
              style={{
                zIndex: pose.zIndex,
                willChange: 'transform, opacity',
              }}
              onWheel={isMain ? handleCardWheel : undefined}
              onMouseDown={
                isMain
                  ? (e) => handlePointerDown(e.clientX, e.clientY)
                  : undefined
              }
              onMouseUp={
                isMain
                  ? (e) => handlePointerUp(e.clientX, e.clientY)
                  : undefined
              }
              onTouchStart={
                isMain
                  ? (e) => {
                      if (e.touches.length > 0) {
                        handlePointerDown(
                          e.touches[0].clientX,
                          e.touches[0].clientY
                        );
                      }
                    }
                  : undefined
              }
              onTouchEnd={
                isMain
                  ? (e) => {
                      if (e.changedTouches.length > 0) {
                        handlePointerUp(
                          e.changedTouches[0].clientX,
                          e.changedTouches[0].clientY
                        );
                      }
                    }
                  : undefined
              }
              onClick={
                !isMain ? () => handleSelectOffset(relOffset) : undefined
              }
              role="button"
              tabIndex={isMain ? 0 : -1}
              aria-label={card.title}
              className={`absolute w-full max-w-[430px] sm:max-w-[480px] h-[280px] sm:h-[316px] rounded-[22px] overflow-hidden border border-white/35 bg-white cursor-pointer transform-gpu transition-shadow duration-200 ${
                isMain
                  ? 'shadow-[0_24px_60px_rgba(0,0,0,0.34)]'
                  : 'shadow-[0_10px_28px_rgba(0,0,0,0.22)]'
              } ${relOffset === -3 ? 'pointer-events-none' : 'pointer-events-auto'}`}
            >
              {/* Certificate Photo Inside the Card:
                  - Blurred when in stepped stack or showing Name / Swiped Details
                  - Crisp & Unblurred right inside the main card when clicked */}
              <img
                src={card.image}
                alt={card.title}
                referrerPolicy="no-referrer"
                decoding="async"
                draggable={false}
                className={`absolute inset-0 w-full h-full select-none transition-[filter,transform,padding] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  isMain && isPhotoRevealed
                    ? 'object-contain bg-white blur-0 scale-100 p-1.5'
                    : isMain
                    ? 'object-cover blur-[10px] scale-105'
                    : 'object-cover blur-[5px] scale-110'
                }`}
              />

              {/* Soft Dark Scrim (Fades out completely when photo is revealed inside the card) */}
              <div
                aria-hidden="true"
                className={`absolute inset-0 pointer-events-none transition-all duration-200 ease-out ${
                  isMain && isPhotoRevealed
                    ? 'opacity-0'
                    : isMain && showDetails
                    ? 'opacity-100 bg-black/52'
                    : isMain
                    ? 'opacity-100 bg-black/32'
                    : 'opacity-100 bg-black/22'
                }`}
              />

              {/* Clean White Shadowed Text Overlay on the Main Active Card */}
              {isMain && (
                <AnimatePresence mode="wait" initial={false}>
                  {!isPhotoRevealed && !showDetails && (
                    <motion.div
                      key="name-only"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{
                        duration: 0.16,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="relative z-10 w-full h-full px-7 sm:px-10 flex items-center justify-center text-center"
                    >
                      <h3
                        className="font-sans font-bold text-xl sm:text-2xl md:text-[26px] tracking-[-0.02em] leading-[1.2] text-white"
                        style={{
                          textShadow:
                            '0 2px 14px rgba(0, 0, 0, 0.78), 0 4px 28px rgba(0, 0, 0, 0.55)',
                        }}
                      >
                        {card.title}
                      </h3>
                    </motion.div>
                  )}

                  {!isPhotoRevealed && showDetails && (
                    <motion.div
                      key="swiped-details"
                      initial={{ opacity: 0, x: 14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -14 }}
                      transition={{
                        duration: 0.16,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="relative z-10 w-full h-full p-6 sm:p-8 flex flex-col justify-center text-left gap-2.5"
                      style={{
                        textShadow:
                          '0 2px 10px rgba(0, 0, 0, 0.85), 0 4px 22px rgba(0, 0, 0, 0.65)',
                      }}
                    >
                      <div className="space-y-0.5">
                        <h3 className="font-sans font-bold text-base sm:text-lg text-white leading-snug">
                          {card.title}
                        </h3>
                        <p className="font-sans font-medium text-xs sm:text-sm text-white/95">
                          {card.issuer}
                        </p>
                      </div>

                      <div className="space-y-0.5 text-xs text-white/90 font-sans">
                        <p>{card.issuedDate}</p>
                        <p className="font-mono text-[11px] text-white/85 truncate">
                          {card.credentialId}
                        </p>
                      </div>

                      <p className="font-sans text-xs text-white/95 leading-relaxed pt-1">
                        <span className="font-semibold text-white">
                          Skills:{' '}
                        </span>
                        {card.skills.join(', ')}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Section Title Below Stack (Matches PROJECTS Typography Style) */}
      <h2
        className={`mt-4 sm:mt-5 font-sans font-medium text-2xl sm:text-3xl tracking-[-0.02em] uppercase transition-colors duration-200 ${
          isDark ? 'text-[#EAE0C8]' : 'text-[#191919]'
        }`}
      >
        CREDENTIALS
      </h2>
    </div>
  );
};
