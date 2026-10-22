import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const blurredCertCache = new Map<string, string>();
const blurredCertListeners = new Set<() => void>();

// Preload all credential certificate photos & pre-render lightweight blurred bitmaps once on module load
// so the 7 stacked cards render at 120fps with ZERO runtime CSS filter:blur() GPU cost
if (typeof window !== 'undefined') {
  for (const item of CREDENTIAL_CARDS) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = item.image;
    img.onload = () => {
      try {
        const w = 280;
        const h = 186;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = 'blur(6px)';
          ctx.drawImage(img, -12, -12, w + 24, h + 24);
          blurredCertCache.set(item.image, canvas.toDataURL('image/jpeg', 0.85));
          blurredCertListeners.forEach((cb) => cb());
        }
      } catch {
        // Fallback to original image if canvas taint occurs
      }
    };
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
  // isPhotoRevealed: true when unblurred right in place, false when blurred
  const [isPhotoRevealed, setIsPhotoRevealed] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const pointerStartRef = useRef<{
    x: number;
    y: number;
    active: boolean;
    moved: boolean;
  }>({
    x: 0,
    y: 0,
    active: false,
    moved: false,
  });

  const total = CREDENTIAL_CARDS.length;
  const [, setCacheTick] = useState<number>(0);

  useEffect(() => {
    const onBlurReady = () => setCacheTick((n) => n + 1);
    blurredCertListeners.add(onBlurReady);
    return () => {
      blurredCertListeners.delete(onBlurReady);
    };
  }, []);

  // Automatic card scrolling animation (1.5s per card)
  // STOPS SCROLLING COMPLETELY when unblurred (isPhotoRevealed) or hovered
  // Resumes scrolling only when clicked and blurred again
  useEffect(() => {
    if (isPhotoRevealed || isHovered) return;

    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [isHovered, isPhotoRevealed, total]);

  const handleSelectOffset = useCallback(
    (offset: number) => {
      if (offset === 0) return;
      setActiveIndex((prev) => (((prev + offset) % total) + total) % total);
    },
    [total]
  );

  // Single click handler:
  // - Clicking any card unblurs the image right where it is (and shifts it to center if needed)
  // - Clicking the active unblurred card blurs it again, which resumes scrolling!
  const handleCardClick = (idx: number) => {
    if (pointerStartRef.current.moved) return;

    if (idx !== activeIndex) {
      setActiveIndex(idx);
      setIsPhotoRevealed(true);
    } else {
      setIsPhotoRevealed((prev) => !prev);
    }
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    pointerStartRef.current = {
      x: clientX,
      y: clientY,
      active: true,
      moved: false,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!pointerStartRef.current.active) return;
    const dx = clientX - pointerStartRef.current.x;
    const dy = clientY - pointerStartRef.current.y;
    if (Math.hypot(dx, dy) > 12) {
      pointerStartRef.current.moved = true;
    }
  };

  const handlePointerUp = (clientX: number, clientY: number) => {
    const start = pointerStartRef.current;
    if (!start.active) return;
    pointerStartRef.current.active = false;

    const dx = clientX - start.x;
    const dy = clientY - start.y;
    const dist = Math.hypot(dx, dy);

    // Intentional swipe gesture (> 24px) to glide through cards
    if (dist > 24 && Math.abs(dy) > Math.abs(dx) * 1.25) {
      if (dy < 0) {
        handleSelectOffset(1);
      } else {
        handleSelectOffset(-1);
      }
    }
  };

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center px-4 sm:px-8 py-6 overflow-hidden select-none"
      onClick={() => {
        // Clicking outside the cards blurs it back and resumes scrolling
        if (isPhotoRevealed) {
          setIsPhotoRevealed(false);
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
          CENTER CONTINUOUS STEPPED STACK OF CERTIFICATE CARDS
          - All cards stay mounted and glide through stepped slots
          - Default: Blurred image in place with the Credential Title text
          - Single Click: Unblurs the image right where it is (no popups, nothing else!)
          - Auto-scrolling stops completely until clicked and blurred again
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
          const preBlurredUrl = blurredCertCache.get(card.image);
          const showCrispPhoto = isMain && isPhotoRevealed;

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
              onMouseDown={
                isMain
                  ? (e) => handlePointerDown(e.clientX, e.clientY)
                  : undefined
              }
              onMouseMove={
                isMain
                  ? (e) => handlePointerMove(e.clientX, e.clientY)
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
              onTouchMove={
                isMain
                  ? (e) => {
                      if (e.touches.length > 0) {
                        handlePointerMove(
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
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick(idx);
              }}
              role="button"
              tabIndex={0}
              aria-label={card.title}
              className={`absolute w-full max-w-[430px] sm:max-w-[480px] h-[280px] sm:h-[316px] rounded-[22px] overflow-hidden border border-white/35 bg-white cursor-pointer transform-gpu ${
                isMain
                  ? 'shadow-[0_20px_48px_rgba(0,0,0,0.3)]'
                  : 'shadow-[0_8px_22px_rgba(0,0,0,0.18)]'
              } ${relOffset === -3 ? 'pointer-events-none' : 'pointer-events-auto'}`}
            >
              {/* Certificate Image:
                  - Blurred in place when in stack
                  - Unblurs right in place on single click */}
              <img
                src={showCrispPhoto ? card.image : preBlurredUrl || card.image}
                alt={card.title}
                referrerPolicy="no-referrer"
                decoding="async"
                draggable={false}
                className={`absolute inset-0 w-full h-full select-none transition-all duration-300 ease-out ${
                  showCrispPhoto
                    ? 'object-contain bg-white scale-100 p-2 sm:p-2.5'
                    : preBlurredUrl
                    ? 'object-cover scale-105'
                    : 'object-cover blur-[8px] scale-105'
                }`}
              />

              {/* Soft Dark Scrim (Fades out completely when unblurred) */}
              <div
                aria-hidden="true"
                className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ease-out ${
                  showCrispPhoto ? 'opacity-0' : 'opacity-100 bg-black/32'
                }`}
              />

              {/* Credential Name Text (Visible only when blurred; disappears when unblurred) */}
              <AnimatePresence>
                {!showCrispPhoto && isMain && (
                  <motion.div
                    key="name-only"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="relative z-10 w-full h-full px-7 sm:px-10 flex items-center justify-center text-center pointer-events-none"
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
              </AnimatePresence>
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

