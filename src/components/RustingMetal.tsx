import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import vertexShader from '../shaders/rusting.vert'
import fragmentShader from '../shaders/rusting.frag'

interface RustingMetalProps {
  progress: number
  noiseScale: number
  edgeSharpness: number
  noiseOctaves: number
  envMapIntensity: number
  lightIntensity: number
}

export function RustingMetal({
  progress,
  noiseScale,
  edgeSharpness,
  noiseOctaves,
  envMapIntensity,
  lightIntensity,
}: RustingMetalProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { camera } = useThree()

  // Load metal textures
  const [metalColor, metalNormal, metalRoughness, metalMetalness] = useTexture([
    '/textures/Metal061A_4K-PNG_Color.png',
    '/textures/Metal061A_4K-PNG_NormalGL.png',
    '/textures/Metal061A_4K-PNG_Roughness.png',
    '/textures/Metal061A_4K-PNG_Metalness.png',
  ])

  // Load rust textures
  const [rustColor, rustNormal, rustRoughness, rustAO] = useTexture([
    '/textures/Rust010_4K-PNG_Color.png',
    '/textures/Rust010_4K-PNG_NormalGL.png',
    '/textures/Rust010_4K-PNG_Roughness.png',
    '/textures/Rust010_4K-PNG_AmbientOcclusion.png',
  ])

  // Configure textures
  useEffect(() => {
    const allTextures = [metalColor, metalNormal, metalRoughness, metalMetalness, rustColor, rustNormal, rustRoughness, rustAO]
    allTextures.forEach((texture) => {
      if (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        texture.anisotropy = 16
      }
    })
  }, [metalColor, metalNormal, metalRoughness, metalMetalness, rustColor, rustNormal, rustRoughness, rustAO])

  const uniforms = useMemo(
    () => ({
      // Metal textures
      metalColorMap: { value: metalColor },
      metalNormalMap: { value: metalNormal },
      metalRoughnessMap: { value: metalRoughness },
      metalMetalnessMap: { value: metalMetalness },
      // Rust textures
      rustColorMap: { value: rustColor },
      rustNormalMap: { value: rustNormal },
      rustRoughnessMap: { value: rustRoughness },
      rustAOMap: { value: rustAO },
      // Rust parameters
      rustProgress: { value: progress },
      noiseScale: { value: noiseScale },
      edgeSharpness: { value: edgeSharpness },
      noiseOctaves: { value: noiseOctaves },
      // Lighting
      lightDirection: { value: new THREE.Vector3(1, 1, 1).normalize() },
      lightColor: { value: new THREE.Vector3(1, 0.98, 0.95) },
      lightIntensity: { value: lightIntensity },
      ambientIntensity: { value: envMapIntensity },
    }),
    [metalColor, metalNormal, metalRoughness, metalMetalness, rustColor, rustNormal, rustRoughness, rustAO]
  )

  // Update uniforms on each frame
  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.rustProgress.value = progress
      materialRef.current.uniforms.noiseScale.value = noiseScale
      materialRef.current.uniforms.edgeSharpness.value = edgeSharpness
      materialRef.current.uniforms.noiseOctaves.value = noiseOctaves
      materialRef.current.uniforms.ambientIntensity.value = envMapIntensity
      materialRef.current.uniforms.lightIntensity.value = lightIntensity

      // Update light direction based on camera for better highlights
      const lightDir = new THREE.Vector3(1, 1, 0.5)
      lightDir.applyQuaternion(camera.quaternion)
      materialRef.current.uniforms.lightDirection.value = lightDir.normalize()
    }
  })

  // Create geometry with tangents for normal mapping
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(4, 4, 128, 128)
    geo.computeTangents()
    return geo
  }, [])

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
