import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { encryptApiKey, maskApiKey } from '@/lib/encryption'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// GET /api/v1/providers - 获取所有提供商列表
export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const providers = await prisma.provider.findMany({
      include: {
        models: {
          select: {
            id: true,
            name: true,
            modelId: true,
            isActive: true,
            config: true,
            pricing: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // 脱敏 API Key
    const list = providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      type: provider.type.toLowerCase(),
      baseUrl: provider.baseUrl,
      apiKeyMasked: maskApiKey(provider.apiKey),
      isActive: provider.isActive,
      models: provider.models,
    }))

    return NextResponse.json(success({
      list,
      total: list.length,
    }))
  } catch (err) {
    console.error('Get providers error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取提供商列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/providers - 创建提供商
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { name, type, baseUrl, apiKey, headers } = body

    // 参数验证
    if (!name || !type || !baseUrl || !apiKey) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '名称、类型、Base URL 和 API Key 不能为空'),
        { status: 400 }
      )
    }

    // 验证类型
    const validTypes = ['openai', 'anthropic', 'azure', 'custom']
    if (!validTypes.includes(type.toLowerCase())) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '无效的提供商类型'),
        { status: 400 }
      )
    }

    // 加密 API Key
    const encryptedApiKey = encryptApiKey(apiKey)

    const provider = await prisma.provider.create({
      data: {
        name,
        type: type.toUpperCase(),
        baseUrl,
        apiKey: encryptedApiKey,
        headers: headers || {},
      },
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
    console.error('Create provider error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '创建提供商失败'),
      { status: 500 }
    )
  }
}
