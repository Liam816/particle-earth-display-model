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

enum CarouselStage {
  HIDDEN,
  FLYING_IN,
  SCROLLING,
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
    // Generate enough for visible photos (screen width / photo width * 2 for safety)
    const count = Math.ceil((window.innerWidth / totalPhotoWidth) * 3) + CITY_PHOTOS.length;
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * window.innerWidth * 2,
      y: (Math.random() - 0.5) * window.innerHeight * 2,
      rotation: (Math.random() - 0.5) * 720,
      scale: 0.3 + Math.random() * 0.5,
    }));
  }, [totalPhotoWidth]);

  // Start carousel sequence after entering CHAOS mode
  useEffect(() => {
    let delayTimer: number | null = null;

    if (mode === TreeMode.CHAOS) {
      delayTimer = window.setTimeout(() => {
        setStage(CarouselStage.FLYING_IN);
        setFlyProgress(0);
        setOffset(0);
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
          const newProgress = prev + deltaTime * 0.8;
          if (newProgress >= 1) {
            setStage(CarouselStage.SCROLLING);
            return 1;
          }
          return newProgress;
        });
      } else if (stage === CarouselStage.SCROLLING) {
        const scrollSpeed = 40;
        setOffset((prev) => {
          // Use modulo for true infinite loop
          return (prev + scrollSpeed * deltaTime) % singleSetWidth;
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

  // Easing function for smooth animation
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easedProgress = easeOutCubic(flyProgress);

  // Calculate backdrop opacity
  const backdropOpacity = stage === CarouselStage.FLYING_IN ? flyProgress * 0.5 : 0.5;

  // Calculate how many photos we need to render to fill the screen plus buffer
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const visibleCount = Math.ceil(screenWidth / totalPhotoWidth) + 4; // Extra buffer

  // Generate the visible photos array with proper indices for infinite scroll
  const getVisiblePhotos = () => {
    const photos = [];
    const startIndex = Math.floor(offset / totalPhotoWidth);

    for (let i = -2; i < visibleCount; i++) {
      const actualIndex = startIndex + i;
      // Use modulo to wrap around the photo array
      const photoIndex = ((actualIndex % CITY_PHOTOS.length) + CITY_PHOTOS.length) % CITY_PHOTOS.length;
      const photo = CITY_PHOTOS[photoIndex];

      // Calculate position: each photo's base position minus current offset
      const basePosition = actualIndex * totalPhotoWidth;
      const position = basePosition - offset;

      photos.push({
        ...photo,
        key: `photo-${actualIndex}`,
        position,
        renderIndex: i + 2, // For random position lookup
      });
    }
    return photos;
  };

  const visiblePhotos = getVisiblePhotos();

  const renderPhotoStrip = (isBlurred: boolean) => (
    <div className="absolute inset-0 flex items-center justify-center">
      {visiblePhotos.map((photo) => {
        const randomPos = randomPositions[photo.renderIndex % randomPositions.length];

        let transform = `translateX(${photo.position - screenWidth / 2 + photoWidth / 2}px)`;
        if (stage === CarouselStage.FLYING_IN) {
          const currentX = randomPos.x * (1 - easedProgress) + (photo.position - screenWidth / 2 + photoWidth / 2) * easedProgress;
          const currentY = randomPos.y * (1 - easedProgress);
          const currentRotation = randomPos.rotation * (1 - easedProgress);
          const currentScale = randomPos.scale + (1 - randomPos.scale) * easedProgress;
          transform = `translate(${currentX}px, ${currentY}px) rotate(${currentRotation}deg) scale(${currentScale})`;
        }

        return (
          <div
            key={`${isBlurred ? 'blur' : 'clear'}-${photo.key}`}
            className="absolute flex-shrink-0"
            style={{
              width: photoWidth,
              transform,
              opacity: isBlurred ? 0.4 : 1,
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
  );

  return (
    <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden">
      {/* Semi-transparent backdrop */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: backdropOpacity }}
      ></div>

      {/* Blurred layer */}
      <div
        className="absolute inset-0"
        style={{
          filter: 'blur(10px)',
          opacity: stage === CarouselStage.FLYING_IN ? flyProgress : 1,
        }}
      >
        {renderPhotoStrip(true)}
      </div>

      {/* Clear center layer with gradient mask */}
      <div
        className="absolute inset-0"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, transparent 20%, black 35%, black 65%, transparent 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, transparent 20%, black 35%, black 65%, transparent 80%, transparent 100%)',
          opacity: stage === CarouselStage.FLYING_IN ? flyProgress : 1,
        }}
      >
        {renderPhotoStrip(false)}
      </div>
    </div>
  );
};
