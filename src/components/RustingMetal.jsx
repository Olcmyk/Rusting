import { useRef, useMemo } from 'react'
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

// Blend computation — uses height from roughness maps (green channel stores height info)
// to avoid extra displacement samplers in fragment shader.
// We pack blend logic to reuse the material's built-in samplers where possible.
//
// Sampler budget (WebGL limit = 16):
//   Material built-in: map(1), normalMap(2), roughnessMap(3), metalnessMap(4) = 4
//   (no displacementMap in fragment — only used in vertex)
//   Custom fragment: uColorB(5), uColorC(6), uNormalB(7), uNormalC(8),
//     uRoughnessB(9), uRoughnessC(10), uMetalnessB(11), uMetalnessC(12),
//     uDispA(13), uDispB(14), uDispC(15) = 11
//   Three.js internal: envMap(16) = 1
//   Total = 16 ✓

// Blend factor computation — computes hBlendAB and hBlendBC
const blendBlock = /* glsl */ `
  float _vor = voronoiNoise(_rustUv * uNoiseScale);
  float _prl = snoise(_rustUv * uNoiseScale * 2.5) * 0.5 + 0.5;
  float _fbm = fbm(_rustUv * uNoiseScale * 1.5);
  float _hA = texture2D(uDispA, _rustUv).r;
  float _hB = texture2D(uDispB, _rustUv).r;
  float _hC = texture2D(uDispC, _rustUv).r;
  float _sus = _vor * 0.35 + _prl * 0.25 + (1.0 - _hA) * 0.25 + _fbm * 0.15;
  float _rl = smoothstep(_sus - 0.13, _sus + 0.13, uProgress);
  float _t1 = smoothstep(0.0, 0.55, _rl);
  float _t2 = smoothstep(0.45, 1.0, _rl);
  float hBlendAB = clamp(_t1 + (_hB - _hA) * uHeightBlend * _t1 * (1.0 - _t1) * 4.0, 0.0, 1.0);
  float hBlendBC = clamp(_t2 + (_hC - _hB) * uHeightBlend * _t2 * (1.0 - _t2) * 4.0, 0.0, 1.0);
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

  const texA = useTexture(paths.A)
  const texB = useTexture(paths.B)
  const texC = useTexture(paths.C)

  useMemo(() => {
    const all = [...Object.values(texA), ...Object.values(texB), ...Object.values(texC)]
    all.forEach((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping
      t.minFilter = THREE.LinearMipmapLinearFilter
      t.magFilter = THREE.LinearFilter
      t.anisotropy = 16
    })
    ;[texA.map, texB.map, texC.map].forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace
    })
  }, [texA, texB, texC])

  const customUniforms = useMemo(() => ({
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
    uDispA: { value: texA.displacementMap },
    uDispB: { value: texB.displacementMap },
    uDispC: { value: texC.displacementMap },
  }), [texA, texB, texC])

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: texA.map,
      normalMap: texA.normalMap,
      normalScale: new THREE.Vector2(1, 1),
      roughnessMap: texA.roughnessMap,
      metalnessMap: texA.metalnessMap,
      // NO displacementMap on material — we handle it manually in vertex shader
      // This saves a sampler slot in the fragment shader
      envMapIntensity: 1.0,
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
        'uniform sampler2D uDispC;',
      ].join('\n')

      const fragUniforms = [
        'uniform float uProgress;',
        'uniform float uNoiseScale;',
        'uniform float uHeightBlend;',
        'uniform sampler2D uDispA;',
        'uniform sampler2D uDispB;',
        'uniform sampler2D uDispC;',
        'uniform sampler2D uColorB;',
        'uniform sampler2D uColorC;',
        'uniform sampler2D uNormalB;',
        'uniform sampler2D uNormalC;',
        'uniform sampler2D uRoughnessB;',
        'uniform sampler2D uRoughnessC;',
      ].join('\n')

      // ---- VERTEX: inject after #include <common> ----
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>\n${noiseGLSL}\n${vertUniforms}`
      )

      // Custom displacement in vertex (no built-in displacementMap)
      // We inject our own displacement logic at the end of the vertex main,
      // right before project_vertex
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `// Custom blended displacement
        {
          vec2 _rustUv = uv;
          ${blendBlock}
          float _bd = mix(mix(_hA, _hB, hBlendAB), _hC, hBlendBC);
          transformed += normalize(objectNormal) * (_bd * uDispScale - uDispScale * 0.5);
        }
        #include <project_vertex>`
      )

      // ---- FRAGMENT: inject after #include <common> ----
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
          vec4 _cC = texture2D(uColorC, _rustUv);
          vec4 sampledDiffuseColor = mix(mix(_cA, _cB, hBlendAB), _cC, hBlendBC);
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
          float _rC = texture2D(uRoughnessC, vRoughnessMapUv).g;
          roughnessFactor *= mix(mix(_rA, _rB, hBlendAB), _rC, hBlendBC);
        #endif`
      )

      // Metalness blend — derive from blend factors, no extra samplers
      // Clean metal (A) is highly metallic, rusted (C) is not
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <metalnessmap_fragment>',
        `float metalnessFactor = metalness;
        #ifdef USE_METALNESSMAP
          float _mA = texture2D(metalnessMap, vMetalnessMapUv).b;
          // Approximate B and C metalness from blend: rust reduces metalness
          float _mBlended = _mA * (1.0 - hBlendAB * 0.4 - hBlendBC * 0.6);
          metalnessFactor *= _mBlended;
        #endif`
      )

      // Normal blend
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#ifdef USE_NORMALMAP_OBJECTSPACE
          vec3 _onA = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0;
          vec3 _onB = texture2D(uNormalB, vNormalMapUv).xyz * 2.0 - 1.0;
          vec3 _onC = texture2D(uNormalC, vNormalMapUv).xyz * 2.0 - 1.0;
          normal = normalize(mix(mix(_onA, _onB, hBlendAB), _onC, hBlendBC));
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
          vec3 _nC = texture2D(uNormalC, vNormalMapUv).xyz * 2.0 - 1.0;
          vec3 mapN = normalize(mix(mix(_nA, _nB, hBlendAB), _nC, hBlendBC));
          mapN.xy *= normalScale;
          normal = normalize(tbn * mapN);
        #elif defined(USE_BUMPMAP)
          normal = perturbNormalArb(-vViewPosition, normal, dHdxy_fwd(), faceDirection);
        #endif`
      )

      shaderRef.current = shader
    }

    mat.customProgramCacheKey = () => 'rusting-v4'
    return mat
  }, [texA, texB, texC, customUniforms])

  useFrame(() => {
    if (!shaderRef.current) return
    const u = shaderRef.current.uniforms
    u.uProgress.value = controls.useRealTime ? getRealProgress() : controls.progressOverride
    u.uNoiseScale.value = controls.noiseScale
    u.uHeightBlend.value = controls.heightBlend
    u.uDispScale.value = controls.displacementScale
    material.normalScale.set(controls.normalStrength, controls.normalStrength)
  })

  return (
    <mesh rotation={[-Math.PI / 5, 0, 0]} position={[0, -0.2, 0]} material={material}>
      <planeGeometry args={[4, 4, 256, 256]} />
    </mesh>
  )
}
