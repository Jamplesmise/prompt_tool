import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, internalError } from '@/lib/api'
import { enableScheduledTask, disableScheduledTask } from '@/lib/scheduler'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/scheduled-tasks/[id]/toggle - 启用/禁用定时任务
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

    // 切换状态
    if (existingTask.isActive) {
      await disableScheduledTask(id)
    } else {
      await enableScheduledTask(id)
    }

    // 获取更新后的任务
    const updatedTask = await prisma.scheduledTask.findUnique({
      where: { id },
      include: {
        taskTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(success(updatedTask))
  } catch (err) {
    console.error('Toggle scheduled task error:', err)
    return NextResponse.json(internalError('切换定时任务状态失败'), { status: 500 })
  }
}
