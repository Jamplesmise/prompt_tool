// 任务执行器 - 任务执行引擎核心

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
import {
  publishProgress,
  publishCompleted,
  publishFailed,
  publishStopped,
} from './progressPublisher'
import { executeInSandbox } from './sandbox'
import { runEvaluator } from '@platform/evaluators'
import type { EvaluatorConfig } from '@platform/evaluators'
import type { EvaluatorInput, EvaluatorOutput } from '@platform/evaluators'
import type { TaskProgress, TaskStats, ResultStatus } from '@platform/shared'
import type { Decimal } from '@prisma/client/runtime/library'

// 执行计划项
export type ExecutionPlanItem = {
  promptId: string
  promptVersionId: string
  promptContent: string
  modelId: string
  datasetRowId: string
  rowIndex: number
  rowData: Record<string, unknown>
  expected: string | null
}

// 任务执行配置
export type TaskExecutionConfig = {
  concurrency: number
  timeoutSeconds: number
  retryCount: number
}

// 加载的任务数据
type LoadedTask = {
  id: string
  name: string
  datasetId: string
  config: TaskExecutionConfig
  prompts: Array<{
    promptId: string
    promptVersionId: string
    promptContent: string
  }>
  models: ModelConfig[]
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

// 运行中的任务 Map
const runningTasks = new Map<string, TaskExecutor>()

/**
 * 任务执行器类
 */
export class TaskExecutor {
  private shouldStop = false
  private runningCount = 0
  private progress: TaskProgress = { total: 0, completed: 0, failed: 0 }

  constructor(private readonly taskId: string) {}

  /**
   * 请求停止执行
   */
  async stop(): Promise<void> {
    this.shouldStop = true
    // 等待所有正在执行的任务完成
    const maxWaitTime = 30000 // 30 秒
    const startTime = Date.now()
    while (this.runningCount > 0 && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  /**
   * 执行任务
   */
  async execute(): Promise<void> {
    try {
      // 加载任务数据
      const task = await this.loadTask()
      if (!task) {
        throw new Error('任务不存在')
      }

      // 生成执行计划
      const plan = this.generateExecutionPlan(task)
      this.progress.total = plan.length

      if (plan.length === 0) {
        throw new Error('执行计划为空，请检查提示词、模型和数据集配置')
      }

      // 更新任务状态为运行中
      await prisma.task.update({
        where: { id: this.taskId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
          progress: this.progress,
        },
      })

      // 创建并发控制器
      const limiter = new ConcurrencyLimiter(task.config.concurrency)

      // 执行所有测试
      await Promise.all(
        plan.map((item) =>
          limiter.execute(() => this.executeSingleTest(task, item))
        )
      )

      // 检查是否被停止
      if (this.shouldStop) {
        await this.handleStopped()
        return
      }

      // 计算统计数据并完成任务
      await this.handleCompleted()
    } catch (error) {
      await this.handleFailed(error)
    } finally {
      runningTasks.delete(this.taskId)
    }
  }

  /**
   * 加载任务数据
   */
  private async loadTask(): Promise<LoadedTask | null> {
    const task = await prisma.task.findUnique({
      where: { id: this.taskId },
      include: {
        prompts: {
          include: {
            prompt: true,
          },
        },
        models: {
          include: {
            model: {
              include: {
                provider: true,
              },
            },
          },
        },
        evaluators: {
          include: {
            evaluator: true,
          },
        },
        dataset: {
          include: {
            rows: {
              orderBy: { rowIndex: 'asc' },
            },
          },
        },
      },
    })

    if (!task) {
      return null
    }

    // 获取提示词版本内容
    const promptVersions = await prisma.promptVersion.findMany({
      where: {
        id: { in: task.prompts.map((p) => p.promptVersionId) },
      },
    })

    const versionMap = new Map(promptVersions.map((v) => [v.id, v]))

    return {
      id: task.id,
      name: task.name,
      datasetId: task.datasetId,
      config: task.config as TaskExecutionConfig,
      prompts: task.prompts.map((tp) => ({
        promptId: tp.promptId,
        promptVersionId: tp.promptVersionId,
        promptContent: versionMap.get(tp.promptVersionId)?.content ?? '',
      })),
      models: task.models.map((tm) => ({
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
      })),
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
   * 生成执行计划（笛卡尔积）
   */
  private generateExecutionPlan(task: LoadedTask): ExecutionPlanItem[] {
    const plan: ExecutionPlanItem[] = []

    for (const prompt of task.prompts) {
      for (const model of task.models) {
        for (const row of task.datasetRows) {
          plan.push({
            promptId: prompt.promptId,
            promptVersionId: prompt.promptVersionId,
            promptContent: prompt.promptContent,
            modelId: model.id,
            datasetRowId: row.id,
            rowIndex: row.rowIndex,
            rowData: row.data,
            expected: extractExpectedOutput(row.data),
          })
        }
      }
    }

    return plan
  }

  /**
   * 执行单条测试
   */
  private async executeSingleTest(
    task: LoadedTask,
    item: ExecutionPlanItem
  ): Promise<void> {
    if (this.shouldStop) return

    this.runningCount++

    // 创建待处理的结果记录
    const taskResult = await prisma.taskResult.create({
      data: {
        taskId: this.taskId,
        datasetRowId: item.datasetRowId,
        promptId: item.promptId,
        promptVersionId: item.promptVersionId,
        modelId: item.modelId,
        input: item.rowData as Prisma.InputJsonValue,
        expected: item.expected ?? null,
        status: 'PENDING',
      },
    })

    try {
      // 1. 渲染提示词
      const rendered = renderPrompt(item.promptContent, item.rowData)
      const messages = buildMessages(rendered.content)

      // 2. 调用模型（带重试和超时）
      const model = task.models.find((m) => m.id === item.modelId)!
      const timeoutMs = task.config.timeoutSeconds * 1000

      const result = await executeWithRetry(
        () =>
          executeWithTimeout(
            () => invokeModel(model, { messages }),
            timeoutMs
          ),
        {
          retryCount: task.config.retryCount,
          shouldRetry: (error) => {
            // 不重试超时错误和特定 HTTP 错误
            if (error instanceof TimeoutError) return false
            if (error instanceof ModelInvokeError) {
              return ![400, 401, 403, 404].includes(error.statusCode ?? 0)
            }
            return true
          },
        }
      )

      // 3. 保存结果
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

      // 4. 执行评估
      await this.runEvaluations(task, taskResult.id, {
        input: JSON.stringify(item.rowData),
        output: result.output,
        expected: item.expected ?? null,
        metadata: item.rowData,
      })

      // 5. 更新进度
      this.progress.completed++
    } catch (error) {
      // 处理失败
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
        data: {
          status,
          error: errorMessage,
        },
      })

      this.progress.failed++
    } finally {
      this.runningCount--

      // 更新并发布进度
      await this.updateProgress()
    }
  }

  /**
   * 执行评估
   */
  private async runEvaluations(
    task: LoadedTask,
    taskResultId: string,
    input: EvaluatorInput
  ): Promise<void> {
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
    }
  }

  /**
   * 更新进度
   */
  private async updateProgress(): Promise<void> {
    await prisma.task.update({
      where: { id: this.taskId },
      data: { progress: this.progress },
    })

    publishProgress(this.taskId, this.progress)
  }

  /**
   * 处理任务完成
   */
  private async handleCompleted(): Promise<void> {
    const stats = await this.calculateStats()

    await prisma.task.update({
      where: { id: this.taskId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        progress: this.progress,
        stats,
      },
    })

    publishCompleted(this.taskId, stats)
  }

  /**
   * 处理任务停止
   */
  private async handleStopped(): Promise<void> {
    const stats = await this.calculateStats()

    await prisma.task.update({
      where: { id: this.taskId },
      data: {
        status: 'STOPPED',
        completedAt: new Date(),
        progress: this.progress,
        stats,
      },
    })

    publishStopped(this.taskId)
  }

  /**
   * 处理任务失败
   */
  private async handleFailed(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : '未知错误'

    await prisma.task.update({
      where: { id: this.taskId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: errorMessage,
        progress: this.progress,
      },
    })

    publishFailed(this.taskId, errorMessage)
  }

  /**
   * 计算统计数据
   */
  private async calculateStats(): Promise<TaskStats> {
    // 获取所有结果
    const results = await prisma.taskResult.findMany({
      where: { taskId: this.taskId },
      include: {
        evaluations: true,
      },
    })

    if (results.length === 0) {
      return {}
    }

    // 计算平均延迟
    const latencies = results
      .filter((r) => r.latencyMs !== null)
      .map((r) => r.latencyMs!)
    const avgLatencyMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : undefined

    // 计算总 Token
    const totalTokens = results.reduce((sum, r) => {
      const tokens = r.tokens as { total?: number }
      return sum + (tokens.total ?? 0)
    }, 0)

    // 计算总费用
    const totalCost = results.reduce((sum, r) => {
      const cost = r.cost as Decimal | null
      return sum + (cost ? Number(cost) : 0)
    }, 0)

    // 计算通过率（基于评估结果）
    const resultsWithEvaluations = results.filter(
      (r) => r.evaluations.length > 0 && r.status === 'SUCCESS'
    )
    const passedCount = resultsWithEvaluations.filter((r) =>
      r.evaluations.every((e) => e.passed)
    ).length

    const passRate =
      resultsWithEvaluations.length > 0
        ? passedCount / resultsWithEvaluations.length
        : undefined

    return {
      avgLatencyMs,
      totalTokens,
      totalCost: totalCost > 0 ? totalCost : undefined,
      passRate,
    }
  }
}

/**
 * 启动任务执行
 */
export async function startTaskExecution(taskId: string): Promise<void> {
  // 检查任务是否已在运行
  if (runningTasks.has(taskId)) {
    throw new Error('任务已在执行中')
  }

  // 检查任务状态
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  })

  if (!task) {
    throw new Error('任务不存在')
  }

  if (task.status !== 'PENDING') {
    throw new Error(`任务状态不允许启动: ${task.status}`)
  }

  // 创建执行器并启动
  const executor = new TaskExecutor(taskId)
  runningTasks.set(taskId, executor)

  // 异步执行（不等待完成）
  executor.execute().catch((error) => {
    console.error(`任务 ${taskId} 执行异常:`, error)
  })
}

/**
 * 停止任务执行
 */
export async function stopTaskExecution(taskId: string): Promise<void> {
  const executor = runningTasks.get(taskId)
  if (!executor) {
    throw new Error('任务未在执行中')
  }

  await executor.stop()
}

/**
 * 重试任务失败用例
 */
export async function retryFailedResults(taskId: string): Promise<void> {
  // 获取失败的结果
  const failedResults = await prisma.taskResult.findMany({
    where: {
      taskId,
      status: { in: ['FAILED', 'TIMEOUT', 'ERROR'] },
    },
  })

  if (failedResults.length === 0) {
    throw new Error('没有需要重试的失败用例')
  }

  // 重置失败结果状态
  await prisma.taskResult.updateMany({
    where: {
      id: { in: failedResults.map((r) => r.id) },
    },
    data: {
      status: 'PENDING',
      error: null,
      output: null,
      latencyMs: null,
      tokens: { input: 0, output: 0, total: 0 },
      cost: null,
    },
  })

  // 删除相关评估结果
  await prisma.evaluationResult.deleteMany({
    where: {
      taskResultId: { in: failedResults.map((r) => r.id) },
    },
  })

  // 更新任务状态和进度
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  })

  if (task) {
    const progress = task.progress as TaskProgress
    progress.failed = 0
    progress.completed -= failedResults.length

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'PENDING',
        progress,
        error: null,
        completedAt: null,
      },
    })
  }
}

/**
 * 检查任务是否正在运行
 */
export function isTaskRunning(taskId: string): boolean {
  return runningTasks.has(taskId)
}
