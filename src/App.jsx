import { Suspense, Component } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { Leva } from 'leva'
import * as THREE from 'three'
import RustingMetal from './components/RustingMetal'
import Effects from './components/Effects'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('Canvas error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ color: 'red', padding: 20, whiteSpace: 'pre-wrap' }}>
          {this.state.error.toString()}
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Leva collapsed />
      <Canvas
        camera={{ position: [0, 1.5, 3], fov: 35 }}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          <Environment
            files="/assets/DaySkyHDRI055A_1K/DaySkyHDRI055A_1K_HDR.exr"
            background={false}
          />
          <RustingMetal />
          <Effects />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={1.5}
          maxDistance={6}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, -0.2, 0]}
        />
      </Canvas>
    </ErrorBoundary>
  )
}
