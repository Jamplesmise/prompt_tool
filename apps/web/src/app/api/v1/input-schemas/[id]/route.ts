import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import type { InputVariableDefinition } from '@platform/shared'

export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

// 验证变量定义
function validateVariableDefinition(variable: InputVariableDefinition, index: number): string | null {
  if (!variable.name || typeof variable.name !== 'string') {
    return `变量 ${index + 1}: 名称不能为空`
  }
  if (!variable.key || typeof variable.key !== 'string') {
    return `变量 ${index + 1}: key 不能为空`
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(variable.key)) {
    return `变量 ${index + 1}: key 必须是有效的标识符`
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

// GET /api/v1/input-schemas/:id - 获取输入结构详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const inputSchema = await prisma.inputSchema.findUnique({
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

    if (!inputSchema) {
      return NextResponse.json(
        notFound('输入结构不存在'),
        { status: 404 }
      )
    }

    return NextResponse.json(
      success({
        id: inputSchema.id,
        name: inputSchema.name,
        description: inputSchema.description,
        variables: inputSchema.variables,
        createdById: inputSchema.createdById,
        createdBy: inputSchema.createdBy,
        teamId: inputSchema.teamId,
        createdAt: inputSchema.createdAt.toISOString(),
        updatedAt: inputSchema.updatedAt.toISOString(),
        _count: inputSchema._count,
      })
    )
  } catch (err) {
    console.error('Get input schema error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取输入结构失败'),
      { status: 500 }
    )
  }
}

// PUT /api/v1/input-schemas/:id - 更新输入结构
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const inputSchema = await prisma.inputSchema.findUnique({
      where: { id },
    })

    if (!inputSchema) {
      return NextResponse.json(
        notFound('输入结构不存在'),
        { status: 404 }
      )
    }

    // 检查权限：只有创建者或团队成员可以修改
    if (inputSchema.createdById !== session.id) {
      if (inputSchema.teamId) {
        const membership = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: inputSchema.teamId,
              userId: session.id,
            },
          },
        })
        if (!membership || membership.role === 'VIEWER') {
          return NextResponse.json(
            error(ERROR_CODES.FORBIDDEN, '您没有权限修改此输入结构'),
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          error(ERROR_CODES.FORBIDDEN, '您只能修改自己创建的输入结构'),
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { name, description, variables } = body

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

    if (variables !== undefined) {
      if (!Array.isArray(variables) || variables.length === 0) {
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

      updateData.variables = variables
    }

    const updated = await prisma.inputSchema.update({
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
        variables: updated.variables,
        createdById: updated.createdById,
        teamId: updated.teamId,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        _count: updated._count,
      })
    )
  } catch (err) {
    console.error('Update input schema error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '更新输入结构失败'),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/input-schemas/:id - 删除输入结构
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const inputSchema = await prisma.inputSchema.findUnique({
      where: { id },
      include: {
        _count: {
          select: { prompts: true },
        },
      },
    })

    if (!inputSchema) {
      return NextResponse.json(
        notFound('输入结构不存在'),
        { status: 404 }
      )
    }

    // 检查权限：只有创建者或团队管理员可以删除
    if (inputSchema.createdById !== session.id) {
      if (inputSchema.teamId) {
        const membership = await prisma.teamMember.findUnique({
          where: {
            teamId_userId: {
              teamId: inputSchema.teamId,
              userId: session.id,
            },
          },
        })
        if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
          return NextResponse.json(
            error(ERROR_CODES.FORBIDDEN, '您没有权限删除此输入结构'),
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          error(ERROR_CODES.FORBIDDEN, '您只能删除自己创建的输入结构'),
          { status: 403 }
        )
      }
    }

    // 检查是否有关联的提示词
    if (inputSchema._count.prompts > 0) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, `该输入结构正被 ${inputSchema._count.prompts} 个提示词使用，无法删除`),
        { status: 400 }
      )
    }

    await prisma.inputSchema.delete({
      where: { id },
    })

    return NextResponse.json(success({ id }))
  } catch (err) {
    console.error('Delete input schema error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除输入结构失败'),
      { status: 500 }
    )
  }
}
