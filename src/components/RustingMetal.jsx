import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKTX2 } from '@react-three/drei'
import { useControls, folder } from 'leva'
import * as THREE from 'three'
import { noiseGLSL } from '../shaders/noise'

const START_DATE = new Date('2026-02-15T00:00:00Z').getTime()
const END_DATE = new Date('2041-02-15T00:00:00Z').getTime()
const DURATION = END_DATE - START_DATE

function getRealProgress() {
  return Math.max(0, Math.min(1, (Date.now() - START_DATE) / DURATION))
}

const BASE = '/assets'
const paths = {
  metal: {
    map: `${BASE}/Metal061A_4K-PNG/Metal061A_4K-PNG_Color.ktx2`,
    normalMap: `${BASE}/Metal061A_4K-PNG/Metal061A_4K-PNG_NormalGL.ktx2`,
    roughnessMap: `${BASE}/Metal061A_4K-PNG/Metal061A_4K-PNG_Roughness.ktx2`,
    metalnessMap: `${BASE}/Metal061A_4K-PNG/Metal061A_4K-PNG_Metalness.ktx2`,
    displacementMap: `${BASE}/Metal061A_4K-PNG/Metal061A_4K-PNG_Displacement.ktx2`,
  },
  rust: {
    map: `${BASE}/Rust010_4K-PNG/Rust010_4K-PNG_Color.ktx2`,
    normalMap: `${BASE}/Rust010_4K-PNG/Rust010_4K-PNG_NormalGL.ktx2`,
    roughnessMap: `${BASE}/Rust010_4K-PNG/Rust010_4K-PNG_Roughness.ktx2`,
    aoMap: `${BASE}/Rust010_4K-PNG/Rust010_4K-PNG_AmbientOcclusion.ktx2`,
    displacementMap: `${BASE}/Rust010_4K-PNG/Rust010_4K-PNG_Displacement.ktx2`,
  },
}

// Blend computation using noise and height
const blendBlock = /* glsl */ `
  float _vor = voronoiNoise(_rustUv * uNoiseScale);
  float _prl = snoise(_rustUv * uNoiseScale * 2.5) * 0.5 + 0.5;
  float _fbm = fbm(_rustUv * uNoiseScale * 1.5);
  float _hA = texture2D(uDispA, _rustUv).r;
  float _hB = texture2D(uDispB, _rustUv).r;
  float _sus = _vor * 0.35 + _prl * 0.25 + (1.0 - _hA) * 0.25 + _fbm * 0.15;
  float _rl = smoothstep(_sus - 0.13, _sus + 0.13, uProgress);
  float hBlend = clamp(_rl + (_hB - _hA) * uHeightBlend * _rl * (1.0 - _rl) * 4.0, 0.0, 1.0);
`

export default function RustingMetal() {
  const shaderRef = useRef(null)
  const { gl } = useThree()

  const controls = useControls('Rust', {
    useRealTime: false,
    progressOverride: { value: 0.0, min: 0, max: 1, step: 0.0001 },
    Material: folder({
      noiseScale: { value: 3.0, min: 0.5, max: 10, step: 0.1 },
      heightBlend: { value: 0.6, min: 0, max: 1, step: 0.01 },
      displacementScale: { value: 0.06, min: 0, max: 0.3, step: 0.001 },
      normalStrength: { value: 1.0, min: 0, max: 2, step: 0.01 },
      envMapIntensity: { value: 2.5, min: 0, max: 5, step: 0.1 },
      metalness: { value: 1.0, min: 0, max: 1, step: 0.01 },
      roughnessBase: { value: 0.15, min: 0, max: 1, step: 0.01 },
    }),
  })

  const texMetal = useKTX2(Object.values(paths.metal))
  const texRust = useKTX2(Object.values(paths.rust))

  const metalTextures = useMemo(() => {
    const keys = Object.keys(paths.metal)
    const result = {}
    keys.forEach((key, i) => {
      result[key] = texMetal[i]
    })
    return result
  }, [texMetal])

  const rustTextures = useMemo(() => {
    const keys = Object.keys(paths.rust)
    const result = {}
    keys.forEach((key, i) => {
      result[key] = texRust[i]
    })
    return result
  }, [texRust])

  useMemo(() => {
    const all = [...texMetal, ...texRust]
    all.forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.magFilter = THREE.LinearFilter
      t.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy())
    })
    metalTextures.map.colorSpace = THREE.SRGBColorSpace
    rustTextures.map.colorSpace = THREE.SRGBColorSpace
  }, [texMetal, texRust, metalTextures, rustTextures, gl])

  const customUniforms = useMemo(() => ({
    uProgress: { value: 0 },
    uNoiseScale: { value: 3.0 },
    uHeightBlend: { value: 0.6 },
    uDispScale: { value: 0.06 },
    uColorB: { value: rustTextures.map },
    uNormalB: { value: rustTextures.normalMap },
    uRoughnessB: { value: rustTextures.roughnessMap },
    uDispA: { value: metalTextures.displacementMap },
    uDispB: { value: rustTextures.displacementMap },
  }), [metalTextures, rustTextures])

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: metalTextures.map,
      normalMap: metalTextures.normalMap,
      normalScale: new THREE.Vector2(1, 1),
      roughnessMap: metalTextures.roughnessMap,
      roughness: 0.15,
      metalnessMap: metalTextures.metalnessMap,
      metalness: 1.0,
      envMapIntensity: 2.5,
    })

    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, customUniforms)

      const vertUniforms = [
        'uniform float uProgress;',
        'uniform float uNoiseScale;',
        'uniform float uHeightBlend;',
        'uniform float uDispScale;',
        'uniform sampler2D uDispA;',
        'uniform sampler2D uDispB;',
      ].join('\n')

      const fragUniforms = [
        'uniform float uProgress;',
        'uniform float uNoiseScale;',
        'uniform float uHeightBlend;',
        'uniform sampler2D uDispA;',
        'uniform sampler2D uDispB;',
        'uniform sampler2D uColorB;',
        'uniform sampler2D uNormalB;',
        'uniform sampler2D uRoughnessB;',
      ].join('\n')

      // VERTEX: inject after #include <common>
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>\n${noiseGLSL}\n${vertUniforms}`
      )

      // Custom displacement in vertex
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `// Custom blended displacement
        {
          vec2 _rustUv = uv;
          ${blendBlock}
          float _bd = mix(_hA, _hB, hBlend);
          transformed += normalize(objectNormal) * (_bd * uDispScale - uDispScale * 0.5);
        }
        #include <project_vertex>`
      )

      // FRAGMENT: inject after #include <common>
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>\n${noiseGLSL}\n${fragUniforms}`
      )

      // Color blend
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec2 _rustUv = vMapUv;
          ${blendBlock}
          vec4 _cA = texture2D(map, _rustUv);
          vec4 _cB = texture2D(uColorB, _rustUv);
          vec4 sampledDiffuseColor = mix(_cA, _cB, hBlend);
          #ifdef DECODE_VIDEO_TEXTURE
            sampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);
          #endif
          diffuseColor *= sampledDiffuseColor;
        #endif`
      )

      // Roughness blend
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          float _rA = texture2D(roughnessMap, vRoughnessMapUv).g;
          float _rB = texture2D(uRoughnessB, vRoughnessMapUv).g;
          roughnessFactor *= mix(_rA, _rB, hBlend);
        #endif`
      )

      // Metalness blend - rust reduces metalness
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <metalnessmap_fragment>',
        `float metalnessFactor = metalness;
        #ifdef USE_METALNESSMAP
          float _mA = texture2D(metalnessMap, vMetalnessMapUv).b;
          float _mBlended = _mA * (1.0 - hBlend * 0.85);
          metalnessFactor *= _mBlended;
        #endif`
      )

      // Normal blend
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#ifdef USE_NORMALMAP_OBJECTSPACE
          vec3 _onA = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
          vec3 _onB = texture2D(uNormalB, vNormalMapUv).xyz * 2.0 - 1.0;
          normal = normalize(mix(_onA, _onB, hBlend));
          #ifdef FLIP_SIDED
            normal = -normal;
          #endif
          #ifdef DOUBLE_SIDED
            normal = normal * faceDirection;
          #endif
          normal = normalize(normalMatrix * normal);
        #elif defined(USE_NORMALMAP_TANGENTSPACE)
          vec3 _nA = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
          vec3 _nB = texture2D(uNormalB, vNormalMapUv).xyz * 2.0 - 1.0;
          vec3 mapN = normalize(mix(_nA, _nB, hBlend));
          mapN.xy *= normalScale;
          normal = normalize(tbn * mapN);
        #elif defined(USE_BUMPMAP)
          normal = perturbNormalArb(-vViewPosition, normal, dHdxy_fwd(), faceDirection);
        #endif`
      )

      shaderRef.current = shader
    }

    mat.customProgramCacheKey = () => 'rusting-ktx2-v1'
    return mat
  }, [metalTextures, rustTextures, customUniforms])

  useFrame(() => {
    if (!shaderRef.current) return
    const u = shaderRef.current.uniforms
    u.uProgress.value = controls.useRealTime ? getRealProgress() : controls.progressOverride
    u.uNoiseScale.value = controls.noiseScale
    u.uHeightBlend.value = controls.heightBlend
    u.uDispScale.value = controls.displacementScale
    material.normalScale.set(controls.normalStrength, controls.normalStrength)
    material.envMapIntensity = controls.envMapIntensity
    material.metalness = controls.metalness
    material.roughness = controls.roughnessBase
  })

  return (
    <mesh rotation={[-Math.PI / 5, 0, 0]} position={[0, -0.2, 0]} material={material}>
      <planeGeometry args={[4, 4, 256, 256]} />
    </mesh>
  )
}
