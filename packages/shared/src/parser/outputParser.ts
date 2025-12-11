/**
 * 输出解析器模块
 *
 * 支持多种解析模式：
 * - JSON: 直接 JSON.parse
 * - JSON_EXTRACT: 从文本中提取 JSON（支持 markdown code block）
 * - REGEX: 正则表达式提取（Phase 2）
 * - TEMPLATE: 模板匹配（Phase 2）
 */

import type {
  ParseMode,
  OutputFieldDefinition,
  ParseResult,
} from '../types/schema'

// 重新导出 ParseResult 以保持向后兼容
export type { ParseResult }

// 字段校验结果
export type FieldValidationResult = {
  valid: boolean
  errors: Array<{
    fieldKey: string
    fieldName: string
    error: string
  }>
}

/**
 * 输出解析器基类
 */
abstract class OutputParser {
  abstract parse(output: string): ParseResult
}

/**
 * JSON 直接解析器
 */
class JsonParser extends OutputParser {
  parse(output: string): ParseResult {
    try {
      const trimmed = output.trim()
      const data = JSON.parse(trimmed)

      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        return {
          success: false,
          error: '输出必须是 JSON 对象',
          raw: output,
        }
      }

      return {
        success: true,
        data: data as Record<string, unknown>,
        raw: output,
      }
    } catch (e) {
      return {
        success: false,
        error: `JSON 解析失败: ${e instanceof Error ? e.message : String(e)}`,
        raw: output,
      }
    }
  }
}

/**
 * JSON 提取解析器
 * 从文本中提取 JSON，支持：
 * - markdown code block (```json ... ```)
 * - 直接 JSON 对象
 * - 文本中的 JSON 片段
 */
class JsonExtractParser extends OutputParser {
  parse(output: string): ParseResult {
    const trimmed = output.trim()

    // 1. 尝试直接解析
    try {
      const data = JSON.parse(trimmed)
      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        return {
          success: true,
          data: data as Record<string, unknown>,
          raw: output,
        }
      }
    } catch {
      // 继续尝试其他方式
    }

    // 2. 尝试从 markdown code block 提取
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
    if (codeBlockMatch) {
      try {
        const data = JSON.parse(codeBlockMatch[1].trim())
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
          return {
            success: true,
            data: data as Record<string, unknown>,
            raw: output,
          }
        }
      } catch {
        // 继续尝试其他方式
      }
    }

    // 3. 尝试查找第一个 JSON 对象
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0])
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
          return {
            success: true,
            data: data as Record<string, unknown>,
            raw: output,
          }
        }
      } catch {
        // 解析失败
      }
    }

    return {
      success: false,
      error: '无法从输出中提取有效的 JSON 对象',
      raw: output,
    }
  }
}

/**
 * 正则表达式解析器（Phase 2 实现）
 */
class RegexParser extends OutputParser {
  private patterns: Record<string, string>

  constructor(patterns: Record<string, string>) {
    super()
    this.patterns = patterns
  }

  parse(output: string): ParseResult {
    const data: Record<string, unknown> = {}

    for (const [key, pattern] of Object.entries(this.patterns)) {
      try {
        const regex = new RegExp(pattern)
        const match = output.match(regex)
        if (match) {
          data[key] = match[1] || match[0]
        }
      } catch (e) {
        return {
          success: false,
          error: `正则表达式 "${pattern}" 无效: ${e instanceof Error ? e.message : String(e)}`,
          raw: output,
        }
      }
    }

    return {
      success: true,
      data,
      raw: output,
    }
  }
}

/**
 * 模板解析器（Phase 2 实现）
 */
class TemplateParser extends OutputParser {
  parse(output: string): ParseResult {
    // Phase 2 实现
    return {
      success: false,
      error: '模板解析器尚未实现',
      raw: output,
    }
  }
}

/**
 * 创建解析器工厂函数
 */
export function createOutputParser(
  mode: ParseMode,
  config?: Record<string, unknown>
): OutputParser {
  switch (mode) {
    case 'JSON':
      return new JsonParser()
    case 'JSON_EXTRACT':
      return new JsonExtractParser()
    case 'REGEX':
      return new RegexParser((config?.patterns as Record<string, string>) || {})
    case 'TEMPLATE':
      return new TemplateParser()
    default:
      return new JsonExtractParser() // 默认使用 JSON_EXTRACT
  }
}

/**
 * 验证解析后的数据是否符合字段定义
 */
export function validateParsedData(
  data: Record<string, unknown>,
  fields: OutputFieldDefinition[]
): FieldValidationResult {
  const errors: FieldValidationResult['errors'] = []

  for (const field of fields) {
    const value = data[field.key]

    // 必填检查
    if (field.required && (value === undefined || value === null)) {
      errors.push({
        fieldKey: field.key,
        fieldName: field.name,
        error: '字段缺失',
      })
      continue
    }

    // 如果字段不存在且非必填，跳过
    if (value === undefined || value === null) {
      continue
    }

    // 类型检查
    const typeError = validateFieldType(value, field)
    if (typeError) {
      errors.push({
        fieldKey: field.key,
        fieldName: field.name,
        error: typeError,
      })
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 验证字段类型
 */
function validateFieldType(
  value: unknown,
  field: OutputFieldDefinition
): string | null {
  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') {
        return `期望字符串，实际为 ${typeof value}`
      }
      break

    case 'number':
      if (typeof value !== 'number') {
        return `期望数字，实际为 ${typeof value}`
      }
      break

    case 'boolean':
      if (typeof value !== 'boolean') {
        return `期望布尔值，实际为 ${typeof value}`
      }
      break

    case 'enum':
      if (typeof value !== 'string') {
        return `期望字符串，实际为 ${typeof value}`
      }
      if (field.enumValues && !field.enumValues.includes(value)) {
        return `值 "${value}" 不在枚举范围内: [${field.enumValues.join(', ')}]`
      }
      break

    case 'array':
      if (!Array.isArray(value)) {
        return `期望数组，实际为 ${typeof value}`
      }
      // 可选：验证数组元素类型
      if (field.itemType) {
        for (let i = 0; i < value.length; i++) {
          const itemError = validateItemType(value[i], field.itemType, i)
          if (itemError) {
            return itemError
          }
        }
      }
      break

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `期望对象，实际为 ${Array.isArray(value) ? 'array' : typeof value}`
      }
      break
  }

  return null
}

/**
 * 验证数组元素类型
 */
function validateItemType(
  item: unknown,
  itemType: string,
  index: number
): string | null {
  switch (itemType) {
    case 'string':
      if (typeof item !== 'string') {
        return `数组第 ${index + 1} 项期望字符串，实际为 ${typeof item}`
      }
      break
    case 'number':
      if (typeof item !== 'number') {
        return `数组第 ${index + 1} 项期望数字，实际为 ${typeof item}`
      }
      break
    case 'boolean':
      if (typeof item !== 'boolean') {
        return `数组第 ${index + 1} 项期望布尔值，实际为 ${typeof item}`
      }
      break
    case 'object':
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        return `数组第 ${index + 1} 项期望对象，实际为 ${typeof item}`
      }
      break
  }
  return null
}

/**
 * 便捷函数：解析并验证
 */
export function parseAndValidate(
  output: string,
  mode: ParseMode,
  fields: OutputFieldDefinition[],
  parseConfig?: Record<string, unknown>
): {
  parseResult: ParseResult
  validationResult?: FieldValidationResult
} {
  const parser = createOutputParser(mode, parseConfig)
  const parseResult = parser.parse(output)

  if (!parseResult.success || !parseResult.data) {
    return { parseResult }
  }

  const validationResult = validateParsedData(parseResult.data, fields)

  return {
    parseResult,
    validationResult,
  }
}
