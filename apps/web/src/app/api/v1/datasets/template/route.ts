import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import type { InputVariableDefinition, OutputFieldDefinition } from '@platform/shared'

// 强制动态渲染
export const dynamic = 'force-dynamic'

type TemplateColumn = {
  key: string
  name: string
  description: string
  type: string
  required: boolean
  source: 'input' | 'expected'
}

/**
 * 根据 InputSchema 和 OutputSchema 生成模板列
 */
function generateTemplateColumns(
  inputSchema: { variables: unknown } | null,
  outputSchema: { fields: unknown } | null
): TemplateColumn[] {
  const columns: TemplateColumn[] = []

  // 添加输入变量列
  if (inputSchema?.variables) {
    const variables = inputSchema.variables as InputVariableDefinition[]
    for (const variable of variables) {
      columns.push({
        key: variable.key,
        name: variable.name,
        description: variable.description || '',
        type: variable.type,
        required: variable.required,
        source: 'input',
      })
    }
  }

  // 添加期望值列（基于输出字段）
  if (outputSchema?.fields) {
    const fields = outputSchema.fields as OutputFieldDefinition[]
    for (const field of fields) {
      // 如果字段有 expectedField，使用它；否则使用 expected_{key}
      const expectedKey = field.evaluation.expectedField || `expected_${field.key}`
      columns.push({
        key: expectedKey,
        name: `期望值: ${field.name}`,
        description: `${field.type} 类型，用于评估 ${field.name} 字段`,
        type: field.type,
        required: false, // 期望值通常是可选的
        source: 'expected',
      })
    }
  }

  return columns
}

/**
 * 生成示例行数据
 */
function generateExampleRow(columns: TemplateColumn[]): Record<string, unknown> {
  const row: Record<string, unknown> = {}

  for (const col of columns) {
    switch (col.type) {
      case 'string':
        row[col.key] = col.source === 'input' ? '示例文本' : '期望文本'
        break
      case 'number':
        row[col.key] = col.source === 'input' ? 100 : 0.95
        break
      case 'boolean':
        row[col.key] = true
        break
      case 'enum':
        row[col.key] = '选项A'
        break
      case 'array':
        row[col.key] = '["item1", "item2"]'
        break
      case 'object':
        row[col.key] = '{"key": "value"}'
        break
      default:
        row[col.key] = ''
    }
  }

  return row
}

// GET /api/v1/datasets/template - 下载数据集模板
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const inputSchemaId = searchParams.get('inputSchemaId')
    const outputSchemaId = searchParams.get('outputSchemaId')
    const promptId = searchParams.get('promptId')
    const format = searchParams.get('format') || 'xlsx'

    let inputSchema = null
    let outputSchema = null

    // 如果提供了 promptId，从 Prompt 获取关联的 Schema
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
      // 分别获取 Schema
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

    // 如果没有任何 Schema，生成简单模板
    if (!inputSchema && !outputSchema) {
      const simpleColumns: TemplateColumn[] = [
        {
          key: 'input',
          name: '输入',
          description: '模型输入内容',
          type: 'string',
          required: true,
          source: 'input',
        },
        {
          key: 'expected',
          name: '期望输出',
          description: '期望的模型输出（用于评估）',
          type: 'string',
          required: false,
          source: 'expected',
        },
      ]

      return generateTemplateResponse(simpleColumns, format, '数据集模板')
    }

    // 根据 Schema 生成模板
    const columns = generateTemplateColumns(inputSchema, outputSchema)
    const schemaName = outputSchema?.name || inputSchema?.name || '结构化数据集模板'

    return generateTemplateResponse(columns, format, schemaName)
  } catch (err) {
    console.error('Generate template error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '生成模板失败'),
      { status: 500 }
    )
  }
}

/**
 * 生成模板响应
 */
function generateTemplateResponse(
  columns: TemplateColumn[],
  format: string,
  name: string
): NextResponse {
  // 生成表头和说明行
  const headerRow: Record<string, string> = {}
  const descriptionRow: Record<string, string> = {}

  for (const col of columns) {
    headerRow[col.key] = col.name
    descriptionRow[col.key] = `[${col.type}${col.required ? ', 必填' : ''}] ${col.description}`
  }

  // 生成示例数据行
  const exampleRow = generateExampleRow(columns)

  // 数据行（表头 + 说明 + 示例）
  const data = [headerRow, descriptionRow, exampleRow]

  if (format === 'csv') {
    const csv = Papa.unparse(data)
    const buffer = Buffer.from(csv, 'utf-8')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}.csv"`,
      },
    })
  } else if (format === 'json') {
    // JSON 格式返回列定义和示例
    const jsonContent = {
      columns: columns.map((col) => ({
        key: col.key,
        name: col.name,
        description: col.description,
        type: col.type,
        required: col.required,
        source: col.source,
      })),
      example: exampleRow,
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: jsonContent,
    })
  } else {
    // 默认 XLSX
    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: columns.map((c) => c.key),
      skipHeader: true,
    })

    // 设置列宽
    const colWidths = columns.map((col) => ({
      wch: Math.max(col.name.length * 2, 15),
    }))
    worksheet['!cols'] = colWidths

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')

    // 添加说明 sheet
    const infoData = [
      { 说明: '第一行为列名（用于显示）' },
      { 说明: '第二行为字段说明（类型和描述）' },
      { 说明: '第三行起为数据行' },
      { 说明: '请删除说明行后填写实际数据' },
      { 说明: '' },
      { 说明: '字段类型说明：' },
      { 说明: 'string - 文本' },
      { 说明: 'number - 数字' },
      { 说明: 'boolean - 布尔值（true/false）' },
      { 说明: 'enum - 枚举值' },
      { 说明: 'array - 数组（JSON 格式，如 ["a", "b"]）' },
      { 说明: 'object - 对象（JSON 格式，如 {"key": "value"}）' },
    ]
    const infoSheet = XLSX.utils.json_to_sheet(infoData)
    XLSX.utils.book_append_sheet(workbook, infoSheet, '说明')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}.xlsx"`,
      },
    })
  }
}
