/**
 * 提示词文本差异生成器
 * 基于行级别的 diff 算法，生成可视化的差异结果
 */

export type DiffType = 'add' | 'remove' | 'unchanged'

export type DiffSegment = {
  type: DiffType
  content: string
  lineNumber: number
  oldLineNumber?: number  // 删除行在原文本中的行号
  newLineNumber?: number  // 新增行在新文本中的行号
}

export type DiffStats = {
  additions: number
  deletions: number
  unchanged: number
  totalOld: number
  totalNew: number
}

export type DiffResult = {
  segments: DiffSegment[]
  stats: DiffStats
  oldLines: string[]
  newLines: string[]
}

/**
 * 计算最长公共子序列 (LCS) 的长度表
 * 用于确定哪些行是相同的
 */
function computeLCSTable(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length
  const n = newLines.length

  // 创建 (m+1) x (n+1) 的表
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

/**
 * 从 LCS 表回溯生成 diff
 */
function backtrackDiff(
  dp: number[][],
  oldLines: string[],
  newLines: string[]
): DiffSegment[] {
  const segments: DiffSegment[] = []
  let i = oldLines.length
  let j = newLines.length
  let lineNumber = 1

  // 临时存储，最后需要反转
  const tempSegments: DiffSegment[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      // 相同行
      tempSegments.push({
        type: 'unchanged',
        content: oldLines[i - 1],
        lineNumber: 0, // 稍后设置
        oldLineNumber: i,
        newLineNumber: j,
      })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // 新增行
      tempSegments.push({
        type: 'add',
        content: newLines[j - 1],
        lineNumber: 0,
        newLineNumber: j,
      })
      j--
    } else if (i > 0) {
      // 删除行
      tempSegments.push({
        type: 'remove',
        content: oldLines[i - 1],
        lineNumber: 0,
        oldLineNumber: i,
      })
      i--
    }
  }

  // 反转并设置行号
  tempSegments.reverse()
  for (const segment of tempSegments) {
    segment.lineNumber = lineNumber++
    segments.push(segment)
  }

  return segments
}

/**
 * 生成两个文本的差异
 * @param oldText 原始文本
 * @param newText 新文本
 * @returns 差异结果
 */
export function generateDiff(oldText: string, newText: string): DiffResult {
  // 处理空文本
  if (!oldText && !newText) {
    return {
      segments: [],
      stats: { additions: 0, deletions: 0, unchanged: 0, totalOld: 0, totalNew: 0 },
      oldLines: [],
      newLines: [],
    }
  }

  // 按行分割
  const oldLines = oldText ? oldText.split('\n') : []
  const newLines = newText ? newText.split('\n') : []

  // 如果原文为空，全部是新增
  if (oldLines.length === 0 || (oldLines.length === 1 && oldLines[0] === '')) {
    const segments: DiffSegment[] = newLines.map((line, idx) => ({
      type: 'add' as DiffType,
      content: line,
      lineNumber: idx + 1,
      newLineNumber: idx + 1,
    }))

    return {
      segments,
      stats: {
        additions: newLines.length,
        deletions: 0,
        unchanged: 0,
        totalOld: 0,
        totalNew: newLines.length,
      },
      oldLines,
      newLines,
    }
  }

  // 如果新文为空，全部是删除
  if (newLines.length === 0 || (newLines.length === 1 && newLines[0] === '')) {
    const segments: DiffSegment[] = oldLines.map((line, idx) => ({
      type: 'remove' as DiffType,
      content: line,
      lineNumber: idx + 1,
      oldLineNumber: idx + 1,
    }))

    return {
      segments,
      stats: {
        additions: 0,
        deletions: oldLines.length,
        unchanged: 0,
        totalOld: oldLines.length,
        totalNew: 0,
      },
      oldLines,
      newLines,
    }
  }

  // 计算 LCS 并生成 diff
  const dp = computeLCSTable(oldLines, newLines)
  const segments = backtrackDiff(dp, oldLines, newLines)

  // 计算统计信息
  const stats: DiffStats = {
    additions: segments.filter(s => s.type === 'add').length,
    deletions: segments.filter(s => s.type === 'remove').length,
    unchanged: segments.filter(s => s.type === 'unchanged').length,
    totalOld: oldLines.length,
    totalNew: newLines.length,
  }

  return { segments, stats, oldLines, newLines }
}

/**
 * 生成统一格式的 diff 输出（类似 git diff）
 */
export function generateUnifiedDiff(
  oldText: string,
  newText: string,
  options: {
    contextLines?: number
    oldLabel?: string
    newLabel?: string
  } = {}
): string {
  const { contextLines = 3, oldLabel = 'old', newLabel = 'new' } = options
  const diff = generateDiff(oldText, newText)

  if (diff.segments.length === 0) {
    return ''
  }

  const lines: string[] = []
  lines.push(`--- ${oldLabel}`)
  lines.push(`+++ ${newLabel}`)

  // 简化实现：输出所有差异
  let oldLineNum = 1
  let newLineNum = 1

  for (const segment of diff.segments) {
    switch (segment.type) {
      case 'unchanged':
        lines.push(` ${segment.content}`)
        oldLineNum++
        newLineNum++
        break
      case 'remove':
        lines.push(`-${segment.content}`)
        oldLineNum++
        break
      case 'add':
        lines.push(`+${segment.content}`)
        newLineNum++
        break
    }
  }

  return lines.join('\n')
}

/**
 * 生成字符级别的内联 diff（用于单行内的变化高亮）
 */
export type InlineDiffSegment = {
  type: DiffType
  text: string
}

export function generateInlineDiff(
  oldLine: string,
  newLine: string
): { old: InlineDiffSegment[]; new: InlineDiffSegment[] } {
  if (oldLine === newLine) {
    return {
      old: [{ type: 'unchanged', text: oldLine }],
      new: [{ type: 'unchanged', text: newLine }],
    }
  }

  // 找到公共前缀
  let prefixLen = 0
  while (
    prefixLen < oldLine.length &&
    prefixLen < newLine.length &&
    oldLine[prefixLen] === newLine[prefixLen]
  ) {
    prefixLen++
  }

  // 找到公共后缀
  let oldSuffixStart = oldLine.length
  let newSuffixStart = newLine.length
  while (
    oldSuffixStart > prefixLen &&
    newSuffixStart > prefixLen &&
    oldLine[oldSuffixStart - 1] === newLine[newSuffixStart - 1]
  ) {
    oldSuffixStart--
    newSuffixStart--
  }

  const prefix = oldLine.substring(0, prefixLen)
  const oldMiddle = oldLine.substring(prefixLen, oldSuffixStart)
  const newMiddle = newLine.substring(prefixLen, newSuffixStart)
  const suffix = oldLine.substring(oldSuffixStart)

  const oldSegments: InlineDiffSegment[] = []
  const newSegments: InlineDiffSegment[] = []

  if (prefix) {
    oldSegments.push({ type: 'unchanged', text: prefix })
    newSegments.push({ type: 'unchanged', text: prefix })
  }

  if (oldMiddle) {
    oldSegments.push({ type: 'remove', text: oldMiddle })
  }

  if (newMiddle) {
    newSegments.push({ type: 'add', text: newMiddle })
  }

  if (suffix) {
    oldSegments.push({ type: 'unchanged', text: suffix })
    newSegments.push({ type: 'unchanged', text: suffix })
  }

  return { old: oldSegments, new: newSegments }
}

/**
 * 计算变更摘要
 */
export function getDiffSummary(diff: DiffResult): string {
  const { stats } = diff
  const parts: string[] = []

  if (stats.additions > 0) {
    parts.push(`+${stats.additions} 行`)
  }
  if (stats.deletions > 0) {
    parts.push(`-${stats.deletions} 行`)
  }
  if (stats.additions === 0 && stats.deletions === 0) {
    return '无变更'
  }

  return parts.join('，')
}

/**
 * 检查两个文本是否有实质性变化
 * 忽略空白字符的差异
 */
export function hasSubstantialChanges(oldText: string, newText: string): boolean {
  const normalizeWhitespace = (text: string) =>
    text.replace(/\s+/g, ' ').trim()

  return normalizeWhitespace(oldText) !== normalizeWhitespace(newText)
}
