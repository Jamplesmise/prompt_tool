'use client'

import { useMutation } from '@tanstack/react-query'
import { appMessage } from '@/lib/message'
import type { TemplateColumn, AISchemaOutput } from '@platform/shared'

// 对话消息类型
type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

// API 响应类型
type GenerateSchemaResponse = {
  code: number
  message: string
  data: {
    aiRawOutput: AISchemaOutput
    inputSchema: {
      name: string
      description?: string
      variables: unknown[]
    }
    outputSchema: {
      name: string
      description?: string
      fields: unknown[]
      parseMode: string
      parseConfig: Record<string, unknown>
      aggregation: {
        mode: string
        passThreshold?: number
      }
    }
    templateColumns: TemplateColumn[]
    tokens?: {
      input: number
      output: number
      total: number
    }
    latencyMs?: number
    evaluationSchemaId?: string
    inputSchemaId?: string
    outputSchemaId?: string
  }
}

// 生成参数
type GenerateSchemaParams = {
  modelId: string
  sceneName: string
  description: string
  save?: boolean
  teamId?: string
}

// 追问参数
type FollowUpSchemaParams = {
  modelId: string
  sceneName: string
  followUp: string
  currentSchema: AISchemaOutput
  conversationHistory?: ConversationMessage[]
  teamId?: string
}

// 生成 Schema
async function generateSchema(params: GenerateSchemaParams): Promise<GenerateSchemaResponse['data']> {
  const response = await fetch('/api/v1/schemas/ai-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const data: GenerateSchemaResponse = await response.json()

  if (data.code !== 200) {
    throw new Error(data.message || '生成失败')
  }

  return data.data
}

// Hook: 生成 Schema
export function useGenerateSchema() {
  return useMutation({
    mutationFn: generateSchema,
    onError: (error: Error) => {
      appMessage.error(error.message || '生成失败')
    },
  })
}

// Hook: 生成并保存 Schema
export function useGenerateAndSaveSchema() {
  return useMutation({
    mutationFn: (params: Omit<GenerateSchemaParams, 'save'>) =>
      generateSchema({ ...params, save: true }),
    onSuccess: () => {
      appMessage.success('Schema 已保存')
    },
    onError: (error: Error) => {
      appMessage.error(error.message || '保存失败')
    },
  })
}

// 追问修改 Schema
async function followUpSchema(params: FollowUpSchemaParams): Promise<GenerateSchemaResponse['data']> {
  const response = await fetch('/api/v1/schemas/ai-followup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const data: GenerateSchemaResponse = await response.json()

  if (data.code !== 200) {
    throw new Error(data.message || '追问处理失败')
  }

  return data.data
}

// Hook: 追问修改 Schema
export function useFollowUpSchema() {
  return useMutation({
    mutationFn: followUpSchema,
    onError: (error: Error) => {
      appMessage.error(error.message || '追问处理失败')
    },
  })
}

export type { GenerateSchemaParams, GenerateSchemaResponse, FollowUpSchemaParams, ConversationMessage }
