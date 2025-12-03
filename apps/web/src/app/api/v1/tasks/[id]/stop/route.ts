import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'
import { getQueuedTaskStatus, removeFromQueue, requestStop } from '@/lib/queue'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/tasks/:id/stop - 终止任务执行
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

    // 检查任务状态
    if (task.status !== 'RUNNING' && task.status !== 'PENDING') {
      return NextResponse.json(
        badRequest(`任务状态不允许终止: ${task.status}`),
        { status: 400 }
      )
    }

    // 检查队列状态
    const queueStatus = await getQueuedTaskStatus(id)

    if (!queueStatus.exists) {
      // 任务不在队列中，可能刚完成
      return NextResponse.json(success({ message: '任务未在执行中' }))
    }

    if (queueStatus.state === 'waiting') {
      // 任务在等待队列中，直接移除
      await removeFromQueue(id)
      await prisma.task.update({
        where: { id },
        data: { status: 'STOPPED', completedAt: new Date() },
      })
      return NextResponse.json(success({ message: '任务已从队列移除' }))
    }

    if (queueStatus.state === 'active') {
      // 任务正在执行，发送停止信号
      requestStop(id)
      return NextResponse.json(success({ message: '已发送停止信号，等待任务完成当前操作' }))
    }

    return NextResponse.json(success({ message: '任务已终止' }))
  } catch (err) {
    console.error('Stop task error:', err)
    const errorMessage = err instanceof Error ? err.message : '终止任务失败'
    return NextResponse.json(internalError(errorMessage), { status: 500 })
  }
}
