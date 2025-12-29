import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeMode } from '../types';

interface FoliageProps {
  mode: TreeMode;
  count: number;
}

const CITIES = [
  { name: 'Edinburgh', lat: 55.95, lon: -3.19 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Seoul', lat: 37.57, lon: 126.98 },
  { name: 'Manila', lat: 14.60, lon: 120.98 },
  { name: 'Kuala Lumpur', lat: 3.14, lon: 101.69 },
  { name: 'Bangkok', lat: 13.76, lon: 100.50 },
  { name: 'Shanghai', lat: 31.23, lon: 121.47 },
  { name: 'Nantong', lat: 31.98, lon: 120.89 },
  { name: 'Guangzhou', lat: 23.13, lon: 113.26 },
];

const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg';

const vertexShader = `
  uniform float uTime;
  uniform float uProgress;
  
  attribute vec3 aChaosPos;
  attribute vec3 aTargetPos;
  attribute float aRandom;
  attribute vec3 aEarthColor;
  attribute float aIsCity;
  
  varying vec3 vColor;
  varying float vAlpha;
  varying float vIsCity;

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
    
    float baseSize = aIsCity > 0.5 ? 4.0 : (1.0 * aRandom + 0.6);
    gl_PointSize = baseSize * (35.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vec3 goldColor = vec3(1.0, 0.84, 0.0);
    
    vIsCity = aIsCity;
    
    if (aIsCity > 0.5) {
      float pulse = sin(uTime * 2.5) * 0.2 + 0.8;
      vColor = mix(goldColor, vec3(1.0, 0.5, 0.2) * pulse, easedProgress);
    } else {
      vColor = mix(goldColor, aEarthColor, easedProgress);
    }

    vAlpha = 1.0;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vIsCity;

  void main() {
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;

    float glow = 1.0 - (r * 2.0);
    
    if (vIsCity > 0.5) {
      glow = pow(glow, 0.7);
    } else {
      glow = pow(glow, 1.0);
    }

    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

function latLonToSpherical(lat: number, lon: number): { theta: number; phi: number } {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return { theta, phi };
}

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
  const cities = new Float32Array(count);

  const radius = 6;
  
  const cityParticles: { theta: number; phi: number }[] = [];
  for (const city of CITIES) {
    const { theta, phi } = latLonToSpherical(city.lat, city.lon);
    for (let j = 0; j < 80; j++) {
      const spread = 0.03;
      cityParticles.push({
        theta: theta + (Math.random() - 0.5) * spread,
        phi: phi + (Math.random() - 0.5) * spread
      });
    }
  }

  let cityIndex = 0;
  const totalCityParticles = cityParticles.length;

  for (let i = 0; i < count; i++) {
    const r = 25 * Math.cbrt(Math.random());
    const cTheta = Math.random() * 2 * Math.PI;
    const cPhi = Math.acos(2 * Math.random() - 1);
    
    chaos[i * 3] = r * Math.sin(cPhi) * Math.cos(cTheta);
    chaos[i * 3 + 1] = r * Math.sin(cPhi) * Math.sin(cTheta) + 5;
    chaos[i * 3 + 2] = r * Math.cos(cPhi);

    let sphereTheta: number;
    let spherePhi: number;
    let isCity = false;

    if (cityIndex < totalCityParticles && i < totalCityParticles) {
      sphereTheta = cityParticles[cityIndex].theta;
      spherePhi = cityParticles[cityIndex].phi;
      isCity = true;
      cityIndex++;
    } else {
      const u = Math.random();
      const v = Math.random();
      sphereTheta = 2 * Math.PI * u;
      spherePhi = Math.acos(2 * v - 1);
    }
    
    target[i * 3] = radius * Math.sin(spherePhi) * Math.cos(sphereTheta);
    target[i * 3 + 1] = radius * Math.cos(spherePhi) + 6;
    target[i * 3 + 2] = radius * Math.sin(spherePhi) * Math.sin(sphereTheta);

    const random = Math.random();
    rnd[i] = random;
    cities[i] = isCity ? 1.0 : 0.0;
    
    let color: THREE.Color;
    if (isCity) {
      color = new THREE.Color(1.0, 0.6, 0.2);
    } else if (imageData) {
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
    earthColors: colors,
    cityFlags: cities
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
        <bufferAttribute
          attach="attributes-aIsCity"
          count={count}
          array={particleData.cityFlags}
          itemSize={1}
        />
      </bufferGeometry>
      {/* @ts-ignore */}
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
