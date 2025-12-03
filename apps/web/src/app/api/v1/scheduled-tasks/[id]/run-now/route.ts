import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, internalError } from '@/lib/api'
import { runScheduledTaskNow } from '@/lib/scheduler'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/scheduled-tasks/[id]/run-now - 立即执行定时任务
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查定时任务是否存在
    const existingTask = await prisma.scheduledTask.findFirst({
      where: {
        id,
        createdById: session.id,
      },
    })

    if (!existingTask) {
      return NextResponse.json(notFound('定时任务不存在'), { status: 404 })
    }

    // 立即执行
    const jobId = await runScheduledTaskNow(id)

    return NextResponse.json(
      success({
        message: '定时任务已加入执行队列',
        jobId,
      })
    )
  } catch (err) {
    console.error('Run scheduled task now error:', err)
    return NextResponse.json(internalError('立即执行定时任务失败'), { status: 500 })
  }
}
