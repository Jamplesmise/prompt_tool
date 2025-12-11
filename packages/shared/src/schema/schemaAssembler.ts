/**
 * Schema 组装器
 *
 * 将 AI 输出的精简格式转换为完整的 InputSchema 和 OutputSchema
 *
 * 职责分离设计：
 * - AI 负责：变量/字段名称、数据类型判断、是否必填、枚举值提取、是否关键字段
 * - 代码负责：key 生成、datasetField 生成、评估器推断、权重分配、聚合策略推断
 */

import type {
  InputVariableDefinition,
  InputVariableType,
  OutputFieldDefinition,
  OutputFieldType,
  FieldEvaluationConfig,
  AggregationConfig,
  AggregationMode,
  ParseMode,
} from '../types/schema'

// ============================================
// AI 输出格式定义
// ============================================

export type AIInputVariable = {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  required: boolean
}

export type AIOutputField = {
  name: string
  type: 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object'
  values?: string[]  // 仅 enum 类型需要
  critical: boolean
}

export type AISchemaOutput = {
  inputs: AIInputVariable[]
  outputs: AIOutputField[]
}

// ============================================
// 组装结果类型
// ============================================

export type AssembledInputSchema = {
  name: string
  description?: string
  variables: InputVariableDefinition[]
}

export type AssembledOutputSchema = {
  name: string
  description?: string
  fields: OutputFieldDefinition[]
  parseMode: ParseMode
  parseConfig: Record<string, unknown>
  aggregation: AggregationConfig
}

export type TemplateColumn = {
  key: string
  name: string
  type: 'input' | 'expected'
  fieldType: string
  required: boolean
  description?: string
}

export type AssembleResult = {
  inputSchema: AssembledInputSchema
  outputSchema: AssembledOutputSchema
  templateColumns: TemplateColumn[]
}

// ============================================
// 拼音转换工具
// ============================================

// 简单的中文字符检测
function containsChinese(str: string): boolean {
  return /[\u4e00-\u9fa5]/.test(str)
}

// 简化的中文转拼音（基础实现，可后续替换为 pinyin-pro）
// 这里使用编号方案：如果包含中文，转为 field_1, field_2 格式
// 如果是英文，直接转换为 camelCase
function generateKey(name: string, index: number, prefix: string = ''): string {
  // 如果名称是纯英文或包含英文，尝试提取英文单词
  const englishMatch = name.match(/[a-zA-Z]+/g)

  if (!containsChinese(name) && englishMatch) {
    // 纯英文情况，转为 camelCase
    const words = name
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0)

    if (words.length > 0) {
      const camelCase = words
        .map((word, i) => i === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join('')
      return prefix ? `${prefix}_${camelCase}` : camelCase
    }
  }

  // 包含中文的情况，使用索引生成 key
  // 尝试提取有意义的关键词
  const chineseKeywords: Record<string, string> = {
    '用户': 'user',
    '设备': 'device',
    '问题': 'question',
    '分类': 'category',
    '类型': 'type',
    '结果': 'result',
    '状态': 'status',
    '内容': 'content',
    '历史': 'history',
    '对话': 'dialog',
    '输入': 'input',
    '输出': 'output',
    '思考': 'thinking',
    '推理': 'reasoning',
    '答案': 'answer',
    '回复': 'reply',
    '提取': 'extract',
    '检索': 'search',
    '关键词': 'keyword',
    '标签': 'tag',
    '评分': 'score',
    '等级': 'level',
    '名称': 'name',
    '描述': 'description',
    '时间': 'time',
    '日期': 'date',
    '数量': 'count',
    '金额': 'amount',
    '价格': 'price',
    '地址': 'address',
    '电话': 'phone',
    '邮箱': 'email',
    '型号': 'model',
    '品牌': 'brand',
    '版本': 'version',
    '意图': 'intent',
    '情感': 'sentiment',
    '摘要': 'summary',
    '列表': 'list',
    '更改': 'change',
    '修改': 'modify',
  }

  // 尝试匹配关键词
  const matchedKeys: string[] = []
  for (const [chinese, english] of Object.entries(chineseKeywords)) {
    if (name.includes(chinese)) {
      matchedKeys.push(english)
    }
  }

  if (matchedKeys.length > 0) {
    const key = matchedKeys.slice(0, 2).join('_')
    return prefix ? `${prefix}_${key}` : key
  }

  // 无法匹配时使用编号
  const fallbackKey = `field_${index + 1}`
  return prefix ? `${prefix}_${fallbackKey}` : fallbackKey
}

// 转换为 snake_case
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/-/g, '_')
}

// ============================================
// 评估器推断
// ============================================

const EVALUATOR_MAP: Record<OutputFieldType, string> = {
  'enum': 'preset-exact-match',      // 枚举值必须精确匹配
  'boolean': 'preset-exact-match',   // 布尔值精确匹配
  'number': 'preset-exact-match',    // 数值精确匹配
  'string': 'preset-contains',       // 字符串包含匹配
  'array': 'preset-array-contains',  // 数组包含匹配
  'object': 'preset-json-match',     // 对象 JSON 匹配
}

function inferEvaluator(type: OutputFieldType): string {
  return EVALUATOR_MAP[type] || 'preset-exact-match'
}

// ============================================
// 聚合策略推断
// ============================================

function inferAggregationMode(outputs: AIOutputField[]): AggregationMode {
  const hasCriticalFields = outputs.some(o => o.critical)
  return hasCriticalFields ? 'critical_first' : 'weighted_average'
}

// ============================================
// 核心组装函数
// ============================================

/**
 * 组装 Schema
 *
 * @param aiOutput - AI 输出的精简格式
 * @param sceneName - 场景名称
 * @param options - 可选配置
 * @returns 组装后的完整 Schema
 */
export function assembleSchemas(
  aiOutput: AISchemaOutput,
  sceneName: string,
  options: {
    defaultParseMode?: ParseMode
    defaultPassThreshold?: number
  } = {}
): AssembleResult {
  const {
    defaultParseMode = 'JSON_EXTRACT',
    defaultPassThreshold = 0.7,
  } = options

  // 用于生成唯一 key 的集合
  const usedInputKeys = new Set<string>()
  const usedOutputKeys = new Set<string>()

  // 生成唯一的 key
  function getUniqueKey(
    name: string,
    index: number,
    prefix: string,
    usedKeys: Set<string>
  ): string {
    let key = generateKey(name, index, '')
    let counter = 1
    const baseKey = key

    while (usedKeys.has(key)) {
      key = `${baseKey}_${counter}`
      counter++
    }

    usedKeys.add(key)
    return key
  }

  // 1. 组装 InputSchema
  const inputVariables: InputVariableDefinition[] = aiOutput.inputs.map((input, index) => {
    const key = getUniqueKey(input.name, index, '', usedInputKeys)

    return {
      name: input.name,
      key,
      type: input.type as InputVariableType,
      required: input.required,
      datasetField: `ctx_${toSnakeCase(key)}`,  // 输入上下文字段前缀 ctx_
    }
  })

  const inputSchema: AssembledInputSchema = {
    name: `${sceneName}输入变量`,
    description: `${sceneName}场景的输入变量定义`,
    variables: inputVariables,
  }

  // 2. 组装 OutputSchema
  const fieldCount = aiOutput.outputs.length
  const outputFields: OutputFieldDefinition[] = aiOutput.outputs.map((output, index) => {
    const key = getUniqueKey(output.name, index, '', usedOutputKeys)

    const evaluation: FieldEvaluationConfig = {
      evaluatorId: inferEvaluator(output.type as OutputFieldType),
      expectedField: `exp_${toSnakeCase(key)}`,  // 期望值字段前缀 exp_
      weight: fieldCount > 0 ? 1 / fieldCount : 1,  // 均分权重
      isCritical: output.critical,
    }

    const field: OutputFieldDefinition = {
      name: output.name,
      key,
      type: output.type as OutputFieldType,
      required: true,  // 默认必填
      evaluation,
    }

    // 如果是枚举类型，添加枚举值
    if (output.type === 'enum' && output.values) {
      field.enumValues = output.values
    }

    return field
  })

  const aggregationMode = inferAggregationMode(aiOutput.outputs)
  const outputSchema: AssembledOutputSchema = {
    name: `${sceneName}输出结构`,
    description: `${sceneName}场景的输出结构定义`,
    fields: outputFields,
    parseMode: defaultParseMode,
    parseConfig: {},
    aggregation: {
      mode: aggregationMode,
      passThreshold: defaultPassThreshold,
    },
  }

  // 3. 生成模板列定义
  const templateColumns: TemplateColumn[] = [
    // 输入列
    ...inputVariables.map(v => ({
      key: v.datasetField!,
      name: v.name,
      type: 'input' as const,
      fieldType: v.type,
      required: v.required,
      description: `输入变量: ${v.name}`,
    })),
    // 期望值列
    ...outputFields.map(f => ({
      key: f.evaluation.expectedField!,
      name: `期望-${f.name}`,
      type: 'expected' as const,
      fieldType: f.type,
      required: true,
      description: `期望输出: ${f.name}`,
    })),
  ]

  return {
    inputSchema,
    outputSchema,
    templateColumns,
  }
}

// ============================================
// 验证函数
// ============================================

export type ValidationError = {
  field: string
  message: string
}

/**
 * 验证 AI 输出格式
 */
export function validateAIOutput(output: unknown): {
  valid: boolean
  errors: ValidationError[]
  data?: AISchemaOutput
} {
  const errors: ValidationError[] = []

  if (!output || typeof output !== 'object') {
    return { valid: false, errors: [{ field: 'root', message: 'Output must be an object' }] }
  }

  const obj = output as Record<string, unknown>

  // 检查 inputs
  if (!Array.isArray(obj.inputs)) {
    errors.push({ field: 'inputs', message: 'inputs must be an array' })
  } else {
    obj.inputs.forEach((input, index) => {
      if (!input || typeof input !== 'object') {
        errors.push({ field: `inputs[${index}]`, message: 'Each input must be an object' })
        return
      }

      const inp = input as Record<string, unknown>
      if (typeof inp.name !== 'string' || !inp.name) {
        errors.push({ field: `inputs[${index}].name`, message: 'name is required and must be a string' })
      }

      const validTypes = ['string', 'number', 'boolean', 'array', 'object']
      if (!validTypes.includes(inp.type as string)) {
        errors.push({
          field: `inputs[${index}].type`,
          message: `type must be one of: ${validTypes.join(', ')}`
        })
      }

      if (typeof inp.required !== 'boolean') {
        errors.push({ field: `inputs[${index}].required`, message: 'required must be a boolean' })
      }
    })
  }

  // 检查 outputs
  if (!Array.isArray(obj.outputs)) {
    errors.push({ field: 'outputs', message: 'outputs must be an array' })
  } else {
    obj.outputs.forEach((output, index) => {
      if (!output || typeof output !== 'object') {
        errors.push({ field: `outputs[${index}]`, message: 'Each output must be an object' })
        return
      }

      const out = output as Record<string, unknown>
      if (typeof out.name !== 'string' || !out.name) {
        errors.push({ field: `outputs[${index}].name`, message: 'name is required and must be a string' })
      }

      const validTypes = ['string', 'number', 'boolean', 'enum', 'array', 'object']
      if (!validTypes.includes(out.type as string)) {
        errors.push({
          field: `outputs[${index}].type`,
          message: `type must be one of: ${validTypes.join(', ')}`
        })
      }

      // enum 类型必须有 values
      if (out.type === 'enum') {
        if (!Array.isArray(out.values) || out.values.length === 0) {
          errors.push({
            field: `outputs[${index}].values`,
            message: 'enum type requires a non-empty values array'
          })
        }
      }

      if (typeof out.critical !== 'boolean') {
        errors.push({ field: `outputs[${index}].critical`, message: 'critical must be a boolean' })
      }
    })
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    errors: [],
    data: obj as AISchemaOutput
  }
}

// ============================================
// 导出
// ============================================

export default {
  assembleSchemas,
  validateAIOutput,
  inferEvaluator,
  generateKey,
}
