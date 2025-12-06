import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'
import { getQueuedTaskStatus, requestStop, createCheckpointFromProgress } from '@/lib/queue'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/tasks/:id/pause - 暂停任务执行
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const task = await prisma.task.findFirst({
      where: {
        id,
        createdById: session.id,
      },
    })

    if (!task) {
      return NextResponse.json(notFound('任务不存在'), { status: 404 })
    }

    // 只有运行中的任务可以暂停
    if (task.status !== 'RUNNING') {
      return NextResponse.json(
        badRequest(`任务状态不允许暂停: ${task.status}`),
        { status: 400 }
      )
    }

    // 检查队列状态
    const queueStatus = await getQueuedTaskStatus(id)

    if (!queueStatus.exists || queueStatus.state !== 'active') {
      return NextResponse.json(badRequest('任务未在执行中'), { status: 400 })
    }

    // 发送停止信号
    requestStop(id)

    // 创建检查点
    await createCheckpointFromProgress(id)

    // 更新任务状态为暂停
    await prisma.task.update({
      where: { id },
      data: { status: 'PAUSED' },
    })

    return NextResponse.json(success({ message: '任务已暂停，可稍后续跑' }))
  } catch (err) {
    console.error('Pause task error:', err)
    const errorMessage = err instanceof Error ? err.message : '暂停任务失败'
    return NextResponse.json(internalError(errorMessage), { status: 500 })
  }
}
