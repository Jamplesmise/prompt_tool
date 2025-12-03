// 提示词模板变量提取和渲染工具

import type { PromptVariable } from '@platform/shared'

/**
 * 从提示词内容中提取变量名
 * 支持 {{变量名}} 格式，变量名只能包含字母、数字和下划线
 */
export function extractVariableNames(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const matches = [...content.matchAll(regex)]
  return [...new Set(matches.map((m) => m[1]))]
}

/**
 * 从提示词内容中提取变量对象
 * 自动推断变量类型（默认为 string）
 */
export function extractVariables(content: string): PromptVariable[] {
  const names = extractVariableNames(content)
  return names.map((name) => ({
    name,
    type: 'string' as const,
    required: true,
  }))
}

/**
 * 合并已有变量定义和新提取的变量
 * 保留已有变量的类型和默认值配置，添加新变量，移除不再使用的变量
 */
export function mergeVariables(
  existingVariables: PromptVariable[],
  newVariableNames: string[]
): PromptVariable[] {
  const existingMap = new Map(existingVariables.map((v) => [v.name, v]))
  const newSet = new Set(newVariableNames)

  // 保留仍在使用的变量（保持原有配置）
  const result: PromptVariable[] = []
  for (const name of newVariableNames) {
    const existing = existingMap.get(name)
    if (existing) {
      result.push(existing)
    } else {
      result.push({
        name,
        type: 'string',
        required: true,
      })
    }
  }

  return result
}

/**
 * 渲染提示词模板
 * 将 {{变量名}} 替换为实际值
 */
export function renderTemplate(
  content: string,
  variables: Record<string, unknown>
): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, name) => {
    const value = variables[name]
    if (value === undefined || value === null) {
      return match // 保留未提供的变量占位符
    }
    return String(value)
  })
}

/**
 * 验证变量值是否符合类型定义
 */
export function validateVariables(
  definitions: PromptVariable[],
  values: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const def of definitions) {
    const value = values[def.name]

    // 检查必填
    if (def.required && (value === undefined || value === null || value === '')) {
      errors.push(`变量 "${def.name}" 是必填项`)
      continue
    }

    // 如果值为空且非必填，跳过类型检查
    if (value === undefined || value === null || value === '') {
      continue
    }

    // 类型检查
    switch (def.type) {
      case 'number':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          errors.push(`变量 "${def.name}" 应为数字类型`)
        }
        break
      case 'boolean':
        if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
          errors.push(`变量 "${def.name}" 应为布尔类型`)
        }
        break
      case 'json':
        if (typeof value === 'string') {
          try {
            JSON.parse(value)
          } catch {
            errors.push(`变量 "${def.name}" 应为有效的 JSON 格式`)
          }
        }
        break
      // string 类型不需要特殊验证
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 获取变量的默认值映射
 */
export function getDefaultValues(
  definitions: PromptVariable[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const def of definitions) {
    if (def.defaultValue !== undefined) {
      result[def.name] = def.defaultValue
    }
  }
  return result
}

/**
 * 高亮显示模板中的变量（用于编辑器）
 * 返回带有标记的内容，可用于语法高亮
 */
export function getVariableRanges(
  content: string
): Array<{ start: number; end: number; name: string }> {
  const regex = /\{\{(\w+)\}\}/g
  const ranges: Array<{ start: number; end: number; name: string }> = []
  let match

  while ((match = regex.exec(content)) !== null) {
    ranges.push({
      start: match.index,
      end: match.index + match[0].length,
      name: match[1],
    })
  }

  return ranges
}

/**
 * 保留变量名，用于数据集映射
 */
export const RESERVED_VARIABLES = {
  INPUT: 'input',
  EXPECTED: 'expected',
} as const

/**
 * 检查是否为保留变量
 */
export function isReservedVariable(name: string): boolean {
  return Object.values(RESERVED_VARIABLES).includes(name as 'input' | 'expected')
}
