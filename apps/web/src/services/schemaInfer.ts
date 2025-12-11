// Schema 推断服务
import type { OutputFieldType, OutputFieldDefinition } from '@platform/shared'

// 推断结果类型
export type InferredField = {
  key: string
  name: string
  suggestedName: string
  type: OutputFieldType
  required: boolean
  itemType?: string
  enumValues?: string[]
  properties?: Array<{ key: string; type: string }>
}

// 推断单个值的类型
function inferValueType(value: unknown): OutputFieldType {
  if (value === null || value === undefined) {
    return 'string' // 默认为 string
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  if (typeof value === 'object') {
    return 'object'
  }

  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  return 'string'
}

// 推断数组元素类型
function inferArrayItemType(arr: unknown[]): string {
  if (arr.length === 0) {
    return 'string'
  }

  const firstItem = arr[0]
  if (typeof firstItem === 'string') return 'string'
  if (typeof firstItem === 'number') return 'number'
  if (typeof firstItem === 'boolean') return 'boolean'
  if (typeof firstItem === 'object' && firstItem !== null) return 'object'

  return 'string'
}

// 推断对象属性
function inferObjectProperties(obj: Record<string, unknown>): Array<{ key: string; type: string }> {
  return Object.entries(obj).map(([key, value]) => ({
    key,
    type: inferValueType(value),
  }))
}

// 生成建议的中文名称
function generateSuggestedName(key: string): string {
  // 常见字段的中文映射
  const nameMap: Record<string, string> = {
    // 通用字段
    id: 'ID',
    name: '名称',
    title: '标题',
    content: '内容',
    description: '描述',
    type: '类型',
    status: '状态',
    result: '结果',
    message: '消息',
    error: '错误',
    success: '成功',
    data: '数据',

    // 分析相关
    thinking: '思考过程',
    analysis: '分析',
    summary: '摘要',
    conclusion: '结论',
    reason: '原因',
    explanation: '解释',

    // 分类相关
    category: '分类',
    label: '标签',
    tags: '标签',
    classification: '分类',
    sentiment: '情感',

    // 数值相关
    score: '评分',
    confidence: '置信度',
    probability: '概率',
    count: '数量',
    total: '总计',
    average: '平均值',

    // NLP 相关
    entities: '实体',
    keywords: '关键词',
    tokens: '词元',
    persons: '人名',
    locations: '地名',
    organizations: '组织',
    dates: '日期',

    // 代码相关
    issues: '问题',
    suggestions: '建议',
    warnings: '警告',
    errors: '错误',

    // 布尔相关
    is_valid: '是否有效',
    is_correct: '是否正确',
    has_error: '是否有错误',
    device_change: '是否换设备',
  }

  // 查找精确匹配
  const lowerKey = key.toLowerCase()
  if (nameMap[lowerKey]) {
    return nameMap[lowerKey]
  }

  // 查找部分匹配
  for (const [pattern, name] of Object.entries(nameMap)) {
    if (lowerKey.includes(pattern)) {
      return name
    }
  }

  // 将 snake_case 或 camelCase 转换为更可读的形式
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// 推断字段是否必填
function inferRequired(key: string, value: unknown): boolean {
  // 某些关键字段通常是必填的
  const requiredKeys = ['type', 'category', 'result', 'status', 'sentiment', 'score']
  if (requiredKeys.some(k => key.toLowerCase().includes(k))) {
    return true
  }

  // 如果值为 null 或 undefined，则不是必填
  if (value === null || value === undefined) {
    return false
  }

  return true
}

// 从 JSON 输出推断 Schema
export function inferSchemaFromOutput(output: unknown): InferredField[] {
  if (typeof output !== 'object' || output === null) {
    throw new Error('输出必须是 JSON 对象')
  }

  if (Array.isArray(output)) {
    throw new Error('输出必须是 JSON 对象，不能是数组')
  }

  const fields: InferredField[] = []

  for (const [key, value] of Object.entries(output as Record<string, unknown>)) {
    const type = inferValueType(value)
    const field: InferredField = {
      key,
      name: key,
      suggestedName: generateSuggestedName(key),
      type,
      required: inferRequired(key, value),
    }

    // 处理数组类型
    if (type === 'array' && Array.isArray(value)) {
      field.itemType = inferArrayItemType(value)

      // 如果数组元素是对象，推断其属性
      if (field.itemType === 'object' && value.length > 0 && typeof value[0] === 'object') {
        field.properties = inferObjectProperties(value[0] as Record<string, unknown>)
      }
    }

    // 处理对象类型
    if (type === 'object' && value !== null) {
      field.properties = inferObjectProperties(value as Record<string, unknown>)
    }

    fields.push(field)
  }

  return fields
}

// 将推断结果转换为 OutputFieldDefinition
export function convertToFieldDefinitions(
  fields: InferredField[],
  options?: {
    defaultEvaluatorId?: string
    equalWeight?: boolean
  }
): OutputFieldDefinition[] {
  const { defaultEvaluatorId, equalWeight = true } = options || {}
  const weight = equalWeight ? 1 / fields.length : 0.2

  return fields.map((field) => ({
    name: field.suggestedName || field.name,
    key: field.key,
    description: '',
    type: field.type,
    required: field.required,
    enumValues: field.enumValues,
    itemType: field.itemType,
    properties: field.properties,
    evaluation: {
      evaluatorId: defaultEvaluatorId,
      weight,
      isCritical: false,
    },
  }))
}

// 解析 JSON 字符串
export function parseJsonOutput(jsonString: string): Record<string, unknown> {
  try {
    // 尝试直接解析
    return JSON.parse(jsonString)
  } catch {
    // 尝试提取 JSON 代码块
    const jsonBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch) {
      return JSON.parse(jsonBlockMatch[1].trim())
    }

    // 尝试查找 JSON 对象
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }

    throw new Error('无法解析 JSON 输出')
  }
}
