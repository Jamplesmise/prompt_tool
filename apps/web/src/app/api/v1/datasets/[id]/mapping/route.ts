import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { error, success, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import type { InputVariableDefinition, OutputFieldDefinition } from '@platform/shared'

// 强制动态渲染
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

// 字段映射配置
type FieldMapping = {
  inputMappings: Array<{
    variableKey: string
    datasetColumn: string
  }>
  expectedMappings: Array<{
    fieldKey: string
    datasetColumn: string
  }>
}

// GET /api/v1/datasets/:id/mapping - 获取字段映射配置
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const inputSchemaId = searchParams.get('inputSchemaId')
    const outputSchemaId = searchParams.get('outputSchemaId')
    const promptId = searchParams.get('promptId')

    // 获取数据集
    const dataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        rows: {
          take: 1,
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

    // 获取数据集列
    const sampleRow = dataset.rows[0]?.data as Record<string, unknown> | undefined
    const datasetColumns = sampleRow ? Object.keys(sampleRow) : []

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

    const inputVariables = (inputSchema?.variables as InputVariableDefinition[]) || []
    const outputFields = (outputSchema?.fields as OutputFieldDefinition[]) || []

    // 生成自动映射建议
    const suggestedMapping: FieldMapping = {
      inputMappings: [],
      expectedMappings: [],
    }

    // 自动匹配输入变量
    for (const variable of inputVariables) {
      const exactMatch = datasetColumns.find(
        (col) => col.toLowerCase() === variable.key.toLowerCase()
      )
      const nameMatch = datasetColumns.find(
        (col) => col.toLowerCase() === variable.name.toLowerCase()
      )
      const partialMatch = datasetColumns.find((col) =>
        col.toLowerCase().includes(variable.key.toLowerCase())
      )

      suggestedMapping.inputMappings.push({
        variableKey: variable.key,
        datasetColumn: exactMatch || nameMatch || partialMatch || '',
      })
    }

    // 自动匹配期望值列
    for (const field of outputFields) {
      const expectedPatterns = [
        `expected_${field.key}`,
        `${field.key}_expected`,
        `expect_${field.key}`,
        field.key,
      ]

      let matchedColumn = ''
      for (const pattern of expectedPatterns) {
        const match = datasetColumns.find(
          (col) => col.toLowerCase() === pattern.toLowerCase()
        )
        if (match) {
          matchedColumn = match
          break
        }
      }

      suggestedMapping.expectedMappings.push({
        fieldKey: field.key,
        datasetColumn: matchedColumn,
      })
    }

    // 获取已保存的映射（如果有）
    const savedMapping = dataset.fieldMapping as FieldMapping | null

    return NextResponse.json(
      success({
        datasetColumns,
        inputVariables: inputVariables.map((v) => ({
          key: v.key,
          name: v.name,
          type: v.type,
          required: v.required,
        })),
        outputFields: outputFields.map((f) => ({
          key: f.key,
          name: f.name,
          type: f.type,
        })),
        suggestedMapping,
        savedMapping,
      })
    )
  } catch (err) {
    console.error('Get mapping error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取映射配置失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/datasets/:id/mapping - 保存字段映射配置
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { inputMappings, expectedMappings, inputSchemaId, outputSchemaId } =
      body as FieldMapping & {
        inputSchemaId?: string
        outputSchemaId?: string
      }

    // 获取数据集
    const dataset = await prisma.dataset.findUnique({
      where: { id },
    })

    if (!dataset) {
      return NextResponse.json(
        error(ERROR_CODES.DATASET_NOT_FOUND, '数据集不存在'),
        { status: 404 }
      )
    }

    // 校验映射配置
    if (!inputMappings && !expectedMappings) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '请提供映射配置'),
        { status: 400 }
      )
    }

    // 保存映射配置
    const fieldMapping: FieldMapping = {
      inputMappings: inputMappings || [],
      expectedMappings: expectedMappings || [],
    }

    await prisma.dataset.update({
      where: { id },
      data: {
        fieldMapping,
        inputSchemaId: inputSchemaId || null,
        outputSchemaId: outputSchemaId || null,
      },
    })

    return NextResponse.json(
      success({ message: '映射配置已保存' })
    )
  } catch (err) {
    console.error('Save mapping error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '保存映射配置失败'),
      { status: 500 }
    )
  }
}
