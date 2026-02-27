import { useState, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Leva } from 'leva'
import { DebugPanel } from './components/DebugPanel'
import { calculateRustProgress } from './utils/dateCalculator'

// 简单测试组件
function TestMesh() {
  return (
    <mesh>
      <planeGeometry args={[4, 4]} />
      <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.1} />
    </mesh>
  )
}

function App() {
  const [progress, setProgress] = useState(() => calculateRustProgress())
  const [noiseScale, setNoiseScale] = useState(3.0)
  const [edgeSharpness, setEdgeSharpness] = useState(0.3)
  const [noiseOctaves, setNoiseOctaves] = useState(4)
  const [envMapIntensity, setEnvMapIntensity] = useState(0.5)
  const [lightIntensity, setLightIntensity] = useState(2.0)

  return (
    <>
      <Leva collapsed={false} />
      <DebugPanel
        onProgressChange={setProgress}
        onNoiseScaleChange={setNoiseScale}
        onEdgeSharpnessChange={setEdgeSharpness}
        onNoiseOctavesChange={setNoiseOctaves}
        onEnvMapIntensityChange={setEnvMapIntensity}
        onLightIntensityChange={setLightIntensity}
      />
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{ background: '#1a1a1a' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <TestMesh />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={1.5}
          maxDistance={6}
        />
      </Canvas>
    </>
  )
}

export default App
