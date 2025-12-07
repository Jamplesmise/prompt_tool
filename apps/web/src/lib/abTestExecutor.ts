// A/B 测试执行器

import { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import {
  ConcurrencyLimiter,
  executeWithRetry,
  executeWithTimeout,
  TimeoutError,
} from './concurrencyLimiter'
import { renderPrompt, extractExpectedOutput, buildMessages } from './promptRenderer'
import { invokeModel, ModelInvokeError } from './modelInvoker'
import type { ModelConfig } from './modelInvoker'
import { publishProgress, publishCompleted, publishFailed } from './progressPublisher'
import { executeInSandbox } from './sandbox'
import { runEvaluator } from '@platform/evaluators'
import type { EvaluatorConfig, EvaluatorInput, EvaluatorOutput } from '@platform/evaluators'
import type { TaskProgress, ResultStatus } from '@platform/shared'
import { chiSquareTest, determineWinner } from './statistics'

// A/B 测试配置
type ABTestConfig = {
  promptId: string
  promptVersionId: string
  modelId: string
}

// 加载的 A/B 测试任务数据
type LoadedABTestTask = {
  id: string
  config: {
    concurrency: number
    timeout: number // 超时时间（秒）
    retryCount: number
  }
  abTest: {
    id: string
    compareType: string
    configA: ABTestConfig
    configB: ABTestConfig
  }
  promptVersions: Map<string, string>  // promptVersionId -> content
  models: Map<string, ModelConfig>     // modelId -> ModelConfig
  evaluators: Array<{
    id: string
    config: EvaluatorConfig
  }>
  datasetRows: Array<{
    id: string
    rowIndex: number
    data: Record<string, unknown>
  }>
}

/**
 * 执行 A/B 测试任务
 */
export async function executeABTest(taskId: string): Promise<void> {
  const progress: TaskProgress = { total: 0, completed: 0, failed: 0 }

  try {
    // 加载任务数据
    const task = await loadABTestTask(taskId)
    if (!task) {
      throw new Error('A/B 测试任务不存在')
    }

    // 计算总执行项（每行数据需要执行 A 和 B 两次）
    progress.total = task.datasetRows.length

    // 更新任务状态
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        progress,
      },
    })

    // 创建并发控制器
    const limiter = new ConcurrencyLimiter(task.config.concurrency)

    // 统计结果
    let winsA = 0
    let winsB = 0
    let ties = 0

    // 执行 A/B 测试
    await Promise.all(
      task.datasetRows.map((row) =>
        limiter.execute(async () => {
          try {
            const result = await executeABTestRow(task, row)

            // 保存 A/B 测试结果
            await prisma.aBTestResult.create({
              data: {
                abTestId: task.abTest.id,
                rowIndex: row.rowIndex,
                resultAId: result.resultA.id,
                resultBId: result.resultB.id,
                winner: result.winner,
              },
            })

            // 更新统计
            if (result.winner === 'A') winsA++
            else if (result.winner === 'B') winsB++
            else ties++

            progress.completed++
          } catch {
            progress.failed++
          }

          // 更新进度
          await prisma.task.update({
            where: { id: taskId },
            data: { progress },
          })
          publishProgress(taskId, progress)
        })
      )
    )

    // 计算统计显著性
    const stats = chiSquareTest(winsA, winsB, ties)

    // 更新 A/B 测试汇总
    await prisma.aBTest.update({
      where: { id: task.abTest.id },
      data: {
        summary: {
          winsA,
          winsB,
          ties,
          total: progress.total,
          chiSquare: stats.chiSquare,
          pValue: stats.pValue,
          significant: stats.significant,
          winner: stats.winner,
          confidence: stats.confidence,
        },
      },
    })

    // 计算任务统计
    const taskStats = await calculateABTestStats(taskId)

    // 完成任务
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        progress,
        stats: taskStats,
      },
    })

    publishCompleted(taskId, taskStats)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: errorMessage,
        progress,
      },
    })
    publishFailed(taskId, errorMessage)
    throw error
  }
}

/**
 * 加载 A/B 测试任务数据
 */
async function loadABTestTask(taskId: string): Promise<LoadedABTestTask | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      abTest: true,
      models: {
        include: {
          model: {
            include: { provider: true },
          },
        },
      },
      evaluators: {
        include: { evaluator: true },
      },
      dataset: {
        include: {
          rows: { orderBy: { rowIndex: 'asc' } },
        },
      },
    },
  })

  if (!task || !task.abTest) return null

  const configA = task.abTest.configA as ABTestConfig
  const configB = task.abTest.configB as ABTestConfig

  // 获取提示词版本内容
  const versionIds = [...new Set([configA.promptVersionId, configB.promptVersionId])]
  const promptVersions = await prisma.promptVersion.findMany({
    where: { id: { in: versionIds } },
  })

  return {
    id: task.id,
    config: task.config as LoadedABTestTask['config'],
    abTest: {
      id: task.abTest.id,
      compareType: task.abTest.compareType,
      configA,
      configB,
    },
    promptVersions: new Map(promptVersions.map((v) => [v.id, v.content])),
    models: new Map(
      task.models.map((tm) => [
        tm.model.id,
        {
          id: tm.model.id,
          modelId: tm.model.modelId,
          provider: {
            type: tm.model.provider.type,
            baseUrl: tm.model.provider.baseUrl,
            apiKey: tm.model.provider.apiKey,
            headers: tm.model.provider.headers as Record<string, string>,
          },
          config: tm.model.config as Record<string, unknown>,
          pricing: tm.model.pricing as { inputPerMillion?: number; outputPerMillion?: number },
        },
      ])
    ),
    evaluators: task.evaluators.map((te) => ({
      id: te.evaluator.id,
      config: te.evaluator.config as EvaluatorConfig,
    })),
    datasetRows: task.dataset.rows.map((row) => ({
      id: row.id,
      rowIndex: row.rowIndex,
      data: row.data as Record<string, unknown>,
    })),
  }
}

/**
 * 执行单行 A/B 测试
 */
async function executeABTestRow(
  task: LoadedABTestTask,
  row: { id: string; rowIndex: number; data: Record<string, unknown> }
): Promise<{
  resultA: { id: string; passed: boolean; score?: number }
  resultB: { id: string; passed: boolean; score?: number }
  winner: 'A' | 'B' | 'tie'
}> {
  const configA = task.abTest.configA
  const configB = task.abTest.configB
  const expected = extractExpectedOutput(row.data)

  // 并行执行 A 和 B
  const [resultA, resultB] = await Promise.all([
    executeSingleConfig(task, configA, row, expected),
    executeSingleConfig(task, configB, row, expected),
  ])

  // 确定胜出者
  const winner = determineWinner(
    resultA.passed,
    resultB.passed,
    resultA.avgScore,
    resultB.avgScore
  )

  return {
    resultA: { id: resultA.id, passed: resultA.passed, score: resultA.avgScore },
    resultB: { id: resultB.id, passed: resultB.passed, score: resultB.avgScore },
    winner,
  }
}

/**
 * 执行单个配置
 */
async function executeSingleConfig(
  task: LoadedABTestTask,
  config: ABTestConfig,
  row: { id: string; rowIndex: number; data: Record<string, unknown> },
  expected: string | null
): Promise<{
  id: string
  passed: boolean
  avgScore?: number
}> {
  const promptContent = task.promptVersions.get(config.promptVersionId) ?? ''
  const model = task.models.get(config.modelId)!

  // 创建结果记录
  const taskResult = await prisma.taskResult.create({
    data: {
      taskId: task.id,
      datasetRowId: row.id,
      promptId: config.promptId,
      promptVersionId: config.promptVersionId,
      modelId: config.modelId,
      input: row.data as Prisma.InputJsonValue,
      expected: expected ?? null,
      status: 'PENDING',
    },
  })

  try {
    // 渲染提示词
    const rendered = renderPrompt(promptContent, row.data)
    const messages = buildMessages(rendered.content)

    // 调用模型
    const timeoutMs = (task.config.timeout ?? 180) * 1000
    const result = await executeWithRetry(
      () => executeWithTimeout(() => invokeModel(model, { messages }), timeoutMs),
      {
        retryCount: task.config.retryCount,
        shouldRetry: (error) => {
          if (error instanceof TimeoutError) return false
          if (error instanceof ModelInvokeError) {
            return ![400, 401, 403, 404].includes(error.statusCode ?? 0)
          }
          return true
        },
      }
    )

    // 更新结果
    await prisma.taskResult.update({
      where: { id: taskResult.id },
      data: {
        output: result.output,
        status: 'SUCCESS',
        latencyMs: result.latencyMs,
        tokens: result.tokens,
        cost: result.cost,
        costCurrency: result.costCurrency,
      },
    })

    // 执行评估
    const evaluationResults = await runEvaluations(task, taskResult.id, {
      input: JSON.stringify(row.data),
      output: result.output,
      expected: expected ?? null,
      metadata: row.data,
    })

    const allPassed = evaluationResults.every((e) => e.passed)
    const avgScore =
      evaluationResults.length > 0
        ? evaluationResults.reduce((sum, e) => sum + (e.score ?? 0), 0) / evaluationResults.length
        : undefined

    return { id: taskResult.id, passed: allPassed, avgScore }
  } catch (error) {
    let status: ResultStatus = 'ERROR'
    let errorMessage = '未知错误'

    if (error instanceof TimeoutError) {
      status = 'TIMEOUT'
      errorMessage = error.message
    } else if (error instanceof ModelInvokeError) {
      status = 'FAILED'
      errorMessage = error.message
    } else if (error instanceof Error) {
      errorMessage = error.message
    }

    await prisma.taskResult.update({
      where: { id: taskResult.id },
      data: { status, error: errorMessage },
    })

    return { id: taskResult.id, passed: false }
  }
}

/**
 * 执行评估
 */
async function runEvaluations(
  task: LoadedABTestTask,
  taskResultId: string,
  input: EvaluatorInput
): Promise<Array<{ passed: boolean; score?: number }>> {
  const results: Array<{ passed: boolean; score?: number }> = []

  for (const evaluator of task.evaluators) {
    const startTime = Date.now()
    let result: EvaluatorOutput

    try {
      result = await runEvaluator({
        config: evaluator.config,
        input,
        sandboxExecutor: executeInSandbox,
      })
    } catch (error) {
      result = {
        passed: false,
        score: 0,
        reason: `评估执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
      }
    }

    await prisma.evaluationResult.create({
      data: {
        taskResultId,
        evaluatorId: evaluator.id,
        passed: result.passed,
        score: result.score ?? null,
        reason: result.reason ?? null,
        details: (result.details ?? {}) as Prisma.InputJsonValue,
        latencyMs: Date.now() - startTime,
      },
    })

    results.push({ passed: result.passed, score: result.score ?? undefined })
  }

  return results
}

/**
 * 计算 A/B 测试任务统计
 */
async function calculateABTestStats(taskId: string) {
  const results = await prisma.taskResult.findMany({
    where: { taskId },
    include: { evaluations: true },
  })

  if (results.length === 0) return {}

  const latencies = results.filter((r) => r.latencyMs).map((r) => r.latencyMs!)
  const avgLatencyMs =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : undefined

  const totalTokens = results.reduce((sum, r) => {
    const tokens = r.tokens as { total?: number }
    return sum + (tokens.total ?? 0)
  }, 0)

  const totalCost = results.reduce((sum, r) => {
    return sum + (r.cost ? Number(r.cost) : 0)
  }, 0)

  return {
    avgLatencyMs,
    totalTokens,
    totalCost: totalCost > 0 ? totalCost : undefined,
  }
}
