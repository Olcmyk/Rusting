import { useMemo, useState, useCallback } from 'react'
import { calculateRustProgress, getProgressInfo, dateFromProgress } from '../utils/dateCalculator'

export function useRustProgress() {
  const [debugProgress, setDebugProgress] = useState<number | null>(null)

  const realProgress = useMemo(() => calculateRustProgress(), [])
  const currentProgress = debugProgress ?? realProgress

  const progressInfo = useMemo(() => {
    if (debugProgress !== null) {
      const simulatedDate = dateFromProgress(debugProgress)
      return getProgressInfo(simulatedDate)
    }
    return getProgressInfo()
  }, [debugProgress])

  const setProgress = useCallback((value: number | null) => {
    setDebugProgress(value)
  }, [])

  const resetToReal = useCallback(() => {
    setDebugProgress(null)
  }, [])

  return {
    progress: currentProgress,
    realProgress,
    isDebugMode: debugProgress !== null,
    progressInfo,
    setProgress,
    resetToReal,
  }
}
