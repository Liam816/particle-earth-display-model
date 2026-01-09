import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TreeMode } from '../types';

// City photos - same as in Foliage.tsx
// const CITY_PHOTOS = [
//   { name: 'Edinburgh', url: '/imgs/Edinburgh.jpg' },
//   { name: 'Tokyo', url: '/imgs/Tokyo.jpg' },
//   { name: 'Seoul', url: '/imgs/Seoul.jpg' },
//   { name: 'Manila', url: '/imgs/Manila.jpg' },
//   { name: 'Kuala Lumpur', url: '/imgs/Kuala-Lumpur.jpg' },
//   { name: 'Bangkok', url: '/imgs/Bangkok.jpg' },
//   { name: 'Shanghai', url: '/imgs/Shanghai.jpg' },
//   { name: 'Nantong', url: '/imgs/Nantong.jpg' },
//   { name: 'Guangzhou', url: '/imgs/Guangzhou.jpg' },
// ];
// const CITY_PHOTOS = [
//   { name: '1', url: '/imgs/grace_photos/1.jpg' },
//   { name: '2', url: '/imgs/grace_photos/2.jpg' },
//   { name: '3', url: '/imgs/grace_photos/3.jpg' },
//   { name: '4', url: '/imgs/grace_photos/4.jpg' },
//   { name: '5', url: '/imgs/grace_photos/5.jpg' },
//   { name: '6', url: '/imgs/grace_photos/6.jpg' },
//   { name: '7', url: '/imgs/grace_photos/7.jpg' },
//   { name: '8', url: '/imgs/grace_photos/8.jpg' },
//   { name: '9', url: '/imgs/grace_photos/9.jpg' },
//   {  name: '10', url: '/imgs/grace_photos/10.jpg' },
//   {  name: '11', url: '/imgs/grace_photos/11.jpg' },
//   {  name: '12', url: '/imgs/grace_photos/12.jpg' },
//   {  name: '13', url: '/imgs/grace_photos/13.jpg' },
//   {  name: '14', url: '/imgs/grace_photos/14.jpg' },
//   {  name: '15', url: '/imgs/grace_photos/15.jpg' },
//   {  name: '16', url: '/imgs/grace_photos/16.jpg' },
//   {  name: '17', url: '/imgs/grace_photos/17.jpg' }
// ];
const CITY_PHOTOS = [
  { name: '', url: '/imgs/grace_photos/1.jpg' },
  { name: '', url: '/imgs/grace_photos/2.jpg' },
  { name: '', url: '/imgs/grace_photos/3.jpg' },
  { name: '', url: '/imgs/grace_photos/4.jpg' },
  { name: '', url: '/imgs/grace_photos/5.jpg' },
  { name: '', url: '/imgs/grace_photos/6.jpg' },
  { name: '', url: '/imgs/grace_photos/7.jpg' },
  { name: '', url: '/imgs/grace_photos/8.jpg' },
  { name: '', url: '/imgs/grace_photos/9.jpg' },
  {  name: '', url: '/imgs/grace_photos/10.jpg' },
  {  name: '', url: '/imgs/grace_photos/11.jpg' },
  {  name: '', url: '/imgs/grace_photos/12.jpg' },
  {  name: '', url: '/imgs/grace_photos/13.jpg' },
  {  name: '', url: '/imgs/grace_photos/14.jpg' },
  {  name: '', url: '/imgs/grace_photos/15.jpg' },
  {  name: '', url: '/imgs/grace_photos/16.jpg' },
  {  name: '', url: '/imgs/grace_photos/17.jpg' }
];

// Cake emojis for falling effect
// const CAKE_EMOJIS = ['🎂', '🍰', '🧁', '🎁', '✨', '🎉'];
const CAKE_EMOJIS = ['🎂', '🧁', '🎁', '✨', '🎉'];

interface FallingCake {
  id: number;
  emoji: string;
  x: number;
  y: number;
  speed: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  swaySpeed: number;
  swayAmount: number;
}

// Falling cakes component
const FallingCakes: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const [cakes, setCakes] = useState<FallingCake[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const cakeIdRef = useRef(0);

  // Generate a new cake
  const createCake = (): FallingCake => {
    const emoji = CAKE_EMOJIS[Math.floor(Math.random() * CAKE_EMOJIS.length)];
    return {
      id: cakeIdRef.current++,
      emoji,
      x: Math.random() * 100, // percentage
      y: -10, // start above screen
      speed: 15 + Math.random() * 20, // pixels per second (slower)
      size: 20 + Math.random() * 20, // font size
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 60, // degrees per second (slower rotation)
      opacity: 0.6 + Math.random() * 0.4,
      swaySpeed: 1 + Math.random() * 2,
      swayAmount: 10 + Math.random() * 20,
    };
  };

  useEffect(() => {
    if (!isActive) {
      setCakes([]);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    // Initialize with more cakes
    const initialCakes: FallingCake[] = [];
    for (let i = 0; i < 30; i++) {
      const cake = createCake();
      cake.y = Math.random() * 100; // Spread across screen initially
      initialCakes.push(cake);
    }
    setCakes(initialCakes);
    lastTimeRef.current = performance.now();

    let lastCakeTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      // Add new cakes more frequently
      if (currentTime - lastCakeTime > 250) { // New cake every 250ms
        setCakes(prev => [...prev, createCake()]);
        lastCakeTime = currentTime;
      }

      // Update cake positions
      setCakes(prev => {
        return prev
          .map(cake => ({
            ...cake,
            y: cake.y + cake.speed * deltaTime,
            rotation: cake.rotation + cake.rotationSpeed * deltaTime,
          }))
          .filter(cake => cake.y < 110); // Remove cakes that fell off screen
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {cakes.map(cake => (
        <div
          key={cake.id}
          className="absolute"
          style={{
            left: `${cake.x}%`,
            top: `${cake.y}%`,
            fontSize: `${cake.size}px`,
            transform: `rotate(${cake.rotation}deg) translateX(${Math.sin(cake.y * 0.05 * cake.swaySpeed) * cake.swayAmount}px)`,
            opacity: cake.opacity,
            transition: 'none',
          }}
        >
          {cake.emoji}
        </div>
      ))}
    </div>
  );
};

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
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredPhotoKey, setHoveredPhotoKey] = useState<string | null>(null);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
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
      }, 1000);  // 过渡时间
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
      } else if (stage === CarouselStage.SCROLLING && !isPaused && !hoveredPhotoKey) {
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
  }, [stage, singleSetWidth, isPaused, hoveredPhotoKey]);

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

        const isHovered = hoveredPhotoKey === photo.key;

        return (
          <div
            key={`${isBlurred ? 'blur' : 'clear'}-${photo.key}`}
            className="absolute flex-shrink-0 transition-all duration-200 cursor-pointer"
            style={{
              width: photoWidth,
              transform,
              opacity: isBlurred ? 0.4 : 1,
              pointerEvents: isBlurred ? 'none' : 'auto',
            }}
            onMouseEnter={() => !isBlurred && setHoveredPhotoKey(photo.key)}
            onMouseLeave={() => setHoveredPhotoKey(null)}
            onClick={() => !isBlurred && setSelectedPhotoUrl(photo.url)}
          >
            <div className={`bg-white p-3 pb-10 shadow-2xl relative transition-all duration-200 ${isHovered ? 'scale-110 shadow-[0_0_30px_rgba(212,175,55,0.5)]' : ''}`}>
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
    <div className="fixed inset-0 z-30 overflow-hidden">
      {/* Semi-transparent backdrop */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300 pointer-events-none"
        style={{ opacity: backdropOpacity }}
      ></div>

      {/* Blurred layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          filter: 'blur(10px)',
          opacity: stage === CarouselStage.FLYING_IN ? flyProgress : 1,
        }}
      >
        {renderPhotoStrip(true)}
      </div>

      {/* Clear center layer with gradient mask - This layer is interactive */}
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

      {/* Falling cakes effect */}
      <FallingCakes isActive={stage === CarouselStage.SCROLLING || stage === CarouselStage.FLYING_IN} />

      {/* Enlarged photo modal */}
      {selectedPhotoUrl && (
        <div
          className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto z-50"
          onClick={() => setSelectedPhotoUrl(null)}
        >
          <div
            className="relative bg-white p-6 pb-20 shadow-2xl max-w-2xl max-h-[85vh] rounded-lg"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: 'rotate(-2deg)' }}
          >
            {/* Gold clip at top */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-6 bg-gradient-to-b from-[#D4AF37] to-[#C5A028] rounded-sm shadow-lg z-10"></div>

            {/* Photo */}
            <img
              src={selectedPhotoUrl}
              alt="Enlarged view"
              className="w-full h-auto object-contain"
              style={{ maxHeight: 'calc(85vh - 80px)' }}
            />

            {/* Close button */}
            <button
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full text-gray-700 font-bold text-lg"
              onClick={() => setSelectedPhotoUrl(null)}
              title="关闭"
            >
              ✕
            </button>

            {/* Instructions */}
            <div className="text-center mt-4 text-gray-600 text-sm">
              点击背景或按钮关闭
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
