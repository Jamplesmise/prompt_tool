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

export const modelsService = {
  // 提供商 API
  providers: {
    // 获取所有提供商
    async list(): Promise<ApiResponse<ProviderWithModels[]>> {
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
    async list(): Promise<ApiResponse<ModelWithProvider[]>> {
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
  },
}

export type {
  ProviderType,
  ModelInfo,
  ProviderWithModels,
  ModelWithProvider,
  TestResult,
  CreateProviderInput,
  UpdateProviderInput,
  CreateModelInput,
  UpdateModelInput,
  ModelPricing,
}
