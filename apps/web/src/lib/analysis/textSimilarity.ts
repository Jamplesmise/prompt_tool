/**
 * 文本相似度计算
 * 支持 Jaccard 相似度和编辑距离相似度
 */

/**
 * 简单的中文分词（基于标点和空格）
 */
function tokenizeChinese(text: string): string[] {
  // 按标点符号、空格、换行分割
  const tokens = text
    .split(/[\s,，.。!！?？;；:：""''()（）【】\[\]{}、\n\r]+/)
    .filter(t => t.length > 0)

  // 对于较长的片段，进一步分割成 2-3 字的词
  const result: string[] = []
  for (const token of tokens) {
    if (token.length <= 3) {
      result.push(token)
    } else {
      // 滑动窗口分词
      for (let i = 0; i < token.length - 1; i += 2) {
        result.push(token.substring(i, Math.min(i + 2, token.length)))
      }
    }
  }

  return result
}

/**
 * 英文分词
 */
function tokenizeEnglish(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.\-!?;:'"()[\]{}]+/)
    .filter(t => t.length > 0)
}

/**
 * 自动检测语言并分词
 */
export function tokenize(text: string): string[] {
  // 检测是否包含中文
  const hasChinese = /[\u4e00-\u9fa5]/.test(text)

  if (hasChinese) {
    return tokenizeChinese(text)
  }
  return tokenizeEnglish(text)
}

/**
 * 计算 Jaccard 相似度
 * @param text1 文本1
 * @param text2 文本2
 * @returns 相似度 (0-1)
 */
export function jaccardSimilarity(text1: string, text2: string): number {
  if (!text1 && !text2) return 1
  if (!text1 || !text2) return 0

  const tokens1 = new Set(tokenize(text1))
  const tokens2 = new Set(tokenize(text2))

  if (tokens1.size === 0 && tokens2.size === 0) return 1
  if (tokens1.size === 0 || tokens2.size === 0) return 0

  // 计算交集
  let intersection = 0
  for (const token of tokens1) {
    if (tokens2.has(token)) {
      intersection++
    }
  }

  // 计算并集
  const union = tokens1.size + tokens2.size - intersection

  return union > 0 ? intersection / union : 0
}

/**
 * 计算编辑距离 (Levenshtein Distance)
 * 使用动态规划，空间优化版本
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length

  // 边界情况
  if (m === 0) return n
  if (n === 0) return m

  // 只需要两行
  let prevRow = new Array(n + 1)
  let currRow = new Array(n + 1)

  // 初始化第一行
  for (let j = 0; j <= n; j++) {
    prevRow[j] = j
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i

    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        currRow[j] = prevRow[j - 1]
      } else {
        currRow[j] = 1 + Math.min(
          prevRow[j],     // 删除
          currRow[j - 1], // 插入
          prevRow[j - 1]  // 替换
        )
      }
    }

    // 交换行
    ;[prevRow, currRow] = [currRow, prevRow]
  }

  return prevRow[n]
}

/**
 * 计算编辑距离相似度
 * @param text1 文本1
 * @param text2 文本2
 * @returns 相似度 (0-1)
 */
export function editDistanceSimilarity(text1: string, text2: string): number {
  if (!text1 && !text2) return 1
  if (!text1 || !text2) return 0

  // 对于超长文本，截取前 500 个字符
  const s1 = text1.length > 500 ? text1.substring(0, 500) : text1
  const s2 = text2.length > 500 ? text2.substring(0, 500) : text2

  const distance = levenshteinDistance(s1, s2)
  const maxLen = Math.max(s1.length, s2.length)

  return maxLen > 0 ? 1 - distance / maxLen : 1
}

/**
 * 计算余弦相似度（基于词频）
 */
export function cosineSimilarity(text1: string, text2: string): number {
  if (!text1 && !text2) return 1
  if (!text1 || !text2) return 0

  const tokens1 = tokenize(text1)
  const tokens2 = tokenize(text2)

  // 构建词频向量
  const freq1 = new Map<string, number>()
  const freq2 = new Map<string, number>()

  for (const token of tokens1) {
    freq1.set(token, (freq1.get(token) || 0) + 1)
  }
  for (const token of tokens2) {
    freq2.set(token, (freq2.get(token) || 0) + 1)
  }

  // 获取所有词
  const allTokens = new Set([...freq1.keys(), ...freq2.keys()])

  // 计算点积和模长
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (const token of allTokens) {
    const f1 = freq1.get(token) || 0
    const f2 = freq2.get(token) || 0
    dotProduct += f1 * f2
    norm1 += f1 * f1
    norm2 += f2 * f2
  }

  const normProduct = Math.sqrt(norm1) * Math.sqrt(norm2)
  return normProduct > 0 ? dotProduct / normProduct : 0
}

/**
 * 综合相似度（加权平均）
 * @param text1 文本1
 * @param text2 文本2
 * @param weights 权重配置
 * @returns 相似度 (0-1)
 */
export function combinedSimilarity(
  text1: string,
  text2: string,
  weights: {
    jaccard?: number
    editDistance?: number
    cosine?: number
  } = {}
): number {
  const { jaccard = 0.4, editDistance = 0.3, cosine = 0.3 } = weights

  const jaccardScore = jaccardSimilarity(text1, text2)
  const editScore = editDistanceSimilarity(text1, text2)
  const cosineScore = cosineSimilarity(text1, text2)

  return jaccardScore * jaccard + editScore * editDistance + cosineScore * cosine
}

/**
 * 相似度计算结果缓存
 */
const similarityCache = new Map<string, number>()
const CACHE_MAX_SIZE = 10000

/**
 * 生成缓存键
 */
function getCacheKey(text1: string, text2: string, method: string): string {
  // 使用较短的哈希
  const hash1 = text1.length > 50 ? text1.substring(0, 25) + text1.length : text1
  const hash2 = text2.length > 50 ? text2.substring(0, 25) + text2.length : text2
  return `${method}:${hash1}:${hash2}`
}

/**
 * 带缓存的相似度计算
 */
export function cachedSimilarity(
  text1: string,
  text2: string,
  method: 'jaccard' | 'editDistance' | 'cosine' | 'combined' = 'combined'
): number {
  const cacheKey = getCacheKey(text1, text2, method)

  if (similarityCache.has(cacheKey)) {
    return similarityCache.get(cacheKey)!
  }

  let result: number
  switch (method) {
    case 'jaccard':
      result = jaccardSimilarity(text1, text2)
      break
    case 'editDistance':
      result = editDistanceSimilarity(text1, text2)
      break
    case 'cosine':
      result = cosineSimilarity(text1, text2)
      break
    case 'combined':
    default:
      result = combinedSimilarity(text1, text2)
  }

  // 缓存结果
  if (similarityCache.size >= CACHE_MAX_SIZE) {
    // 清除一半缓存
    const keys = Array.from(similarityCache.keys())
    for (let i = 0; i < keys.length / 2; i++) {
      similarityCache.delete(keys[i])
    }
  }
  similarityCache.set(cacheKey, result)

  return result
}

/**
 * 批量计算相似度矩阵
 * @param texts 文本数组
 * @param method 计算方法
 * @returns 相似度矩阵 (n x n)
 */
export function computeSimilarityMatrix(
  texts: string[],
  method: 'jaccard' | 'editDistance' | 'cosine' | 'combined' = 'combined'
): number[][] {
  const n = texts.length
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1 // 对角线为 1
    for (let j = i + 1; j < n; j++) {
      const similarity = cachedSimilarity(texts[i], texts[j], method)
      matrix[i][j] = similarity
      matrix[j][i] = similarity // 对称矩阵
    }
  }

  return matrix
}

/**
 * 清除相似度缓存
 */
export function clearSimilarityCache(): void {
  similarityCache.clear()
}
