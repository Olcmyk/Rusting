import { EffectComposer, Bloom, DepthOfField, Noise, Vignette } from '@react-three/postprocessing'
import { useControls, folder } from 'leva'

export default function Effects() {
  const bloom = useControls('Post Processing', {
    Bloom: folder({
      bloomIntensity: { value: 0.4, min: 0, max: 2, step: 0.01 },
      bloomThreshold: { value: 0.75, min: 0, max: 1, step: 0.01 },
      bloomSmoothing: { value: 0.9, min: 0, max: 1, step: 0.01 },
    }),
  })

  const dof = useControls('Post Processing', {
    'Depth of Field': folder({
      focusDistance: { value: 0.02, min: 0, max: 0.1, step: 0.001 },
      focalLength: { value: 0.04, min: 0, max: 0.2, step: 0.001 },
      bokehScale: { value: 4, min: 0, max: 10, step: 0.1 },
    }),
  })

  const film = useControls('Post Processing', {
    Film: folder({
      grainOpacity: { value: 0.06, min: 0, max: 0.3, step: 0.005 },
      vignetteDarkness: { value: 0.55, min: 0, max: 1, step: 0.01 },
      vignetteOffset: { value: 0.3, min: 0, max: 1, step: 0.01 },
    }),
  })

  return (
    <EffectComposer>
      <Bloom
        intensity={bloom.bloomIntensity}
        luminanceThreshold={bloom.bloomThreshold}
        luminanceSmoothing={bloom.bloomSmoothing}
        mipmapBlur
      />
      <DepthOfField
        focusDistance={dof.focusDistance}
        focalLength={dof.focalLength}
        bokehScale={dof.bokehScale}
      />
      <Noise opacity={film.grainOpacity} />
      <Vignette darkness={film.vignetteDarkness} offset={film.vignetteOffset} />
    </EffectComposer>
  )
}
