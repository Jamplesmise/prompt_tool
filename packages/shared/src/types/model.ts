// 模型配置相关类型

export type ProviderType = 'OPENAI' | 'ANTHROPIC' | 'AZURE' | 'CUSTOM'

export type Provider = {
  id: string
  name: string
  type: ProviderType
  baseUrl: string
  apiKey: string
  headers: Record<string, string>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type ModelConfig = {
  temperature?: number
  maxInputTokens?: number   // 最大输入上下文长度
  maxOutputTokens?: number  // 最大输出 token 数
  maxTokens?: number        // @deprecated 向后兼容，等同于 maxOutputTokens
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stop?: string[]
}

export type ModelPricing = {
  inputPrice: number
  outputPrice: number
  unit: 'per_1k_tokens' | 'per_1m_tokens'
}

export type Model = {
  id: string
  providerId: string
  name: string
  modelId: string
  config: ModelConfig
  pricing: ModelPricing
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type CreateProviderInput = {
  name: string
  type: ProviderType
  baseUrl: string
  apiKey: string
  headers?: Record<string, string>
}

export type UpdateProviderInput = Partial<CreateProviderInput>

export type CreateModelInput = {
  providerId: string
  name: string
  modelId: string
  config?: ModelConfig
  pricing?: ModelPricing
}

export type UpdateModelInput = Partial<Omit<CreateModelInput, 'providerId'>>

export type ProviderWithModels = Provider & {
  models: Model[]
}
