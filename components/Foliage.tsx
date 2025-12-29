import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeMode } from '../types';

interface FoliageProps {
  mode: TreeMode;
  count: number;
}

const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg';

const vertexShader = `
  uniform float uTime;
  uniform float uProgress;
  
  attribute vec3 aChaosPos;
  attribute vec3 aTargetPos;
  attribute float aRandom;
  attribute vec3 aEarthColor;
  
  varying vec3 vColor;
  varying float vAlpha;

  float cubicInOut(float t) {
    return t < 0.5
      ? 4.0 * t * t * t
      : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
  }

  void main() {
    float localProgress = clamp(uProgress * 1.2 - aRandom * 0.2, 0.0, 1.0);
    float easedProgress = cubicInOut(localProgress);

    vec3 newPos = mix(aChaosPos, aTargetPos, easedProgress);
    
    if (easedProgress > 0.9) {
      newPos.x += sin(uTime * 0.5 + newPos.y * 2.0) * 0.01;
      newPos.z += cos(uTime * 0.3 + newPos.x * 2.0) * 0.01;
    }

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    
    float baseSize = 1.0 * aRandom + 0.6;
    gl_PointSize = baseSize * (35.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vec3 goldColor = vec3(1.0, 0.84, 0.0);
    vColor = mix(goldColor, aEarthColor, easedProgress);
    vAlpha = 1.0;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;

    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 1.5);
    
    vec3 finalColor = vColor * 0.75;
    gl_FragColor = vec4(finalColor, vAlpha * glow * 0.85);
  }
`;

function sampleTexture(imageData: ImageData, phi: number, theta: number): THREE.Color {
  const u = theta / (2 * Math.PI);
  const v = phi / Math.PI;
  
  const x = Math.floor(u * (imageData.width - 1));
  const y = Math.floor(v * (imageData.height - 1));
  const idx = (y * imageData.width + x) * 4;
  
  return new THREE.Color(
    imageData.data[idx] / 255,
    imageData.data[idx + 1] / 255,
    imageData.data[idx + 2] / 255
  );
}

function generateParticles(count: number, imageData: ImageData | null) {
  const chaos = new Float32Array(count * 3);
  const target = new Float32Array(count * 3);
  const rnd = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  const radius = 6;

  for (let i = 0; i < count; i++) {
    const r = 25 * Math.cbrt(Math.random());
    const cTheta = Math.random() * 2 * Math.PI;
    const cPhi = Math.acos(2 * Math.random() - 1);
    
    chaos[i * 3] = r * Math.sin(cPhi) * Math.cos(cTheta);
    chaos[i * 3 + 1] = r * Math.sin(cPhi) * Math.sin(cTheta) + 5;
    chaos[i * 3 + 2] = r * Math.cos(cPhi);

    const u = Math.random();
    const v = Math.random();
    const sphereTheta = 2 * Math.PI * u;
    const spherePhi = Math.acos(2 * v - 1);
    
    target[i * 3] = radius * Math.sin(spherePhi) * Math.cos(sphereTheta);
    target[i * 3 + 1] = radius * Math.cos(spherePhi) + 6;
    target[i * 3 + 2] = radius * Math.sin(spherePhi) * Math.sin(sphereTheta);

    const random = Math.random();
    rnd[i] = random;
    
    let color: THREE.Color;
    if (imageData) {
      color = sampleTexture(imageData, spherePhi, sphereTheta);
    } else {
      color = new THREE.Color(0.1, 0.3, 0.6);
    }
    
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  return {
    chaosPositions: chaos,
    targetPositions: target,
    randoms: rnd,
    earthColors: colors
  };
}

export const Foliage: React.FC<FoliageProps> = ({ mode, count }) => {
  const meshRef = useRef<THREE.Points>(null);
  const progressRef = useRef(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setImageData(data);
      }
      setIsReady(true);
    };
    img.onerror = () => {
      console.warn('Failed to load earth texture, using fallback');
      setIsReady(true);
    };
    img.src = EARTH_TEXTURE_URL;
  }, []);

  const particleData = useMemo(() => {
    if (!isReady) return null;
    return generateParticles(count, imageData);
  }, [count, imageData, isReady]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
  }), []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      
      const target = mode === TreeMode.FORMED ? 1 : 0;
      progressRef.current = THREE.MathUtils.lerp(progressRef.current, target, delta * 1.5);
      material.uniforms.uProgress.value = progressRef.current;
      
      if (mode === TreeMode.FORMED) {
        meshRef.current.rotation.y += delta * 0.03;
      }
    }
  });

  if (!particleData) {
    return null;
  }

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particleData.chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aChaosPos"
          count={count}
          array={particleData.chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
          count={count}
          array={particleData.targetPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={count}
          array={particleData.randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aEarthColor"
          count={count}
          array={particleData.earthColors}
          itemSize={3}
        />
      </bufferGeometry>
      {/* @ts-ignore */}
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
};
