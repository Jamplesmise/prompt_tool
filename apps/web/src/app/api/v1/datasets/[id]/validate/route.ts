import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { error, success, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import type { InputVariableDefinition, OutputFieldDefinition } from '@platform/shared'

// 强制动态渲染
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

type ValidationError = {
  rowIndex: number
  fieldKey: string
  fieldName: string
  error: string
  value?: unknown
}

type ValidationResult = {
  valid: boolean
  totalRows: number
  validRows: number
  invalidRows: number
  errors: ValidationError[]
  warnings: Array<{
    type: string
    message: string
    details?: Record<string, unknown>
  }>
}

/**
 * 验证字段值类型
 */
function validateFieldType(
  value: unknown,
  type: string,
  itemType?: string
): string | null {
  if (value === undefined || value === null || value === '') {
    return null // 空值由 required 检查处理
  }

  switch (type) {
    case 'string':
      // 字符串类型比较宽松
      return null

    case 'number':
      if (typeof value === 'number') return null
      if (typeof value === 'string') {
        const num = Number(value)
        if (!isNaN(num)) return null
      }
      return `期望数字类型，实际为 ${typeof value}`

    case 'boolean':
      if (typeof value === 'boolean') return null
      if (typeof value === 'string') {
        if (['true', 'false', '1', '0'].includes(value.toLowerCase())) {
          return null
        }
      }
      return `期望布尔类型，实际为 ${typeof value}`

    case 'array':
      if (Array.isArray(value)) {
        // 检查元素类型
        if (itemType) {
          for (let i = 0; i < value.length; i++) {
            const itemError = validateFieldType(value[i], itemType)
            if (itemError) {
              return `数组第 ${i + 1} 项: ${itemError}`
            }
          }
        }
        return null
      }
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) return null
        } catch {
          // 尝试逗号分隔
          return null // 允许逗号分隔的字符串
        }
      }
      return `期望数组类型，实际为 ${typeof value}`

    case 'object':
      if (typeof value === 'object' && !Array.isArray(value)) return null
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            return null
          }
        } catch {
          return `无法解析为 JSON 对象`
        }
      }
      return `期望对象类型，实际为 ${typeof value}`

    case 'enum':
      // 枚举值在更高层检查
      return null

    default:
      return null
  }
}

/**
 * 验证枚举值
 */
function validateEnumValue(
  value: unknown,
  enumValues: string[] | undefined
): string | null {
  if (!enumValues || enumValues.length === 0) return null
  if (value === undefined || value === null || value === '') return null

  const strValue = String(value)
  if (!enumValues.includes(strValue)) {
    return `值 "${strValue}" 不在枚举范围内: [${enumValues.join(', ')}]`
  }
  return null
}

// POST /api/v1/datasets/:id/validate - 校验数据集
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { inputSchemaId, outputSchemaId, promptId } = body

    // 获取数据集
    const dataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        rows: {
          orderBy: { rowIndex: 'asc' },
        },
      },
    })

    if (!dataset) {
      return NextResponse.json(
        error(ERROR_CODES.DATASET_NOT_FOUND, '数据集不存在'),
        { status: 404 }
      )
    }

    // 获取 Schema
    let inputSchema = null
    let outputSchema = null

    if (promptId) {
      const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        include: {
          inputSchema: true,
          outputSchema: true,
        },
      })
      if (prompt) {
        inputSchema = prompt.inputSchema
        outputSchema = prompt.outputSchema
      }
    } else {
      if (inputSchemaId) {
        inputSchema = await prisma.inputSchema.findUnique({
          where: { id: inputSchemaId },
        })
      }
      if (outputSchemaId) {
        outputSchema = await prisma.outputSchema.findUnique({
          where: { id: outputSchemaId },
        })
      }
    }

    // 执行校验
    const result: ValidationResult = {
      valid: true,
      totalRows: dataset.rows.length,
      validRows: 0,
      invalidRows: 0,
      errors: [],
      warnings: [],
    }

    // 获取所有数据列名
    const allColumns = new Set<string>()
    for (const row of dataset.rows) {
      const data = row.data as Record<string, unknown>
      Object.keys(data).forEach((k) => allColumns.add(k))
    }

    // 检查 Schema 字段是否存在于数据集中
    const inputVariables = (inputSchema?.variables as InputVariableDefinition[]) || []
    const outputFields = (outputSchema?.fields as OutputFieldDefinition[]) || []

    // 检查输入变量映射
    for (const variable of inputVariables) {
      const sourceKey = variable.datasetField || variable.key
      if (!allColumns.has(sourceKey)) {
        result.warnings.push({
          type: 'missing_input_column',
          message: `输入变量 "${variable.name}" 映射的列 "${sourceKey}" 不存在于数据集中`,
          details: { variableKey: variable.key, sourceKey },
        })
      }
    }

    // 检查期望值列映射
    for (const field of outputFields) {
      const expectedKey =
        field.evaluation.expectedField ||
        `expected_${field.key}` ||
        `${field.key}_expected`

      const hasExpected =
        allColumns.has(expectedKey) ||
        allColumns.has(`expected_${field.key}`) ||
        allColumns.has(`${field.key}_expected`)

      if (!hasExpected) {
        result.warnings.push({
          type: 'missing_expected_column',
          message: `输出字段 "${field.name}" 没有对应的期望值列（尝试: ${expectedKey}）`,
          details: { fieldKey: field.key, expectedKey },
        })
      }
    }

    // 逐行校验
    for (const row of dataset.rows) {
      const data = row.data as Record<string, unknown>
      let rowValid = true

      // 校验输入变量
      for (const variable of inputVariables) {
        const sourceKey = variable.datasetField || variable.key
        const value = data[sourceKey]

        // 必填检查
        if (
          variable.required &&
          (value === undefined || value === null || value === '')
        ) {
          result.errors.push({
            rowIndex: row.rowIndex,
            fieldKey: sourceKey,
            fieldName: variable.name,
            error: '必填字段缺失',
            value,
          })
          rowValid = false
          continue
        }

        // 类型检查
        const typeError = validateFieldType(value, variable.type, variable.itemType)
        if (typeError) {
          result.errors.push({
            rowIndex: row.rowIndex,
            fieldKey: sourceKey,
            fieldName: variable.name,
            error: typeError,
            value,
          })
          rowValid = false
        }
      }

      // 校验期望值（如果有）
      for (const field of outputFields) {
        const expectedKey =
          field.evaluation.expectedField ||
          `expected_${field.key}`

        let value = data[expectedKey]
        if (value === undefined) {
          value = data[`${field.key}_expected`]
        }

        // 期望值通常不是必填，跳过空值
        if (value === undefined || value === null || value === '') {
          continue
        }

        // 类型检查
        const typeError = validateFieldType(value, field.type, field.itemType)
        if (typeError) {
          result.errors.push({
            rowIndex: row.rowIndex,
            fieldKey: expectedKey,
            fieldName: `期望: ${field.name}`,
            error: typeError,
            value,
          })
          rowValid = false
        }

        // 枚举检查
        if (field.type === 'enum') {
          const enumError = validateEnumValue(value, field.enumValues)
          if (enumError) {
            result.errors.push({
              rowIndex: row.rowIndex,
              fieldKey: expectedKey,
              fieldName: `期望: ${field.name}`,
              error: enumError,
              value,
            })
            rowValid = false
          }
        }
      }

      if (rowValid) {
        result.validRows++
      } else {
        result.invalidRows++
      }
    }

    result.valid = result.invalidRows === 0

    return NextResponse.json(success(result))
  } catch (err) {
    console.error('Validate dataset error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '校验数据集失败'),
      { status: 500 }
    )
  }
}
