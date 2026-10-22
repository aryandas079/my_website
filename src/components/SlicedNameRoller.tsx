import React, { useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';

const ROW_PERIOD = 116; // Vertical repeat period of the ARYAN DAS glyph row in SVG units

interface BandConfig {
  id: string;
  baseY: number;
  baseHeight: number;
  baseScaleX: number;
  baseScaleY: number;
  sampleOffsetY: number;
  parallaxFactor: number;
}

// 7 horizontal cylindrical bands matching /assets/aistudio/image_64a6b47f.png
const BANDS: BandConfig[] = [
  {
    id: 'band-0',
    baseY: 12,
    baseHeight: 11,
    baseScaleX: 0.75,
    baseScaleY: 0.24,
    sampleOffsetY: 6,
    parallaxFactor: -1.0,
  },
  {
    id: 'band-1',
    baseY: 29,
    baseHeight: 23,
    baseScaleX: 0.85,
    baseScaleY: 0.4,
    sampleOffsetY: 6,
    parallaxFactor: -0.68,
  },
  {
    id: 'band-2',
    baseY: 59,
    baseHeight: 43,
    baseScaleX: 0.94,
    baseScaleY: 0.58,
    sampleOffsetY: 6,
    parallaxFactor: -0.35,
  },
  {
    id: 'band-3',
    baseY: 110,
    baseHeight: 106,
    baseScaleX: 1.0,
    baseScaleY: 1.0,
    sampleOffsetY: 4,
    parallaxFactor: 0,
  },
  {
    id: 'band-4',
    baseY: 224,
    baseHeight: 48,
    baseScaleX: 0.95,
    baseScaleY: 0.62,
    sampleOffsetY: 34,
    parallaxFactor: 0.35,
  },
  {
    id: 'band-5',
    baseY: 279,
    baseHeight: 28,
    baseScaleX: 0.87,
    baseScaleY: 0.44,
    sampleOffsetY: 46,
    parallaxFactor: 0.68,
  },
  {
    id: 'band-6',
    baseY: 313,
    baseHeight: 13,
    baseScaleX: 0.77,
    baseScaleY: 0.26,
    sampleOffsetY: 60,
    parallaxFactor: 1.0,
  },
];

export const SlicedNameRoller: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bandGroupRefs = useRef<(SVGGElement | null)[]>([]);

  const physicsRef = useRef({
    currentY: 0,
    targetY: 0,
    velY: 0,
    currentX: 0,
    targetX: 0,
    velX: 0,
    isDragging: false,
    lastPointerY: 0,
    lastPointerX: 0,
    snapTimeout: null as number | null,
    rafId: null as number | null,
  });

  // Direct DOM update for 120fps zero-re-render SVG slice transforms
  const applySliceTransforms = useCallback(
    (offsetY: number, offsetX: number, velocityY: number) => {
      const wrappedY = ((offsetY % ROW_PERIOD) + ROW_PERIOD) % ROW_PERIOD;
      const clampedVel = Math.max(-18, Math.min(18, velocityY));

      for (let i = 0; i < BANDS.length; i++) {
        const el = bandGroupRefs.current[i];
        if (!el) continue;
        const band = BANDS[i];
        const bandScrollY = wrappedY + clampedVel * band.parallaxFactor * 0.85;
        const bandShiftX = offsetX * band.parallaxFactor;
        const dynamicScaleX = Math.max(
          0.68,
          Math.min(
            1.04,
            band.baseScaleX - band.parallaxFactor * (clampedVel * 0.0025)
          )
        );

        el.setAttribute(
          'transform',
          `translate(${(500 + bandShiftX).toFixed(2)}, ${band.baseY}) scale(${dynamicScaleX.toFixed(4)}, ${band.baseScaleY}) translate(-500, ${(-(band.sampleOffsetY + bandScrollY)).toFixed(2)})`
        );
      }
    },
    []
  );

  const wakePhysicsLoop = useCallback(() => {
    const p = physicsRef.current;
    if (p.rafId !== null) return;

    const step = () => {
      const stiffness = p.isDragging ? 0.26 : 0.11;
      const damping = p.isDragging ? 0.68 : 0.82;

      const forceY = (p.targetY - p.currentY) * stiffness;
      p.velY = (p.velY + forceY) * damping;
      p.currentY += p.velY;

      const forceX = (p.targetX - p.currentX) * stiffness;
      p.velX = (p.velX + forceX) * damping;
      p.currentX += p.velX;

      applySliceTransforms(p.currentY, p.currentX, p.velY);

      const isMoving =
        p.isDragging ||
        Math.abs(p.velY) > 0.008 ||
        Math.abs(p.targetY - p.currentY) > 0.015 ||
        Math.abs(p.velX) > 0.008 ||
        Math.abs(p.targetX - p.currentX) > 0.015;

      if (isMoving) {
        p.rafId = requestAnimationFrame(step);
      } else {
        p.currentY = p.targetY;
        p.currentX = p.targetX;
        p.velY = 0;
        p.velX = 0;
        applySliceTransforms(p.currentY, p.currentX, 0);
        p.rafId = null;
      }
    };

    p.rafId = requestAnimationFrame(step);
  }, [applySliceTransforms]);

  const scheduleSnapToRevolution = useCallback(
    (delayMs = 150) => {
      const p = physicsRef.current;
      if (p.snapTimeout !== null) {
        window.clearTimeout(p.snapTimeout);
      }
      p.snapTimeout = window.setTimeout(() => {
        if (!p.isDragging) {
          p.targetY = Math.round(p.targetY / ROW_PERIOD) * ROW_PERIOD;
          p.targetX = 0;
          wakePhysicsLoop();
        }
      }, delayMs);
    },
    [wakePhysicsLoop]
  );

  useEffect(() => {
    applySliceTransforms(0, 0, 0);
    return () => {
      const p = physicsRef.current;
      if (p.rafId !== null) {
        cancelAnimationFrame(p.rafId);
      }
      if (p.snapTimeout !== null) {
        window.clearTimeout(p.snapTimeout);
      }
    };
  }, [applySliceTransforms]);

  // Passive wheel listener so scrolling over "ARYAN DAS" spins the drum at 90% sensitivity while smoothly scrolling the page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      const p = physicsRef.current;
      p.targetY += e.deltaY * 0.9;
      p.targetX = Math.max(-36, Math.min(36, p.targetX + e.deltaX * 0.45));
      wakePhysicsLoop();
      scheduleSnapToRevolution(150);
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: true });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [scheduleSnapToRevolution, wakePhysicsLoop]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const p = physicsRef.current;
    p.isDragging = true;
    p.lastPointerY = e.clientY;
    p.lastPointerX = e.clientX;
    if (p.snapTimeout !== null) {
      window.clearTimeout(p.snapTimeout);
    }
    wakePhysicsLoop();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const p = physicsRef.current;
    if (p.isDragging) {
      const dy = e.clientY - p.lastPointerY;
      const dx = e.clientX - p.lastPointerX;
      p.lastPointerY = e.clientY;
      p.lastPointerX = e.clientX;
      p.targetY -= dy * 1.8;
      p.targetX = Math.max(-42, Math.min(42, p.targetX + dx * 0.6));
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const relY = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
      const relX = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
      const baseRevolution = Math.round(p.targetY / ROW_PERIOD) * ROW_PERIOD;
      p.targetY = baseRevolution + relY * (ROW_PERIOD * 0.9);
      p.targetX = relX * 32;
    }
    wakePhysicsLoop();
  };

  const handleMouseUpOrLeave = () => {
    const p = physicsRef.current;
    if (p.isDragging) {
      p.isDragging = false;
      p.targetY += p.velY * 5;
      wakePhysicsLoop();
    }
    scheduleSnapToRevolution(85);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const p = physicsRef.current;
    p.isDragging = true;
    p.lastPointerY = touch.clientY;
    p.lastPointerX = touch.clientX;
    if (p.snapTimeout !== null) {
      window.clearTimeout(p.snapTimeout);
    }
    wakePhysicsLoop();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const p = physicsRef.current;
    const dy = touch.clientY - p.lastPointerY;
    const dx = touch.clientX - p.lastPointerX;
    p.lastPointerY = touch.clientY;
    p.lastPointerX = touch.clientX;
    p.targetY -= dy * 1.65;
    p.targetX = Math.max(-42, Math.min(42, p.targetX + dx * 0.45));
    wakePhysicsLoop();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    const p = physicsRef.current;
    p.isDragging = false;
    p.targetY += p.velY * 6;
    wakePhysicsLoop();
    scheduleSnapToRevolution(100);
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{
        type: 'spring',
        stiffness: 220,
        damping: 24,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUpOrLeave}
      onMouseLeave={handleMouseUpOrLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
      className="relative w-full max-w-[340px] sm:max-w-[560px] md:max-w-[700px] lg:max-w-[780px] my-auto flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
    >
      <svg
        viewBox="0 0 1000 340"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="ARYAN DAS — Interactive Sliced Typography"
        className="w-full h-auto overflow-visible"
      >
        <defs>
          {/* Vertically Tiled Rows of Ultra-Heavy Uppercase "ARYAN DAS" for Seamless 360° Drum Rolling */}
          <g id="aryan-das-repeating-stream">
            {[-1, 0, 1, 2].map((rowIndex) => (
              <text
                key={rowIndex}
                x="500"
                y={104 + rowIndex * ROW_PERIOD}
                textAnchor="middle"
                fill="currentColor"
                style={{
                  fontFamily: "'Inter', 'Arial Black', sans-serif",
                  fontWeight: 900,
                  fontSize: '138px',
                  letterSpacing: '-0.055em',
                  textTransform: 'uppercase',
                }}
              >
                ARYAN DAS
              </text>
            ))}
          </g>

          {/* 7 Fixed Horizontal Cylindrical Slit Masks */}
          {BANDS.map((band) => (
            <clipPath key={band.id} id={`clip-${band.id}`}>
              <rect
                x="-60"
                y={band.baseY}
                width="1120"
                height={band.baseHeight}
              />
            </clipPath>
          ))}
        </defs>

        {/* Render each of the 7 cylindrical slices updated via direct DOM ref at 120fps */}
        {BANDS.map((band, idx) => (
          <g key={band.id} clipPath={`url(#clip-${band.id})`}>
            <g
              ref={(el) => {
                bandGroupRefs.current[idx] = el;
              }}
              transform={`translate(500, ${band.baseY}) scale(${band.baseScaleX}, ${band.baseScaleY}) translate(-500, ${-band.sampleOffsetY})`}
            >
              <use href="#aryan-das-repeating-stream" />
            </g>
          </g>
        ))}
      </svg>
    </motion.div>
  );
};
