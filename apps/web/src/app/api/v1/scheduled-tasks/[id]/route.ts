import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'
import {
  scheduleTask,
  removeScheduledJob,
  validateCronExpression,
} from '@/lib/scheduler'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/scheduled-tasks/[id] - 获取定时任务详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const scheduledTask = await prisma.scheduledTask.findFirst({
      where: {
        id,
        createdById: session.id,
      },
      include: {
        taskTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            config: true,
            dataset: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            task: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!scheduledTask) {
      return NextResponse.json(notFound('定时任务不存在'), { status: 404 })
    }

    return NextResponse.json(success(scheduledTask))
  } catch (err) {
    console.error('Get scheduled task error:', err)
    return NextResponse.json(internalError('获取定时任务详情失败'), { status: 500 })
  }
}

// 更新定时任务输入类型
type UpdateScheduledTaskInput = {
  name?: string
  description?: string
  cronExpression?: string
  timezone?: string
}

// PUT /api/v1/scheduled-tasks/[id] - 更新定时任务
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = (await request.json()) as UpdateScheduledTaskInput

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

    // 验证 Cron 表达式（如果提供）
    if (body.cronExpression) {
      const cronValidation = validateCronExpression(body.cronExpression)
      if (!cronValidation.isValid) {
        return NextResponse.json(
          badRequest(`无效的 Cron 表达式: ${cronValidation.error}`),
          { status: 400 }
        )
      }
    }

    // 更新定时任务
    const updatedTask = await prisma.scheduledTask.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.cronExpression !== undefined && { cronExpression: body.cronExpression.trim() }),
        ...(body.timezone !== undefined && { timezone: body.timezone }),
      },
      include: {
        taskTemplate: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // 如果 Cron 表达式变更且任务是启用的，重新调度
    if (body.cronExpression && existingTask.isActive) {
      await removeScheduledJob(id)
      await scheduleTask(id)
    }

    return NextResponse.json(success(updatedTask))
  } catch (err) {
    console.error('Update scheduled task error:', err)
    return NextResponse.json(internalError('更新定时任务失败'), { status: 500 })
  }
}

// DELETE /api/v1/scheduled-tasks/[id] - 删除定时任务
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 移除调度 Job
    await removeScheduledJob(id)

    // 删除定时任务（级联删除执行记录）
    await prisma.scheduledTask.delete({
      where: { id },
    })

    return NextResponse.json(success({ deleted: true }))
  } catch (err) {
    console.error('Delete scheduled task error:', err)
    return NextResponse.json(internalError('删除定时任务失败'), { status: 500 })
  }
}
