import React, { useMemo, useRef } from 'react';
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
    
    float baseSize = aIsCity > 0.5 ? 6.0 : (1.2 * aRandom + 0.8);
    gl_PointSize = baseSize * (35.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vec3 goldColor = vec3(1.0, 0.84, 0.0);
    
    vIsCity = aIsCity;
    
    if (aIsCity > 0.5) {
      float pulse = sin(uTime * 3.0) * 0.3 + 0.7;
      vColor = mix(goldColor, vec3(1.0, 0.3, 0.1) * pulse + vec3(1.0, 0.8, 0.2) * (1.0 - pulse), easedProgress);
    } else {
      float sparkle = sin(uTime * 3.0 + aRandom * 100.0);
      vColor = mix(goldColor, aEarthColor, easedProgress);
      if (sparkle > 0.97) {
        vColor += vec3(0.1);
      }
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
      glow = pow(glow, 0.8);
    } else {
      glow = pow(glow, 1.2);
    }

    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

function latLonToSpherical(lat: number, lon: number): { theta: number; phi: number } {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return { theta, phi };
}

function isNearCity(phi: number, theta: number): boolean {
  const lat = 90 - phi * 180 / Math.PI;
  const lon = theta * 180 / Math.PI - 180;
  
  for (const city of CITIES) {
    const dLat = Math.abs(lat - city.lat);
    const dLon = Math.abs(lon - city.lon);
    if (dLat < 3 && dLon < 3) {
      return true;
    }
  }
  return false;
}

function isLand(lat: number, lon: number): { isLand: boolean; landType: string } {
  lat = lat * 180 / Math.PI - 90;
  lon = lon * 180 / Math.PI - 180;
  
  if (lat > 70 || lat < -65) {
    return { isLand: true, landType: 'ice' };
  }
  
  if (lon > -170 && lon < -50) {
    if (lat > 25 && lat < 70) {
      if (lon > -130 && lon < -100 && lat > 35 && lat < 55) {
        return { isLand: true, landType: 'forest' };
      }
      return { isLand: true, landType: 'land' };
    }
    if (lat > -60 && lat < 15 && lon > -85 && lon < -30) {
      if (lat > -10 && lat < 5 && lon > -80 && lon < -45) {
        return { isLand: true, landType: 'rainforest' };
      }
      return { isLand: true, landType: 'land' };
    }
  }
  
  if (lon > -20 && lon < 55) {
    if (lat > -38 && lat < 38) {
      if (lat > 15 && lat < 35 && lon > -15 && lon < 35) {
        return { isLand: true, landType: 'desert' };
      }
      if (lat > -5 && lat < 8 && lon > 5 && lon < 30) {
        return { isLand: true, landType: 'rainforest' };
      }
      if (lat > -35 && lat < -20 && lon > 15 && lon < 35) {
        return { isLand: true, landType: 'land' };
      }
      if (lat > 30 && lat < 45 && lon > -10 && lon < 45) {
        return { isLand: true, landType: 'land' };
      }
      return { isLand: true, landType: 'land' };
    }
  }
  
  if (lon > -15 && lon < 180 && lat > 38 && lat < 72) {
    if (lon > 55 && lon < 150 && lat > 50 && lat < 70) {
      return { isLand: true, landType: 'forest' };
    }
    return { isLand: true, landType: 'land' };
  }
  
  if (lon > 65 && lon < 145 && lat > -12 && lat < 38) {
    if (lon > 75 && lon < 100 && lat > 25 && lat < 35) {
      return { isLand: true, landType: 'mountain' };
    }
    if (lon > 95 && lon < 125 && lat > 5 && lat < 25) {
      return { isLand: true, landType: 'rainforest' };
    }
    if (lon > 100 && lon < 125 && lat > 18 && lat < 42) {
      return { isLand: true, landType: 'land' };
    }
    if (lon > 125 && lon < 145 && lat > 30 && lat < 45) {
      return { isLand: true, landType: 'land' };
    }
    return { isLand: true, landType: 'land' };
  }
  
  if (lon > 112 && lon < 155 && lat > -45 && lat < -10) {
    if (lat < -28 && lon > 120 && lon < 145) {
      return { isLand: true, landType: 'desert' };
    }
    return { isLand: true, landType: 'land' };
  }
  
  return { isLand: false, landType: 'ocean' };
}

function getEarthColor(phi: number, theta: number, random: number): THREE.Color {
  const terrain = isLand(phi, theta);
  
  if (!terrain.isLand) {
    const depth = random;
    if (depth > 0.7) {
      return new THREE.Color(0.02, 0.15, 0.4);
    } else if (depth > 0.4) {
      return new THREE.Color(0.03, 0.22, 0.5);
    } else {
      return new THREE.Color(0.05, 0.3, 0.6);
    }
  }
  
  switch (terrain.landType) {
    case 'ice':
      return new THREE.Color(0.85 + random * 0.15, 0.9 + random * 0.1, 0.95 + random * 0.05);
    case 'desert':
      return new THREE.Color(0.7 + random * 0.15, 0.55 + random * 0.1, 0.3 + random * 0.1);
    case 'rainforest':
      return new THREE.Color(0.05 + random * 0.08, 0.35 + random * 0.1, 0.1 + random * 0.08);
    case 'forest':
      return new THREE.Color(0.1 + random * 0.08, 0.3 + random * 0.12, 0.12 + random * 0.08);
    case 'mountain':
      return new THREE.Color(0.4 + random * 0.15, 0.35 + random * 0.15, 0.3 + random * 0.1);
    default:
      return new THREE.Color(0.2 + random * 0.12, 0.45 + random * 0.12, 0.18 + random * 0.1);
  }
}

export const Foliage: React.FC<FoliageProps> = ({ mode, count }) => {
  const meshRef = useRef<THREE.Points>(null);
  const progressRef = useRef(0);

  const { chaosPositions, targetPositions, randoms, earthColors, cityFlags } = useMemo(() => {
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
      
      const color = isCity 
        ? new THREE.Color(1.0, 0.5, 0.1)
        : getEarthColor(spherePhi, sphereTheta, random);
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
  }, [count]);

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

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aChaosPos"
          count={count}
          array={chaosPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aTargetPos"
          count={count}
          array={targetPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aRandom"
          count={count}
          array={randoms}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aEarthColor"
          count={count}
          array={earthColors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aIsCity"
          count={count}
          array={cityFlags}
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
