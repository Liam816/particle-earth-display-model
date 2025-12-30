
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { TreeMode } from '../types';

const EARTH_RADIUS = 6;
const EARTH_CENTER_Y = 6;

// Conveyor positions
const CONVEYOR_CENTER = new THREE.Vector3(0, 7, 12);
const CONVEYOR_LEFT = new THREE.Vector3(-15, 7, 12);
const CONVEYOR_RIGHT = new THREE.Vector3(15, 7, 12);

enum PolaroidAnimationStage {
  FORMED,
  EXPLODING,
  CONVEYOR,
}

interface PolaroidsProps {
  mode: TreeMode;
  uploadedPhotos: string[];
  defaultPhotos: string[];
  twoHandsDetected: boolean;
  onClosestPhotoChange?: (photoUrl: string | null) => void;
}

interface PhotoData {
  id: number;
  url: string;
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  speed: number;
}

interface PolaroidItemProps {
  data: PhotoData;
  animStage: PolaroidAnimationStage;
  isActive: boolean;
  isExiting: boolean;
}

const PolaroidItem: React.FC<PolaroidItemProps> = ({ data, animStage, isActive, isExiting }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      data.url,
      (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        setTexture(loadedTex);
        setError(false);
      },
      undefined,
      (err) => {
        console.warn(`Failed to load image: ${data.url}`, err);
        setError(true);
      }
    );
  }, [data.url]);

  const swayOffset = useMemo(() => Math.random() * 100, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    let targetPos: THREE.Vector3;
    let targetOpacity = 1.0;

    switch (animStage) {
      case PolaroidAnimationStage.FORMED:
        targetPos = data.targetPos;
        targetOpacity = 1.0;
        break;
      case PolaroidAnimationStage.EXPLODING:
        targetPos = data.chaosPos;
        targetOpacity = 1.0;
        break;
      case PolaroidAnimationStage.CONVEYOR:
        if (isActive) {
          targetPos = CONVEYOR_CENTER;
          targetOpacity = 1.0;
        } else if (isExiting) {
          targetPos = CONVEYOR_RIGHT;
          targetOpacity = 0.0;
        } else {
          targetPos = CONVEYOR_LEFT;
          targetOpacity = 0.0;
        }
        break;
    }

    const step = delta * data.speed;
    groupRef.current.position.lerp(targetPos, step);

    const frameGroup = groupRef.current.children[1] as THREE.Group;
    if (frameGroup && frameGroup.children[1]) {
      const photoMesh = frameGroup.children[1] as THREE.Mesh;
      const material = photoMesh.material as THREE.MeshBasicMaterial;
      if (material && material.opacity !== undefined) {
        material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, delta * 5);
        material.transparent = true;
      }
    }

    if (animStage === PolaroidAnimationStage.FORMED) {
        const dummy = new THREE.Object3D();
        dummy.position.copy(groupRef.current.position);
        dummy.lookAt(0, EARTH_CENTER_Y, 0);
        dummy.rotateY(Math.PI);

        groupRef.current.quaternion.slerp(dummy.quaternion, step);

        const swayAngle = Math.sin(time * 2.0 + swayOffset) * 0.08;
        const tiltAngle = Math.cos(time * 1.5 + swayOffset) * 0.05;

        const currentRot = new THREE.Euler().setFromQuaternion(groupRef.current.quaternion);
        groupRef.current.rotation.z = currentRot.z + swayAngle * 0.05;
        groupRef.current.rotation.x = currentRot.x + tiltAngle * 0.05;

    } else {
        const cameraPos = new THREE.Vector3(0, 9, 20);
        const dummy = new THREE.Object3D();
        dummy.position.copy(groupRef.current.position);

        dummy.lookAt(cameraPos);

        groupRef.current.quaternion.slerp(dummy.quaternion, delta * 3);

        const wobbleX = Math.sin(time * 1.5 + swayOffset) * 0.03;
        const wobbleZ = Math.cos(time * 1.2 + swayOffset) * 0.03;

        const currentRot = new THREE.Euler().setFromQuaternion(groupRef.current.quaternion);
        groupRef.current.rotation.x = currentRot.x + wobbleX;
        groupRef.current.rotation.z = currentRot.z + wobbleZ;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 1.2, -0.1]}>
        <cylinderGeometry args={[0.005, 0.005, 1.5]} />
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.2} transparent opacity={0.6} />
      </mesh>

      <group position={[0, 0, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 1.5, 0.02]} />
          <meshStandardMaterial color="#fdfdfd" roughness={0.8} />
        </mesh>

        <mesh position={[0, 0.15, 0.025]}>
          <planeGeometry args={[1.0, 1.0]} />
          {texture && !error ? (
            <meshBasicMaterial map={texture} transparent opacity={1.0} />
          ) : (
            <meshStandardMaterial color={error ? "#550000" : "#cccccc"} />
          )}
        </mesh>

        <mesh position={[0, 0.7, 0.025]} rotation={[0,0,0]}>
           <boxGeometry args={[0.1, 0.05, 0.05]} />
           <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.2} />
        </mesh>

        <Text
          position={[0, -0.55, 0.03]}
          fontSize={0.12}
          color="#333"
          anchorX="center"
          anchorY="middle"
        >
          {error ? "Image not found" : "Happy Memories"}
        </Text>
      </group>
    </group>
  );
};

export const Polaroids: React.FC<PolaroidsProps> = ({ mode, uploadedPhotos, defaultPhotos, twoHandsDetected, onClosestPhotoChange }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [animStage, setAnimStage] = useState(PolaroidAnimationStage.FORMED);
  const [activeIndex, setActiveIndex] = useState(0);
  const [exitingIndex, setExitingIndex] = useState<number | null>(null);
  const stageTimerRef = useRef<number | null>(null);
  const conveyorTimerRef = useRef<number | null>(null);
  const photos = uploadedPhotos.length > 0 ? uploadedPhotos : defaultPhotos;

  useEffect(() => {
    if (mode === TreeMode.CHAOS) {
      setAnimStage(PolaroidAnimationStage.EXPLODING);
      stageTimerRef.current = window.setTimeout(() => {
        setAnimStage(PolaroidAnimationStage.CONVEYOR);
      }, 2000);
    } else {
      setAnimStage(PolaroidAnimationStage.FORMED);
      if (stageTimerRef.current !== null) {
        clearTimeout(stageTimerRef.current);
      }
      if (conveyorTimerRef.current !== null) {
        clearInterval(conveyorTimerRef.current);
      }
    }

    return () => {
      if (stageTimerRef.current !== null) {
        clearTimeout(stageTimerRef.current);
      }
      if (conveyorTimerRef.current !== null) {
        clearInterval(conveyorTimerRef.current);
      }
    };
  }, [mode]);

  useEffect(() => {
    if (animStage === PolaroidAnimationStage.CONVEYOR && photos.length > 0) {
      setActiveIndex(0);
      setExitingIndex(null);

      conveyorTimerRef.current = window.setInterval(() => {
        setActiveIndex((prevActive) => {
          setExitingIndex(prevActive);
          return (prevActive + 1) % photos.length;
        });
      }, 3000);
    } else {
      if (conveyorTimerRef.current !== null) {
        clearInterval(conveyorTimerRef.current);
      }
      setExitingIndex(null);
    }

    return () => {
      if (conveyorTimerRef.current !== null) {
        clearInterval(conveyorTimerRef.current);
      }
    };
  }, [animStage, photos.length]);

  const photoData = useMemo(() => {
    if (photos.length === 0) return [];

    const data: PhotoData[] = [];
    const count = photos.length;

    for (let i = 0; i < count; i++) {
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const theta = goldenAngle * i;
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const r = EARTH_RADIUS + 1.2;

      const targetPos = new THREE.Vector3(
        r * radiusAtY * Math.cos(theta),
        r * y + EARTH_CENTER_Y,
        r * radiusAtY * Math.sin(theta)
      );

      const rChaos = 25 * Math.cbrt(Math.random());
      const thetaChaos = Math.random() * 2 * Math.PI;
      const phiChaos = Math.acos(2 * Math.random() - 1);
      const chaosPos = new THREE.Vector3(
        rChaos * Math.sin(phiChaos) * Math.cos(thetaChaos),
        rChaos * Math.sin(phiChaos) * Math.sin(thetaChaos) + 5,
        rChaos * Math.cos(phiChaos)
      );

      data.push({
        id: i,
        url: photos[i],
        chaosPos,
        targetPos,
        speed: 0.8 + Math.random() * 1.5,
      });
    }
    return data;
  }, [photos]);

  useFrame(() => {
    if (twoHandsDetected && onClosestPhotoChange) {
      onClosestPhotoChange(null);
    }
  });

  return (
    <group ref={groupRef}>
      {photoData.map((data, i) => (
        <PolaroidItem
          key={data.id}
          data={data}
          animStage={animStage}
          isActive={i === activeIndex}
          isExiting={i === exitingIndex}
        />
      ))}
    </group>
  );
};
