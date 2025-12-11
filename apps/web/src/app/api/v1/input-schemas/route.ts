import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import type { InputVariableDefinition } from '@platform/shared'

export const dynamic = 'force-dynamic'

// 验证变量定义
function validateVariableDefinition(variable: InputVariableDefinition, index: number): string | null {
  if (!variable.name || typeof variable.name !== 'string') {
    return `变量 ${index + 1}: 名称不能为空`
  }
  if (!variable.key || typeof variable.key !== 'string') {
    return `变量 ${index + 1}: key 不能为空`
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.key)) {
    return `变量 ${index + 1}: key 必须是有效的标识符（字母、数字、下划线，不能以数字开头）`
  }

  const validTypes = ['string', 'number', 'boolean', 'array', 'object']
  if (!variable.type || !validTypes.includes(variable.type)) {
    return `变量 ${index + 1}: 类型必须为 ${validTypes.join(', ')} 之一`
  }

  if (variable.type === 'array' && variable.itemType) {
    const validItemTypes = ['string', 'number', 'boolean', 'object']
    if (!validItemTypes.includes(variable.itemType)) {
      return `变量 ${index + 1}: 数组元素类型必须为 ${validItemTypes.join(', ')} 之一`
    }
  }

  if (typeof variable.required !== 'boolean') {
    return `变量 ${index + 1}: required 必须是布尔值`
  }

  return null
}

// GET /api/v1/input-schemas - 获取输入结构列表
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
      prisma.inputSchema.findMany({
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
      prisma.inputSchema.count({ where }),
    ])

    const list = schemas.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      variables: s.variables,
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
    console.error('Get input schemas error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取输入结构列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/input-schemas - 创建输入结构
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { name, description, variables, teamId } = body

    // 参数验证
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '名称不能为空'),
        { status: 400 }
      )
    }

    if (!variables || !Array.isArray(variables) || variables.length === 0) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '必须定义至少一个输入变量'),
        { status: 400 }
      )
    }

    // 验证每个变量定义
    for (let i = 0; i < variables.length; i++) {
      const varError = validateVariableDefinition(variables[i], i)
      if (varError) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, varError),
          { status: 400 }
        )
      }
    }

    // 检查 key 是否重复
    const keys = variables.map((v: InputVariableDefinition) => v.key)
    const duplicates = keys.filter((key: string, index: number) => keys.indexOf(key) !== index)
    if (duplicates.length > 0) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, `变量 key 重复: ${[...new Set(duplicates)].join(', ')}`),
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

    const inputSchema = await prisma.inputSchema.create({
      data: {
        name,
        description: description || null,
        variables: variables as object,
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
        id: inputSchema.id,
        name: inputSchema.name,
        description: inputSchema.description,
        variables: inputSchema.variables,
        createdById: inputSchema.createdById,
        teamId: inputSchema.teamId,
        createdAt: inputSchema.createdAt.toISOString(),
        updatedAt: inputSchema.updatedAt.toISOString(),
        _count: inputSchema._count,
      })
    )
  } catch (err) {
    console.error('Create input schema error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '创建输入结构失败'),
      { status: 500 }
    )
  }
}
