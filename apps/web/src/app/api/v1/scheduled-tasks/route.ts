import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, badRequest, internalError } from '@/lib/api'
import { scheduleTask, validateCronExpression } from '@/lib/scheduler'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// GET /api/v1/scheduled-tasks - 获取定时任务列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const isActive = searchParams.get('isActive')
    const keyword = searchParams.get('keyword')

    const where = {
      createdById: session.id,
      ...(isActive !== null && isActive !== '' ? { isActive: isActive === 'true' } : {}),
      ...(keyword ? { name: { contains: keyword, mode: 'insensitive' as const } } : {}),
    }

    const [scheduledTasks, total] = await Promise.all([
      prisma.scheduledTask.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          cronExpression: true,
          timezone: true,
          isActive: true,
          lastRunAt: true,
          nextRunAt: true,
          createdAt: true,
          updatedAt: true,
          taskTemplate: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              executions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.scheduledTask.count({ where }),
    ])

    return NextResponse.json(
      success({
        list: scheduledTasks,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get scheduled tasks error:', err)
    return NextResponse.json(internalError('获取定时任务列表失败'), { status: 500 })
  }
}

// 创建定时任务输入类型
type CreateScheduledTaskInput = {
  name: string
  description?: string
  taskTemplateId: string
  cronExpression: string
  timezone?: string
  isActive?: boolean
}

// POST /api/v1/scheduled-tasks - 创建定时任务
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = (await request.json()) as CreateScheduledTaskInput

    // 验证必填字段
    if (!body.name?.trim()) {
      return NextResponse.json(badRequest('定时任务名称不能为空'), { status: 400 })
    }
    if (!body.taskTemplateId) {
      return NextResponse.json(badRequest('请选择任务模板'), { status: 400 })
    }
    if (!body.cronExpression?.trim()) {
      return NextResponse.json(badRequest('Cron 表达式不能为空'), { status: 400 })
    }

    // 验证 Cron 表达式
    const cronValidation = validateCronExpression(body.cronExpression)
    if (!cronValidation.isValid) {
      return NextResponse.json(
        badRequest(`无效的 Cron 表达式: ${cronValidation.error}`),
        { status: 400 }
      )
    }

    // 验证任务模板存在
    const taskTemplate = await prisma.task.findFirst({
      where: {
        id: body.taskTemplateId,
        createdById: session.id,
        status: 'COMPLETED', // 只能选择已完成的任务作为模板
      },
    })

    if (!taskTemplate) {
      return NextResponse.json(
        badRequest('任务模板不存在或未完成'),
        { status: 400 }
      )
    }

    // 创建定时任务
    const scheduledTask = await prisma.scheduledTask.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        taskTemplateId: body.taskTemplateId,
        cronExpression: body.cronExpression.trim(),
        timezone: body.timezone || 'Asia/Shanghai',
        isActive: body.isActive ?? true,
        createdById: session.id,
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

    // 如果启用，立即调度
    if (scheduledTask.isActive) {
      await scheduleTask(scheduledTask.id)
    }

    return NextResponse.json(success(scheduledTask), { status: 201 })
  } catch (err) {
    console.error('Create scheduled task error:', err)
    return NextResponse.json(internalError('创建定时任务失败'), { status: 500 })
  }
}
