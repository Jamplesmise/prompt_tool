// BullMQ 任务 Worker

import { Worker, Job } from 'bullmq'
import { Prisma } from '@prisma/client'
import { redis, BULLMQ_PREFIX } from '../redis'
import { prisma } from '../prisma'
import {
  ConcurrencyLimiter,
  executeWithRetry,
  executeWithTimeout,
  TimeoutError,
} from '../concurrencyLimiter'
import { renderPrompt, extractExpectedOutput, buildMessages } from '../promptRenderer'
import { invokeModel, ModelInvokeError } from '../modelInvoker'
import type { ModelConfig } from '../modelInvoker'
import {
  publishProgress,
  publishCompleted,
  publishFailed,
  publishStopped,
} from '../progressPublisher'
import { executeInSandbox } from '../sandbox'
import { runEvaluator } from '@platform/evaluators'
import type { EvaluatorConfig } from '@platform/evaluators'
import type { EvaluatorInput, EvaluatorOutput } from '@platform/evaluators'
import type { TaskProgress, TaskStats, ResultStatus } from '@platform/shared'
import type { Decimal } from '@prisma/client/runtime/library'
import {
  TASK_QUEUE_NAME,
  type TaskJobData,
  type TaskJobResult,
} from './taskQueue'
import {
  initProgress,
  addCompletedItem,
  addFailedItem,
  getProgress,
  deleteProgress,
  saveCheckpoint,
} from './progressStore'
import { executeABTest } from '../abTestExecutor'

// Worker 配置
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10)

// 执行计划项（带 ID）
type ExecutionPlanItem = {
  id: string  // 用于断点续跑的唯一标识
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
type TaskExecutionConfig = {
  concurrency: number
  timeout: number // 超时时间（秒）
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

// 停止信号 Map
const stopSignals = new Map<string, boolean>()

/**
 * 请求停止任务
 */
export function requestStop(taskId: string): void {
  stopSignals.set(taskId, true)
}

/**
 * 检查是否应该停止
 */
function shouldStop(taskId: string): boolean {
  return stopSignals.get(taskId) ?? false
}

/**
 * 清除停止信号
 */
function clearStopSignal(taskId: string): void {
  stopSignals.delete(taskId)
}

/**
 * 任务处理函数
 */
async function processTask(job: Job<TaskJobData, TaskJobResult>): Promise<TaskJobResult> {
  const { taskId, resumeFrom } = job.data
  const progress: TaskProgress = { total: 0, completed: 0, failed: 0 }

  try {
    // 先检查任务类型
    const taskInfo = await prisma.task.findUnique({
      where: { id: taskId },
      select: { type: true },
    })

    if (!taskInfo) {
      throw new Error('任务不存在')
    }

    // A/B 测试任务使用专门的执行器
    if (taskInfo.type === 'AB_TEST') {
      await executeABTest(taskId)
      return { taskId, status: 'completed' }
    }

    // 加载普通任务数据
    const task = await loadTask(taskId)
    if (!task) {
      throw new Error('任务不存在')
    }

    // 生成执行计划
    const fullPlan = generateExecutionPlan(task)
    progress.total = fullPlan.length

    if (fullPlan.length === 0) {
      throw new Error('执行计划为空，请检查提示词、模型和数据集配置')
    }

    // 确定要执行的计划（考虑断点续跑）
    let plan = fullPlan
    if (resumeFrom) {
      const existingProgress = await getProgress(taskId)
      if (existingProgress) {
        const completedSet = new Set(existingProgress.completed)
        plan = fullPlan.filter(item => !completedSet.has(item.id))
        progress.completed = existingProgress.completed.length
        progress.failed = existingProgress.failed.length
      }
    } else {
      // 初始化进度存储
      await initProgress(taskId, fullPlan.map(item => item.id))
    }

    // 更新任务状态为运行中
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

    // 执行所有测试
    await Promise.all(
      plan.map((item) =>
        limiter.execute(async () => {
          if (shouldStop(taskId)) return

          try {
            await executeSingleTest(job, task, item, progress)
            await addCompletedItem(taskId, item.id)
            progress.completed++
          } catch {
            await addFailedItem(taskId, item.id)
            progress.failed++
          }

          // 更新 Job 进度
          const percent = Math.round(
            ((progress.completed + progress.failed) / progress.total) * 100
          )
          await job.updateProgress(percent)

          // 发布进度
          await updateProgress(taskId, progress)
        })
      )
    )

    // 检查是否被停止
    if (shouldStop(taskId)) {
      await handleStopped(taskId, progress)
      clearStopSignal(taskId)
      return { taskId, status: 'stopped' }
    }

    // 完成任务
    await handleCompleted(taskId, progress)
    await deleteProgress(taskId)

    return { taskId, status: 'completed' }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    await handleFailed(taskId, progress, errorMessage)

    return { taskId, status: 'failed', error: errorMessage }
  } finally {
    clearStopSignal(taskId)
  }
}

/**
 * 加载任务数据
 */
async function loadTask(taskId: string): Promise<LoadedTask | null> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
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
 * 生成执行计划（笛卡尔积，带唯一 ID）
 */
function generateExecutionPlan(task: LoadedTask): ExecutionPlanItem[] {
  const plan: ExecutionPlanItem[] = []

  for (const prompt of task.prompts) {
    for (const model of task.models) {
      for (const row of task.datasetRows) {
        // 生成唯一 ID：promptVersionId-modelId-datasetRowId
        const id = `${prompt.promptVersionId}-${model.id}-${row.id}`
        plan.push({
          id,
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
async function executeSingleTest(
  job: Job<TaskJobData, TaskJobResult>,
  task: LoadedTask,
  item: ExecutionPlanItem,
  progress: TaskProgress
): Promise<void> {
  const { taskId } = job.data

  // 创建待处理的结果记录
  const taskResult = await prisma.taskResult.create({
    data: {
      taskId,
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
    const timeoutMs = (task.config.timeout ?? 180) * 1000

    const result = await executeWithRetry(
      () =>
        executeWithTimeout(
          () => invokeModel(model, { messages }),
          timeoutMs
        ),
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
    await runEvaluations(task, taskResult.id, {
      input: JSON.stringify(item.rowData),
      output: result.output,
      expected: item.expected ?? null,
      metadata: item.rowData,
    })
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

    throw error  // 重新抛出以便上层处理
  }
}

/**
 * 执行评估
 */
async function runEvaluations(
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
async function updateProgress(taskId: string, progress: TaskProgress): Promise<void> {
  await prisma.task.update({
    where: { id: taskId },
    data: { progress },
  })

  publishProgress(taskId, progress)
}

/**
 * 计算统计数据
 */
async function calculateStats(taskId: string): Promise<TaskStats> {
  const results = await prisma.taskResult.findMany({
    where: { taskId },
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

  // 计算通过率
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

/**
 * 处理任务完成
 */
async function handleCompleted(taskId: string, progress: TaskProgress): Promise<void> {
  const stats = await calculateStats(taskId)

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      progress,
      stats,
    },
  })

  publishCompleted(taskId, stats)
}

/**
 * 处理任务停止
 */
async function handleStopped(taskId: string, progress: TaskProgress): Promise<void> {
  const stats = await calculateStats(taskId)

  // 保存检查点
  await saveCheckpoint(taskId, {
    lastUpdated: new Date().toISOString(),
    completedItems: (await getProgress(taskId))?.completed ?? [],
    failedItems: (await getProgress(taskId))?.failed ?? [],
    currentProgress: progress,
  })

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'STOPPED',
      completedAt: new Date(),
      progress,
      stats,
    },
  })

  publishStopped(taskId)
}

/**
 * 处理任务失败
 */
async function handleFailed(
  taskId: string,
  progress: TaskProgress,
  errorMessage: string
): Promise<void> {
  // 保存检查点
  await saveCheckpoint(taskId, {
    lastUpdated: new Date().toISOString(),
    completedItems: (await getProgress(taskId))?.completed ?? [],
    failedItems: (await getProgress(taskId))?.failed ?? [],
    currentProgress: progress,
  })

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
}

/**
 * 创建 Worker 实例
 */
export function createTaskWorker(): Worker<TaskJobData, TaskJobResult> {
  const worker = new Worker<TaskJobData, TaskJobResult>(
    TASK_QUEUE_NAME,
    processTask,
    {
      connection: redis,
      prefix: BULLMQ_PREFIX,  // 与队列保持一致
      concurrency: WORKER_CONCURRENCY,
    }
  )

  // 错误处理
  worker.on('error', (err) => {
    console.error('Worker error:', err)
  })

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err)
  })

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
  })

  return worker
}

// 使用 globalThis 确保在 Next.js 热更新时保持 Worker 实例
const globalForWorker = globalThis as unknown as {
  taskWorkerInstance: Worker<TaskJobData, TaskJobResult> | undefined
}

/**
 * 获取或创建 Worker
 */
export function getTaskWorker(): Worker<TaskJobData, TaskJobResult> {
  if (!globalForWorker.taskWorkerInstance) {
    globalForWorker.taskWorkerInstance = createTaskWorker()
  }
  return globalForWorker.taskWorkerInstance
}

/**
 * 关闭 Worker
 */
export async function closeTaskWorker(): Promise<void> {
  if (globalForWorker.taskWorkerInstance) {
    await globalForWorker.taskWorkerInstance.close()
    globalForWorker.taskWorkerInstance = undefined
  }
}
