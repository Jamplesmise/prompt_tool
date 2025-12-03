import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { subscribeProgress } from '@/lib/progressPublisher'
import type { ProgressEvent } from '@/lib/progressPublisher'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/tasks/:id/progress - SSE 进度推送
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params

  // 验证任务存在且属于当前用户
  const task = await prisma.task.findFirst({
    where: {
      id,
      createdById: session.id,
    },
    select: {
      id: true,
      status: true,
      progress: true,
      stats: true,
      error: true,
    },
  })

  if (!task) {
    return new Response('Task not found', { status: 404 })
  }

  // 如果任务已完成、失败或停止，直接返回最终状态
  if (['COMPLETED', 'FAILED', 'STOPPED'].includes(task.status)) {
    const encoder = new TextEncoder()
    let eventData: string

    if (task.status === 'COMPLETED') {
      eventData = `event: completed\ndata: ${JSON.stringify({ status: task.status, stats: task.stats })}\n\n`
    } else if (task.status === 'FAILED') {
      eventData = `event: failed\ndata: ${JSON.stringify({ status: task.status, error: task.error })}\n\n`
    } else {
      eventData = `event: stopped\ndata: ${JSON.stringify({ status: task.status })}\n\n`
    }

    return new Response(encoder.encode(eventData), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  // 创建 SSE 流
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // 发送当前进度
      const initialData = `event: progress\ndata: ${JSON.stringify(task.progress)}\n\n`
      controller.enqueue(encoder.encode(initialData))

      // 订阅进度更新
      const unsubscribe = subscribeProgress(id, (event: ProgressEvent) => {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
        controller.enqueue(encoder.encode(data))

        // 如果是终止事件，关闭流
        if (['completed', 'failed', 'stopped'].includes(event.type)) {
          unsubscribe()
          controller.close()
        }
      })

      // 处理客户端断开连接
      request.signal.addEventListener('abort', () => {
        unsubscribe()
        controller.close()
      })

      // 心跳保持连接（每 30 秒）
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeatInterval)
        }
      }, 30000)

      // 清理心跳
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  })
}
