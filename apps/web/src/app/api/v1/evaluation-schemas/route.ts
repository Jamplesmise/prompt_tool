import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import type { InputVariableDefinition, OutputFieldDefinition } from '@platform/shared'

export const dynamic = 'force-dynamic'

// GET /api/v1/evaluation-schemas - 获取评估结构列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const teamId = searchParams.get('teamId')

    const where: Record<string, unknown> = {}

    // 搜索条件
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // 团队筛选：如果指定了 teamId 则筛选团队，否则只显示用户自己创建的
    if (teamId) {
      where.teamId = teamId
    } else {
      where.createdById = session.id
    }

    const [schemas, total] = await Promise.all([
      prisma.evaluationSchema.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          inputSchema: {
            select: {
              id: true,
              name: true,
              variables: true,
            },
          },
          outputSchema: {
            select: {
              id: true,
              name: true,
              fields: true,
              parseMode: true,
              aggregation: true,
            },
          },
          _count: {
            select: { prompts: true, datasets: true },
          },
        },
      }),
      prisma.evaluationSchema.count({ where }),
    ])

    const list = schemas.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      inputSchema: s.inputSchema
        ? {
            id: s.inputSchema.id,
            name: s.inputSchema.name,
            variableCount: (s.inputSchema.variables as InputVariableDefinition[])?.length || 0,
          }
        : null,
      outputSchema: s.outputSchema
        ? {
            id: s.outputSchema.id,
            name: s.outputSchema.name,
            fieldCount: (s.outputSchema.fields as OutputFieldDefinition[])?.length || 0,
            parseMode: s.outputSchema.parseMode,
          }
        : null,
      createdById: s.createdById,
      teamId: s.teamId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      _count: s._count,
    }))

    return NextResponse.json(
      success({
        list,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get evaluation schemas error:', err)
    return NextResponse.json(error(ERROR_CODES.INTERNAL_ERROR, '获取评估结构列表失败'), {
      status: 500,
    })
  }
}

// POST /api/v1/evaluation-schemas - 创建评估结构
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { name, description, inputSchema, outputSchema, teamId } = body

    // 参数验证
    if (!name || typeof name !== 'string') {
      return NextResponse.json(error(ERROR_CODES.VALIDATION_ERROR, '名称不能为空'), {
        status: 400,
      })
    }

    // 如果指定了 teamId，验证用户是否有权限
    if (teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: session.id,
          },
        },
      })
      if (!membership) {
        return NextResponse.json(error(ERROR_CODES.FORBIDDEN, '您不是该团队的成员'), {
          status: 403,
        })
      }
    }

    // 使用事务创建评估结构及其关联的输入输出结构
    const result = await prisma.$transaction(async (tx) => {
      // 创建评估结构
      const evaluationSchema = await tx.evaluationSchema.create({
        data: {
          name,
          description: description || null,
          createdById: session.id,
          teamId: teamId || null,
        },
      })

      // 如果提供了输入结构配置，创建输入结构
      let createdInputSchema = null
      if (inputSchema && inputSchema.variables && inputSchema.variables.length > 0) {
        createdInputSchema = await tx.inputSchema.create({
          data: {
            name: inputSchema.name || `${name} - 输入结构`,
            description: inputSchema.description || null,
            variables: inputSchema.variables as object,
            createdById: session.id,
            teamId: teamId || null,
            evaluationSchemaId: evaluationSchema.id,
          },
        })
      }

      // 如果提供了输出结构配置，创建输出结构
      let createdOutputSchema = null
      if (outputSchema && outputSchema.fields && outputSchema.fields.length > 0) {
        createdOutputSchema = await tx.outputSchema.create({
          data: {
            name: outputSchema.name || `${name} - 输出结构`,
            description: outputSchema.description || null,
            fields: outputSchema.fields as object,
            parseMode: outputSchema.parseMode || 'JSON_EXTRACT',
            parseConfig: (outputSchema.parseConfig as object) || {},
            aggregation: (outputSchema.aggregation as object) || { mode: 'critical_first' },
            createdById: session.id,
            teamId: teamId || null,
            evaluationSchemaId: evaluationSchema.id,
          },
        })
      }

      return {
        evaluationSchema,
        inputSchema: createdInputSchema,
        outputSchema: createdOutputSchema,
      }
    })

    return NextResponse.json(
      success({
        id: result.evaluationSchema.id,
        name: result.evaluationSchema.name,
        description: result.evaluationSchema.description,
        inputSchema: result.inputSchema
          ? {
              id: result.inputSchema.id,
              name: result.inputSchema.name,
              variables: result.inputSchema.variables,
            }
          : null,
        outputSchema: result.outputSchema
          ? {
              id: result.outputSchema.id,
              name: result.outputSchema.name,
              fields: result.outputSchema.fields,
              parseMode: result.outputSchema.parseMode,
              aggregation: result.outputSchema.aggregation,
            }
          : null,
        createdById: result.evaluationSchema.createdById,
        teamId: result.evaluationSchema.teamId,
        createdAt: result.evaluationSchema.createdAt.toISOString(),
        updatedAt: result.evaluationSchema.updatedAt.toISOString(),
      })
    )
  } catch (err) {
    console.error('Create evaluation schema error:', err)
    return NextResponse.json(error(ERROR_CODES.INTERNAL_ERROR, '创建评估结构失败'), {
      status: 500,
    })
  }
}
