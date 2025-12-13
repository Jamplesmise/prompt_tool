// 模型调用器 - 封装 LLM API 调用

import { decryptApiKey, isEncrypted } from './encryption'
import type { TokenUsage } from '@platform/shared'

// OneHub 配置（用于 FastGPT 模型）
const ONEHUB_BASE_URL = process.env.OPENAI_BASE_URL || ''
const ONEHUB_API_KEY = process.env.CHAT_API_KEY || ''

export type ModelConfig = {
  id: string
  modelId: string
  provider: {
    type: string
    baseUrl: string
    apiKey: string
    headers: Record<string, string>
  }
  config: Record<string, unknown>
  pricing?: {
    inputPerMillion?: number
    outputPerMillion?: number
    currency?: 'USD' | 'CNY'
  }
  // FastGPT 模型标识
  source?: 'local' | 'fastgpt'
}

export type InvokeModelInput = {
  messages: Array<{ role: string; content: string }>
  maxTokens?: number
  temperature?: number
  topP?: number
}

export type InvokeModelResult = {
  output: string
  tokens: TokenUsage
  latencyMs: number
  cost: number | null
  costCurrency: string
  rawResponse?: unknown
}

/**
 * 调用模型
 */
export async function invokeModel(
  model: ModelConfig,
  input: InvokeModelInput
): Promise<InvokeModelResult> {
  const startTime = Date.now()

  // FastGPT 模型通过 OneHub 调用
  if (model.source === 'fastgpt') {
    return invokeFastGPTModel(model, input, startTime)
  }

  // 解密 API Key
  let apiKey: string
  const rawApiKey = model.provider.apiKey

  if (!rawApiKey) {
    // 尝试使用环境变量中的备用 API Key
    const fallbackKey = process.env.CHAT_API_KEY
    if (fallbackKey) {
      console.log('[ModelInvoker] Using fallback CHAT_API_KEY from environment')
      apiKey = fallbackKey
    } else {
      throw new ModelInvokeError('API Key not configured for this provider', 400)
    }
  } else if (isEncrypted(rawApiKey)) {
    // 检查是否已加密
    try {
      apiKey = decryptApiKey(rawApiKey)
    } catch (decryptError) {
      console.error('Failed to decrypt API key:', decryptError)
      // 尝试使用环境变量中的备用 API Key
      const fallbackKey = process.env.CHAT_API_KEY
      if (fallbackKey) {
        console.log('[ModelInvoker] Decrypt failed, using fallback CHAT_API_KEY from environment')
        apiKey = fallbackKey
      } else {
        throw new ModelInvokeError(
          'Failed to decrypt API key. Please check ENCRYPTION_KEY environment variable or re-configure the provider.',
          500
        )
      }
    }
  } else {
    // 如果未加密，直接使用（向后兼容）
    apiKey = rawApiKey
  }

  const providerType = model.provider.type.toLowerCase()

  // 如果使用了 fallback API Key，同时检查是否需要使用 fallback baseUrl
  let baseUrl = model.provider.baseUrl
  if (!baseUrl && process.env.OPENAI_BASE_URL) {
    console.log('[ModelInvoker] Using fallback OPENAI_BASE_URL from environment')
    baseUrl = process.env.OPENAI_BASE_URL
  }

  // 更新 model 的 baseUrl（临时）
  const effectiveModel = {
    ...model,
    provider: {
      ...model.provider,
      baseUrl: baseUrl || model.provider.baseUrl,
    },
  }

  // 构建请求
  const { url, headers, body } = buildRequest(
    providerType,
    effectiveModel,
    apiKey,
    input
  )

  // 发送请求
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const latencyMs = Date.now() - startTime

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage =
      errorData.error?.message ||
      errorData.message ||
      `HTTP ${response.status}: ${response.statusText}`
    throw new ModelInvokeError(errorMessage, response.status)
  }

  const data = await response.json()

  // 解析响应
  const result = parseResponse(providerType, data)

  // 计算费用
  const cost = calculateCost(result.tokens, model.pricing)
  const costCurrency = model.pricing?.currency ?? 'USD'

  return {
    output: result.output,
    tokens: result.tokens,
    latencyMs,
    cost,
    costCurrency,
    rawResponse: data,
  }
}

/**
 * 构建请求
 */
function buildRequest(
  providerType: string,
  model: ModelConfig,
  apiKey: string,
  input: InvokeModelInput
): { url: string; headers: Record<string, string>; body: Record<string, unknown> } {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  let url: string
  let body: Record<string, unknown>

  const modelConfig = model.config as Record<string, unknown>
  // 优先使用 maxOutputTokens，向后兼容 maxTokens
  const maxTokens = input.maxTokens ?? modelConfig.maxOutputTokens ?? modelConfig.maxTokens ?? 2048
  const temperature = input.temperature ?? modelConfig.temperature ?? 0.7

  if (providerType === 'anthropic') {
    url = `${model.provider.baseUrl}/messages`
    headers['x-api-key'] = apiKey
    headers['anthropic-version'] = '2023-06-01'
    body = {
      model: model.modelId,
      messages: input.messages.filter((m) => m.role !== 'system'),
      max_tokens: maxTokens,
      temperature,
      ...(input.messages.find((m) => m.role === 'system')
        ? { system: input.messages.find((m) => m.role === 'system')!.content }
        : {}),
    }
  } else {
    // OpenAI、Azure 和自定义提供商使用 OpenAI 兼容格式
    url = `${model.provider.baseUrl}/chat/completions`
    headers['Authorization'] = `Bearer ${apiKey}`
    body = {
      model: model.modelId,
      messages: input.messages,
      max_tokens: maxTokens,
      temperature,
      ...(input.topP !== undefined ? { top_p: input.topP } : {}),
    }
  }

  // 添加自定义请求头
  if (model.provider.headers && typeof model.provider.headers === 'object') {
    Object.assign(headers, model.provider.headers)
  }

  return { url, headers, body }
}

/**
 * 解析响应
 */
function parseResponse(
  providerType: string,
  data: Record<string, unknown>
): { output: string; tokens: TokenUsage } {
  let output: string
  let tokens: TokenUsage

  if (providerType === 'anthropic') {
    // Anthropic 响应格式
    const content = data.content as Array<{ type: string; text: string }>
    output = content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('')

    const usage = data.usage as { input_tokens: number; output_tokens: number }
    tokens = {
      input: usage?.input_tokens ?? 0,
      output: usage?.output_tokens ?? 0,
      total: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
    }
  } else {
    // OpenAI 兼容格式
    const choices = data.choices as Array<{
      message: { content: string }
    }>
    output = choices?.[0]?.message?.content ?? ''

    const usage = data.usage as {
      prompt_tokens: number
      completion_tokens: number
      total_tokens: number
    }
    tokens = {
      input: usage?.prompt_tokens ?? 0,
      output: usage?.completion_tokens ?? 0,
      total: usage?.total_tokens ?? 0,
    }
  }

  return { output, tokens }
}

/**
 * 计算费用
 */
function calculateCost(
  tokens: TokenUsage,
  pricing?: { inputPerMillion?: number; outputPerMillion?: number }
): number | null {
  if (!pricing || (!pricing.inputPerMillion && !pricing.outputPerMillion)) {
    return null
  }

  const inputCost = (tokens.input / 1000000) * (pricing.inputPerMillion ?? 0)
  const outputCost = (tokens.output / 1000000) * (pricing.outputPerMillion ?? 0)

  return inputCost + outputCost
}

/**
 * 通过 OneHub 调用 FastGPT 模型
 */
async function invokeFastGPTModel(
  model: ModelConfig,
  input: InvokeModelInput,
  startTime: number
): Promise<InvokeModelResult> {
  if (!ONEHUB_BASE_URL || !ONEHUB_API_KEY) {
    throw new ModelInvokeError(
      'OneHub not configured. Please set OPENAI_BASE_URL and CHAT_API_KEY environment variables.',
      500
    )
  }

  const url = `${ONEHUB_BASE_URL}/chat/completions`
  const modelConfig = model.config as Record<string, unknown>
  // 优先使用 maxOutputTokens，向后兼容 maxTokens
  const maxTokens = input.maxTokens ?? modelConfig.maxOutputTokens ?? modelConfig.maxTokens ?? 2048
  const temperature = input.temperature ?? modelConfig.temperature ?? 0.7

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ONEHUB_API_KEY}`,
  }

  const body = {
    model: model.modelId,
    messages: input.messages,
    max_tokens: maxTokens,
    temperature,
    ...(input.topP !== undefined ? { top_p: input.topP } : {}),
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  const latencyMs = Date.now() - startTime

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage =
      errorData.error?.message ||
      errorData.message ||
      `HTTP ${response.status}: ${response.statusText}`
    throw new ModelInvokeError(errorMessage, response.status)
  }

  const data = await response.json()

  // 解析 OpenAI 兼容格式响应
  const result = parseResponse('openai', data)

  // 计算费用（使用 FastGPT 的定价）
  const cost = calculateFastGPTCost(result.tokens, model)

  return {
    output: result.output,
    tokens: result.tokens,
    latencyMs,
    cost,
    costCurrency: 'CNY',
    rawResponse: data,
  }
}

/**
 * 计算 FastGPT 模型费用
 */
function calculateFastGPTCost(
  tokens: TokenUsage,
  model: ModelConfig
): number | null {
  const pricing = model.pricing
  if (!pricing) return null

  // FastGPT 定价是每 1K tokens
  const inputPrice = pricing.inputPerMillion ? pricing.inputPerMillion / 1000 : 0
  const outputPrice = pricing.outputPerMillion ? pricing.outputPerMillion / 1000 : 0

  if (!inputPrice && !outputPrice) return null

  const inputCost = (tokens.input / 1000) * inputPrice
  const outputCost = (tokens.output / 1000) * outputPrice

  return inputCost + outputCost
}

/**
 * 模型调用错误
 */
export class ModelInvokeError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = 'ModelInvokeError'
  }
}
