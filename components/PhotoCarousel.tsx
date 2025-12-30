import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TreeMode } from '../types';

// City photos - same as in Foliage.tsx
const CITY_PHOTOS = [
  { name: 'Edinburgh', url: '/imgs/Edinburgh.jpg' },
  { name: 'Tokyo', url: '/imgs/Tokyo.jpg' },
  { name: 'Seoul', url: '/imgs/Seoul.jpg' },
  { name: 'Manila', url: '/imgs/Manila.jpg' },
  { name: 'Kuala Lumpur', url: '/imgs/Kuala-Lumpur.jpg' },
  { name: 'Bangkok', url: '/imgs/Bangkok.jpg' },
  { name: 'Shanghai', url: '/imgs/Shanghai.jpg' },
  { name: 'Nantong', url: '/imgs/Nantong.jpg' },
  { name: 'Guangzhou', url: '/imgs/Guangzhou.jpg' },
];

// Duplicate photos for infinite scroll effect
const EXTENDED_PHOTOS = [...CITY_PHOTOS, ...CITY_PHOTOS, ...CITY_PHOTOS];

enum CarouselStage {
  HIDDEN,
  FLYING_IN,  // Photos fly from random positions to form a line
  SCROLLING,  // Normal carousel scrolling
}

interface PhotoCarouselProps {
  mode: TreeMode;
}

export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({ mode }) => {
  const [stage, setStage] = useState<CarouselStage>(CarouselStage.HIDDEN);
  const [offset, setOffset] = useState(0);
  const [flyProgress, setFlyProgress] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Photo dimensions and spacing
  const photoWidth = 280;
  const photoSpacing = 40;
  const totalPhotoWidth = photoWidth + photoSpacing;
  const singleSetWidth = CITY_PHOTOS.length * totalPhotoWidth;

  // Generate random starting positions for fly-in animation
  const randomPositions = useMemo(() => {
    return EXTENDED_PHOTOS.map(() => ({
      x: (Math.random() - 0.5) * window.innerWidth * 2,
      y: (Math.random() - 0.5) * window.innerHeight * 2,
      rotation: (Math.random() - 0.5) * 720,
      scale: 0.3 + Math.random() * 0.5,
    }));
  }, []);

  // Start carousel sequence after entering CHAOS mode
  useEffect(() => {
    let delayTimer: number | null = null;
    let flyTimer: number | null = null;

    if (mode === TreeMode.CHAOS) {
      // After 2s explosion, start fly-in animation
      delayTimer = window.setTimeout(() => {
        setStage(CarouselStage.FLYING_IN);
        setFlyProgress(0);
        lastTimeRef.current = performance.now();
      }, 2000);
    } else {
      setStage(CarouselStage.HIDDEN);
      setOffset(0);
      setFlyProgress(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (delayTimer) clearTimeout(delayTimer);
      if (flyTimer) clearTimeout(flyTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode]);

  // Animation loop
  useEffect(() => {
    if (stage === CarouselStage.HIDDEN) return;

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      if (stage === CarouselStage.FLYING_IN) {
        setFlyProgress((prev) => {
          const newProgress = prev + deltaTime * 0.8; // 1.25 seconds to complete
          if (newProgress >= 1) {
            // Transition to scrolling
            setStage(CarouselStage.SCROLLING);
            return 1;
          }
          return newProgress;
        });
      } else if (stage === CarouselStage.SCROLLING) {
        const scrollSpeed = 40;
        setOffset((prev) => {
          let newOffset = prev + scrollSpeed * deltaTime;
          if (newOffset >= singleSetWidth) {
            newOffset -= singleSetWidth;
          }
          return newOffset;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stage, singleSetWidth]);

  if (stage === CarouselStage.HIDDEN) return null;

  const startOffset = singleSetWidth;

  // Easing function for smooth animation
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easedProgress = easeOutCubic(flyProgress);

  // Calculate backdrop opacity - fade in during fly-in
  const backdropOpacity = stage === CarouselStage.FLYING_IN
    ? flyProgress * 0.5
    : 0.5;

  return (
    <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
      {/* Semi-transparent backdrop - fades in */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: backdropOpacity }}
      ></div>

      {/* Blurred layer - base layer with blur */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          filter: 'blur(10px)',
          opacity: stage === CarouselStage.FLYING_IN ? flyProgress * 0.4 : 0.4,
        }}
      >
        <div
          className="flex items-center"
          style={{
            transform: `translateX(${-startOffset - offset + photoWidth / 2}px)`,
          }}
        >
          {EXTENDED_PHOTOS.map((photo, index) => {
            const randomPos = randomPositions[index];

            // During fly-in, interpolate from random position to final position
            let transform = '';
            if (stage === CarouselStage.FLYING_IN) {
              const currentX = randomPos.x * (1 - easedProgress);
              const currentY = randomPos.y * (1 - easedProgress);
              const currentRotation = randomPos.rotation * (1 - easedProgress);
              const currentScale = randomPos.scale + (1 - randomPos.scale) * easedProgress;
              transform = `translate(${currentX}px, ${currentY}px) rotate(${currentRotation}deg) scale(${currentScale})`;
            }

            return (
              <div
                key={`blur-${photo.name}-${index}`}
                className="flex-shrink-0 relative"
                style={{
                  width: photoWidth,
                  marginRight: photoSpacing,
                  transform,
                }}
              >
                <div className="bg-white p-3 pb-10 shadow-2xl relative">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-4 bg-gradient-to-b from-[#D4AF37] to-[#C5A028] rounded-sm shadow-lg z-10"></div>
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="text-center mt-3 font-serif text-gray-700 text-base">
                    {photo.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clear center layer - with gradient mask for smooth transition */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, transparent 20%, black 35%, black 65%, transparent 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 20%, black 35%, black 65%, transparent 80%, transparent 100%)',
          opacity: stage === CarouselStage.FLYING_IN ? flyProgress : 1,
        }}
      >
        <div
          className="flex items-center"
          style={{
            transform: `translateX(${-startOffset - offset + photoWidth / 2}px)`,
          }}
        >
          {EXTENDED_PHOTOS.map((photo, index) => {
            const randomPos = randomPositions[index];

            // During fly-in, interpolate from random position to final position
            let transform = '';
            if (stage === CarouselStage.FLYING_IN) {
              const currentX = randomPos.x * (1 - easedProgress);
              const currentY = randomPos.y * (1 - easedProgress);
              const currentRotation = randomPos.rotation * (1 - easedProgress);
              const currentScale = randomPos.scale + (1 - randomPos.scale) * easedProgress;
              transform = `translate(${currentX}px, ${currentY}px) rotate(${currentRotation}deg) scale(${currentScale})`;
            }

            return (
              <div
                key={`clear-${photo.name}-${index}`}
                className="flex-shrink-0 relative"
                style={{
                  width: photoWidth,
                  marginRight: photoSpacing,
                  transform,
                }}
              >
                <div className="bg-white p-3 pb-10 shadow-2xl relative">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-4 bg-gradient-to-b from-[#D4AF37] to-[#C5A028] rounded-sm shadow-lg z-10"></div>
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="text-center mt-3 font-serif text-gray-700 text-base">
                    {photo.name}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
