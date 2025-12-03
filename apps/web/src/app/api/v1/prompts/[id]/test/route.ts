import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { decryptApiKey } from '@/lib/encryption'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { renderTemplate } from '@/lib/template'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = { params: Promise<{ id: string }> }

// POST /api/v1/prompts/:id/test - 快速测试提示词
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { modelId, versionId, variables = {} } = body

    if (!modelId) {
      return NextResponse.json(
        badRequest('请选择测试模型'),
        { status: 400 }
      )
    }

    // 获取提示词
    const prompt = await prisma.prompt.findUnique({
      where: { id },
    })

    if (!prompt) {
      return NextResponse.json(
        error(ERROR_CODES.PROMPT_NOT_FOUND, '提示词不存在'),
        { status: 404 }
      )
    }

    // 确定使用的内容：指定版本或草稿
    let content = prompt.content
    if (versionId) {
      const version = await prisma.promptVersion.findUnique({
        where: { id: versionId },
      })
      if (!version || version.promptId !== id) {
        return NextResponse.json(
          error(ERROR_CODES.NOT_FOUND, '版本不存在'),
          { status: 404 }
        )
      }
      content = version.content
    }

    // 渲染模板
    const renderedContent = renderTemplate(content, variables)

    // 获取模型和提供商信息
    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: { provider: true },
    })

    if (!model) {
      return NextResponse.json(
        error(ERROR_CODES.MODEL_NOT_FOUND, '模型不存在'),
        { status: 404 }
      )
    }

    const startTime = Date.now()

    try {
      const apiKey = decryptApiKey(model.provider.apiKey)
      const providerType = model.provider.type.toLowerCase()

      let apiUrl: string
      let requestBody: Record<string, unknown>
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (providerType === 'openai' || providerType === 'azure') {
        apiUrl = `${model.provider.baseUrl}/chat/completions`
        headers['Authorization'] = `Bearer ${apiKey}`
        requestBody = {
          model: model.modelId,
          messages: [{ role: 'user', content: renderedContent }],
          ...(model.config as Record<string, unknown>),
        }
      } else if (providerType === 'anthropic') {
        apiUrl = `${model.provider.baseUrl}/messages`
        headers['x-api-key'] = apiKey
        headers['anthropic-version'] = '2023-06-01'
        requestBody = {
          model: model.modelId,
          messages: [{ role: 'user', content: renderedContent }],
          max_tokens: 4096,
          ...(model.config as Record<string, unknown>),
        }
      } else {
        // 自定义提供商，默认 OpenAI 兼容格式
        apiUrl = `${model.provider.baseUrl}/chat/completions`
        headers['Authorization'] = `Bearer ${apiKey}`
        requestBody = {
          model: model.modelId,
          messages: [{ role: 'user', content: renderedContent }],
          ...(model.config as Record<string, unknown>),
        }
      }

      // 添加自定义请求头
      const customHeaders = model.provider.headers as Record<string, string>
      if (customHeaders && typeof customHeaders === 'object') {
        Object.assign(headers, customHeaders)
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })

      const latencyMs = Date.now() - startTime
      const responseData = await response.json()

      if (!response.ok) {
        return NextResponse.json(
          success({
            success: false,
            error: responseData.error?.message || `HTTP ${response.status}`,
            latencyMs,
          })
        )
      }

      // 解析响应
      let output = ''
      let tokens = { input: 0, output: 0, total: 0 }

      if (providerType === 'anthropic') {
        output = responseData.content?.[0]?.text || ''
        tokens = {
          input: responseData.usage?.input_tokens || 0,
          output: responseData.usage?.output_tokens || 0,
          total:
            (responseData.usage?.input_tokens || 0) +
            (responseData.usage?.output_tokens || 0),
        }
      } else {
        output = responseData.choices?.[0]?.message?.content || ''
        tokens = {
          input: responseData.usage?.prompt_tokens || 0,
          output: responseData.usage?.completion_tokens || 0,
          total: responseData.usage?.total_tokens || 0,
        }
      }

      return NextResponse.json(
        success({
          success: true,
          output,
          latencyMs,
          tokens,
          renderedPrompt: renderedContent,
        })
      )
    } catch (fetchError) {
      const latencyMs = Date.now() - startTime
      const errorMessage =
        fetchError instanceof Error ? fetchError.message : '请求失败'

      return NextResponse.json(
        success({
          success: false,
          error: errorMessage,
          latencyMs,
        })
      )
    }
  } catch (err) {
    console.error('Test prompt error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '测试提示词失败'),
      { status: 500 }
    )
  }
}
