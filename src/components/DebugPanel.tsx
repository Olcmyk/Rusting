import { useControls, button, folder } from 'leva'
import { useRustProgress } from '../hooks/useRustProgress'

interface DebugPanelProps {
  onProgressChange: (progress: number) => void
  onNoiseScaleChange: (scale: number) => void
  onEdgeSharpnessChange: (sharpness: number) => void
  onNoiseOctavesChange: (octaves: number) => void
  onEnvMapIntensityChange: (intensity: number) => void
  onLightIntensityChange: (intensity: number) => void
}

export function DebugPanel({
  onProgressChange,
  onNoiseScaleChange,
  onEdgeSharpnessChange,
  onNoiseOctavesChange,
  onEnvMapIntensityChange,
  onLightIntensityChange,
}: DebugPanelProps) {
  const { progress, realProgress, progressInfo, setProgress, resetToReal, isDebugMode } =
    useRustProgress()

  useControls('生锈进度', {
    '当前进度': {
      value: `${(progress * 100).toFixed(4)}%`,
      editable: false,
    },
    '真实进度': {
      value: `${(realProgress * 100).toFixed(4)}%`,
      editable: false,
    },
    '已过年数': {
      value: `${progressInfo.elapsedYears} 年`,
      editable: false,
    },
    '剩余年数': {
      value: `${progressInfo.remainingYears} 年`,
      editable: false,
    },
    '调试模式': {
      value: isDebugMode ? '开启' : '关闭',
      editable: false,
    },
  })

  useControls('调试控制', {
    '调试进度': {
      value: progress,
      min: 0,
      max: 1,
      step: 0.001,
      onChange: (v: number) => {
        setProgress(v)
        onProgressChange(v)
      },
    },
    快速预览: folder(
      {
        '0% 全新': button(() => {
          setProgress(0)
          onProgressChange(0)
        }),
        '25% 轻微': button(() => {
          setProgress(0.25)
          onProgressChange(0.25)
        }),
        '50% 中等': button(() => {
          setProgress(0.5)
          onProgressChange(0.5)
        }),
        '75% 严重': button(() => {
          setProgress(0.75)
          onProgressChange(0.75)
        }),
        '100% 完全': button(() => {
          setProgress(1)
          onProgressChange(1)
        }),
        '恢复真实': button(() => {
          resetToReal()
          onProgressChange(realProgress)
        }),
      },
      { collapsed: false }
    ),
  })

  useControls('材质参数', {
    '噪声缩放': {
      value: 3.0,
      min: 0.5,
      max: 10,
      step: 0.1,
      onChange: onNoiseScaleChange,
    },
    '边缘锐度': {
      value: 0.3,
      min: 0.01,
      max: 1,
      step: 0.01,
      onChange: onEdgeSharpnessChange,
    },
    '噪声层数': {
      value: 4,
      min: 1,
      max: 6,
      step: 1,
      onChange: onNoiseOctavesChange,
    },
  })

  useControls('光照', {
    '环境光强度': {
      value: 1.0,
      min: 0,
      max: 3,
      step: 0.1,
      onChange: onEnvMapIntensityChange,
    },
    '直射光强度': {
      value: 2.0,
      min: 0,
      max: 5,
      step: 0.1,
      onChange: onLightIntensityChange,
    },
  })

  return null
}
