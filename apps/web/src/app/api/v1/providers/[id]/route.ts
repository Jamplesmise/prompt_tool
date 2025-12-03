import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { encryptApiKey, maskApiKey } from '@/lib/encryption'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/providers/:id - 获取单个提供商
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        models: {
          select: {
            id: true,
            name: true,
            modelId: true,
            config: true,
            isActive: true,
          },
        },
      },
    })

    if (!provider) {
      return NextResponse.json(notFound('提供商不存在'), { status: 404 })
    }

    return NextResponse.json(
      success({
        id: provider.id,
        name: provider.name,
        type: provider.type.toLowerCase(),
        baseUrl: provider.baseUrl,
        apiKeyMasked: maskApiKey(provider.apiKey),
        headers: provider.headers,
        isActive: provider.isActive,
        models: provider.models,
      })
    )
  } catch (err) {
    console.error('Get provider error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取提供商失败'),
      { status: 500 }
    )
  }
}

// PUT /api/v1/providers/:id - 更新提供商
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, baseUrl, apiKey, headers, isActive } = body

    // 检查提供商是否存在
    const existing = await prisma.provider.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(notFound('提供商不存在'), { status: 404 })
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl
    if (headers !== undefined) updateData.headers = headers
    if (isActive !== undefined) updateData.isActive = isActive

    // 如果提供了新的 API Key（非空字符串），则加密存储
    if (apiKey && apiKey.length > 0) {
      updateData.apiKey = encryptApiKey(apiKey)
    }

    const provider = await prisma.provider.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(
      success({
        id: provider.id,
        name: provider.name,
        type: provider.type.toLowerCase(),
        baseUrl: provider.baseUrl,
        isActive: provider.isActive,
      })
    )
  } catch (err) {
    console.error('Update provider error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '更新提供商失败'),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/providers/:id - 删除提供商（级联删除模型）
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.provider.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(notFound('提供商不存在'), { status: 404 })
    }

    // 删除提供商（Prisma 会级联删除其下的模型）
    await prisma.provider.delete({ where: { id } })

    return NextResponse.json(success(null))
  } catch (err) {
    console.error('Delete provider error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除提供商失败'),
      { status: 500 }
    )
  }
}
