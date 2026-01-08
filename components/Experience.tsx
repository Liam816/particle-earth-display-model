import React, { useRef } from 'react';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useFrame } from '@react-three/fiber';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Polaroids } from './Polaroids';
import { TreeMode } from '../types';

interface ExperienceProps {
  mode: TreeMode;
  handPosition: { x: number; y: number; detected: boolean };
  uploadedPhotos: string[];
  defaultPhotos: string[];
  twoHandsDetected: boolean;
  onClosestPhotoChange?: (photoUrl: string | null) => void;
}

export const Experience: React.FC<ExperienceProps> = ({ mode, handPosition, uploadedPhotos, defaultPhotos, twoHandsDetected, onClosestPhotoChange }) => {
  const controlsRef = useRef<any>(null);

  // Update camera rotation based on hand position
  useFrame((_, delta) => {
    if (controlsRef.current && handPosition.detected && mode !== TreeMode.CHAOS) {
      const controls = controlsRef.current;

      const targetAzimuth = (handPosition.x - 0.5) * Math.PI * 3;

      // Invert Y axis: when hand moves up (y decreases), camera looks up
      const adjustedY = (1 - handPosition.y - 0.2) * 2.0;
      const clampedY = Math.max(0, Math.min(1, adjustedY));

      const minPolar = Math.PI / 6;
      const maxPolar = Math.PI / 1.5;
      const targetPolar = minPolar + clampedY * (maxPolar - minPolar);

      const currentAzimuth = controls.getAzimuthalAngle();
      const currentPolar = controls.getPolarAngle();

      let azimuthDiff = targetAzimuth - currentAzimuth;
      if (azimuthDiff > Math.PI) azimuthDiff -= Math.PI * 2;
      if (azimuthDiff < -Math.PI) azimuthDiff += Math.PI * 2;

      const lerpSpeed = 8;
      const newAzimuth = currentAzimuth + azimuthDiff * delta * lerpSpeed;
      const newPolar = currentPolar + (targetPolar - currentPolar) * delta * lerpSpeed;

      const radius = controls.getDistance();
      const targetY = 1;

      const x = radius * Math.sin(newPolar) * Math.sin(newAzimuth);
      const y = targetY + radius * Math.cos(newPolar);
      const z = radius * Math.sin(newPolar) * Math.cos(newAzimuth);

      controls.object.position.set(x, y, z);
      controls.target.set(0, 1, 0);
      controls.update();
    }
  });
  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 1.5}
        minDistance={12}
        maxDistance={35}
        enableDamping
        dampingFactor={0.05}
        enabled={true}
        target={[0, 1, 0]}
      />

      {/* Removed Environment preset to avoid external HDR loading issues */}
      {/* Use enhanced lighting instead */}

      <ambientLight intensity={1.2} color="#ffffff" />
      <hemisphereLight args={['#ffffff', '#ffffff', 0.5]} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-5, 10, -5]} intensity={1.0} color="#ffffff" />
      <spotLight
        position={[10, 20, 10]}
        angle={0.3}
        penumbra={1}
        intensity={2.5}
        color="#ffffff"
        castShadow
      />
      <pointLight position={[-10, 5, -10]} intensity={1.5} color="#ffffff" />
      <pointLight position={[10, 5, 10]} intensity={1.5} color="#ffffff" />

      <group position={[0, -5, 0]}>
        <Foliage mode={mode} count={1000000} />
        <Ornaments mode={mode} count={600} />
        <Polaroids
          mode={mode}
          uploadedPhotos={uploadedPhotos}
          defaultPhotos={defaultPhotos}
          twoHandsDetected={twoHandsDetected}
          onClosestPhotoChange={onClosestPhotoChange}
        />

        <ContactShadows
          opacity={0.5}
          scale={40}
          blur={2}
          far={6}
          color="#000000"
        />
      </group>

      <EffectComposer enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.8}
          mipmapBlur
          intensity={1.5}
          radius={0.6}
        />
        <Vignette eskil={false} offset={0.1} darkness={0.7} />
        <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </>
  );
};
