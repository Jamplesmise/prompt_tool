import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { decryptApiKey } from '@/lib/encryption'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/models/:id/test - 测试模型连接
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        provider: true,
      },
    })

    if (!model) {
      return NextResponse.json(notFound('模型不存在'), { status: 404 })
    }

    const startTime = Date.now()

    try {
      // 解密 API Key
      const apiKey = decryptApiKey(model.provider.apiKey)
      const providerType = model.provider.type.toLowerCase()

      // 根据提供商类型构建请求
      let testUrl: string
      let testBody: Record<string, unknown>
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (providerType === 'openai' || providerType === 'azure') {
        testUrl = `${model.provider.baseUrl}/chat/completions`
        headers['Authorization'] = `Bearer ${apiKey}`
        testBody = {
          model: model.modelId,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }
      } else if (providerType === 'anthropic') {
        testUrl = `${model.provider.baseUrl}/messages`
        headers['x-api-key'] = apiKey
        headers['anthropic-version'] = '2023-06-01'
        testBody = {
          model: model.modelId,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }
      } else {
        // 自定义提供商
        testUrl = `${model.provider.baseUrl}/chat/completions`
        headers['Authorization'] = `Bearer ${apiKey}`
        testBody = {
          model: model.modelId,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }
      }

      // 添加自定义请求头
      const customHeaders = model.provider.headers as Record<string, string>
      if (customHeaders && typeof customHeaders === 'object') {
        Object.assign(headers, customHeaders)
      }

      const response = await fetch(testUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(testBody),
      })

      const latencyMs = Date.now() - startTime

      if (response.ok) {
        return NextResponse.json(
          success({
            success: true,
            message: '连接成功',
            latencyMs,
          })
        )
      } else {
        const errorData = await response.json().catch(() => ({}))
        return NextResponse.json(
          success({
            success: false,
            message: errorData.error?.message || `HTTP ${response.status}`,
            latencyMs,
          })
        )
      }
    } catch (fetchError) {
      const latencyMs = Date.now() - startTime
      const errorMessage =
        fetchError instanceof Error ? fetchError.message : '连接失败'

      return NextResponse.json(
        success({
          success: false,
          message: errorMessage,
          latencyMs,
        })
      )
    }
  } catch (err) {
    console.error('Test model error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '测试模型连接失败'),
      { status: 500 }
    )
  }
}
