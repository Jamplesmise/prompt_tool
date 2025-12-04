import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { decryptApiKey } from '@/lib/encryption'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/providers/:id/test - 测试提供商连接
export async function POST(_request: NextRequest, { params }: RouteParams) {
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
          where: { isActive: true },
          take: 1,
        },
      },
    })

    if (!provider) {
      return NextResponse.json(notFound('提供商不存在'), { status: 404 })
    }

    // 如果没有模型，只测试 API Key 有效性
    const testModel = provider.models[0]

    const startTime = Date.now()

    try {
      // 解密 API Key
      const apiKey = decryptApiKey(provider.apiKey)
      const providerType = provider.type.toLowerCase()

      // 根据提供商类型构建请求
      let testUrl: string
      let testBody: Record<string, unknown>
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (providerType === 'openai' || providerType === 'azure') {
        testUrl = `${provider.baseUrl}/chat/completions`
        headers['Authorization'] = `Bearer ${apiKey}`
        testBody = {
          model: testModel?.modelId || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }
      } else if (providerType === 'anthropic') {
        testUrl = `${provider.baseUrl}/messages`
        headers['x-api-key'] = apiKey
        headers['anthropic-version'] = '2023-06-01'
        testBody = {
          model: testModel?.modelId || 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }
      } else {
        // 自定义提供商
        testUrl = `${provider.baseUrl}/chat/completions`
        headers['Authorization'] = `Bearer ${apiKey}`
        testBody = {
          model: testModel?.modelId || 'default',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        }
      }

      // 添加自定义请求头
      const customHeaders = provider.headers as Record<string, string>
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
    console.error('Test provider error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '测试提供商连接失败'),
      { status: 500 }
    )
  }
}
