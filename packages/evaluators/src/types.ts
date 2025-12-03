// 评估器核心类型定义

export type EvaluatorInput = {
  input: string
  output: string
  expected: string | null
  metadata: Record<string, unknown>
}

export type EvaluatorOutput = {
  passed: boolean
  score?: number
  reason?: string
  details?: Record<string, unknown>
}

export type PresetType =
  | 'exact_match'
  | 'contains'
  | 'regex'
  | 'json_schema'
  | 'similarity'

export type SimilarityAlgorithm = 'levenshtein' | 'cosine' | 'jaccard'

export type RegexParams = {
  pattern: string
  flags?: string
}

export type JsonSchemaParams = {
  schema: Record<string, unknown>
}

export type SimilarityParams = {
  threshold: number
  algorithm?: SimilarityAlgorithm
}

export type PresetParams = RegexParams | JsonSchemaParams | SimilarityParams | Record<string, never>

export type PresetEvaluatorFn = (
  input: EvaluatorInput,
  params?: PresetParams
) => EvaluatorOutput

export type PresetEvaluatorDefinition = {
  id: string
  name: string
  description: string
  type: 'PRESET'
  presetType: PresetType
  defaultParams?: PresetParams
}

// LLM 评估器类型
export type LLMEvaluatorConfig = {
  modelId: string
  prompt?: string
  scoreRange?: {
    min: number
    max: number
  }
  passThreshold?: number
}

// 组合评估器类型
export type CompositeEvaluatorConfig = {
  evaluatorIds: string[]
  mode: 'parallel' | 'serial'
  aggregation: 'and' | 'or' | 'weighted_average'
  weights?: number[]
}
