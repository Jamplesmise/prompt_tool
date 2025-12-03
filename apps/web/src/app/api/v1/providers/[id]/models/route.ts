import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/providers/:providerId/models - 为提供商添加模型
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id: providerId } = await params
    const body = await request.json()
    const { name, modelId, config, pricing } = body

    // 参数验证
    if (!name || !modelId) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '模型名称和模型 ID 不能为空'),
        { status: 400 }
      )
    }

    // 检查提供商是否存在
    const provider = await prisma.provider.findUnique({ where: { id: providerId } })
    if (!provider) {
      return NextResponse.json(notFound('提供商不存在'), { status: 404 })
    }

    const model = await prisma.model.create({
      data: {
        providerId,
        name,
        modelId,
        config: config || {},
        pricing: pricing || {},
      },
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
    console.error('Create model error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '创建模型失败'),
      { status: 500 }
    )
  }
}
