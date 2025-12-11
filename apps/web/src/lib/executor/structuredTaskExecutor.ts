/**
 * 结构化任务执行器
 *
 * 当提示词关联了 OutputSchema 时，使用此执行器：
 * 1. 根据 InputSchema 构建变量
 * 2. 使用模板引擎渲染提示词
 * 3. 调用模型获取输出
 * 4. 使用 OutputParser 解析输出
 * 5. 使用 FieldEvaluationEngine 进行字段级评估
 * 6. 使用 AggregationEngine 计算聚合结果
 * 7. 保存 TaskResult 和 FieldEvaluationResult
 */

import { Prisma } from '@prisma/client'
import { prisma } from '../prisma'
import {
  render as renderTemplate,
  parseAndValidate,
  evaluateFields,
  aggregateFieldResults,
} from '@platform/shared'
import type {
  InputVariableDefinition,
  OutputFieldDefinition,
  AggregationConfig,
  ParseMode,
} from '@platform/shared'
import type { FieldEvaluationResultData } from '@platform/shared'
import { buildMessages } from '../promptRenderer'
import { invokeModel } from '../modelInvoker'
import type { ModelConfig } from '../modelInvoker'
import { executeWithRetry, executeWithTimeout, TimeoutError } from '../concurrencyLimiter'
import { ModelInvokeError } from '../modelInvoker'
import { executeInSandbox } from '../sandbox'
import { runEvaluator } from '@platform/evaluators'
import type { EvaluatorConfig, EvaluatorInput, EvaluatorOutput } from '@platform/evaluators'

// 结构化执行配置
export type StructuredExecutionConfig = {
  concurrency: number
  timeout: number
  retryCount: number
}

// 结构化提示词数据
export type StructuredPromptData = {
  promptId: string
  promptVersionId: string
  promptContent: string
  inputSchema: {
    id: string
    variables: InputVariableDefinition[]
  } | null
  outputSchema: {
    id: string
    fields: OutputFieldDefinition[]
    parseMode: ParseMode
    parseConfig: Record<string, unknown>
    aggregation: AggregationConfig
  } | null
}

// 执行项
export type StructuredExecutionItem = {
  prompt: StructuredPromptData
  model: ModelConfig
  datasetRowId: string
  rowIndex: number
  rowData: Record<string, unknown>
}

// 执行结果
export type StructuredExecutionResult = {
  success: boolean
  taskResultId: string
  output?: string
  outputParsed?: Record<string, unknown>
  parseSuccess: boolean
  parseError?: string
  fieldResults?: FieldEvaluationResultData[]
  aggregationPassed?: boolean
  aggregationScore?: number
  error?: string
}

/**
 * 构建变量映射
 * 根据 InputSchema 的变量定义，从数据集行提取变量
 */
export function buildVariables(
  rowData: Record<string, unknown>,
  variables: InputVariableDefinition[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const variable of variables) {
    // 优先使用 datasetField 映射，否则使用 key
    const sourceKey = variable.datasetField || variable.key
    let value = rowData[sourceKey]

    // 如果值不存在，使用默认值
    if (value === undefined || value === null) {
      value = variable.defaultValue
    }

    // 类型转换
    if (value !== undefined && value !== null) {
      value = convertType(value, variable.type, variable.itemType)
    }

    result[variable.key] = value
  }

  // 同时保留原始数据（用于模板中可能的其他变量引用）
  return { ...rowData, ...result }
}

/**
 * 构建期望值映射
 * 根据 OutputSchema 的字段定义，从数据集行提取期望值
 */
export function buildExpectedValues(
  rowData: Record<string, unknown>,
  fields: OutputFieldDefinition[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const field of fields) {
    // 优先使用 expectedField，否则使用 expected_{key} 或 {key}_expected
    const expectedKey =
      field.evaluation.expectedField ||
      `expected_${field.key}` ||
      `${field.key}_expected`

    let value = rowData[expectedKey]

    // 尝试其他命名约定
    if (value === undefined) {
      value = rowData[`expected_${field.key}`]
    }
    if (value === undefined) {
      value = rowData[`${field.key}_expected`]
    }

    // 类型转换
    if (value !== undefined && value !== null) {
      value = convertType(value, field.type, field.itemType)
    }

    if (value !== undefined) {
      result[field.key] = value
    }
  }

  return result
}

/**
 * 类型转换
 */
function convertType(
  value: unknown,
  type: string,
  itemType?: string
): unknown {
  if (value === undefined || value === null) {
    return value
  }

  switch (type) {
    case 'string':
      return String(value)

    case 'number':
      const num = Number(value)
      return isNaN(num) ? value : num

    case 'boolean':
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1'
      }
      return Boolean(value)

    case 'array':
      if (Array.isArray(value)) {
        // 如果有 itemType，转换数组元素
        if (itemType) {
          return value.map((item) => convertType(item, itemType))
        }
        return value
      }
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) {
            return itemType ? parsed.map((item) => convertType(item, itemType)) : parsed
          }
        } catch {
          // 尝试逗号分隔
          return value.split(',').map((s) => s.trim())
        }
      }
      return [value]

    case 'object':
      if (typeof value === 'object' && !Array.isArray(value)) {
        return value
      }
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }
      return value

    case 'enum':
      return String(value)

    default:
      return value
  }
}

/**
 * 创建评估器执行器
 * 用于字段评估引擎调用评估器
 */
function createEvaluatorExecutor(
  evaluatorMap: Map<string, EvaluatorConfig>
) {
  return async (
    fieldValue: unknown,
    expectedValue: unknown,
    evaluatorId: string,
    metadata?: Record<string, unknown>
  ) => {
    const config = evaluatorMap.get(evaluatorId)
    if (!config) {
      // 使用默认的精确匹配
      const passed = JSON.stringify(fieldValue) === JSON.stringify(expectedValue)
      return {
        passed,
        score: passed ? 1 : 0,
        reason: passed ? '值匹配' : '值不匹配',
      }
    }

    const input: EvaluatorInput = {
      input: JSON.stringify(metadata || {}),
      output: typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue),
      expected: expectedValue !== undefined ?
        (typeof expectedValue === 'string' ? expectedValue : JSON.stringify(expectedValue)) :
        null,
      metadata: metadata || {},
    }

    const result = await runEvaluator({
      config,
      input,
      sandboxExecutor: executeInSandbox,
    })

    return {
      passed: result.passed,
      score: result.score,
      reason: result.reason,
      details: result.details,
    }
  }
}

/**
 * 执行结构化测试
 */
export async function executeStructuredTest(
  item: StructuredExecutionItem,
  config: StructuredExecutionConfig,
  evaluatorMap: Map<string, EvaluatorConfig>
): Promise<StructuredExecutionResult> {
  const { prompt, model, datasetRowId, rowData } = item

  // 创建 TaskResult 记录
  const taskResult = await prisma.taskResult.create({
    data: {
      taskId: '', // 需要从外部传入
      datasetRowId,
      promptId: prompt.promptId,
      promptVersionId: prompt.promptVersionId,
      modelId: model.id,
      input: rowData as Prisma.InputJsonValue,
      status: 'PENDING',
    },
  })

  try {
    // 1. 构建变量
    const variables = prompt.inputSchema
      ? buildVariables(rowData, prompt.inputSchema.variables)
      : rowData

    // 2. 渲染提示词
    const renderedContent = renderTemplate(prompt.promptContent, variables)
    const messages = buildMessages(renderedContent)

    // 3. 调用模型
    const timeoutMs = config.timeout * 1000
    const modelResult = await executeWithRetry(
      () =>
        executeWithTimeout(() => invokeModel(model, { messages }), timeoutMs),
      {
        retryCount: config.retryCount,
        shouldRetry: (error) => {
          if (error instanceof TimeoutError) return false
          if (error instanceof ModelInvokeError) {
            return ![400, 401, 403, 404].includes(error.statusCode ?? 0)
          }
          return true
        },
      }
    )

    const outputRaw = modelResult.output

    // 4. 解析输出
    let outputParsed: Record<string, unknown> | undefined
    let parseSuccess = true
    let parseError: string | undefined

    if (prompt.outputSchema) {
      const { parseResult, validationResult } = parseAndValidate(
        outputRaw,
        prompt.outputSchema.parseMode,
        prompt.outputSchema.fields,
        prompt.outputSchema.parseConfig
      )

      if (parseResult.success) {
        outputParsed = parseResult.data
        if (validationResult && !validationResult.valid) {
          parseError = validationResult.errors
            .map((e) => `${e.fieldName}: ${e.error}`)
            .join('; ')
        }
      } else {
        parseSuccess = false
        parseError = parseResult.error
      }
    }

    // 5. 构建期望值
    const expectedValues = prompt.outputSchema
      ? buildExpectedValues(rowData, prompt.outputSchema.fields)
      : {}

    // 6. 字段级评估
    let fieldResults: FieldEvaluationResultData[] | undefined
    let aggregationPassed = true
    let aggregationScore = 1

    if (prompt.outputSchema && parseSuccess && outputParsed) {
      const evaluationResult = await evaluateFields(
        {
          parsedOutput: outputParsed,
          expectedValues,
          fields: prompt.outputSchema.fields,
        },
        {
          evaluatorExecutor: createEvaluatorExecutor(evaluatorMap),
        }
      )

      fieldResults = evaluationResult.fieldResults

      // 7. 聚合计算
      const aggregationResult = aggregateFieldResults(
        evaluationResult.fieldResults,
        prompt.outputSchema.fields,
        prompt.outputSchema.aggregation
      )

      aggregationPassed = aggregationResult.passed
      aggregationScore = aggregationResult.score
    }

    // 8. 更新 TaskResult
    await prisma.taskResult.update({
      where: { id: taskResult.id },
      data: {
        output: outputRaw,
        outputRaw,
        outputParsed: outputParsed as Prisma.InputJsonValue ?? Prisma.JsonNull,
        parseSuccess,
        parseError,
        expectedValues: expectedValues as Prisma.InputJsonValue,
        status: 'SUCCESS',
        latencyMs: modelResult.latencyMs,
        tokens: modelResult.tokens,
        cost: modelResult.cost,
        costCurrency: modelResult.costCurrency,
      },
    })

    // 9. 保存 FieldEvaluationResult
    if (fieldResults && fieldResults.length > 0) {
      await prisma.fieldEvaluationResult.createMany({
        data: fieldResults.map((r) => ({
          taskResultId: taskResult.id,
          fieldName: r.fieldName,
          fieldKey: r.fieldKey,
          fieldValue: r.fieldValue as Prisma.InputJsonValue ?? Prisma.JsonNull,
          expectedValue: r.expectedValue as Prisma.InputJsonValue ?? Prisma.JsonNull,
          evaluatorId: r.evaluatorId ?? null,
          evaluatorName: null,
          passed: r.passed,
          score: r.score ?? null,
          reason: r.reason ?? null,
          details: (r.details ?? {}) as Prisma.InputJsonValue,
          skipped: r.skipped,
          skipReason: r.skipReason ?? null,
          latencyMs: r.latencyMs ?? null,
        })),
      })
    }

    return {
      success: true,
      taskResultId: taskResult.id,
      output: outputRaw,
      outputParsed,
      parseSuccess,
      parseError,
      fieldResults,
      aggregationPassed,
      aggregationScore,
    }
  } catch (error) {
    // 处理失败
    let status: 'FAILED' | 'TIMEOUT' | 'ERROR' = 'ERROR'
    let errorMessage = '未知错误'

    if (error instanceof TimeoutError) {
      status = 'TIMEOUT'
      errorMessage = error.message
    } else if (error instanceof ModelInvokeError) {
      status = 'FAILED'
      errorMessage = error.message
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    await prisma.taskResult.update({
      where: { id: taskResult.id },
      data: {
        status,
        error: errorMessage,
      },
    })

    return {
      success: false,
      taskResultId: taskResult.id,
      parseSuccess: false,
      error: errorMessage,
    }
  }
}

/**
 * 检查提示词是否使用结构化模式
 */
export function isStructuredMode(prompt: {
  outputSchemaId?: string | null
}): boolean {
  return !!prompt.outputSchemaId
}
