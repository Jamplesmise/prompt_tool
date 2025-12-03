// JSON Schema 校验评估器
import Ajv from 'ajv'
import type { EvaluatorInput, EvaluatorOutput, JsonSchemaParams } from '../types'

const ajv = new Ajv({ allErrors: true })

/**
 * JSON Schema 校验评估器
 * 规则：输出解析为 JSON 后符合 Schema
 * 使用场景：结构化输出验证
 */
export function jsonSchema(
  input: EvaluatorInput,
  params?: JsonSchemaParams
): EvaluatorOutput {
  const { output } = input

  if (!params?.schema) {
    return {
      passed: false,
      score: 0,
      reason: '缺少 JSON Schema 参数',
    }
  }

  // 尝试解析 JSON
  let data: unknown
  try {
    data = JSON.parse(output)
  } catch (error) {
    return {
      passed: false,
      score: 0,
      reason: '输出不是有效的 JSON',
      details: {
        parseError:
          error instanceof Error ? error.message : '解析失败',
      },
    }
  }

  // 校验 Schema
  try {
    const validate = ajv.compile(params.schema)
    const valid = validate(data)

    if (valid) {
      return {
        passed: true,
        score: 1,
        reason: '输出符合 JSON Schema',
      }
    }

    const errors = validate.errors?.map((err) => ({
      path: err.instancePath || '/',
      message: err.message || '校验失败',
      keyword: err.keyword,
    }))

    return {
      passed: false,
      score: 0,
      reason: `输出不符合 JSON Schema: ${validate.errors?.map((e) => e.message).join('; ')}`,
      details: { errors },
    }
  } catch (error) {
    return {
      passed: false,
      score: 0,
      reason: `Schema 编译失败: ${error instanceof Error ? error.message : '未知错误'}`,
    }
  }
}
