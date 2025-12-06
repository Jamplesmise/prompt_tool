import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'
import { isTaskRunning } from '@/lib/taskExecutor'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/tasks/:id - 获取任务详情
export async function GET(_request: NextRequest, { params }: RouteParams) {
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
      include: {
        dataset: {
          select: {
            id: true,
            name: true,
            rowCount: true,
          },
        },
        prompts: {
          include: {
            prompt: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        models: {
          include: {
            model: {
              select: {
                id: true,
                name: true,
                modelId: true,
                provider: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
        evaluators: {
          include: {
            evaluator: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    })

    if (!task) {
      return NextResponse.json(notFound('任务不存在'), { status: 404 })
    }

    // 获取提示词版本信息
    const promptVersionIds = task.prompts.map((p) => p.promptVersionId)
    const promptVersions = await prisma.promptVersion.findMany({
      where: { id: { in: promptVersionIds } },
      select: {
        id: true,
        version: true,
        promptId: true,
      },
    })

    const versionMap = new Map(promptVersions.map((v) => [v.id, v]))

    // 格式化响应
    const response = {
      ...task,
      prompts: task.prompts.map((tp) => ({
        promptId: tp.promptId,
        promptName: tp.prompt.name,
        promptVersionId: tp.promptVersionId,
        version: versionMap.get(tp.promptVersionId)?.version,
      })),
      models: task.models.map((tm) => ({
        modelId: tm.model.id,
        modelName: tm.model.name,
        modelIdentifier: tm.model.modelId,
        providerName: tm.model.provider.name,
        providerType: tm.model.provider.type,
      })),
      evaluators: task.evaluators.map((te) => ({
        evaluatorId: te.evaluator.id,
        evaluatorName: te.evaluator.name,
        evaluatorType: te.evaluator.type,
      })),
    }

    return NextResponse.json(success(response))
  } catch (err) {
    console.error('Get task error:', err)
    return NextResponse.json(internalError('获取任务详情失败'), { status: 500 })
  }
}

// DELETE /api/v1/tasks/:id - 删除任务
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

    // 检查任务是否正在运行
    if (task.status === 'RUNNING' || isTaskRunning(id)) {
      return NextResponse.json(badRequest('正在运行的任务无法删除'), { status: 400 })
    }

    // 删除任务（级联删除关联数据）
    await prisma.task.delete({
      where: { id },
    })

    return NextResponse.json(success(null))
  } catch (err) {
    console.error('Delete task error:', err)
    return NextResponse.json(internalError('删除任务失败'), { status: 500 })
  }
}
