import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import type { OutputFieldDefinition, AggregationConfig, ParseMode } from '@platform/shared'

export const dynamic = 'force-dynamic'

// 验证字段定义
function validateFieldDefinition(field: OutputFieldDefinition, index: number): string | null {
  if (!field.name || typeof field.name !== 'string') {
    return `字段 ${index + 1}: 名称不能为空`
  }
  if (!field.key || typeof field.key !== 'string') {
    return `字段 ${index + 1}: key 不能为空`
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.key)) {
    return `字段 ${index + 1}: key 必须是有效的标识符（字母、数字、下划线，不能以数字开头）`
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

// GET /api/v1/output-schemas - 获取输出结构列表
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
      prisma.outputSchema.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { prompts: true },
          },
        },
      }),
      prisma.outputSchema.count({ where }),
    ])

    const list = schemas.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      fields: s.fields,
      parseMode: s.parseMode,
      parseConfig: s.parseConfig,
      aggregation: s.aggregation,
      createdById: s.createdById,
      teamId: s.teamId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      _count: s._count,
    }))

    return NextResponse.json(success({
      list,
      total,
      page,
      pageSize,
    }))
  } catch (err) {
    console.error('Get output schemas error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取输出结构列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/output-schemas - 创建输出结构
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { name, description, fields, parseMode, parseConfig, aggregation, teamId } = body

    // 参数验证
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '名称不能为空'),
        { status: 400 }
      )
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
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

    // 验证解析模式
    const validParseModes: ParseMode[] = ['JSON', 'JSON_EXTRACT', 'REGEX', 'TEMPLATE']
    const finalParseMode = parseMode || 'JSON'
    if (!validParseModes.includes(finalParseMode)) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, `解析模式必须为 ${validParseModes.join(', ')} 之一`),
        { status: 400 }
      )
    }

    // 验证聚合配置
    const finalAggregation: AggregationConfig = aggregation || { mode: 'all_pass' }
    const aggError = validateAggregation(finalAggregation)
    if (aggError) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, aggError),
        { status: 400 }
      )
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
        return NextResponse.json(
          error(ERROR_CODES.FORBIDDEN, '您不是该团队的成员'),
          { status: 403 }
        )
      }
    }

    const outputSchema = await prisma.outputSchema.create({
      data: {
        name,
        description: description || null,
        fields: fields as object,
        parseMode: finalParseMode,
        parseConfig: parseConfig || {},
        aggregation: finalAggregation as object,
        createdById: session.id,
        teamId: teamId || null,
      },
      include: {
        _count: {
          select: { prompts: true },
        },
      },
    })

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
        teamId: outputSchema.teamId,
        createdAt: outputSchema.createdAt.toISOString(),
        updatedAt: outputSchema.updatedAt.toISOString(),
        _count: outputSchema._count,
      })
    )
  } catch (err) {
    console.error('Create output schema error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '创建输出结构失败'),
      { status: 500 }
    )
  }
}
