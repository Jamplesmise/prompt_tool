import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, badRequest, internalError } from '@/lib/api'

// A/B 测试配置类型
type ABTestConfig = {
  promptId: string
  promptVersionId: string
  modelId: string
}

// POST /api/v1/tasks/ab - 创建 A/B 测试任务
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      description,
      compareType,
      configA,
      configB,
      datasetId,
      evaluatorIds,
      execution,
    } = body as {
      name: string
      description?: string
      compareType: 'prompt' | 'model'
      configA: ABTestConfig
      configB: ABTestConfig
      datasetId: string
      evaluatorIds: string[]
      execution: {
        concurrency: number
        timeoutSeconds: number
        retryCount: number
      }
    }

    // 验证参数
    if (!name || !compareType || !configA || !configB || !datasetId) {
      return NextResponse.json(
        badRequest('缺少必要参数'),
        { status: 400 }
      )
    }

    // 验证对比类型
    if (compareType === 'prompt') {
      // 提示词对比：模型必须相同
      if (configA.modelId !== configB.modelId) {
        return NextResponse.json(
          badRequest('提示词对比模式下，模型必须相同'),
          { status: 400 }
        )
      }
      // 提示词必须不同
      if (configA.promptVersionId === configB.promptVersionId) {
        return NextResponse.json(
          badRequest('提示词对比模式下，提示词版本必须不同'),
          { status: 400 }
        )
      }
    } else if (compareType === 'model') {
      // 模型对比：提示词必须相同
      if (configA.promptVersionId !== configB.promptVersionId) {
        return NextResponse.json(
          badRequest('模型对比模式下，提示词版本必须相同'),
          { status: 400 }
        )
      }
      // 模型必须不同
      if (configA.modelId === configB.modelId) {
        return NextResponse.json(
          badRequest('模型对比模式下，模型必须不同'),
          { status: 400 }
        )
      }
    }

    // 验证数据集
    const dataset = await prisma.dataset.findUnique({ where: { id: datasetId } })
    if (!dataset) {
      return NextResponse.json(badRequest('数据集不存在'), { status: 400 })
    }

    // 创建任务和 A/B 测试记录（事务）
    const result = await prisma.$transaction(async (tx) => {
      // 收集所有涉及的提示词和模型
      const promptIds = [...new Set([configA.promptId, configB.promptId])]
      const promptVersionIds = [...new Set([configA.promptVersionId, configB.promptVersionId])]
      const modelIds = [...new Set([configA.modelId, configB.modelId])]

      // 创建任务
      const task = await tx.task.create({
        data: {
          name,
          description,
          type: 'AB_TEST',
          status: 'PENDING',
          config: {
            concurrency: execution?.concurrency ?? 5,
            timeoutSeconds: execution?.timeoutSeconds ?? 60,
            retryCount: execution?.retryCount ?? 2,
          },
          datasetId,
          createdById: session.id,
        },
      })

      // 创建任务-提示词关联
      for (let i = 0; i < promptIds.length; i++) {
        await tx.taskPrompt.create({
          data: {
            taskId: task.id,
            promptId: promptIds[i],
            promptVersionId: promptVersionIds[i],
          },
        })
      }

      // 创建任务-模型关联
      for (const modelId of modelIds) {
        await tx.taskModel.create({
          data: {
            taskId: task.id,
            modelId,
          },
        })
      }

      // 创建任务-评估器关联
      if (evaluatorIds?.length > 0) {
        for (const evaluatorId of evaluatorIds) {
          await tx.taskEvaluator.create({
            data: {
              taskId: task.id,
              evaluatorId,
            },
          })
        }
      }

      // 创建 A/B 测试记录
      const abTest = await tx.aBTest.create({
        data: {
          taskId: task.id,
          compareType,
          configA,
          configB,
        },
      })

      return { task, abTest }
    })

    return NextResponse.json(success({
      id: result.task.id,
      abTestId: result.abTest.id,
      name: result.task.name,
      type: result.task.type,
      status: result.task.status,
      compareType: result.abTest.compareType,
    }))
  } catch (err) {
    console.error('Create A/B test error:', err)
    const errorMessage = err instanceof Error ? err.message : '创建 A/B 测试失败'
    return NextResponse.json(internalError(errorMessage), { status: 500 })
  }
}
