import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeMode } from '../types';

interface OrnamentsProps {
  mode: TreeMode;
  count: number;
}

interface InstanceData {
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  color: THREE.Color;
  scale: number;
  speed: number;
}

export const Ornaments: React.FC<OrnamentsProps> = ({ mode, count }) => {
  const lightsRef = useRef<THREE.InstancedMesh>(null);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const lightsData = useMemo(() => {
    const _lights: InstanceData[] = [];

    const earthRadius = 6;
    const earthCenterY = 6;
    
    const lightColors = [
      new THREE.Color("#FFFFAA"),
      new THREE.Color("#FFE4B5"),
      new THREE.Color("#87CEEB"),
      new THREE.Color("#98FB98"),
    ];

    const lightCount = Math.floor(count * 0.15);

    for (let i = 0; i < lightCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      const r = earthRadius + 0.3 + Math.random() * 0.5;
      
      const targetPos = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) + earthCenterY,
        r * Math.sin(phi) * Math.sin(theta)
      );

      const cR = 15 + Math.random() * 15;
      const cTheta = Math.random() * Math.PI * 2;
      const cPhi = Math.acos(2 * Math.random() - 1);
      const chaosPos = new THREE.Vector3(
        cR * Math.sin(cPhi) * Math.cos(cTheta),
        cR * Math.sin(cPhi) * Math.sin(cTheta) + 5,
        cR * Math.cos(cPhi)
      );

      const scale = 0.08 + Math.random() * 0.12;
      const color = lightColors[Math.floor(Math.random() * lightColors.length)];

      _lights.push({
        chaosPos,
        targetPos,
        color,
        scale,
        speed: 0.5 + Math.random() * 1.5,
      });
    }

    return _lights;
  }, [count]);

  useLayoutEffect(() => {
    if (lightsRef.current) {
      lightsData.forEach((d, i) => {
        lightsRef.current!.setColorAt(i, d.color);
      });
      lightsRef.current.instanceColor!.needsUpdate = true;
    }
  }, [lightsData]);

  useFrame((state, delta) => {
    const isFormed = mode === TreeMode.FORMED;
    const time = state.clock.elapsedTime;

    if (!lightsRef.current) return;

    let needsUpdate = false;

    lightsData.forEach((d, i) => {
      const dest = isFormed ? d.targetPos : d.chaosPos;
      
      lightsRef.current!.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      
      const step = delta * d.speed;
      dummy.position.lerp(dest, step);

      if (isFormed) {
        const currentRadius = Math.sqrt(dummy.position.x ** 2 + dummy.position.z ** 2);
        const currentAngle = Math.atan2(dummy.position.z, dummy.position.x) + delta * 0.1;
        dummy.position.x = currentRadius * Math.cos(currentAngle);
        dummy.position.z = currentRadius * Math.sin(currentAngle);
      }

      const pulse = 1 + Math.sin(time * 5 + d.chaosPos.y) * 0.3;
      dummy.scale.setScalar(d.scale * pulse);

      dummy.updateMatrix();
      lightsRef.current!.setMatrixAt(i, dummy.matrix);
      needsUpdate = true;
    });

    if (needsUpdate) lightsRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={lightsRef} args={[undefined, undefined, lightsData.length]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial 
        emissive="white"
        emissiveIntensity={2}
        toneMapped={false}
        color="white"
      />
    </instancedMesh>
  );
};
