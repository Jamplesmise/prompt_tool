/**
 * 失败模式类型
 */
export type FailurePatternType = 'format' | 'content' | 'keyword' | 'length' | 'other'

/**
 * 失败模式
 */
export type FailurePattern = {
  /** 失败类型 */
  type: FailurePatternType
  /** 失败数量 */
  count: number
  /** 示例（最多3个） */
  examples: string[]
  /** 改进建议 */
  suggestion: string
}

/**
 * 任务结果数据（简化版）
 */
type TaskResultItem = {
  passed: boolean
  output?: string
  expectedOutput?: string
  evaluatorResults?: Array<{
    evaluatorName: string
    passed: boolean
    reason?: string
  }>
}

/**
 * 分析失败模式
 */
export function analyzeFailures(results: TaskResultItem[]): FailurePattern[] {
  const failedResults = results.filter((r) => !r.passed)

  if (failedResults.length === 0) {
    return []
  }

  const patterns: Map<FailurePatternType, FailurePattern> = new Map()

  // 初始化所有模式
  const initPattern = (type: FailurePatternType, suggestion: string): FailurePattern => ({
    type,
    count: 0,
    examples: [],
    suggestion,
  })

  patterns.set('format', initPattern('format', '检查输出格式是否符合要求，考虑在提示词中明确指定输出格式'))
  patterns.set('content', initPattern('content', '检查模型理解是否正确，考虑提供更多示例或上下文'))
  patterns.set('keyword', initPattern('keyword', '检查是否遗漏了关键信息，考虑在提示词中强调必须包含的内容'))
  patterns.set('length', initPattern('length', '检查输出长度限制，考虑在提示词中明确字数要求'))
  patterns.set('other', initPattern('other', '仔细检查评估器配置和提示词内容'))

  for (const result of failedResults) {
    const type = classifyFailure(result)
    const pattern = patterns.get(type)!
    pattern.count++
    if (pattern.examples.length < 3) {
      const example = result.output?.substring(0, 100) || '（无输出）'
      pattern.examples.push(example)
    }
  }

  // 只返回有失败的模式，按数量排序
  return Array.from(patterns.values())
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
}

/**
 * 对单个失败进行分类
 */
function classifyFailure(result: TaskResultItem): FailurePatternType {
  const evaluatorReasons = result.evaluatorResults
    ?.filter((e) => !e.passed)
    ?.map((e) => e.reason?.toLowerCase() || '') || []

  const allReasons = evaluatorReasons.join(' ')
  const output = (result.output || '').toLowerCase()
  const expected = (result.expectedOutput || '').toLowerCase()

  // 格式问题检测
  if (
    allReasons.includes('format') ||
    allReasons.includes('格式') ||
    allReasons.includes('json') ||
    allReasons.includes('xml')
  ) {
    return 'format'
  }

  // 关键词问题检测
  if (
    allReasons.includes('keyword') ||
    allReasons.includes('关键') ||
    allReasons.includes('包含') ||
    allReasons.includes('缺少')
  ) {
    return 'keyword'
  }

  // 长度问题检测
  if (
    allReasons.includes('length') ||
    allReasons.includes('长度') ||
    allReasons.includes('字数') ||
    allReasons.includes('太长') ||
    allReasons.includes('太短')
  ) {
    return 'length'
  }

  // 内容问题检测
  if (
    allReasons.includes('content') ||
    allReasons.includes('内容') ||
    allReasons.includes('语义') ||
    allReasons.includes('准确')
  ) {
    return 'content'
  }

  // 如果有期望输出，对比分析
  if (expected && output) {
    // 如果输出长度差异大
    if (Math.abs(output.length - expected.length) > expected.length * 0.5) {
      return 'length'
    }
  }

  return 'other'
}

/**
 * 获取失败类型的中文名称
 */
export function getFailureTypeName(type: FailurePatternType): string {
  const names: Record<FailurePatternType, string> = {
    format: '格式错误',
    content: '内容问题',
    keyword: '关键词缺失',
    length: '长度不符',
    other: '其他问题',
  }
  return names[type]
}

/**
 * 获取失败类型的颜色
 */
export function getFailureTypeColor(type: FailurePatternType): string {
  const colors: Record<FailurePatternType, string> = {
    format: '#faad14',
    content: '#ff4d4f',
    keyword: '#722ed1',
    length: '#EF4444',
    other: '#8c8c8c',
  }
  return colors[type]
}
