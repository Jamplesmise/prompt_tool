/**
 * GOI 模糊匹配器
 *
 * 提供资源名称的模糊匹配能力：
 * - 精确匹配
 * - 前缀匹配
 * - 包含匹配
 * - 编辑距离（Levenshtein）
 * - 拼音匹配（中文首字母）
 */

import type { ResourceType, EntityCandidate } from '@platform/shared'

// ============================================
// 编辑距离算法
// ============================================

/**
 * 计算 Levenshtein 编辑距离
 * 时间复杂度: O(m * n)
 * 空间复杂度: O(min(m, n)) - 使用滚动数组优化
 */
export function levenshteinDistance(s1: string, s2: string): number {
  // 确保 s1 是较短的字符串，优化空间
  if (s1.length > s2.length) {
    [s1, s2] = [s2, s1]
  }

  const m = s1.length
  const n = s2.length

  // 使用两行滚动数组
  let prevRow = Array.from({ length: m + 1 }, (_, i) => i)
  let currRow = new Array<number>(m + 1)

  for (let j = 1; j <= n; j++) {
    currRow[0] = j

    for (let i = 1; i <= m; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      currRow[i] = Math.min(
        prevRow[i] + 1,      // 删除
        currRow[i - 1] + 1,  // 插入
        prevRow[i - 1] + cost // 替换
      )
    }

    // 交换行
    [prevRow, currRow] = [currRow, prevRow]
  }

  return prevRow[m]
}

/**
 * 计算相似度得分 (0-1)
 * 基于编辑距离
 */
export function similarityScore(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1

  const distance = levenshteinDistance(s1.toLowerCase(), s2.toLowerCase())
  return 1 - distance / maxLen
}

// ============================================
// 匹配策略
// ============================================

/**
 * 匹配策略类型
 */
export type MatchStrategy =
  | 'exact'      // 精确匹配
  | 'prefix'     // 前缀匹配
  | 'contains'   // 包含匹配
  | 'pinyin'     // 拼音匹配
  | 'fuzzy'      // 模糊匹配（编辑距离）

/**
 * 匹配结果
 */
export type MatchResult = {
  /** 是否匹配 */
  matched: boolean
  /** 匹配策略 */
  strategy: MatchStrategy
  /** 匹配得分 (0-1) */
  score: number
}

/**
 * 精确匹配
 */
export function exactMatch(query: string, target: string): MatchResult {
  const matched = query.toLowerCase() === target.toLowerCase()
  return {
    matched,
    strategy: 'exact',
    score: matched ? 1.0 : 0,
  }
}

/**
 * 前缀匹配
 */
export function prefixMatch(query: string, target: string): MatchResult {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  const matched = t.startsWith(q)

  return {
    matched,
    strategy: 'prefix',
    score: matched ? 0.9 * (q.length / t.length) + 0.1 : 0,
  }
}

/**
 * 包含匹配
 */
export function containsMatch(query: string, target: string): MatchResult {
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  const index = t.indexOf(q)
  const matched = index >= 0

  // 位置越靠前得分越高
  let score = 0
  if (matched) {
    const positionBonus = 1 - index / t.length
    const lengthBonus = q.length / t.length
    score = 0.7 * positionBonus + 0.2 * lengthBonus + 0.1
  }

  return {
    matched,
    strategy: 'contains',
    score,
  }
}

/**
 * 模糊匹配（基于编辑距离）
 */
export function fuzzyMatch(
  query: string,
  target: string,
  maxDistance: number = 3
): MatchResult {
  const distance = levenshteinDistance(query.toLowerCase(), target.toLowerCase())
  const matched = distance <= maxDistance

  return {
    matched,
    strategy: 'fuzzy',
    score: matched ? similarityScore(query, target) * 0.8 : 0,
  }
}

// ============================================
// 拼音匹配（中文支持）
// ============================================

/**
 * 简单的拼音首字母映射
 * 只包含常用汉字，实际项目可使用 pinyin 库
 */
const PINYIN_MAP: Record<string, string> = {
  // 常用字的拼音首字母
  '提': 't', '示': 's', '词': 'c', '模': 'm', '型': 'x',
  '数': 's', '据': 'j', '集': 'j', '任': 'r', '务': 'w',
  '评': 'p', '估': 'g', '器': 'q', '告': 'g', '警': 'j',
  '通': 't', '知': 'z', '渠': 'q', '道': 'd', '定': 'd',
  '时': 's', '监': 'j', '控': 'k', '设': 's', '置': 'z',
  '情': 'q', '感': 'g', '分': 'f', '析': 'x', '测': 'c',
  '试': 's', '创': 'c', '建': 'j', '编': 'b', '辑': 'j',
  '删': 's', '除': 'c', '查': 'c', '看': 'k', '运': 'y',
  '行': 'x', '导': 'd', '出': 'c', '入': 'r', '新': 'x',
  '增': 'z', '加': 'j', '修': 'x', '改': 'g', '更': 'g',
}

/**
 * 获取中文字符串的拼音首字母
 */
export function getPinyinInitials(text: string): string {
  let result = ''
  for (const char of text) {
    if (PINYIN_MAP[char]) {
      result += PINYIN_MAP[char]
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char.toLowerCase()
    }
    // 其他字符跳过
  }
  return result
}

/**
 * 拼音首字母匹配
 */
export function pinyinMatch(query: string, target: string): MatchResult {
  const q = query.toLowerCase()
  const targetPinyin = getPinyinInitials(target)

  // 查询串与目标拼音首字母匹配
  const matched = targetPinyin.startsWith(q) || targetPinyin.includes(q)

  return {
    matched,
    strategy: 'pinyin',
    score: matched ? 0.75 : 0,
  }
}

// ============================================
// 综合匹配
// ============================================

/**
 * 综合匹配得分计算
 * 使用多种策略，取最高分
 */
export function calculateMatchScore(query: string, target: string): number {
  const strategies = [
    exactMatch(query, target),
    prefixMatch(query, target),
    containsMatch(query, target),
    pinyinMatch(query, target),
    fuzzyMatch(query, target),
  ]

  return Math.max(...strategies.map((s) => s.score))
}

/**
 * 获取最佳匹配策略
 */
export function getBestMatchStrategy(query: string, target: string): MatchResult {
  const strategies = [
    exactMatch(query, target),
    prefixMatch(query, target),
    containsMatch(query, target),
    pinyinMatch(query, target),
    fuzzyMatch(query, target),
  ]

  return strategies.reduce((best, current) =>
    current.score > best.score ? current : best
  )
}

// ============================================
// 资源搜索
// ============================================

/**
 * 资源搜索函数类型
 */
export type ResourceSearchFn = (
  resourceType: ResourceType
) => Promise<Array<{ id: string; name: string; metadata?: Record<string, unknown> }>>

/**
 * 模糊搜索资源
 */
export async function fuzzySearchResources(
  resourceType: ResourceType,
  query: string,
  searchFn: ResourceSearchFn,
  options: {
    limit?: number
    minScore?: number
  } = {}
): Promise<EntityCandidate[]> {
  const { limit = 5, minScore = 0.3 } = options

  // 1. 获取所有该类型的资源
  const resources = await searchFn(resourceType)

  // 2. 计算相似度
  const scored = resources.map((r) => ({
    id: r.id,
    name: r.name,
    score: calculateMatchScore(query, r.name),
    metadata: r.metadata,
  }))

  // 3. 过滤并排序
  return scored
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * 搜索所有类型的资源
 */
export async function fuzzySearchAllResources(
  query: string,
  searchFns: Partial<Record<ResourceType, ResourceSearchFn>>,
  options: {
    limit?: number
    minScore?: number
  } = {}
): Promise<Array<EntityCandidate & { resourceType: ResourceType }>> {
  const { limit = 10, minScore = 0.3 } = options
  const results: Array<EntityCandidate & { resourceType: ResourceType }> = []

  // 并行搜索所有类型
  const searchPromises = Object.entries(searchFns).map(async ([type, fn]) => {
    if (!fn) return []
    const candidates = await fuzzySearchResources(
      type as ResourceType,
      query,
      fn,
      { limit: limit * 2, minScore }
    )
    return candidates.map((c) => ({ ...c, resourceType: type as ResourceType }))
  })

  const allResults = await Promise.all(searchPromises)

  // 合并并排序
  for (const typeResults of allResults) {
    results.push(...typeResults)
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ============================================
// 匹配建议
// ============================================

/**
 * 生成匹配建议
 * 当没有找到精确匹配时，提供可能的候选
 */
export function generateMatchSuggestions(
  query: string,
  candidates: Array<{ id: string; name: string }>,
  limit: number = 3
): EntityCandidate[] {
  const scored = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    score: calculateMatchScore(query, c.name),
  }))

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * 检查是否需要消歧
 * 当有多个高分候选时返回 true
 */
export function needsDisambiguation(
  candidates: EntityCandidate[],
  scoreThreshold: number = 0.1
): boolean {
  if (candidates.length <= 1) return false

  const topScore = candidates[0]?.score || 0
  const secondScore = candidates[1]?.score || 0

  // 如果第一名和第二名得分接近，需要消歧
  return topScore - secondScore < scoreThreshold
}

// ============================================
// 资源类型模糊匹配
// ============================================

import { RESOURCE_TYPE_ALIASES } from '@platform/shared'

/**
 * 模糊匹配资源类型
 */
export function fuzzyMatchResourceType(
  query: string
): ResourceType | undefined {
  const q = query.toLowerCase().trim()

  // 计算每个别名的匹配分数
  let bestMatch: { type: ResourceType; score: number } | null = null

  for (const [alias, resourceType] of Object.entries(RESOURCE_TYPE_ALIASES)) {
    const score = calculateMatchScore(q, alias.toLowerCase())

    if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { type: resourceType, score }
    }
  }

  return bestMatch?.type
}

// ============================================
// 工具函数
// ============================================

/**
 * 高亮匹配的部分
 * 用于 UI 展示
 */
export function highlightMatch(
  text: string,
  query: string
): Array<{ text: string; highlighted: boolean }> {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)

  if (index < 0) {
    return [{ text, highlighted: false }]
  }

  const result: Array<{ text: string; highlighted: boolean }> = []

  if (index > 0) {
    result.push({ text: text.slice(0, index), highlighted: false })
  }

  result.push({
    text: text.slice(index, index + query.length),
    highlighted: true,
  })

  if (index + query.length < text.length) {
    result.push({
      text: text.slice(index + query.length),
      highlighted: false,
    })
  }

  return result
}

/**
 * 格式化匹配得分为百分比
 */
export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`
}
