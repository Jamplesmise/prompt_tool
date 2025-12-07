import type { ApiResponse } from '@platform/shared'

const API_BASE = '/api/v1'

// 提供商类型
type ProviderType = 'openai' | 'anthropic' | 'azure' | 'custom'

// 模型定价
type ModelPricing = {
  inputPerMillion?: number
  outputPerMillion?: number
  currency?: 'USD' | 'CNY'
}

// 模型信息
type ModelInfo = {
  id: string
  name: string
  modelId: string
  isActive: boolean
  config?: Record<string, unknown>
  pricing?: ModelPricing
}

// 提供商（带模型列表）
type ProviderWithModels = {
  id: string
  name: string
  type: ProviderType
  baseUrl: string
  apiKeyMasked: string
  isActive: boolean
  models: ModelInfo[]
}

// 模型（带提供商信息）
type ModelWithProvider = {
  id: string
  name: string
  modelId: string
  provider: {
    id: string
    name: string
    type: ProviderType
  }
  config: Record<string, unknown>
  isActive: boolean
}

// 模型测试结果
type TestResult = {
  success: boolean
  message: string
  latencyMs: number
  tokenUsage?: {
    input: number
    output: number
  }
  response?: string
}

// 创建提供商参数
type CreateProviderInput = {
  name: string
  type: ProviderType
  baseUrl: string
  apiKey: string
  headers?: Record<string, string>
}

// 更新提供商参数
type UpdateProviderInput = {
  name?: string
  baseUrl?: string
  apiKey?: string
  headers?: Record<string, string>
  isActive?: boolean
}

// 创建模型参数
type CreateModelInput = {
  name: string
  modelId: string
  config?: {
    temperature?: number
    maxTokens?: number
  }
  pricing?: ModelPricing
}

// 更新模型参数
type UpdateModelInput = {
  name?: string
  modelId?: string
  config?: {
    temperature?: number
    maxTokens?: number
  }
  pricing?: ModelPricing
  isActive?: boolean
}

// 列表响应格式
type ListResponse<T> = {
  list: T[]
  total: number
}

// FastGPT 统一模型类型
type UnifiedModelResponse = {
  models: UnifiedModel[]
  stats: {
    total: number
    active: number
    fastgpt: number
    local: number
    byType: Record<string, number>
  }
  fastgptEnabled: boolean
}

type UnifiedModel = {
  id: string
  name: string
  provider: string
  type: 'llm' | 'embedding' | 'tts' | 'stt' | 'rerank'
  isActive: boolean
  isCustom: boolean
  source: 'fastgpt' | 'local'
  inputPrice?: number
  outputPrice?: number
  charsPointsPrice?: number
  maxContext?: number
  maxResponse?: number
  vision?: boolean
  toolChoice?: boolean
  functionCall?: boolean
  reasoning?: boolean
  maxToken?: number
  defaultToken?: number
  voices?: { label: string; value: string }[]
}

export const modelsService = {
  // 提供商 API
  providers: {
    // 获取所有提供商
    async list(): Promise<ApiResponse<ListResponse<ProviderWithModels>>> {
      const response = await fetch(`${API_BASE}/providers`)
      return response.json()
    },

    // 获取单个提供商
    async get(id: string): Promise<ApiResponse<ProviderWithModels>> {
      const response = await fetch(`${API_BASE}/providers/${id}`)
      return response.json()
    },

    // 创建提供商
    async create(data: CreateProviderInput): Promise<ApiResponse<ProviderWithModels>> {
      const response = await fetch(`${API_BASE}/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },

    // 更新提供商
    async update(id: string, data: UpdateProviderInput): Promise<ApiResponse<ProviderWithModels>> {
      const response = await fetch(`${API_BASE}/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },

    // 删除提供商
    async delete(id: string): Promise<ApiResponse<null>> {
      const response = await fetch(`${API_BASE}/providers/${id}`, {
        method: 'DELETE',
      })
      return response.json()
    },

    // 为提供商添加模型
    async addModel(providerId: string, data: CreateModelInput): Promise<ApiResponse<ModelInfo>> {
      const response = await fetch(`${API_BASE}/providers/${providerId}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },

    // 测试提供商连接
    async test(id: string): Promise<ApiResponse<TestResult>> {
      const response = await fetch(`${API_BASE}/providers/${id}/test`, {
        method: 'POST',
      })
      return response.json()
    },
  },

  // 模型 API
  models: {
    // 获取所有模型（扁平列表）
    async list(): Promise<ApiResponse<ListResponse<ModelWithProvider>>> {
      const response = await fetch(`${API_BASE}/models`)
      return response.json()
    },

    // 获取单个模型
    async get(id: string): Promise<ApiResponse<ModelWithProvider>> {
      const response = await fetch(`${API_BASE}/models/${id}`)
      return response.json()
    },

    // 更新模型
    async update(id: string, data: UpdateModelInput): Promise<ApiResponse<ModelInfo>> {
      const response = await fetch(`${API_BASE}/models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      return response.json()
    },

    // 删除模型
    async delete(id: string): Promise<ApiResponse<null>> {
      const response = await fetch(`${API_BASE}/models/${id}`, {
        method: 'DELETE',
      })
      return response.json()
    },

    // 测试模型连接
    async test(id: string): Promise<ApiResponse<TestResult>> {
      const response = await fetch(`${API_BASE}/models/${id}/test`, {
        method: 'POST',
      })
      return response.json()
    },

    // 获取统一模型列表（FastGPT + 本地）
    async listAll(params?: {
      type?: string
      active?: boolean
      source?: 'fastgpt' | 'local'
      refresh?: boolean
    }): Promise<ApiResponse<UnifiedModelResponse>> {
      const searchParams = new URLSearchParams()
      if (params?.type) searchParams.set('type', params.type)
      if (params?.active) searchParams.set('active', 'true')
      if (params?.source) searchParams.set('source', params.source)
      if (params?.refresh) searchParams.set('refresh', 'true')

      const query = searchParams.toString()
      const response = await fetch(`${API_BASE}/models/all${query ? `?${query}` : ''}`)
      return response.json()
    },
  },

  // FastGPT 模型 API
  fastgpt: {
    // 获取 FastGPT 模型列表
    async list(params?: {
      type?: string
      active?: boolean
      refresh?: boolean
    }): Promise<ApiResponse<{ models: UnifiedModel[]; stats: Record<string, number>; enabled: boolean }>> {
      const searchParams = new URLSearchParams()
      if (params?.type) searchParams.set('type', params.type)
      if (params?.active) searchParams.set('active', 'true')
      if (params?.refresh) searchParams.set('refresh', 'true')

      const query = searchParams.toString()
      const response = await fetch(`${API_BASE}/fastgpt/models${query ? `?${query}` : ''}`)
      return response.json()
    },

    // 获取单个模型详情
    async get(model: string): Promise<ApiResponse<UnifiedModel>> {
      const response = await fetch(`${API_BASE}/fastgpt/models/${encodeURIComponent(model)}`)
      return response.json()
    },
  },

  // 同步模型 API
  sync: {
    // 手动触发同步
    async syncFromFastGPT(): Promise<ApiResponse<{ result: SyncResult; stats: SyncStats }>> {
      const response = await fetch(`${API_BASE}/synced-models/sync`, {
        method: 'POST',
      })
      return response.json()
    },

    // 获取同步状态
    async getStatus(): Promise<ApiResponse<{ stats: SyncStats }>> {
      const response = await fetch(`${API_BASE}/synced-models/sync`)
      return response.json()
    },

    // 获取已同步的模型列表
    async list(params?: {
      type?: string
      active?: boolean
    }): Promise<ApiResponse<{ models: SyncedModelInfo[]; stats: SyncStats }>> {
      const searchParams = new URLSearchParams()
      if (params?.type) searchParams.set('type', params.type)
      if (params?.active) searchParams.set('active', 'true')

      const query = searchParams.toString()
      const response = await fetch(`${API_BASE}/synced-models${query ? `?${query}` : ''}`)
      return response.json()
    },
  },
}

// 同步结果
type SyncResult = {
  success: boolean
  synced: number
  providersCreated: number
  providersUpdated: number
  modelsCreated: number
  modelsUpdated: number
  errors: string[]
  syncedAt: string
}

// 同步统计
type SyncStats = {
  total: number
  active: number
  byType: Record<string, number>
  lastSyncedAt: string | null
}

// 已同步的模型
type SyncedModelInfo = {
  id: string
  modelId: string
  name: string
  provider: string
  type: 'llm' | 'embedding' | 'tts' | 'stt' | 'rerank'
  inputPrice: number | null
  outputPrice: number | null
  maxContext: number | null
  maxResponse: number | null
  vision: boolean
  toolChoice: boolean
  functionCall: boolean
  reasoning: boolean
  isActive: boolean
  isCustom: boolean
  syncedAt: string
}

export type {
  ProviderType,
  ModelInfo,
  SyncResult,
  SyncStats,
  SyncedModelInfo,
  ProviderWithModels,
  ModelWithProvider,
  TestResult,
  CreateProviderInput,
  UpdateProviderInput,
  CreateModelInput,
  UpdateModelInput,
  ModelPricing,
  UnifiedModel,
  UnifiedModelResponse,
}
