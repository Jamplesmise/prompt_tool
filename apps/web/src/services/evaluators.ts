import type { ApiResponse } from '@platform/shared'

const API_BASE = '/api/v1'

// 评估器类型
type EvaluatorType = 'preset' | 'code' | 'llm' | 'composite'

// 预置评估器类型
type PresetType = 'exact_match' | 'contains' | 'regex' | 'json_schema' | 'similarity'

// 评估器列表项
type EvaluatorListItem = {
  id: string
  name: string
  description: string | null
  type: EvaluatorType
  isPreset: boolean
  createdAt: string
  updatedAt: string
}

// 评估器详情
type EvaluatorDetail = EvaluatorListItem & {
  config: CodeEvaluatorConfig | PresetEvaluatorConfig | LLMEvaluatorConfig | CompositeEvaluatorConfig
}

// 代码评估器配置
type CodeEvaluatorConfig = {
  language: 'nodejs' | 'python'
  code: string
  timeout?: number
}

// 预置评估器配置
type PresetEvaluatorConfig = {
  presetType: PresetType
  params?: Record<string, unknown>
}

// LLM 评估器配置
type LLMEvaluatorConfig = {
  modelId: string
  prompt: string
  scoreRange?: { min: number; max: number }
  passThreshold?: number
}

// 组合评估器配置
type CompositeEvaluatorConfig = {
  evaluatorIds: string[]
  mode: 'parallel' | 'serial'
  aggregation: 'and' | 'or' | 'weighted_average'
  weights?: number[]
}

// 预置评估器定义
type PresetEvaluator = {
  id: string
  name: string
  description: string
  type: 'preset'
  config: PresetEvaluatorConfig
}

// 创建评估器参数
type CreateEvaluatorInput = {
  name: string
  description?: string
  type: EvaluatorType
  config: CodeEvaluatorConfig | PresetEvaluatorConfig | LLMEvaluatorConfig | CompositeEvaluatorConfig
}

// 更新评估器参数
type UpdateEvaluatorInput = {
  name?: string
  description?: string
  config?: Partial<CodeEvaluatorConfig> | PresetEvaluatorConfig | LLMEvaluatorConfig | CompositeEvaluatorConfig
}

// 测试评估器参数
type TestEvaluatorInput = {
  input: string
  output: string
  expected?: string
  metadata?: Record<string, unknown>
}

// 测试评估器结果
type TestEvaluatorResult = {
  passed: boolean
  score: number | null
  reason: string | null
  latencyMs: number
  error: string | null
  details?: Record<string, unknown>
}

// 列表响应格式
type ListResponse<T> = {
  list: T[]
  total: number
}

export const evaluatorsService = {
  // 获取评估器列表
  async list(type?: EvaluatorType): Promise<ApiResponse<ListResponse<EvaluatorListItem>>> {
    const params = type ? `?type=${type}` : ''
    const response = await fetch(`${API_BASE}/evaluators${params}`)
    return response.json()
  },

  // 获取预置评估器列表
  async getPresets(): Promise<ApiResponse<PresetEvaluator[]>> {
    const response = await fetch(`${API_BASE}/evaluators/presets`)
    return response.json()
  },

  // 获取评估器详情
  async get(id: string): Promise<ApiResponse<EvaluatorDetail>> {
    const response = await fetch(`${API_BASE}/evaluators/${id}`)
    return response.json()
  },

  // 创建评估器
  async create(data: CreateEvaluatorInput): Promise<ApiResponse<EvaluatorDetail>> {
    const response = await fetch(`${API_BASE}/evaluators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 更新评估器
  async update(id: string, data: UpdateEvaluatorInput): Promise<ApiResponse<EvaluatorDetail>> {
    const response = await fetch(`${API_BASE}/evaluators/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  // 删除评估器
  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    const response = await fetch(`${API_BASE}/evaluators/${id}`, {
      method: 'DELETE',
    })
    return response.json()
  },

  // 测试评估器
  async test(id: string, data: TestEvaluatorInput): Promise<ApiResponse<TestEvaluatorResult>> {
    const response = await fetch(`${API_BASE}/evaluators/${id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.json()
  },
}

export type {
  EvaluatorType,
  PresetType,
  EvaluatorListItem,
  EvaluatorDetail,
  CodeEvaluatorConfig,
  PresetEvaluatorConfig,
  LLMEvaluatorConfig,
  CompositeEvaluatorConfig,
  PresetEvaluator,
  CreateEvaluatorInput,
  UpdateEvaluatorInput,
  TestEvaluatorInput,
  TestEvaluatorResult,
}
