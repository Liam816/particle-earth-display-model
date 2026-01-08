import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard, Html } from '@react-three/drei';
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

const CITY_IMAGES: Record<string, string> = {
  'Edinburgh': '/imgs/Edinburgh.jpg',
  'Tokyo': '/imgs/Tokyo.jpg',
  'Seoul': '/imgs/Seoul.jpg',
  'Manila': '/imgs/Manila.jpg',
  'Kuala Lumpur': '/imgs/Kuala-Lumpur.jpg',
  'Bangkok': '/imgs/Bangkok.jpg',
  'Shanghai': '/imgs/Shanghai.jpg',
  'Nantong': '/imgs/Nantong.jpg',
  'Guangzhou': '/imgs/Guangzhou.jpg',
};

const EARTH_RADIUS = 6;
const EARTH_CENTER_Y = 6;
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
    glow = pow(glow, 1.3);

    vec3 finalColor = vColor * 1.15;
    gl_FragColor = vec4(finalColor, vAlpha * glow * 0.95);
  }
`;

const cityMarkerVertexShader = `
  uniform float uTime;
  uniform float uProgress;

  attribute vec3 aChaosPos;
  attribute vec3 aTargetPos;
  attribute float aRandom;

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
    vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);

    float pulse = sin(uTime * 4.0 + aRandom * 10.0) * 0.5 + 0.5;
    float baseSize = 3.0 + pulse * 2.0;
    gl_PointSize = baseSize * (40.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vAlpha = easedProgress * (0.7 + pulse * 0.3);
  }
`;

const cityMarkerFragmentShader = `
  varying float vAlpha;

  void main() {
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;

    float glow = 1.0 - (r * 2.0);
    glow = pow(glow, 0.8);

    vec3 redColor = vec3(1.0, 0.2, 0.1);
    gl_FragColor = vec4(redColor, vAlpha * glow);
  }
`;

function latLonToSpherical(lat: number, lon: number): { theta: number; phi: number } {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return { theta, phi };
}

const CityImage: React.FC<{ cityName: string; onClick?: () => void }> = ({ cityName, onClick }) => {
  const imagePath = CITY_IMAGES[cityName];
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [error, setError] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      imagePath,
      (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        setTexture(loadedTexture);
        setError(false);
      },
      undefined,
      () => {
        console.warn(`Failed to load image for ${cityName}`);
        setError(true);
      }
    );
  }, [imagePath, cityName]);

  if (!texture && !error) return null;

  return (
    <group
      position={[0, -0.55, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Polaroid white frame - use meshBasicMaterial to ignore lighting */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.72, 0.9, 0.012]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      <mesh position={[0, 0.09, 0.015]}>
        <planeGeometry args={[0.6, 0.6]} />
        {texture && !error ? (
          <meshBasicMaterial map={texture} />
        ) : (
          <meshBasicMaterial color={error ? "#550000" : "#cccccc"} />
        )}
      </mesh>

      {/* Gold clip */}
      <mesh position={[0, 0.42, 0.015]}>
        <boxGeometry args={[0.06, 0.03, 0.03]} />
        <meshBasicMaterial color="#D4AF37" />
      </mesh>
    </group>
  );
};

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

const CityLabel: React.FC<{
  city: any;
  progress: React.MutableRefObject<number>;
  onCityClick: (cityData: { name: string; url: string }) => void;
}> = ({ city, progress, onCityClick }) => {
  const ref = useRef<THREE.Group>(null!);
  const [targetPosition] = useState(() => {
    const { theta, phi } = latLonToSpherical(city.lat, city.lon);
    const r = EARTH_RADIUS + 0.4;
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) + EARTH_CENTER_Y,
      r * Math.sin(phi) * Math.sin(theta)
    );
  });
  const [chaosPosition] = useState(() => {
    const rChaos = 25 * Math.cbrt(Math.random());
    const thetaChaos = Math.random() * 2 * Math.PI;
    const phiChaos = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
      rChaos * Math.sin(phiChaos) * Math.cos(thetaChaos),
      rChaos * Math.sin(phiChaos) * Math.sin(thetaChaos) + 5,
      rChaos * Math.cos(phiChaos)
    );
  });
  const [randomVal] = useState(Math.random());

  useFrame(() => {
    if (ref.current) {
      const localProgress = Math.max(0, Math.min(1, progress.current * 1.2 - randomVal * 0.2));
      const easedProgress = localProgress < 0.5 ? 4.0 * localProgress * localProgress * localProgress : 1.0 - Math.pow(-2.0 * localProgress + 2.0, 3.0) / 2.0;
      ref.current.position.lerpVectors(chaosPosition, targetPosition, easedProgress);
    }
  });

  // Hack: Tokyo and Shanghai labels on the left side
  const isLeftSide = city.name === 'Tokyo' || city.name === 'Shanghai';
  const textX = isLeftSide ? -0.45 : 0.45;
  const textAnchor = isLeftSide ? 'right' : 'left';

  // Hack: Offset Shanghai photo left, Nantong photo right to avoid overlap
  let photoOffsetX = 0;
  let photoOffsetY = 0;
  let textOffsetY = 0;
  if (city.name === 'Shanghai') { photoOffsetX = -0.5; photoOffsetY = -0.3; }
  if (city.name === 'Nantong') photoOffsetX = 0.5;
  if (city.name === 'Seoul') textOffsetY = 0.15;

  return (
    <group ref={ref}>
      <Billboard follow={true}>
        <group position={[photoOffsetX, photoOffsetY, 0]}>
          <CityImage
            cityName={city.name}
            onClick={() => onCityClick({ name: city.name, url: CITY_IMAGES[city.name] })}
          />
        </group>
        <Text
          fontSize={0.35}
          color="#F5E6BF"
          anchorX={textAnchor}
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#8B4513"
          position={[textX + photoOffsetX, -0.55 + photoOffsetY + textOffsetY, 0]}
        >
          {city.name}
        </Text>
      </Billboard>
    </group>
  );
};

function generateParticles(count: number, imageData: ImageData | null) {
  const chaos = new Float32Array(count * 3);
  const target = new Float32Array(count * 3);
  const rnd = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  const radius = EARTH_RADIUS;

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
    target[i * 3 + 1] = radius * Math.cos(spherePhi) + EARTH_CENTER_Y;
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

function generateCityMarkers() {
  const chaosPositions = new Float32Array(CITIES.length * 3);
  const targetPositions = new Float32Array(CITIES.length * 3);
  const randoms = new Float32Array(CITIES.length);

  CITIES.forEach((city, i) => {
    // Chaos position
    const rChaos = 25 * Math.cbrt(Math.random());
    const thetaChaos = Math.random() * 2 * Math.PI;
    const phiChaos = Math.acos(2 * Math.random() - 1);
    chaosPositions[i * 3] = rChaos * Math.sin(phiChaos) * Math.cos(thetaChaos);
    chaosPositions[i * 3 + 1] = rChaos * Math.sin(phiChaos) * Math.sin(thetaChaos) + 5;
    chaosPositions[i * 3 + 2] = rChaos * Math.cos(phiChaos);

    // Target position
    const { theta, phi } = latLonToSpherical(city.lat, city.lon);
    const r = EARTH_RADIUS + 0.15;
    targetPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    targetPositions[i * 3 + 1] = r * Math.cos(phi) + EARTH_CENTER_Y;
    targetPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    randoms[i] = Math.random();
  });

  return { chaosPositions, targetPositions, randoms };
}

export const Foliage: React.FC<FoliageProps> = ({ mode, count }) => {
  const meshRef = useRef<THREE.Points>(null);
  const cityMarkersRef = useRef<THREE.Points>(null);
  const cityLabelsRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedCityData, setSelectedCityData] = useState<{ name: string; url: string } | null>(null);

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

  const cityMarkerData = useMemo(() => generateCityMarkers(), []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
  }), []);

  const cityUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uProgress: { value: 0 },
  }), []);

  useFrame((state, delta) => {
    const target = mode === TreeMode.FORMED ? 1 : 0;
    progressRef.current = THREE.MathUtils.lerp(progressRef.current, target, delta * 1.5);

    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uProgress.value = progressRef.current;
      if (mode === TreeMode.FORMED) {
        meshRef.current.rotation.y += delta * 0.03;
      }
    }

    if (cityMarkersRef.current) {
      const material = cityMarkersRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.elapsedTime;
      material.uniforms.uProgress.value = progressRef.current;
      if (mode === TreeMode.FORMED) {
        cityMarkersRef.current.rotation.y = meshRef.current?.rotation.y || 0;
      }
    }

    if (cityLabelsRef.current && mode === TreeMode.FORMED) {
      cityLabelsRef.current.rotation.y = meshRef.current?.rotation.y || 0;
    }
  });

  if (!particleData) {
    return null;
  }

  return (
    <>
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

      <points ref={cityMarkersRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={CITIES.length}
            array={cityMarkerData.chaosPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aChaosPos"
            count={CITIES.length}
            array={cityMarkerData.chaosPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aTargetPos"
            count={CITIES.length}
            array={cityMarkerData.targetPositions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aRandom"
            count={CITIES.length}
            array={cityMarkerData.randoms}
            itemSize={1}
          />
        </bufferGeometry>
        {/* @ts-ignore */}
        <shaderMaterial
          vertexShader={cityMarkerVertexShader}
          fragmentShader={cityMarkerFragmentShader}
          uniforms={cityUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <group ref={cityLabelsRef}>
        {CITIES.map((city) => (
          <CityLabel
            key={city.name}
            city={city}
            progress={progressRef}
            onCityClick={setSelectedCityData}
          />
        ))}
      </group>

      {selectedCityData && (
        <Html
          portal={{ current: document.body }}
          calculatePosition={() => [0, 0]}
          style={{
            pointerEvents: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 10001
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'auto',
              cursor: 'pointer',
              zIndex: 10001,
            }}
            onClick={() => setSelectedCityData(null)}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '16px 16px 60px 16px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                maxWidth: '90vw',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                transform: 'rotate(-1.5deg)',
                transition: 'transform 0.2s',
                borderRadius: '2px',
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#f0f0f0',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minWidth: '300px',
                minHeight: '200px',
              }}>
                <img
                  src={selectedCityData.url}
                  alt={selectedCityData.name}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '65vh',
                    objectFit: 'contain',
                  }}
                />
              </div>
              <div style={{
                position: 'absolute',
                bottom: '15px',
                width: '100%',
                textAlign: 'center',
                fontFamily: '\"Courier New\", Courier, monospace',
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#222',
                letterSpacing: '1px',
              }}>
                {selectedCityData.name}
              </div>
            </div>
          </div>
        </Html>
      )}
    </>
  );
};
