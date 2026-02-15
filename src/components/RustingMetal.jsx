import { useRef, useMemo, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useControls, folder } from 'leva'
import * as THREE from 'three'
import { noiseGLSL } from '../shaders/noise'

const START_DATE = new Date('2026-02-15T00:00:00Z').getTime()
const END_DATE = new Date('2041-02-15T00:00:00Z').getTime()
const DURATION = END_DATE - START_DATE

function getRealProgress() {
  return Math.max(0, Math.min(1, (Date.now() - START_DATE) / DURATION))
}

// Texture paths
const BASE = '/assets'
const paths = {
  A: {
    map: `${BASE}/Metal056A_1K-PNG/Metal056A_1K-PNG_Color.png`,
    normalMap: `${BASE}/Metal056A_1K-PNG/Metal056A_1K-PNG_NormalGL.png`,
    roughnessMap: `${BASE}/Metal056A_1K-PNG/Metal056A_1K-PNG_Roughness.png`,
    metalnessMap: `${BASE}/Metal056A_1K-PNG/Metal056A_1K-PNG_Metalness.png`,
    displacementMap: `${BASE}/Metal056A_1K-PNG/Metal056A_1K-PNG_Displacement.png`,
  },
  B: {
    map: `${BASE}/Metal056B_1K-PNG/Metal056B_1K-PNG_Color.png`,
    normalMap: `${BASE}/Metal056B_1K-PNG/Metal056B_1K-PNG_NormalGL.png`,
    roughnessMap: `${BASE}/Metal056B_1K-PNG/Metal056B_1K-PNG_Roughness.png`,
    metalnessMap: `${BASE}/Metal056B_1K-PNG/Metal056B_1K-PNG_Metalness.png`,
    displacementMap: `${BASE}/Metal056B_1K-PNG/Metal056B_1K-PNG_Displacement.png`,
  },
  C: {
    map: `${BASE}/Metal056C_1K-PNG/Metal056C_1K-PNG_Color.png`,
    normalMap: `${BASE}/Metal056C_1K-PNG/Metal056C_1K-PNG_NormalGL.png`,
    roughnessMap: `${BASE}/Metal056C_1K-PNG/Metal056C_1K-PNG_Roughness.png`,
    metalnessMap: `${BASE}/Metal056C_1K-PNG/Metal056C_1K-PNG_Metalness.png`,
    displacementMap: `${BASE}/Metal056C_1K-PNG/Metal056C_1K-PNG_Displacement.png`,
  },
}

// Fragment shader: uniform declarations + blend computation
const fragmentUniforms = /* glsl */ `
uniform float uProgress;
uniform float uNoiseScale;
uniform float uHeightBlend;
uniform sampler2D uColorB;
uniform sampler2D uColorC;
uniform sampler2D uNormalB;
uniform sampler2D uNormalC;
uniform sampler2D uRoughnessB;
uniform sampler2D uRoughnessC;
uniform sampler2D uMetalnessB;
uniform sampler2D uMetalnessC;
uniform sampler2D uDispA;
uniform sampler2D uDispB;
uniform sampler2D uDispC;
`

// Vertex shader: uniform declarations for displacement blending
const vertexUniforms = /* glsl */ `
uniform float uProgress;
uniform float uNoiseScale;
uniform float uHeightBlend;
uniform float uDispScale;
uniform sampler2D uDispA;
uniform sampler2D uDispB;
uniform sampler2D uDispC;
`

// Shared blend factor computation (used in both vertex and fragment)
const blendComputation = /* glsl */ `
float computeVoronoi = voronoiNoise(rustUv * uNoiseScale);
float computePerlin = snoise(rustUv * uNoiseScale * 2.5) * 0.5 + 0.5;
float computeFbm = fbm(rustUv * uNoiseScale * 1.5);

float hA = texture2D(uDispA, rustUv).r;
float hB = texture2D(uDispB, rustUv).r;
float hC = texture2D(uDispC, rustUv).r;

// Susceptibility: crevices (low height) + voronoi patches + perlin variation
float susceptibility = computeVoronoi * 0.35 + computePerlin * 0.25 + (1.0 - hA) * 0.25 + computeFbm * 0.15;

// Rust front advances with progress
float rustLevel = smoothstep(susceptibility - 0.13, susceptibility + 0.13, uProgress);

// Three-way blend: A -> B -> C
float t1 = smoothstep(0.0, 0.55, rustLevel);
float t2 = smoothstep(0.45, 1.0, rustLevel);

// Height-based blend refinement for natural transitions
float hBlendAB = clamp(t1 + (hB - hA) * uHeightBlend * t1 * (1.0 - t1) * 4.0, 0.0, 1.0);
float hBlendBC = clamp(t2 + (hC - hB) * uHeightBlend * t2 * (1.0 - t2) * 4.0, 0.0, 1.0);
`

// Custom map_fragment replacement
const customMapFragment = /* glsl */ `
#ifdef USE_MAP
  vec2 rustUv = vMapUv;
  ${blendComputation}

  vec4 colA = texture2D(map, rustUv);
  vec4 colB = texture2D(uColorB, rustUv);
  vec4 colC = texture2D(uColorC, rustUv);
  vec4 sampledDiffuseColor = mix(mix(colA, colB, hBlendAB), colC, hBlendBC);

  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);
  #endif

  diffuseColor *= sampledDiffuseColor;
#endif
`

// Custom roughnessmap_fragment replacement
const customRoughnessFragment = /* glsl */ `
float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
  float rA = texture2D(roughnessMap, vRoughnessMapUv).g;
  float rB = texture2D(uRoughnessB, vRoughnessMapUv).g;
  float rC = texture2D(uRoughnessC, vRoughnessMapUv).g;
  roughnessFactor *= mix(mix(rA, rB, hBlendAB), rC, hBlendBC);
#endif
`

// Custom metalnessmap_fragment replacement
const customMetalnessFragment = /* glsl */ `
float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
  float mA = texture2D(metalnessMap, vMetalnessMapUv).b;
  float mB = texture2D(uMetalnessB, vMetalnessMapUv).b;
  float mC = texture2D(uMetalnessC, vMetalnessMapUv).b;
  metalnessFactor *= mix(mix(mA, mB, hBlendAB), mC, hBlendBC);
#endif
`

// Custom normal_fragment_maps replacement
const customNormalFragment = /* glsl */ `
#ifdef USE_NORMALMAP_OBJECTSPACE
  vec3 onA = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
  vec3 onB = texture2D(uNormalB, vNormalMapUv).xyz * 2.0 - 1.0;
  vec3 onC = texture2D(uNormalC, vNormalMapUv).xyz * 2.0 - 1.0;
  normal = normalize(mix(mix(onA, onB, hBlendAB), onC, hBlendBC));
  #ifdef FLIP_SIDED
    normal = -normal;
  #endif
  #ifdef DOUBLE_SIDED
    normal = normal * faceDirection;
  #endif
  normal = normalize(normalMatrix * normal);
#elif defined(USE_NORMALMAP_TANGENTSPACE)
  vec3 mapNA = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
  vec3 mapNB = texture2D(uNormalB, vNormalMapUv).xyz * 2.0 - 1.0;
  vec3 mapNC = texture2D(uNormalC, vNormalMapUv).xyz * 2.0 - 1.0;
  vec3 mapN = normalize(mix(mix(mapNA, mapNB, hBlendAB), mapNC, hBlendBC));
  mapN.xy *= normalScale;
  normal = normalize(tbn * mapN);
#elif defined(USE_BUMPMAP)
  normal = perturbNormalArb(-vViewPosition, normal, dHdxy_fwd(), faceDirection);
#endif
`

// Custom displacementmap_vertex replacement
const customDisplacementVertex = /* glsl */ `
#ifdef USE_DISPLACEMENTMAP
  vec2 rustUv = vDisplacementMapUv;
  ${blendComputation}

  float dA = texture2D(uDispA, rustUv).r;
  float dB = texture2D(uDispB, rustUv).r;
  float dC = texture2D(uDispC, rustUv).r;
  float blendedDisp = mix(mix(dA, dB, hBlendAB), dC, hBlendBC);

  transformed += normalize(objectNormal) * (blendedDisp * uDispScale + displacementBias);
#endif
`

export default function RustingMetal() {
  const shaderRef = useRef(null)

  const controls = useControls('Rust', {
    useRealTime: true,
    progressOverride: { value: 0.0, min: 0, max: 1, step: 0.0001 },
    Material: folder({
      noiseScale: { value: 3.0, min: 0.5, max: 10, step: 0.1 },
      heightBlend: { value: 0.6, min: 0, max: 1, step: 0.01 },
      displacementScale: { value: 0.06, min: 0, max: 0.3, step: 0.001 },
      normalStrength: { value: 1.0, min: 0, max: 2, step: 0.01 },
    }),
  })

  // Load all PBR textures
  const texA = useTexture(paths.A)
  const texB = useTexture(paths.B)
  const texC = useTexture(paths.C)

  // Set proper texture settings
  useMemo(() => {
    const allTextures = [
      ...Object.values(texA),
      ...Object.values(texB),
      ...Object.values(texC),
    ]
    allTextures.forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.magFilter = THREE.LinearFilter
      t.anisotropy = 16
    })
    // Color textures need sRGB encoding
    ;[texA.map, texB.map, texC.map].forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace
    })
  }, [texA, texB, texC])

  // Custom uniforms
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uNoiseScale: { value: 3.0 },
      uHeightBlend: { value: 0.6 },
      uDispScale: { value: 0.06 },
      uColorB: { value: texB.map },
      uColorC: { value: texC.map },
      uNormalB: { value: texB.normalMap },
      uNormalC: { value: texC.normalMap },
      uRoughnessB: { value: texB.roughnessMap },
      uRoughnessC: { value: texC.roughnessMap },
      uMetalnessB: { value: texB.metalnessMap },
      uMetalnessC: { value: texC.metalnessMap },
      uDispA: { value: texA.displacementMap },
      uDispB: { value: texB.displacementMap },
      uDispC: { value: texC.displacementMap },
    }),
    [texA, texB, texC]
  )

  const onBeforeCompile = useCallback(
    (shader) => {
      // Merge custom uniforms
      Object.assign(shader.uniforms, uniforms)

      // --- VERTEX SHADER ---
      shader.vertexShader = shader.vertexShader.replace(
        'void main() {',
        `${noiseGLSL}\n${vertexUniforms}\nvoid main() {`
      )
      shader.vertexShader = shader.vertexShader.replace(
        '#include <displacementmap_vertex>',
        customDisplacementVertex
      )

      // --- FRAGMENT SHADER ---
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        `${noiseGLSL}\n${fragmentUniforms}\nvoid main() {`
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        customMapFragment
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        customRoughnessFragment
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <metalnessmap_fragment>',
        customMetalnessFragment
      )
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        customNormalFragment
      )

      shaderRef.current = shader
    },
    [uniforms]
  )

  // Update uniforms every frame
  useFrame(() => {
    if (!shaderRef.current) return
    const u = shaderRef.current.uniforms
    u.uProgress.value = controls.useRealTime
      ? getRealProgress()
      : controls.progressOverride
    u.uNoiseScale.value = controls.noiseScale
    u.uHeightBlend.value = controls.heightBlend
    u.uDispScale.value = controls.displacementScale
  })

  // Create material imperatively so onBeforeCompile is stable
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: texA.map,
      normalMap: texA.normalMap,
      normalScale: new THREE.Vector2(1, 1),
      roughnessMap: texA.roughnessMap,
      metalnessMap: texA.metalnessMap,
      displacementMap: texA.displacementMap,
      displacementScale: 0.06,
      displacementBias: -0.03,
      envMapIntensity: 1.0,
    })
    mat.onBeforeCompile = onBeforeCompile
    // Force shader recompilation when needed
    mat.customProgramCacheKey = () => 'rusting-metal-v1'
    return mat
  }, [texA, onBeforeCompile])

  // Update normalScale from controls
  useFrame(() => {
    material.normalScale.set(controls.normalStrength, controls.normalStrength)
  })

  return (
    <mesh rotation={[-Math.PI / 5, 0, 0]} position={[0, -0.2, 0]}>
      <planeGeometry args={[4, 4, 256, 256]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
