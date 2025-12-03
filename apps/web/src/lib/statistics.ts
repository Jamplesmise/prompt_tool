// 统计分析工具

/**
 * 卡方分布累积分布函数（近似）
 * 使用 Wilson-Hilferty 变换近似
 */
function chiSquareCDF(x: number, df: number): number {
  if (x <= 0) return 0
  if (df <= 0) return 0

  // 对于 df=1，使用更精确的近似
  if (df === 1) {
    // 使用正态分布近似
    const z = Math.sqrt(x)
    return 2 * normalCDF(z) - 1
  }

  // Wilson-Hilferty 变换
  const h = 2 / (9 * df)
  const z = (Math.pow(x / df, 1 / 3) - (1 - h)) / Math.sqrt(h)
  return normalCDF(z)
}

/**
 * 标准正态分布累积分布函数（近似）
 * 使用 Abramowitz and Stegun 近似
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)

  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1 + sign * y)
}

/**
 * A/B 测试结果
 */
export type ABTestStats = {
  winsA: number
  winsB: number
  ties: number
  chiSquare: number
  pValue: number
  significant: boolean
  winner: 'A' | 'B' | null
  confidence: number  // 置信度百分比
}

/**
 * 卡方检验 - 用于 A/B 测试显著性分析
 *
 * @param winsA - A 配置胜出次数
 * @param winsB - B 配置胜出次数
 * @param alpha - 显著性水平（默认 0.05）
 * @returns 检验结果
 */
export function chiSquareTest(
  winsA: number,
  winsB: number,
  ties: number = 0,
  alpha: number = 0.05
): ABTestStats {
  const total = winsA + winsB

  // 样本量太小时无法进行有意义的检验
  if (total < 10) {
    return {
      winsA,
      winsB,
      ties,
      chiSquare: 0,
      pValue: 1,
      significant: false,
      winner: null,
      confidence: 0,
    }
  }

  // 期望值（假设 A 和 B 相等）
  const expected = total / 2

  // 计算卡方统计量
  const chiSquare =
    Math.pow(winsA - expected, 2) / expected +
    Math.pow(winsB - expected, 2) / expected

  // 计算 p 值（自由度 = 1）
  const pValue = 1 - chiSquareCDF(chiSquare, 1)

  // 判断显著性
  const significant = pValue < alpha

  // 确定胜出者
  let winner: 'A' | 'B' | null = null
  if (significant) {
    winner = winsA > winsB ? 'A' : 'B'
  }

  // 计算置信度
  const confidence = (1 - pValue) * 100

  return {
    winsA,
    winsB,
    ties,
    chiSquare,
    pValue,
    significant,
    winner,
    confidence,
  }
}

/**
 * 计算胜率差异
 */
export function calculateWinRateDifference(winsA: number, winsB: number): {
  rateA: number
  rateB: number
  difference: number
  percentDifference: number
} {
  const total = winsA + winsB
  if (total === 0) {
    return { rateA: 0, rateB: 0, difference: 0, percentDifference: 0 }
  }

  const rateA = winsA / total
  const rateB = winsB / total
  const difference = rateA - rateB
  const percentDifference = total > 0 ? (difference / 0.5) * 100 : 0

  return { rateA, rateB, difference, percentDifference }
}

/**
 * 根据评估结果判断胜出者
 *
 * @param passedA - A 是否通过评估
 * @param passedB - B 是否通过评估
 * @param scoreA - A 的评估分数（可选）
 * @param scoreB - B 的评估分数（可选）
 * @returns 'A' | 'B' | 'tie'
 */
export function determineWinner(
  passedA: boolean,
  passedB: boolean,
  scoreA?: number | null,
  scoreB?: number | null
): 'A' | 'B' | 'tie' {
  // 如果一个通过一个未通过，通过的胜出
  if (passedA && !passedB) return 'A'
  if (!passedA && passedB) return 'B'

  // 两个都通过或都未通过，比较分数
  if (scoreA !== null && scoreA !== undefined && scoreB !== null && scoreB !== undefined) {
    const diff = scoreA - scoreB
    if (Math.abs(diff) < 0.001) return 'tie'  // 分数差异小于阈值认为平局
    return diff > 0 ? 'A' : 'B'
  }

  // 无法判断，认为平局
  return 'tie'
}
