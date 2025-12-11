import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES, getTemplateById } from '@platform/shared'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Params = {
  params: Promise<{ id: string }>
}

// POST /api/v1/schemas/templates/:id/use - 使用模板创建 Schema
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const template = getTemplateById(id)

    if (!template) {
      return NextResponse.json(
        error(ERROR_CODES.NOT_FOUND, '模板不存在'),
        { status: 404 }
      )
    }

    // 获取请求参数
    const body = await request.json().catch(() => ({}))
    const { teamId, inputSchemaName, outputSchemaName } = body

    // 使用事务创建 InputSchema 和 OutputSchema
    const result = await prisma.$transaction(async (tx) => {
      // 创建 InputSchema
      const inputSchema = await tx.inputSchema.create({
        data: {
          name: inputSchemaName || template.inputSchema.name,
          description: template.inputSchema.description,
          variables: JSON.parse(JSON.stringify(template.inputSchema.variables)),
          createdById: session.id,
          teamId: teamId || null,
        },
      })

      // 创建 OutputSchema
      const outputSchema = await tx.outputSchema.create({
        data: {
          name: outputSchemaName || template.outputSchema.name,
          description: template.outputSchema.description,
          fields: JSON.parse(JSON.stringify(template.outputSchema.fields)),
          parseMode: template.outputSchema.parseMode,
          parseConfig: {},
          aggregation: JSON.parse(JSON.stringify(template.outputSchema.aggregation)),
          createdById: session.id,
          teamId: teamId || null,
        },
      })

      return { inputSchema, outputSchema }
    })

    return NextResponse.json(
      success({
        inputSchemaId: result.inputSchema.id,
        outputSchemaId: result.outputSchema.id,
        inputSchema: {
          id: result.inputSchema.id,
          name: result.inputSchema.name,
          description: result.inputSchema.description,
          variables: result.inputSchema.variables,
        },
        outputSchema: {
          id: result.outputSchema.id,
          name: result.outputSchema.name,
          description: result.outputSchema.description,
          fields: result.outputSchema.fields,
          parseMode: result.outputSchema.parseMode,
          aggregation: result.outputSchema.aggregation,
        },
        templateId: template.id,
        templateName: template.name,
      })
    )
  } catch (err) {
    console.error('Use schema template error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, err instanceof Error ? err.message : '使用模板创建 Schema 失败'),
      { status: 500 }
    )
  }
}
