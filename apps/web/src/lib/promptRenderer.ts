// 提示词渲染器 - 用于任务执行时渲染提示词模板

import { renderTemplate } from './template'

export type RenderedPrompt = {
  content: string
  variables: Record<string, unknown>
}

/**
 * 渲染提示词，将模板变量替换为数据集行中的值
 */
export function renderPrompt(
  template: string,
  datasetRowData: Record<string, unknown>,
  expectedField?: string
): RenderedPrompt {
  const content = renderTemplate(template, datasetRowData)
  return {
    content,
    variables: datasetRowData,
  }
}

/**
 * 从数据集行数据中提取期望输出
 */
export function extractExpectedOutput(
  data: Record<string, unknown>,
  expectedField?: string
): string | null {
  // 默认使用 'expected' 字段
  const field = expectedField || 'expected'
  const value = data[field]

  if (value === undefined || value === null) {
    return null
  }

  return String(value)
}

/**
 * 构建模型调用的消息格式
 */
export function buildMessages(
  prompt: string,
  systemPrompt?: string
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = []

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }

  messages.push({ role: 'user', content: prompt })

  return messages
}
