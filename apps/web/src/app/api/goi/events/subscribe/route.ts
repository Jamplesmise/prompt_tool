import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { eventBus } from '@/lib/events'
import type { GoiEventType, GoiEvent } from '@platform/shared'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * GET /api/goi/events/subscribe - SSE 订阅事件
 *
 * Query params:
 * - sessionId: 会话 ID（必填）
 * - types: 事件类型过滤（逗号分隔，可选）
 *
 * Response: Server-Sent Events stream
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return new Response('sessionId parameter is required', { status: 400 })
  }

  const typesParam = searchParams.get('types')
  const types = typesParam ? (typesParam.split(',') as GoiEventType[]) : undefined

  // 创建 SSE 流
  const encoder = new TextEncoder()
  let subscriptionId: string | null = null

  const stream = new ReadableStream({
    async start(controller) {
      // 发送初始连接消息
      const connectMessage = `data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`
      controller.enqueue(encoder.encode(connectMessage))

      // 订阅事件
      subscriptionId = await eventBus.subscribe(
        sessionId,
        (event: GoiEvent) => {
          try {
            const message = `data: ${JSON.stringify(event)}\n\n`
            controller.enqueue(encoder.encode(message))
          } catch {
            // 流可能已关闭
          }
        },
        types
      )

      // 定期发送心跳
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`
          controller.enqueue(encoder.encode(heartbeat))
        } catch {
          clearInterval(heartbeatInterval)
        }
      }, 30000) // 每 30 秒

      // 处理客户端断开连接
      request.signal.addEventListener('abort', async () => {
        clearInterval(heartbeatInterval)
        if (subscriptionId) {
          await eventBus.unsubscribe(subscriptionId)
        }
        controller.close()
      })
    },

    async cancel() {
      if (subscriptionId) {
        await eventBus.unsubscribe(subscriptionId)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
