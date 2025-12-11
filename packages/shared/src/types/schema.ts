// 结构化评估类型定义

// ============================================
// 解析模式
// ============================================

export type ParseMode = 'JSON' | 'JSON_EXTRACT' | 'REGEX' | 'TEMPLATE'

// ============================================
// 输入变量定义
// ============================================

export type InputVariableType = 'string' | 'number' | 'boolean' | 'array' | 'object'

export type InputVariableDefinition = {
  name: string              // 显示名称
  key: string               // 变量键名（用于模板渲染）
  description?: string
  type: InputVariableType
  itemType?: 'string' | 'number' | 'boolean' | 'object'  // array 类型的元素类型
  properties?: Array<{ key: string; type: string }>       // object 类型的属性定义
  required: boolean
  defaultValue?: unknown
  datasetField?: string     // 映射到数据集的哪个字段
}

// ============================================
// 输出字段定义
// ============================================

export type OutputFieldType = 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object'

export type FieldEvaluationConfig = {
  evaluatorId?: string      // 评估器 ID
  expectedField?: string    // 期望值来源字段名（数据集中的列名）
  weight: number            // 权重 0-1
  isCritical: boolean       // 是否关键字段
  condition?: string        // 条件表达式（Phase 2）
}

export type OutputFieldDefinition = {
  name: string              // 显示名称
  key: string               // JSON key
  description?: string
  type: OutputFieldType
  required: boolean
  enumValues?: string[]     // enum 类型的可选值
  itemType?: string         // array 类型的元素类型
  properties?: Array<{ key: string; type: string }>  // object 类型的属性定义
  evaluation: FieldEvaluationConfig
}

// ============================================
// 聚合配置
// ============================================

export type AggregationMode = 'all_pass' | 'weighted_average' | 'critical_first' | 'custom'

export type AggregationConfig = {
  mode: AggregationMode
  passThreshold?: number      // 加权模式通过阈值 (0-1)
  customExpression?: string   // 自定义表达式（Phase 2）
}

// ============================================
// Schema 实体类型
// ============================================

export type InputSchema = {
  id: string
  name: string
  description?: string | null
  variables: InputVariableDefinition[]
  createdById: string
  teamId?: string | null
  createdAt: Date
  updatedAt: Date
}

export type OutputSchema = {
  id: string
  name: string
  description?: string | null
  fields: OutputFieldDefinition[]
  parseMode: ParseMode
  parseConfig: Record<string, unknown>
  aggregation: AggregationConfig
  createdById: string
  teamId?: string | null
  createdAt: Date
  updatedAt: Date
}

// ============================================
// 字段级评估结果
// ============================================

export type FieldEvaluationResult = {
  id: string
  taskResultId: string
  fieldName: string
  fieldKey: string
  fieldValue: unknown
  expectedValue: unknown
  evaluatorId?: string | null
  evaluatorName?: string | null
  passed: boolean
  score?: number | null
  reason?: string | null
  details: Record<string, unknown>
  skipped: boolean
  skipReason?: string | null
  latencyMs?: number | null
  createdAt: Date
}

// ============================================
// API 请求/响应类型
// ============================================

// 创建 InputSchema
export type CreateInputSchemaRequest = {
  name: string
  description?: string
  variables: InputVariableDefinition[]
  teamId?: string
}

// 更新 InputSchema
export type UpdateInputSchemaRequest = {
  name?: string
  description?: string
  variables?: InputVariableDefinition[]
}

// 创建 OutputSchema
export type CreateOutputSchemaRequest = {
  name: string
  description?: string
  fields: OutputFieldDefinition[]
  parseMode?: ParseMode
  parseConfig?: Record<string, unknown>
  aggregation?: AggregationConfig
  teamId?: string
}

// 更新 OutputSchema
export type UpdateOutputSchemaRequest = {
  name?: string
  description?: string
  fields?: OutputFieldDefinition[]
  parseMode?: ParseMode
  parseConfig?: Record<string, unknown>
  aggregation?: AggregationConfig
}

// Schema 列表项（带关联数量）
export type InputSchemaListItem = InputSchema & {
  _count: {
    prompts: number
  }
}

export type OutputSchemaListItem = OutputSchema & {
  _count: {
    prompts: number
  }
}

// ============================================
// 评估结构（输入+输出的完整单元）
// ============================================

export type EvaluationSchema = {
  id: string
  name: string
  description?: string | null
  inputSchema?: InputSchema | null
  outputSchema?: OutputSchema | null
  createdById: string
  teamId?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

export type EvaluationSchemaListItem = {
  id: string
  name: string
  description?: string | null
  inputSchema?: {
    id: string
    name: string
    variableCount: number
  } | null
  outputSchema?: {
    id: string
    name: string
    fieldCount: number
    parseMode: ParseMode
  } | null
  createdById: string
  teamId?: string | null
  createdAt: string
  updatedAt: string
  _count: {
    prompts: number
    datasets: number
  }
}

// 创建 EvaluationSchema 请求
export type CreateEvaluationSchemaRequest = {
  name: string
  description?: string
  inputSchema?: {
    name?: string
    description?: string
    variables: InputVariableDefinition[]
  }
  outputSchema?: {
    name?: string
    description?: string
    fields: OutputFieldDefinition[]
    parseMode?: ParseMode
    parseConfig?: Record<string, unknown>
    aggregation?: AggregationConfig
  }
  teamId?: string
}

// 更新 EvaluationSchema 请求
export type UpdateEvaluationSchemaRequest = {
  name?: string
  description?: string
  inputSchema?: {
    name?: string
    description?: string
    variables?: InputVariableDefinition[]
  } | null
  outputSchema?: {
    name?: string
    description?: string
    fields?: OutputFieldDefinition[]
    parseMode?: ParseMode
    parseConfig?: Record<string, unknown>
    aggregation?: AggregationConfig
  } | null
}

// ============================================
// 解析结果类型
// ============================================

export type ParseResult = {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  raw: string
}

// ============================================
// 聚合结果类型
// ============================================

export type AggregatedResult = {
  passed: boolean
  score: number
  reason: string
  details?: {
    mode: AggregationMode
    criticalResults?: Array<{ fieldKey: string; passed: boolean }>
    weightedScores?: Array<{ fieldKey: string; weight: number; score: number }>
  }
}

// ============================================
// Schema 模板类型
// ============================================

export type SchemaTemplateCategory =
  | 'customer_service'  // 客服场景
  | 'document_analysis' // 文档分析
  | 'text_analysis'     // 文本分析
  | 'code_quality'      // 代码质量
  | 'nlp'               // NLP
  | 'general'           // 通用

export type SchemaTemplate = {
  id: string
  name: string
  category: SchemaTemplateCategory
  description: string
  icon?: string                        // 图标名称（Ant Design 图标）
  inputSchema: {
    name: string
    description?: string
    variables: InputVariableDefinition[]
  }
  outputSchema: {
    name: string
    description?: string
    fields: OutputFieldDefinition[]
    parseMode: ParseMode
    aggregation: AggregationConfig
  }
}

export type SchemaTemplateListItem = {
  id: string
  name: string
  category: SchemaTemplateCategory
  description: string
  icon?: string
  inputVariableCount: number
  outputFieldCount: number
}
