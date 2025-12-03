import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'
import { enqueueTask, getQueuedTaskStatus } from '@/lib/queue'

// 确保 Worker 在服务端启动
import '@/lib/queue/initWorker'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/tasks/:id/run - 启动任务执行
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 获取请求体中的优先级
    let priority: number | undefined
    try {
      const body = await request.json()
      priority = body.priority
    } catch {
      // 忽略 JSON 解析错误，使用默认值
    }

    const task = await prisma.task.findFirst({
      where: {
        id,
        createdById: session.id,
      },
    })

    if (!task) {
      return NextResponse.json(notFound('任务不存在'), { status: 404 })
    }

    // 检查任务状态
    if (task.status !== 'PENDING') {
      return NextResponse.json(
        badRequest(`任务状态不允许启动: ${task.status}`),
        { status: 400 }
      )
    }

    // 检查是否已在队列中
    const queueStatus = await getQueuedTaskStatus(id)
    if (queueStatus.exists && (queueStatus.state === 'waiting' || queueStatus.state === 'active')) {
      return NextResponse.json(badRequest('任务已在队列中'), { status: 400 })
    }

    // 加入任务队列
    await enqueueTask(id, { priority })

    return NextResponse.json(success({
      message: '任务已加入队列',
      queuePosition: queueStatus.position,
    }))
  } catch (err) {
    console.error('Run task error:', err)
    const errorMessage = err instanceof Error ? err.message : '启动任务失败'
    return NextResponse.json(internalError(errorMessage), { status: 500 })
  }
}
