import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, badRequest, internalError } from '@/lib/api'
import { getQueuedTaskStatus } from '@/lib/queue'
import type { TaskConfig } from '@platform/shared'
import { TaskStatus, TaskType } from '@prisma/client'

// 确保 Worker 在服务端启动
import '@/lib/queue/initWorker'

// GET /api/v1/tasks - 获取任务列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const keyword = searchParams.get('keyword')

    const where = {
      createdById: session.id,
      ...(status ? { status: status as TaskStatus } : {}),
      ...(type ? { type: type as TaskType } : {}),
      ...(keyword ? { name: { contains: keyword, mode: 'insensitive' as const } } : {}),
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          status: true,
          progress: true,
          stats: true,
          error: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
          dataset: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.task.count({ where }),
    ])

    // 获取队列中任务的位置信息
    const tasksWithQueue = await Promise.all(
      tasks.map(async (task) => {
        if (task.status === 'PENDING' || task.status === 'RUNNING') {
          try {
            const queueStatus = await getQueuedTaskStatus(task.id)
            return {
              ...task,
              queuePosition: queueStatus.position,
              queueState: queueStatus.state,
            }
          } catch {
            return task
          }
        }
        return task
      })
    )

    return NextResponse.json(
      success({
        list: tasksWithQueue,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get tasks error:', err)
    return NextResponse.json(internalError('获取任务列表失败'), { status: 500 })
  }
}

// 创建任务输入类型
type CreateTaskInput = {
  name: string
  description?: string
  config: {
    promptIds: string[]
    promptVersionIds: string[]
    modelIds: string[]
    datasetId: string
    evaluatorIds: string[]
    execution: {
      concurrency: number
      timeoutSeconds: number
      retryCount: number
    }
  }
}

// POST /api/v1/tasks - 创建任务
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = (await request.json()) as CreateTaskInput

    // 验证必填字段
    if (!body.name?.trim()) {
      return NextResponse.json(badRequest('任务名称不能为空'), { status: 400 })
    }
    if (!body.config?.promptIds?.length) {
      return NextResponse.json(badRequest('请选择至少一个提示词'), { status: 400 })
    }
    if (!body.config?.modelIds?.length) {
      return NextResponse.json(badRequest('请选择至少一个模型'), { status: 400 })
    }
    if (!body.config?.datasetId) {
      return NextResponse.json(badRequest('请选择数据集'), { status: 400 })
    }
    if (!body.config?.evaluatorIds?.length) {
      return NextResponse.json(badRequest('请选择至少一个评估器'), { status: 400 })
    }

    // 验证提示词和版本数量匹配
    if (body.config.promptIds.length !== body.config.promptVersionIds.length) {
      return NextResponse.json(badRequest('提示词和版本数量不匹配'), { status: 400 })
    }

    // 验证执行配置
    const execution = body.config.execution ?? {}
    const concurrency = Math.max(1, Math.min(20, execution.concurrency ?? 5))
    const timeoutSeconds = Math.max(10, Math.min(300, execution.timeoutSeconds ?? 30))
    const retryCount = Math.max(0, Math.min(5, execution.retryCount ?? 3))

    // 验证关联资源存在
    const [dataset, prompts, models, evaluators] = await Promise.all([
      prisma.dataset.findUnique({
        where: { id: body.config.datasetId },
        include: { rows: { select: { id: true } } },
      }),
      prisma.prompt.findMany({
        where: { id: { in: body.config.promptIds } },
      }),
      prisma.model.findMany({
        where: { id: { in: body.config.modelIds }, isActive: true },
      }),
      prisma.evaluator.findMany({
        where: { id: { in: body.config.evaluatorIds } },
      }),
    ])

    if (!dataset) {
      return NextResponse.json(badRequest('数据集不存在'), { status: 400 })
    }
    if (dataset.rows.length === 0) {
      return NextResponse.json(badRequest('数据集为空'), { status: 400 })
    }
    if (prompts.length !== body.config.promptIds.length) {
      return NextResponse.json(badRequest('部分提示词不存在'), { status: 400 })
    }
    if (models.length !== body.config.modelIds.length) {
      return NextResponse.json(badRequest('部分模型不存在或未启用'), { status: 400 })
    }
    if (evaluators.length !== body.config.evaluatorIds.length) {
      return NextResponse.json(badRequest('部分评估器不存在'), { status: 400 })
    }

    // 验证提示词版本存在
    const promptVersions = await prisma.promptVersion.findMany({
      where: { id: { in: body.config.promptVersionIds } },
    })
    if (promptVersions.length !== body.config.promptVersionIds.length) {
      return NextResponse.json(badRequest('部分提示词版本不存在'), { status: 400 })
    }

    // 计算预估总数
    const totalCount = body.config.promptIds.length * body.config.modelIds.length * dataset.rows.length

    // 创建任务（事务）
    const task = await prisma.$transaction(async (tx) => {
      // 1. 创建任务
      const taskConfig: TaskConfig = {
        concurrency,
        timeout: timeoutSeconds,
        retryCount,
      }

      const newTask = await tx.task.create({
        data: {
          name: body.name.trim(),
          description: body.description?.trim() || null,
          datasetId: body.config.datasetId,
          config: taskConfig,
          progress: { total: totalCount, completed: 0, failed: 0 },
          createdById: session.id,
        },
      })

      // 2. 创建任务-提示词关联
      await tx.taskPrompt.createMany({
        data: body.config.promptIds.map((promptId, index) => ({
          taskId: newTask.id,
          promptId,
          promptVersionId: body.config.promptVersionIds[index],
        })),
      })

      // 3. 创建任务-模型关联
      await tx.taskModel.createMany({
        data: body.config.modelIds.map((modelId) => ({
          taskId: newTask.id,
          modelId,
        })),
      })

      // 4. 创建任务-评估器关联
      await tx.taskEvaluator.createMany({
        data: body.config.evaluatorIds.map((evaluatorId) => ({
          taskId: newTask.id,
          evaluatorId,
        })),
      })

      return newTask
    })

    return NextResponse.json(success(task), { status: 201 })
  } catch (err) {
    console.error('Create task error:', err)
    return NextResponse.json(internalError('创建任务失败'), { status: 500 })
  }
}
