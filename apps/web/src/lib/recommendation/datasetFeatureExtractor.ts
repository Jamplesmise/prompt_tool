/**
 * 数据集特征提取器
 * 从数据集中提取用于评估器推荐的特征
 */

/**
 * 数据集行数据
 */
export type DatasetRow = {
  data: Record<string, unknown>
}

/**
 * 数据集信息
 */
export type DatasetInfo = {
  columns: string[]
  rows: DatasetRow[]
  rowCount: number
}

/**
 * 数据集特征
 */
export type DatasetFeatures = {
  /** 是否有期望输出字段 */
  hasExpectedOutput: boolean
  /** 期望输出字段名 */
  expectedOutputField: string | null
  /** 是否有关键词字段 */
  hasKeywords: boolean
  /** 关键词字段名 */
  keywordsField: string | null
  /** 是否有评分字段 */
  hasScore: boolean
  /** 评分字段名 */
  scoreField: string | null
  /** 是否有分类标签字段 */
  hasLabel: boolean
  /** 分类标签字段名 */
  labelField: string | null
  /** 平均输入长度 */
  avgInputLength: number
  /** 平均输出长度 */
  avgOutputLength: number
  /** 输入字段列表 */
  inputFields: string[]
  /** 总行数 */
  totalRows: number
  /** 置信度 */
  confidence: number
}

/**
 * 期望输出相关字段名模式
 */
const EXPECTED_OUTPUT_PATTERNS = [
  'expected', 'output', 'answer', 'response', 'result',
  '期望', '输出', '答案', '结果', '预期'
]

/**
 * 关键词相关字段名模式
 */
const KEYWORDS_PATTERNS = [
  'keyword', 'keywords', 'key', 'must_include',
  '关键词', '关键字', '必含'
]

/**
 * 评分相关字段名模式
 */
const SCORE_PATTERNS = [
  'score', 'rating', 'grade', 'mark',
  '评分', '分数', '得分', '打分'
]

/**
 * 分类标签相关字段名模式
 */
const LABEL_PATTERNS = [
  'label', 'class', 'category', 'type', 'tag',
  '标签', '类别', '分类', '类型'
]

/**
 * 输入相关字段名模式
 */
const INPUT_PATTERNS = [
  'input', 'query', 'question', 'text', 'content', 'prompt',
  '输入', '问题', '文本', '内容', '查询'
]

/**
 * 检查字段名是否匹配模式
 */
function fieldMatches(fieldName: string, patterns: string[]): boolean {
  const lowerName = fieldName.toLowerCase()
  return patterns.some(p => lowerName.includes(p.toLowerCase()))
}

/**
 * 查找匹配的字段
 */
function findMatchingField(columns: string[], patterns: string[]): string | null {
  for (const col of columns) {
    if (fieldMatches(col, patterns)) {
      return col
    }
  }
  return null
}

/**
 * 计算字符串长度，处理各种类型
 */
function getStringLength(value: unknown): number {
  if (typeof value === 'string') return value.length
  if (value === null || value === undefined) return 0
  return JSON.stringify(value).length
}

/**
 * 计算平均长度
 */
function calculateAvgLength(rows: DatasetRow[], fieldName: string | null): number {
  if (!fieldName || rows.length === 0) return 0

  let totalLength = 0
  let count = 0

  for (const row of rows) {
    const value = row.data[fieldName]
    if (value !== null && value !== undefined) {
      totalLength += getStringLength(value)
      count++
    }
  }

  return count > 0 ? Math.round(totalLength / count) : 0
}

/**
 * 识别输入字段
 */
function identifyInputFields(columns: string[], excludeFields: Set<string>): string[] {
  const inputFields: string[] = []

  for (const col of columns) {
    if (excludeFields.has(col)) continue
    if (fieldMatches(col, INPUT_PATTERNS)) {
      inputFields.push(col)
    }
  }

  // 如果没有明确匹配的输入字段，使用排除后的第一个字段
  if (inputFields.length === 0) {
    const remaining = columns.filter(c => !excludeFields.has(c))
    if (remaining.length > 0) {
      inputFields.push(remaining[0])
    }
  }

  return inputFields
}

/**
 * 计算特征提取的置信度
 */
function calculateConfidence(features: Omit<DatasetFeatures, 'confidence'>): number {
  let score = 0.5 // 基础分

  // 有明确的期望输出时增加置信度
  if (features.hasExpectedOutput) score += 0.2
  if (features.hasKeywords) score += 0.1
  if (features.hasScore) score += 0.1
  if (features.hasLabel) score += 0.1
  if (features.inputFields.length > 0) score += 0.1

  return Math.min(score, 1)
}

/**
 * 从数据集中提取特征
 * @param dataset 数据集信息
 * @returns 提取的特征
 */
export function extractDatasetFeatures(dataset: DatasetInfo): DatasetFeatures {
  const { columns, rows, rowCount } = dataset

  // 查找特殊字段
  const expectedOutputField = findMatchingField(columns, EXPECTED_OUTPUT_PATTERNS)
  const keywordsField = findMatchingField(columns, KEYWORDS_PATTERNS)
  const scoreField = findMatchingField(columns, SCORE_PATTERNS)
  const labelField = findMatchingField(columns, LABEL_PATTERNS)

  // 排除已识别的特殊字段
  const excludeFields = new Set<string>()
  if (expectedOutputField) excludeFields.add(expectedOutputField)
  if (keywordsField) excludeFields.add(keywordsField)
  if (scoreField) excludeFields.add(scoreField)
  if (labelField) excludeFields.add(labelField)

  // 识别输入字段
  const inputFields = identifyInputFields(columns, excludeFields)

  // 计算平均长度
  const avgInputLength = calculateAvgLength(rows, inputFields[0] || null)
  const avgOutputLength = calculateAvgLength(rows, expectedOutputField)

  const partialFeatures = {
    hasExpectedOutput: !!expectedOutputField,
    expectedOutputField,
    hasKeywords: !!keywordsField,
    keywordsField,
    hasScore: !!scoreField,
    scoreField,
    hasLabel: !!labelField,
    labelField,
    avgInputLength,
    avgOutputLength,
    inputFields,
    totalRows: rowCount,
  }

  return {
    ...partialFeatures,
    confidence: calculateConfidence(partialFeatures),
  }
}

/**
 * 从简化的数据集信息中提取特征
 * @param columns 列名列表
 * @param sampleRows 样本行（可选，用于计算平均长度）
 * @param rowCount 总行数
 */
export function extractDatasetFeaturesFromColumns(
  columns: string[],
  sampleRows: DatasetRow[] = [],
  rowCount: number = 0
): DatasetFeatures {
  return extractDatasetFeatures({
    columns,
    rows: sampleRows,
    rowCount,
  })
}
