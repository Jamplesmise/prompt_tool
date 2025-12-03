// 评估器相关类型

export type EvaluatorType = 'PRESET' | 'CODE' | 'LLM' | 'COMPOSITE'

export type PresetEvaluatorType =
  | 'exact_match'
  | 'contains'
  | 'regex'
  | 'json_schema'
  | 'similarity'

export type PresetEvaluatorConfig = {
  presetType: PresetEvaluatorType
  caseSensitive?: boolean
  pattern?: string
  schema?: Record<string, unknown>
  threshold?: number
}

export type CodeEvaluatorConfig = {
  code: string
  language: 'javascript' | 'python'
  timeout?: number
}

export type LLMEvaluatorConfig = {
  modelId: string
  prompt: string
  criteria: string[]
}

export type CompositeEvaluatorConfig = {
  evaluatorIds: string[]
  operator: 'AND' | 'OR'
  weights?: Record<string, number>
}

export type EvaluatorConfig =
  | PresetEvaluatorConfig
  | CodeEvaluatorConfig
  | LLMEvaluatorConfig
  | CompositeEvaluatorConfig

export type Evaluator = {
  id: string
  name: string
  description: string | null
  type: EvaluatorType
  config: EvaluatorConfig
  isPreset: boolean
  createdById: string | null
  createdAt: Date
  updatedAt: Date
}

export type CreateEvaluatorInput = {
  name: string
  description?: string
  type: EvaluatorType
  config: EvaluatorConfig
}

export type UpdateEvaluatorInput = Partial<CreateEvaluatorInput>

export type EvaluationInput = {
  output: string
  expected?: string
  context?: Record<string, unknown>
}

export type EvaluationOutput = {
  passed: boolean
  score: number | null
  reason: string | null
  details: Record<string, unknown>
  latencyMs: number
}
