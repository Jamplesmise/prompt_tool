import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import type { OutputFieldDefinition, AggregationConfig, ParseMode } from '@platform/shared'

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

// 验证字段定义
function validateFieldDefinition(field: OutputFieldDefinition, index: number): string | null {
  if (!field.name || typeof field.name !== 'string') {
    return `字段 ${index + 1}: 名称不能为空`
  }
  if (!field.key || typeof field.key !== 'string') {
    return `字段 ${index + 1}: key 不能为空`
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key)) {
    return `字段 ${index + 1}: key 必须是有效的标识符`
  }

  const validTypes = ['string', 'number', 'boolean', 'enum', 'array', 'object']
  if (!field.type || !validTypes.includes(field.type)) {
    return `字段 ${index + 1}: 类型必须为 ${validTypes.join(', ')} 之一`
  }

  if (field.type === 'enum') {
    if (!field.enumValues || !Array.isArray(field.enumValues) || field.enumValues.length === 0) {
      return `字段 ${index + 1}: enum 类型必须提供 enumValues`
    }
  }

  if (!field.evaluation || typeof field.evaluation !== 'object') {
    return `字段 ${index + 1}: 必须提供 evaluation 配置`
  }

  if (typeof field.evaluation.weight !== 'number' || field.evaluation.weight < 0 || field.evaluation.weight > 1) {
    return `字段 ${index + 1}: 权重必须在 0-1 之间`
  }

  return null
}

// 验证聚合配置
function validateAggregation(agg: AggregationConfig): string | null {
  const validModes = ['all_pass', 'weighted_average', 'critical_first', 'custom']
  if (!agg.mode || !validModes.includes(agg.mode)) {
    return `聚合模式必须为 ${validModes.join(', ')} 之一`
  }

  if (agg.mode === 'weighted_average' || agg.mode === 'critical_first') {
    if (agg.passThreshold !== undefined) {
      if (typeof agg.passThreshold !== 'number' || agg.passThreshold < 0 || agg.passThreshold > 1) {
        return '通过阈值必须在 0-1 之间'
      }
    }
  }

  return null
}

// GET /api/v1/output-schemas/:id - 获取输出结构详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const outputSchema = await prisma.outputSchema.findUnique({
      where: { id },
      include: {
        _count: {
          select: { prompts: true },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!outputSchema) {
      return NextResponse.json(
        notFound('输出结构不存在'),
        { status: 404 }
      )
    }

    return NextResponse.json(
      success({
        id: outputSchema.id,
        name: outputSchema.name,
        description: outputSchema.description,
        fields: outputSchema.fields,
        parseMode: outputSchema.parseMode,
        parseConfig: outputSchema.parseConfig,
        aggregation: outputSchema.aggregation,
        createdById: outputSchema.createdById,
        createdBy: outputSchema.createdBy,
        teamId: outputSchema.teamId,
        createdAt: outputSchema.createdAt.toISOString(),
        updatedAt: outputSchema.updatedAt.toISOString(),
        _count: outputSchema._count,
      })
    )
  } catch (err) {
    console.error('Get output schema error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取输出结构失败'),
      { status: 500 }
    )
  }
}

// PUT /api/v1/output-schemas/:id - 更新输出结构
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const outputSchema = await prisma.outputSchema.findUnique({
      where: { id },
    })

    if (!outputSchema) {
      return NextResponse.json(
        notFound('输出结构不存在'),
        { status: 404 }
      )
    }

    // 检查权限：只有创建者或团队成员可以修改
    if (outputSchema.createdById !== session.id) {
      if (outputSchema.teamId) {
        const membership = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: outputSchema.teamId,
              userId: session.id,
            },
          },
        })
        if (!membership || membership.role === 'VIEWER') {
          return NextResponse.json(
            error(ERROR_CODES.FORBIDDEN, '您没有权限修改此输出结构'),
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          error(ERROR_CODES.FORBIDDEN, '您只能修改自己创建的输出结构'),
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { name, description, fields, parseMode, parseConfig, aggregation } = body

    const updateData: Record<string, unknown> = {}

    if (name !== undefined) {
      if (!name || typeof name !== 'string') {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, '名称不能为空'),
          { status: 400 }
        )
      }
      updateData.name = name
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (fields !== undefined) {
      if (!Array.isArray(fields) || fields.length === 0) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, '必须定义至少一个输出字段'),
          { status: 400 }
        )
      }

      // 验证每个字段定义
      for (let i = 0; i < fields.length; i++) {
        const fieldError = validateFieldDefinition(fields[i], i)
        if (fieldError) {
          return NextResponse.json(
            error(ERROR_CODES.VALIDATION_ERROR, fieldError),
            { status: 400 }
          )
        }
      }

      // 检查 key 是否重复
      const keys = fields.map((f: OutputFieldDefinition) => f.key)
      const duplicates = keys.filter((key: string, index: number) => keys.indexOf(key) !== index)
      if (duplicates.length > 0) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, `字段 key 重复: ${[...new Set(duplicates)].join(', ')}`),
          { status: 400 }
        )
      }

      updateData.fields = fields
    }

    if (parseMode !== undefined) {
      const validParseModes: ParseMode[] = ['JSON', 'JSON_EXTRACT', 'REGEX', 'TEMPLATE']
      if (!validParseModes.includes(parseMode)) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, `解析模式必须为 ${validParseModes.join(', ')} 之一`),
          { status: 400 }
        )
      }
      updateData.parseMode = parseMode
    }

    if (parseConfig !== undefined) {
      updateData.parseConfig = parseConfig
    }

    if (aggregation !== undefined) {
      const aggError = validateAggregation(aggregation)
      if (aggError) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, aggError),
          { status: 400 }
        )
      }
      updateData.aggregation = aggregation
    }

    const updated = await prisma.outputSchema.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { prompts: true },
        },
      },
    })

    return NextResponse.json(
      success({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        fields: updated.fields,
        parseMode: updated.parseMode,
        parseConfig: updated.parseConfig,
        aggregation: updated.aggregation,
        createdById: updated.createdById,
        teamId: updated.teamId,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        _count: updated._count,
      })
    )
  } catch (err) {
    console.error('Update output schema error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '更新输出结构失败'),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/output-schemas/:id - 删除输出结构
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const outputSchema = await prisma.outputSchema.findUnique({
      where: { id },
      include: {
        _count: {
          select: { prompts: true },
        },
      },
    })

    if (!outputSchema) {
      return NextResponse.json(
        notFound('输出结构不存在'),
        { status: 404 }
      )
    }

    // 检查权限：只有创建者或团队管理员可以删除
    if (outputSchema.createdById !== session.id) {
      if (outputSchema.teamId) {
        const membership = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: outputSchema.teamId,
              userId: session.id,
            },
          },
        })
        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
          return NextResponse.json(
            error(ERROR_CODES.FORBIDDEN, '您没有权限删除此输出结构'),
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          error(ERROR_CODES.FORBIDDEN, '您只能删除自己创建的输出结构'),
          { status: 403 }
        )
      }
    }

    // 检查是否有关联的提示词
    if (outputSchema._count.prompts > 0) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, `该输出结构正被 ${outputSchema._count.prompts} 个提示词使用，无法删除`),
        { status: 400 }
      )
    }

    await prisma.outputSchema.delete({
      where: { id },
    })

    return NextResponse.json(success({ id }))
  } catch (err) {
    console.error('Delete output schema error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除输出结构失败'),
      { status: 500 }
    )
  }
}
