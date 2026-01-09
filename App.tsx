import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Experience } from './components/Experience';
import { UIOverlay } from './components/UIOverlay';
import { GestureController } from './components/GestureController';
import { PhotoCarousel } from './components/PhotoCarousel';
import { TreeMode } from './types';

// Simple Error Boundary to catch 3D resource loading errors (like textures)
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error loading 3D scene:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can customize this fallback UI
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-[#D4AF37] font-serif p-8 text-center">
          <div>
            <h2 className="text-2xl mb-2">Something went wrong</h2>
            <p className="opacity-70">A resource failed to load (likely a missing image). Check the console for details.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// No default photos - user uploads their own for the Polaroids on the tree
const DEFAULT_PHOTOS: string[] = [];

export default function App() {
  const [mode, setMode] = useState<TreeMode>(TreeMode.FORMED);
  const [handPosition, setHandPosition] = useState<{ x: number; y: number; detected: boolean }>({ x: 0.5, y: 0.5, detected: false });
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isLoadingShare, setIsLoadingShare] = useState(false);
  const [isSharedView, setIsSharedView] = useState(false);
  const [twoHandsDetected, setTwoHandsDetected] = useState(false);
  const [closestPhoto, setClosestPhoto] = useState<string | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasTriedMusicPlay = useRef(false);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/audio/ai_hbd_rb_style_song_v2_trim.m4a');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    // Set up interaction listeners for first play
    const handleFirstInteraction = () => {
      if (audioRef.current && !hasTriedMusicPlay.current) {
        hasTriedMusicPlay.current = true;
        // Safari requires synchronous play() call in user interaction handler
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsMusicPlaying(true);
            })
            .catch((error) => {
              console.error('Auto play failed:', error);
              // Safari may block autoplay, that's okay - user can click the button
            });
        }
      }
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction, { passive: true });
    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Trigger music when hand gesture is detected
  useEffect(() => {
    if (handPosition.detected && audioRef.current && !hasTriedMusicPlay.current) {
      hasTriedMusicPlay.current = true;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsMusicPlaying(true);
          })
          .catch((error) => {
            console.error('Gesture play failed:', error);
          });
      }
    }
  }, [handPosition.detected]);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
        setIsMusicPlaying(false);
      } else {
        // Safari requires play() to be called synchronously in user interaction handler
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsMusicPlaying(true);
            })
            .catch((error) => {
              console.error('Play failed:', error);
              // If play fails, try to load and play again
              if (audioRef.current) {
                audioRef.current.load();
                audioRef.current.play()
                  .then(() => setIsMusicPlaying(true))
                  .catch(err => console.error('Retry play failed:', err));
              }
            });
        }
      }
    }
  };

  // Check for share parameter in URL on mount
  useEffect(() => {
    const loadSharedPhotos = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const shareId = urlParams.get('share');

      if (!shareId) return;

      setIsSharedView(true);
      setIsLoadingShare(true);

      try {
        // Try API first (works in vercel dev and production)
        try {
          const response = await fetch(`/api/share?id=${shareId}`);
          const data = await response.json();

          if (response.ok && data.success) {
            setUploadedPhotos(data.images);
            return;
          }
        } catch (apiError) {
          console.log('API not available, trying localStorage fallback');
        }

        // Fallback to localStorage if API fails (pure vite dev mode)
        const shareDataStr = localStorage.getItem(`share_${shareId}`);
        if (shareDataStr) {
          const shareData = JSON.parse(shareDataStr);
          setUploadedPhotos(shareData.images);
        } else {
          console.error('Share not found');
        }
      } catch (error) {
        console.error('Error loading shared photos:', error);
      } finally {
        setIsLoadingShare(false);
      }
    };

    loadSharedPhotos();
  }, []);

  const toggleMode = () => {
    setMode((prev) => (prev === TreeMode.FORMED ? TreeMode.CHAOS : TreeMode.FORMED));
  };

  const handleHandPosition = (x: number, y: number, detected: boolean) => {
    setHandPosition({ x, y, detected });
  };

  const handleTwoHandsDetected = (detected: boolean) => {
    setTwoHandsDetected(detected);
  };

  const handleClosestPhotoChange = (photoUrl: string | null) => {
    setClosestPhoto(photoUrl);
  };

  const handlePhotosUpload = (photos: string[]) => {
    setUploadedPhotos(photos);
  };

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-black via-[#001a0d] to-[#0a2f1e]">
      <ErrorBoundary>
        <Canvas
          dpr={[1, 2]}
          camera={{
            // Position camera to face Shanghai (lon: 121.47°)
            // Camera at radius 20, directly facing Shanghai longitude
            // 虽然上海经度是121.47°，但为了更好的视觉效果，我们选择160°
            position: [
              20 * Math.sin(160.0 * Math.PI / 180),
              6,
              20 * Math.cos(160.0 * Math.PI / 180)
            ],
            fov: 45
          }}
          gl={{ antialias: false, stencil: false, alpha: false }}
          shadows
        >
          <Suspense fallback={null}>
            <Experience
              mode={mode}
              handPosition={handPosition}
              uploadedPhotos={uploadedPhotos}
              defaultPhotos={DEFAULT_PHOTOS}
              twoHandsDetected={twoHandsDetected}
              onClosestPhotoChange={handleClosestPhotoChange}
            />
          </Suspense>
        </Canvas>
      </ErrorBoundary>

      <Loader
        containerStyles={{ background: '#000' }}
        innerStyles={{ width: '300px', height: '10px', background: '#333' }}
        barStyles={{ background: '#D4AF37', height: '10px' }}
        dataStyles={{ color: '#D4AF37', fontFamily: 'Cinzel' }}
      />

      <UIOverlay
        mode={mode}
        onToggle={toggleMode}
        onPhotosUpload={handlePhotosUpload}
        hasPhotos={uploadedPhotos.length > 0}
        uploadedPhotos={uploadedPhotos}
        isSharedView={isSharedView}
      />

      {/* Loading indicator for shared photos */}
      {isLoadingShare && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-[#D4AF37] font-serif text-xl">
            加载分享的照片中...
          </div>
        </div>
      )}

      {/* Gesture Control Module */}
      <GestureController currentMode={mode} onModeChange={setMode} onHandPosition={handleHandPosition} onTwoHandsDetected={handleTwoHandsDetected} />

      {/* Photo Carousel - Shows city photos in CHAOS mode after explosion */}
      <PhotoCarousel mode={mode} />

      {/* Photo Overlay - Shows when two hands detected */}
      {closestPhoto && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none animate-fade-in">
          {/* Semi-transparent backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

          {/* Polaroid frame with photo */}
          <div className="relative z-50 transform transition-all duration-500 ease-out animate-scale-in">
            {/* Polaroid container */}
            <div className="bg-white p-4 pb-8 shadow-2xl" style={{ width: '60vmin', maxWidth: '600px' }}>
              {/* Gold clip at top */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-6 bg-gradient-to-b from-[#D4AF37] to-[#C5A028] rounded-sm shadow-lg"></div>

              {/* Photo */}
              <img
                src={closestPhoto}
                alt="Selected Memory"
                className="w-full aspect-square object-cover"
              />

              {/* Text label */}
              <div className="text-center mt-4 font-serif text-gray-700 text-lg">
                Happy Memories
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Music Toggle Button */}
      <button
        onClick={toggleMusic}
        className="fixed bottom-12 right-12 z-50 w-12 h-12 rounded-full border-2 border-[#D4AF37] bg-black/70 backdrop-blur-md flex items-center justify-center hover:bg-[#D4AF37]/20 transition-all duration-300"
        title={isMusicPlaying ? '暂停音乐' : '播放音乐'}
      >
        <span className="text-xl">{isMusicPlaying ? '🔊' : '🔇'}</span>
      </button>
    </div>
  );
}
