import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';

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

const EARTH_RADIUS = 6;
const EARTH_CENTER_Y = 6;

function latLonToPosition(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return [
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi) + EARTH_CENTER_Y,
    radius * Math.sin(phi) * Math.sin(theta)
  ];
}

interface CityMarkersProps {
  visible: boolean;
  getRotation: () => number;
}

export const CityMarkers: React.FC<CityMarkersProps> = ({ visible, getRotation }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const cityData = useMemo(() => {
    return CITIES.map(city => ({
      name: city.name,
      position: latLonToPosition(city.lat, city.lon, EARTH_RADIUS + 0.15)
    }));
  }, []);

  useFrame(() => {
    if (groupRef.current && visible) {
      groupRef.current.rotation.y = getRotation();
    }
  });

  if (!visible) return null;

  return (
    <group ref={groupRef}>
      {cityData.map((city) => (
        <group key={city.name} position={city.position}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.4, 6]} />
            <meshBasicMaterial color="#654321" />
          </mesh>
          
          <mesh position={[0.1, 0.35, 0]}>
            <planeGeometry args={[0.2, 0.12]} />
            <meshBasicMaterial color="#E63946" side={THREE.DoubleSide} />
          </mesh>
          
          <Billboard>
            <Text
              position={[0.3, 0.35, 0]}
              fontSize={0.18}
              color="#FFD700"
              anchorX="left"
              anchorY="middle"
              outlineWidth={0.008}
              outlineColor="#000000"
            >
              {city.name}
            </Text>
          </Billboard>
        </group>
      ))}
    </group>
  );
};
