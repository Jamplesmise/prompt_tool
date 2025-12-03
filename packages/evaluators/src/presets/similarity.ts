// 相似度匹配评估器
import type {
  EvaluatorInput,
  EvaluatorOutput,
  SimilarityParams,
  SimilarityAlgorithm,
} from '../types'

/**
 * 计算 Levenshtein 距离（编辑距离）
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length
  const n = s2.length

  // 创建 DP 表
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  )

  // 初始化
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  // 填充 DP 表
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }

  return dp[m][n]
}

/**
 * Levenshtein 相似度（归一化到 0-1）
 */
function levenshteinSimilarity(s1: string, s2: string): number {
  if (s1.length === 0 && s2.length === 0) return 1
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(s1, s2)
  return 1 - distance / maxLen
}

/**
 * 分词（简单按空格和标点分割）
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.!?;:，。！？；：]+/)
    .filter((t) => t.length > 0)
}

/**
 * 余弦相似度
 */
function cosineSimilarity(s1: string, s2: string): number {
  const tokens1 = tokenize(s1)
  const tokens2 = tokenize(s2)

  // 构建词频向量
  const vocab = new Set([...tokens1, ...tokens2])
  if (vocab.size === 0) return 1

  const freq1 = new Map<string, number>()
  const freq2 = new Map<string, number>()

  for (const t of tokens1) {
    freq1.set(t, (freq1.get(t) || 0) + 1)
  }
  for (const t of tokens2) {
    freq2.set(t, (freq2.get(t) || 0) + 1)
  }

  // 计算点积和模长
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (const word of vocab) {
    const v1 = freq1.get(word) || 0
    const v2 = freq2.get(word) || 0
    dotProduct += v1 * v2
    norm1 += v1 * v1
    norm2 += v2 * v2
  }

  if (norm1 === 0 || norm2 === 0) return 0
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

/**
 * Jaccard 相似度（集合相似度）
 */
function jaccardSimilarity(s1: string, s2: string): number {
  const set1 = new Set(tokenize(s1))
  const set2 = new Set(tokenize(s2))

  if (set1.size === 0 && set2.size === 0) return 1

  const intersection = new Set([...set1].filter((x) => set2.has(x)))
  const union = new Set([...set1, ...set2])

  if (union.size === 0) return 1
  return intersection.size / union.size
}

/**
 * 计算相似度
 */
export function calculateSimilarity(
  s1: string,
  s2: string,
  algorithm: SimilarityAlgorithm = 'levenshtein'
): number {
  switch (algorithm) {
    case 'levenshtein':
      return levenshteinSimilarity(s1, s2)
    case 'cosine':
      return cosineSimilarity(s1, s2)
    case 'jaccard':
      return jaccardSimilarity(s1, s2)
    default:
      return levenshteinSimilarity(s1, s2)
  }
}

/**
 * 相似度匹配评估器
 * 规则：similarity(output, expected) >= threshold
 * 使用场景：模糊匹配、文本相似度检测
 */
export function similarity(
  input: EvaluatorInput,
  params?: SimilarityParams
): EvaluatorOutput {
  const { output, expected } = input

  const threshold = params?.threshold ?? 0.8
  const algorithm = params?.algorithm ?? 'levenshtein'

  if (expected === null || expected === undefined) {
    return {
      passed: false,
      score: 0,
      reason: '缺少期望值 (expected)',
    }
  }

  const score = calculateSimilarity(output, expected, algorithm)
  const passed = score >= threshold

  return {
    passed,
    score,
    reason: passed
      ? `相似度 ${(score * 100).toFixed(1)}% >= 阈值 ${(threshold * 100).toFixed(1)}%`
      : `相似度 ${(score * 100).toFixed(1)}% < 阈值 ${(threshold * 100).toFixed(1)}%`,
    details: {
      algorithm,
      threshold,
      similarity: score,
    },
  }
}
