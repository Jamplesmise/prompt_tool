import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/models/:id - 获取单个模型
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    })

    if (!model) {
      return NextResponse.json(notFound('模型不存在'), { status: 404 })
    }

    return NextResponse.json(
      success({
        id: model.id,
        name: model.name,
        modelId: model.modelId,
        provider: {
          id: model.provider.id,
          name: model.provider.name,
          type: model.provider.type.toLowerCase(),
        },
        config: model.config,
        pricing: model.pricing,
        isActive: model.isActive,
      })
    )
  } catch (err) {
    console.error('Get model error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取模型失败'),
      { status: 500 }
    )
  }
}

// PUT /api/v1/models/:id - 更新模型
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, modelId, config, pricing, isActive } = body

    // 检查模型是否存在
    const existing = await prisma.model.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(notFound('模型不存在'), { status: 404 })
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (modelId !== undefined) updateData.modelId = modelId
    if (config !== undefined) updateData.config = config
    if (pricing !== undefined) updateData.pricing = pricing
    if (isActive !== undefined) updateData.isActive = isActive

    const model = await prisma.model.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(
      success({
        id: model.id,
        name: model.name,
        modelId: model.modelId,
        config: model.config,
        pricing: model.pricing,
        isActive: model.isActive,
      })
    )
  } catch (err) {
    console.error('Update model error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '更新模型失败'),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/models/:id - 删除模型
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.model.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(notFound('模型不存在'), { status: 404 })
    }

    await prisma.model.delete({ where: { id } })

    return NextResponse.json(success(null))
  } catch (err) {
    console.error('Delete model error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除模型失败'),
      { status: 500 }
    )
  }
}
