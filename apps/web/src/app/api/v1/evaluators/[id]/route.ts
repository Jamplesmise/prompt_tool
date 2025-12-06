import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import { validateCode } from '@/lib/sandbox'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/v1/evaluators/:id - 获取评估器详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const evaluator = await prisma.evaluator.findUnique({
      where: { id },
    })

    if (!evaluator) {
      return NextResponse.json(
        notFound('评估器不存在'),
        { status: 404 }
      )
    }

    return NextResponse.json(
      success({
        id: evaluator.id,
        name: evaluator.name,
        description: evaluator.description,
        type: evaluator.type.toLowerCase(),
        config: evaluator.config,
        isPreset: evaluator.isPreset,
        createdAt: evaluator.createdAt.toISOString(),
        updatedAt: evaluator.updatedAt.toISOString(),
      })
    )
  } catch (err) {
    console.error('Get evaluator error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取评估器失败'),
      { status: 500 }
    )
  }
}

// PUT /api/v1/evaluators/:id - 更新评估器
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const evaluator = await prisma.evaluator.findUnique({
      where: { id },
    })

    if (!evaluator) {
      return NextResponse.json(
        notFound('评估器不存在'),
        { status: 404 }
      )
    }

    // 预置评估器不可修改
    if (evaluator.isPreset) {
      return NextResponse.json(
        error(ERROR_CODES.FORBIDDEN, '预置评估器不可修改'),
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, config } = body

    // 验证代码语法
    if (config?.code) {
      const validation = validateCode(config.code)
      if (!validation.valid) {
        return NextResponse.json(
          error(ERROR_CODES.VALIDATION_ERROR, `代码语法错误: ${validation.error}`),
          { status: 400 }
        )
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (config !== undefined) {
      const existingConfig = evaluator.config as Record<string, unknown>
      updateData.config = {
        ...existingConfig,
        ...config,
      }
    }

    const updated = await prisma.evaluator.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(
      success({
        id: updated.id,
        name: updated.name,
        description: updated.description,
        type: updated.type.toLowerCase(),
        config: updated.config,
        isPreset: updated.isPreset,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      })
    )
  } catch (err) {
    console.error('Update evaluator error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '更新评估器失败'),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/evaluators/:id - 删除评估器
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const evaluator = await prisma.evaluator.findUnique({
      where: { id },
    })

    if (!evaluator) {
      return NextResponse.json(
        notFound('评估器不存在'),
        { status: 404 }
      )
    }

    // 预置评估器不可删除
    if (evaluator.isPreset) {
      return NextResponse.json(
        error(ERROR_CODES.FORBIDDEN, '预置评估器不可删除'),
        { status: 403 }
      )
    }

    await prisma.evaluator.delete({
      where: { id },
    })

    return NextResponse.json(success({ id }))
  } catch (err) {
    console.error('Delete evaluator error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除评估器失败'),
      { status: 500 }
    )
  }
}
