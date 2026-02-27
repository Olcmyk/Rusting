// 起始日期：2026年2月17日
const START_DATE = new Date('2026-02-17')
// 总时长：15年（约5475天）
const TOTAL_DAYS = 15 * 365

export function calculateRustProgress(currentDate: Date = new Date()): number {
  const diffTime = currentDate.getTime() - START_DATE.getTime()
  const diffDays = diffTime / (1000 * 60 * 60 * 24)

  if (diffDays <= 0) return 0
  if (diffDays >= TOTAL_DAYS) return 1

  const linearProgress = diffDays / TOTAL_DAYS
  // S曲线：模拟真实生锈过程（开始慢，中间快，结束慢）
  return sCurve(linearProgress)
}

// S曲线函数（Sigmoid变体）
function sCurve(t: number): number {
  // 使用平滑的S曲线，让生锈过程更自然
  return t * t * (3 - 2 * t)
}

export function getProgressInfo(currentDate: Date = new Date()) {
  const diffTime = currentDate.getTime() - START_DATE.getTime()
  const diffDays = Math.max(0, diffTime / (1000 * 60 * 60 * 24))
  const elapsedYears = diffDays / 365
  const remainingYears = Math.max(0, 15 - elapsedYears)
  const progress = calculateRustProgress(currentDate)

  return {
    progress,
    progressPercent: progress * 100,
    elapsedDays: Math.floor(diffDays),
    elapsedYears: elapsedYears.toFixed(2),
    remainingYears: remainingYears.toFixed(2),
    startDate: START_DATE.toISOString().split('T')[0],
    currentDate: currentDate.toISOString().split('T')[0],
  }
}

export function dateFromProgress(progress: number): Date {
  // 反向S曲线
  const linearProgress = inverseSCurve(Math.max(0, Math.min(1, progress)))
  const days = linearProgress * TOTAL_DAYS
  const date = new Date(START_DATE)
  date.setDate(date.getDate() + days)
  return date
}

function inverseSCurve(y: number): number {
  // 数值方法求解 t^2(3-2t) = y
  let t = y
  for (let i = 0; i < 10; i++) {
    const f = t * t * (3 - 2 * t) - y
    const df = 6 * t * (1 - t)
    if (Math.abs(df) < 0.0001) break
    t = t - f / df
  }
  return Math.max(0, Math.min(1, t))
}
