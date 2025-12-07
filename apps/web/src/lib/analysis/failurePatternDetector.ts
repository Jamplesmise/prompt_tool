/**
 * 失败模式检测器
 * 自动识别测试失败的模式类型，支持多维度分析
 */

/**
 * 失败类型枚举
 */
export type FailureType =
  | 'format_error'      // 格式错误（JSON/XML等）
  | 'content_missing'   // 内容缺失
  | 'keyword_missing'   // 关键词缺失
  | 'length_violation'  // 长度不符
  | 'semantic_mismatch' // 语义不匹配
  | 'timeout'           // 超时
  | 'error'             // 执行错误
  | 'other'             // 其他

/**
 * 失败样本
 */
export type FailedResult = {
  id: string
  input: Record<string, unknown>
  output: string | null
  expected: string | null
  status: string
  error?: string | null
  evaluations: Array<{
    evaluatorId: string
    evaluatorName: string
    passed: boolean
    score: number | null
    reason: string | null
  }>
}

/**
 * 失败模式
 */
export type FailurePattern = {
  type: FailureType
  count: number
  percentage: number
  examples: Array<{
    id: string
    input: string
    expected: string
    actual: string
  }>
  commonFeatures: string[]
  suggestion: string
}

/**
 * 检测结果
 */
export type DetectionResult = {
  totalFailed: number
  patterns: FailurePattern[]
  dominantPattern: FailureType | null
}

/**
 * 格式检测规则
 */
const FORMAT_PATTERNS = {
  json: /^[\s]*[{\[][\s\S]*[}\]][\s]*$/,
  xml: /^[\s]*<[\s\S]*>[\s]*$/,
  markdown: /^#+\s|^\*\s|^-\s|^\d+\.\s/m,
}

/**
 * 关键词检测模式
 */
const KEYWORD_INDICATORS = [
  'keyword', '关键', '包含', '缺少', 'missing', 'required',
  '必须', '需要包含', '应该有', 'must include', 'should contain'
]

/**
 * 长度检测模式
 */
const LENGTH_INDICATORS = [
  'length', '长度', '字数', '太长', '太短', 'too long', 'too short',
  '超过', '不足', '字符', 'characters', 'words'
]

/**
 * 格式检测模式
 */
const FORMAT_INDICATORS = [
  'format', '格式', 'json', 'xml', 'html', 'markdown',
  '解析', 'parse', 'invalid', '无效', 'syntax', '语法'
]

/**
 * 语义检测模式
 */
const SEMANTIC_INDICATORS = [
  'semantic', '语义', '意思', '含义', 'meaning', 'incorrect',
  '不正确', '错误', '不匹配', 'mismatch', 'similarity', '相似度'
]

/**
 * 获取失败类型的中文名称
 */
export function getFailureTypeName(type: FailureType): string {
  const names: Record<FailureType, string> = {
    format_error: '格式错误',
    content_missing: '内容缺失',
    keyword_missing: '关键词缺失',
    length_violation: '长度不符',
    semantic_mismatch: '语义不匹配',
    timeout: '执行超时',
    error: '执行错误',
    other: '其他问题',
  }
  return names[type]
}

/**
 * 获取失败类型的颜色
 */
export function getFailureTypeColor(type: FailureType): string {
  const colors: Record<FailureType, string> = {
    format_error: '#faad14',
    content_missing: '#ff4d4f',
    keyword_missing: '#722ed1',
    length_violation: '#EF4444',
    semantic_mismatch: '#eb2f96',
    timeout: '#fa8c16',
    error: '#f5222d',
    other: '#8c8c8c',
  }
  return colors[type]
}

/**
 * 获取失败类型的图标名称
 */
export function getFailureTypeIcon(type: FailureType): string {
  const icons: Record<FailureType, string> = {
    format_error: 'FileTextOutlined',
    content_missing: 'FileExclamationOutlined',
    keyword_missing: 'SearchOutlined',
    length_violation: 'ColumnWidthOutlined',
    semantic_mismatch: 'DisconnectOutlined',
    timeout: 'ClockCircleOutlined',
    error: 'CloseCircleOutlined',
    other: 'QuestionCircleOutlined',
  }
  return icons[type]
}

/**
 * 获取失败类型的默认建议
 */
function getDefaultSuggestion(type: FailureType): string {
  const suggestions: Record<FailureType, string> = {
    format_error: '在提示词中明确指定输出格式，提供格式示例',
    content_missing: '补充必要的背景知识，提供更详细的指令',
    keyword_missing: '在提示词中强调必须包含的关键信息',
    length_violation: '明确指定输出的字数或长度范围',
    semantic_mismatch: '优化提示词表述，确保指令清晰明确',
    timeout: '考虑简化任务复杂度或增加超时时间',
    error: '检查输入数据格式和模型配置',
    other: '仔细检查评估器配置和提示词内容',
  }
  return suggestions[type]
}

/**
 * 检查文本是否包含指定模式
 */
function containsPattern(text: string, patterns: string[]): boolean {
  const lowerText = text.toLowerCase()
  return patterns.some(p => lowerText.includes(p.toLowerCase()))
}

/**
 * 提取输入的简短描述
 */
function extractInputSummary(input: Record<string, unknown>): string {
  const str = JSON.stringify(input)
  if (str.length <= 100) return str
  return str.substring(0, 97) + '...'
}

/**
 * 分类单个失败结果
 */
function classifyFailure(result: FailedResult): FailureType {
  // 1. 检查状态
  if (result.status === 'TIMEOUT') {
    return 'timeout'
  }
  if (result.status === 'ERROR') {
    return 'error'
  }

  // 2. 收集评估器失败原因
  const failedEvaluations = result.evaluations.filter(e => !e.passed)
  const reasons = failedEvaluations
    .map(e => e.reason || '')
    .join(' ')
    .toLowerCase()

  // 3. 基于评估器原因分类
  if (containsPattern(reasons, FORMAT_INDICATORS)) {
    return 'format_error'
  }
  if (containsPattern(reasons, KEYWORD_INDICATORS)) {
    return 'keyword_missing'
  }
  if (containsPattern(reasons, LENGTH_INDICATORS)) {
    return 'length_violation'
  }
  if (containsPattern(reasons, SEMANTIC_INDICATORS)) {
    return 'semantic_mismatch'
  }

  // 4. 基于输出内容分析
  const output = result.output || ''
  const expected = result.expected || ''

  // 检查是否期望 JSON 但输出不是 JSON
  if (expected && FORMAT_PATTERNS.json.test(expected) && !FORMAT_PATTERNS.json.test(output)) {
    return 'format_error'
  }

  // 检查内容是否为空或过短
  if (!output || output.trim().length < 5) {
    return 'content_missing'
  }

  // 检查长度差异
  if (expected && output) {
    const lengthRatio = output.length / expected.length
    if (lengthRatio < 0.3 || lengthRatio > 3) {
      return 'length_violation'
    }
  }

  return 'other'
}

/**
 * 提取共同特征
 */
function extractCommonFeatures(results: FailedResult[], type: FailureType): string[] {
  const features: string[] = []

  if (results.length === 0) return features

  // 基于类型提取特征
  switch (type) {
    case 'format_error': {
      // 检查是否都缺少特定格式
      const hasJsonExpected = results.some(r => r.expected && FORMAT_PATTERNS.json.test(r.expected))
      if (hasJsonExpected) {
        features.push('期望 JSON 格式输出')
      }
      const invalidJsonCount = results.filter(r => {
        try {
          if (r.output) JSON.parse(r.output)
          return false
        } catch {
          return true
        }
      }).length
      if (invalidJsonCount > results.length * 0.5) {
        features.push('输出无法解析为有效 JSON')
      }
      break
    }
    case 'content_missing': {
      const emptyCount = results.filter(r => !r.output || r.output.trim().length < 10).length
      if (emptyCount > results.length * 0.5) {
        features.push('输出内容过短或为空')
      }
      break
    }
    case 'keyword_missing': {
      // 从评估器原因中提取缺失的关键词
      const keywords = new Set<string>()
      results.forEach(r => {
        r.evaluations.forEach(e => {
          if (!e.passed && e.reason) {
            const matches = e.reason.match(/["""]([^"""]+)["""]/g)
            if (matches) {
              matches.forEach(m => keywords.add(m.replace(/["""]/g, '')))
            }
          }
        })
      })
      if (keywords.size > 0) {
        features.push(`缺失关键词: ${Array.from(keywords).slice(0, 3).join(', ')}`)
      }
      break
    }
    case 'length_violation': {
      const avgOutputLen = results.reduce((sum, r) => sum + (r.output?.length || 0), 0) / results.length
      const avgExpectedLen = results.reduce((sum, r) => sum + (r.expected?.length || 0), 0) / results.length
      if (avgOutputLen < avgExpectedLen * 0.5) {
        features.push('输出普遍过短')
      } else if (avgOutputLen > avgExpectedLen * 2) {
        features.push('输出普遍过长')
      }
      break
    }
    case 'timeout': {
      features.push('模型响应超时')
      break
    }
    case 'error': {
      const errorMessages = new Set<string>()
      results.forEach(r => {
        if (r.error) {
          const shortError = r.error.substring(0, 50)
          errorMessages.add(shortError)
        }
      })
      if (errorMessages.size > 0) {
        features.push(`错误信息: ${Array.from(errorMessages)[0]}`)
      }
      break
    }
  }

  return features
}

/**
 * 检测失败模式
 * @param results 失败的测试结果列表
 * @returns 检测结果，包含失败模式分析
 */
export function detectPatterns(results: FailedResult[]): DetectionResult {
  if (results.length === 0) {
    return {
      totalFailed: 0,
      patterns: [],
      dominantPattern: null,
    }
  }

  // 按类型分组
  const grouped = new Map<FailureType, FailedResult[]>()

  for (const result of results) {
    const type = classifyFailure(result)
    if (!grouped.has(type)) {
      grouped.set(type, [])
    }
    grouped.get(type)!.push(result)
  }

  // 构建模式列表
  const patterns: FailurePattern[] = []
  const totalFailed = results.length

  for (const [type, typeResults] of grouped) {
    const pattern: FailurePattern = {
      type,
      count: typeResults.length,
      percentage: Math.round((typeResults.length / totalFailed) * 100),
      examples: typeResults.slice(0, 3).map(r => ({
        id: r.id,
        input: extractInputSummary(r.input),
        expected: r.expected?.substring(0, 100) || '（无期望输出）',
        actual: r.output?.substring(0, 100) || '（无输出）',
      })),
      commonFeatures: extractCommonFeatures(typeResults, type),
      suggestion: getDefaultSuggestion(type),
    }
    patterns.push(pattern)
  }

  // 按数量排序
  patterns.sort((a, b) => b.count - a.count)

  // 确定主要失败模式
  const dominantPattern = patterns.length > 0 ? patterns[0].type : null

  return {
    totalFailed,
    patterns,
    dominantPattern,
  }
}

/**
 * 分析任务结果并返回失败模式
 * 兼容旧版 API
 */
export function analyzeFailurePatterns(
  results: Array<{
    id: string
    input: Record<string, unknown>
    output: string | null
    expected: string | null
    status: string
    error?: string | null
    evaluations: Array<{
      evaluatorId: string
      evaluatorName: string
      passed: boolean
      score: number | null
      reason: string | null
    }>
  }>
): DetectionResult {
  // 过滤出失败的结果
  const failedResults = results.filter(r => {
    // 状态不是成功
    if (r.status !== 'SUCCESS') return true
    // 或者有评估失败
    return r.evaluations.some(e => !e.passed)
  })

  return detectPatterns(failedResults)
}
