// 模型调用器 - 封装 LLM API 调用

import { decryptApiKey } from './encryption'
import type { TokenUsage } from '@platform/shared'

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
  const apiKey = decryptApiKey(model.provider.apiKey)
  const providerType = model.provider.type.toLowerCase()

  // 构建请求
  const { url, headers, body } = buildRequest(
    providerType,
    model,
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
  const maxTokens = input.maxTokens ?? modelConfig.maxTokens ?? 2048
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
