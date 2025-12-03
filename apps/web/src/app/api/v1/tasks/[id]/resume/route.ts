import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'
import { enqueueTask, getCheckpoint } from '@/lib/queue'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/tasks/:id/resume - 续跑任务
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

    // 只有暂停、失败、停止的任务可以续跑
    if (!['PAUSED', 'FAILED', 'STOPPED'].includes(task.status)) {
      return NextResponse.json(
        badRequest(`任务状态不允许续跑: ${task.status}`),
        { status: 400 }
      )
    }

    // 获取检查点
    const checkpoint = await getCheckpoint(id)
    if (!checkpoint) {
      return NextResponse.json(
        badRequest('未找到检查点，无法续跑'),
        { status: 400 }
      )
    }

    // 更新任务状态
    await prisma.task.update({
      where: { id },
      data: {
        status: 'PENDING',
        error: null,
      },
    })

    // 加入队列，标记从检查点续跑
    await enqueueTask(id, { resumeFrom: checkpoint.lastUpdated })

    return NextResponse.json(success({
      message: '任务已加入队列，将从断点继续执行',
      checkpoint: {
        completedCount: checkpoint.completedItems.length,
        failedCount: checkpoint.failedItems.length,
        lastUpdated: checkpoint.lastUpdated,
      },
    }))
  } catch (err) {
    console.error('Resume task error:', err)
    const errorMessage = err instanceof Error ? err.message : '续跑任务失败'
    return NextResponse.json(internalError(errorMessage), { status: 500 })
  }
}
