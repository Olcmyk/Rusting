import { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useControls, folder } from 'leva'
import * as THREE from 'three'

const BASE = '/assets'
const paths = {
  A: {
    map: `${BASE}/Metal056A_1K-PNG/Metal056A_1K-PNG_Color.png`,
    normalMap: `${BASE}/Metal056A_1K-PNG/Metal056A_1K-PNG_NormalGL.png`,
    roughnessMap: `${BASE}/Metal056A_1K-PNG/Metal056A_1K-PNG_Roughness.png`,
    metalnessMap: `${BASE}/Metal056A_1K-PNG/Metal056A_1K-PNG_Metalness.png`,
    displacementMap: `${BASE}/Metal056A_1K-PNG/Metal056A_1K-PNG_Displacement.png`,
  },
}

export default function RustingMetal() {
  const texA = useTexture(paths.A)

  return (
    <mesh rotation={[-Math.PI / 5, 0, 0]} position={[0, -0.2, 0]}>
      <planeGeometry args={[4, 4, 64, 64]} />
      <meshStandardMaterial
        map={texA.map}
        normalMap={texA.normalMap}
        roughnessMap={texA.roughnessMap}
        metalnessMap={texA.metalnessMap}
        displacementMap={texA.displacementMap}
        displacementScale={0.06}
      />
    </mesh>
  )
}
