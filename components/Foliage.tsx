import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeMode } from '../types';

interface FoliageProps {
  mode: TreeMode;
  count: number;
}

const vertexShader = `
  uniform float uTime;
  uniform float uProgress;
  
  attribute vec3 aChaosPos;
  attribute vec3 aTargetPos;
  attribute float aRandom;
  
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
      newPos.x += sin(uTime * 0.5 + newPos.y * 2.0) * 0.02;
      newPos.z += cos(uTime * 0.3 + newPos.x * 2.0) * 0.02;
    }

    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
    
    gl_PointSize = (3.0 * aRandom + 2.0) * (20.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vec3 oceanBlue = vec3(0.0, 0.3, 0.6);
    vec3 landGreen = vec3(0.1, 0.5, 0.2);
    vec3 landBrown = vec3(0.4, 0.3, 0.1);
    vec3 iceWhite = vec3(0.9, 0.95, 1.0);
    vec3 goldColor = vec3(1.0, 0.84, 0.0);
    
    float lat = aTargetPos.y / 6.0;
    vec3 earthColor;
    
    if (abs(lat) > 0.8) {
      earthColor = iceWhite;
    } else if (aRandom > 0.35) {
      earthColor = mix(landGreen, landBrown, aRandom * 0.5);
    } else {
      earthColor = oceanBlue;
    }
    
    float sparkle = sin(uTime * 3.0 + aRandom * 100.0);
    
    vColor = mix(goldColor, earthColor, easedProgress);
    
    if (sparkle > 0.95) {
      vColor += vec3(0.3);
    }

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

    gl_FragColor = vec4(vColor, vAlpha * glow);
  }
`;

export const Foliage: React.FC<FoliageProps> = ({ mode, count }) => {
  const meshRef = useRef<THREE.Points>(null);
  
  const progressRef = useRef(0);

  const { chaosPositions, targetPositions, randoms } = useMemo(() => {
    const chaos = new Float32Array(count * 3);
    const target = new Float32Array(count * 3);
    const rnd = new Float32Array(count);

    const radius = 6;

    for (let i = 0; i < count; i++) {
      const r = 25 * Math.cbrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      chaos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      chaos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 5;
      chaos[i * 3 + 2] = r * Math.cos(phi);

      const u = Math.random();
      const v = Math.random();
      const sphereTheta = 2 * Math.PI * u;
      const spherePhi = Math.acos(2 * v - 1);
      
      target[i * 3] = radius * Math.sin(spherePhi) * Math.cos(sphereTheta);
      target[i * 3 + 1] = radius * Math.cos(spherePhi) + 6;
      target[i * 3 + 2] = radius * Math.sin(spherePhi) * Math.sin(sphereTheta);

      rnd[i] = Math.random();
    }

    return {
      chaosPositions: chaos,
      targetPositions: target,
      randoms: rnd
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
        meshRef.current.rotation.y += delta * 0.1;
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
