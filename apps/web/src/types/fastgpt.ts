/**
 * FastGPT 模型类型定义
 * 基于 FastGPT packages/global/core/ai/model.d.ts
 */

export enum ModelTypeEnum {
  llm = 'llm',
  embedding = 'embedding',
  tts = 'tts',
  stt = 'stt',
  rerank = 'rerank',
}

export type ModelType = keyof typeof ModelTypeEnum

export type PriceType = {
  charsPointsPrice?: number // 1k chars=n points; 60s=n points
  inputPrice?: number // 1k tokens=n points
  outputPrice?: number // 1k tokens=n points
}

export type BaseModelItemType = {
  provider: string
  model: string
  name: string
  avatar?: string

  isActive?: boolean
  isCustom?: boolean
  isDefault?: boolean
  isDefaultDatasetTextModel?: boolean
  isDefaultDatasetImageModel?: boolean

  requestUrl?: string
  requestAuth?: string
}

export type LLMModelItemType = PriceType &
  BaseModelItemType & {
    type: ModelTypeEnum.llm
    maxContext: number
    maxResponse: number
    quoteMaxToken: number
    maxTemperature?: number

    showTopP?: boolean
    responseFormatList?: string[]
    showStopSign?: boolean

    censor?: boolean
    vision?: boolean
    reasoning?: boolean

    datasetProcess?: boolean
    usedInClassify?: boolean
    usedInExtractFields?: boolean
    usedInToolCall?: boolean
    useInEvaluation?: boolean

    functionCall: boolean
    toolChoice: boolean

    defaultSystemChatPrompt?: string
    defaultConfig?: Record<string, unknown>
    fieldMap?: Record<string, string>
  }

export type EmbeddingModelItemType = PriceType &
  BaseModelItemType & {
    type: ModelTypeEnum.embedding
    defaultToken: number
    maxToken: number
    weight: number
    hidden?: boolean
    normalization?: boolean
    batchSize?: number
    defaultConfig?: Record<string, unknown>
    dbConfig?: Record<string, unknown>
    queryConfig?: Record<string, unknown>
  }

export type RerankModelItemType = PriceType &
  BaseModelItemType & {
    type: ModelTypeEnum.rerank
  }

export type TTSModelType = PriceType &
  BaseModelItemType & {
    type: ModelTypeEnum.tts
    voices: { label: string; value: string }[]
  }

export type STTModelType = PriceType &
  BaseModelItemType & {
    type: ModelTypeEnum.stt
  }

// 联合类型：所有模型类型
export type SystemModelItemType =
  | LLMModelItemType
  | EmbeddingModelItemType
  | RerankModelItemType
  | TTSModelType
  | STTModelType

// MongoDB 文档结构
export type SystemModelSchemaType = {
  model: string // unique key
  metadata: SystemModelItemType
}

// 统一的模型展示类型（用于前端）
export type UnifiedModelType = {
  id: string // model identifier
  name: string
  provider: string
  type: ModelTypeEnum
  isActive: boolean
  isCustom: boolean
  source: 'fastgpt' | 'local' // 数据来源

  // 定价
  inputPrice?: number
  outputPrice?: number
  charsPointsPrice?: number

  // LLM 特有
  maxContext?: number
  maxResponse?: number
  vision?: boolean
  toolChoice?: boolean
  functionCall?: boolean
  reasoning?: boolean

  // Embedding 特有
  maxToken?: number
  defaultToken?: number

  // TTS 特有
  voices?: { label: string; value: string }[]

  // 原始数据
  raw?: SystemModelItemType
}

// 模型类型标签配置
export const MODEL_TYPE_CONFIG: Record<
  ModelTypeEnum,
  { label: string; color: string }
> = {
  [ModelTypeEnum.llm]: { label: 'LLM', color: 'blue' },
  [ModelTypeEnum.embedding]: { label: 'Embedding', color: 'gold' },
  [ModelTypeEnum.tts]: { label: 'TTS', color: 'green' },
  [ModelTypeEnum.stt]: { label: 'STT', color: 'purple' },
  [ModelTypeEnum.rerank]: { label: 'Rerank', color: 'cyan' },
}
