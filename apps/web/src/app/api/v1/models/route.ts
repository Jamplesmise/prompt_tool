import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// GET /api/v1/models - 获取所有模型列表（扁平化）
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const models = await prisma.model.findMany({
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const list = models.map((model) => ({
      id: model.id,
      name: model.name,
      modelId: model.modelId,
      provider: {
        id: model.provider.id,
        name: model.provider.name,
        type: model.provider.type.toLowerCase(),
      },
      config: model.config,
      isActive: model.isActive,
    }))

    return NextResponse.json(success({
      list,
      total: list.length,
    }))
  } catch (err) {
    console.error('Get models error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取模型列表失败'),
      { status: 500 }
    )
  }
}
