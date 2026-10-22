import React, { useEffect, useState } from 'react';

interface CutoutPortraitProps {
  imageSrc: string;
  alt: string;
  className?: string;
}

const cutoutPortraitCache = new Map<string, string>();
const cutoutPortraitInflight = new Map<string, Promise<string>>();

function processCutoutPortrait(imageSrc: string): Promise<string> {
  if (cutoutPortraitCache.has(imageSrc)) {
    return Promise.resolve(cutoutPortraitCache.get(imageSrc)!);
  }
  if (cutoutPortraitInflight.has(imageSrc)) {
    return cutoutPortraitInflight.get(imageSrc)!;
  }

  const promise = new Promise<string>((resolve) => {
    if (typeof window === 'undefined') {
      resolve(imageSrc);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = imageSrc;

    img.onload = () => {
      try {
        const rawWidth = img.naturalWidth || 460;
        const rawHeight = img.naturalHeight || 460;
        // Cap processing canvas size to 540px max for <5ms flood-fill without visual loss
        const scale = Math.min(1, 540 / Math.max(rawWidth, rawHeight));
        const width = Math.max(1, Math.round(rawWidth * scale));
        const height = Math.max(1, Math.round(rawHeight * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let head = 0;
        let tail = 0;

        const isWhiteBg = (idx: number) => {
          const p = idx * 4;
          return data[p] >= 232 && data[p + 1] >= 232 && data[p + 2] >= 232;
        };

        const enqueue = (x: number, y: number) => {
          if (x < 0 || x >= width || y < 0 || y >= height) return;
          const idx = y * width + x;
          if (visited[idx]) return;
          if (isWhiteBg(idx)) {
            visited[idx] = 1;
            queue[tail++] = idx;
          }
        };

        // Seed BFS from top, left, and right borders
        for (let x = 0; x < width; x++) {
          enqueue(x, 0);
        }
        for (let y = 0; y < height; y++) {
          enqueue(0, y);
          enqueue(width - 1, y);
        }

        // Flood-fill contiguous exterior white pixels
        while (head < tail) {
          const curr = queue[head++];
          const cx = curr % width;
          const cy = (curr / width) | 0;

          data[curr * 4 + 3] = 0;

          if (cx > 0) enqueue(cx - 1, cy);
          if (cx + 1 < width) enqueue(cx + 1, cy);
          if (cy > 0) enqueue(cx, cy - 1);
          if (cy + 1 < height) enqueue(cx, cy + 1);
        }

        // Soft anti-alias pass on the 1-2px boundary next to removed background
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;
            if (visited[idx]) continue;

            if (
              visited[idx - 1] ||
              visited[idx + 1] ||
              visited[idx - width] ||
              visited[idx + width]
            ) {
              const p = idx * 4;
              const lum = (data[p] + data[p + 1] + data[p + 2]) / 3;
              if (lum > 190) {
                const factor = Math.max(0, Math.min(1, (240 - lum) / 50));
                data[p + 3] = Math.round(data[p + 3] * factor);
              }
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        cutoutPortraitCache.set(imageSrc, dataUrl);
        resolve(dataUrl);
      } catch {
        resolve(imageSrc);
      } finally {
        cutoutPortraitInflight.delete(imageSrc);
      }
    };

    img.onerror = () => {
      cutoutPortraitInflight.delete(imageSrc);
      resolve(imageSrc);
    };
  });

  cutoutPortraitInflight.set(imageSrc, promise);
  return promise;
}

// Pre-warm hero portrait immediately on module evaluation
if (typeof window !== 'undefined') {
  processCutoutPortrait('/assets/portrait/aryan-portrait.png');
}

/**
 * Automatically removes the contiguous exterior white background of the portrait PNG
 * via border-seeded BFS flood-fill so interior features (eyes, teeth, skin, shirt)
 * remain 100% intact and opaque against both Dark (#191919) and Light backgrounds.
 */
export const CutoutPortrait: React.FC<CutoutPortraitProps> = ({
  imageSrc,
  alt,
  className = '',
}) => {
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(
    () => cutoutPortraitCache.get(imageSrc) || null
  );

  useEffect(() => {
    if (cutoutPortraitCache.has(imageSrc)) {
      setCutoutUrl(cutoutPortraitCache.get(imageSrc)!);
      return;
    }

    let isMounted = true;
    processCutoutPortrait(imageSrc).then((url) => {
      if (isMounted) {
        setCutoutUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [imageSrc]);

  return (
    <>
      <img
        src={imageSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        className="sr-only"
      />
      <img
        src={cutoutUrl || imageSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        decoding="async"
        fetchPriority="high"
        draggable={false}
        className={`${className} transition-opacity duration-150 ease-out ${
          cutoutUrl ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </>
  );
};
