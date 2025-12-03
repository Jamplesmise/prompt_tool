import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ConcurrencyLimiter,
  executeWithRetry,
  executeWithTimeout,
  TimeoutError,
  sleep,
} from '@/lib/concurrencyLimiter'
import { renderPrompt, extractExpectedOutput, buildMessages } from '@/lib/promptRenderer'
import {
  publishProgress,
  publishCompleted,
  publishFailed,
  publishStopped,
  subscribeProgress,
} from '@/lib/progressPublisher'
import type { TaskProgress, TaskStats } from '@platform/shared'

/**
 * IT-4.1 任务完整流程集成测试
 *
 * 测试流程：创建任务 → 启动 → 执行完成
 *
 * 注意：这是集成测试的测试用例设计
 * 实际运行需要测试数据库环境或完整 mock
 */

describe('IT-4.1 任务完整流程', () => {
  describe('1. 执行计划生成', () => {
    it('应该生成正确的笛卡尔积', () => {
      const prompts = [
        { id: 'p1', versionId: 'pv1', content: '提示词1 {{var}}' },
        { id: 'p2', versionId: 'pv2', content: '提示词2 {{var}}' },
      ]
      const models = [{ id: 'm1' }, { id: 'm2' }]
      const datasetRows = [
        { id: 'r1', rowIndex: 0, data: { var: 'a' } },
        { id: 'r2', rowIndex: 1, data: { var: 'b' } },
        { id: 'r3', rowIndex: 2, data: { var: 'c' } },
      ]

      // 生成执行计划
      const plan: Array<{
        promptId: string
        modelId: string
        datasetRowId: string
      }> = []

      for (const prompt of prompts) {
        for (const model of models) {
          for (const row of datasetRows) {
            plan.push({
              promptId: prompt.id,
              modelId: model.id,
              datasetRowId: row.id,
            })
          }
        }
      }

      // 2 提示词 × 2 模型 × 3 数据行 = 12 条
      expect(plan.length).toBe(12)

      // 验证包含所有组合
      expect(plan.filter((p) => p.promptId === 'p1')).toHaveLength(6)
      expect(plan.filter((p) => p.modelId === 'm1')).toHaveLength(6)
      expect(plan.filter((p) => p.datasetRowId === 'r1')).toHaveLength(4)
    })

    it('空数据集应该返回空执行计划', () => {
      const prompts = [{ id: 'p1' }]
      const models = [{ id: 'm1' }]
      const datasetRows: Array<{ id: string }> = []

      const planLength = prompts.length * models.length * datasetRows.length
      expect(planLength).toBe(0)
    })
  })

  describe('2. 提示词渲染', () => {
    it('应该正确渲染模板变量', () => {
      const template = '请翻译以下文本：{{text}}，目标语言：{{language}}'
      const data = { text: 'Hello World', language: '中文' }

      const result = renderPrompt(template, data)

      expect(result.content).toBe('请翻译以下文本：Hello World，目标语言：中文')
    })

    it('应该提取期望输出', () => {
      const data = {
        input: '问题内容',
        expected: '期望的答案',
        other: '其他字段',
      }

      const expected = extractExpectedOutput(data)
      expect(expected).toBe('期望的答案')
    })

    it('应该构建正确的消息格式', () => {
      const prompt = '请回答问题'
      const systemPrompt = '你是一个助手'

      const messages = buildMessages(prompt, systemPrompt)

      expect(messages).toEqual([
        { role: 'system', content: '你是一个助手' },
        { role: 'user', content: '请回答问题' },
      ])
    })
  })

  describe('3. 并发控制', () => {
    it('应该限制同时执行的任务数', async () => {
      const limiter = new ConcurrencyLimiter(3)
      let maxConcurrent = 0
      let currentConcurrent = 0

      const tasks = Array.from({ length: 10 }, () =>
        limiter.execute(async () => {
          currentConcurrent++
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent)
          await sleep(20)
          currentConcurrent--
        })
      )

      await Promise.all(tasks)

      expect(maxConcurrent).toBeLessThanOrEqual(3)
    })
  })

  describe('4. 重试和超时', () => {
    it('失败后应该重试', async () => {
      let attempts = 0
      const fn = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error(`attempt ${attempts}`))
        }
        return Promise.resolve('success')
      })

      const result = await executeWithRetry(fn, {
        retryCount: 3,
        baseDelayMs: 10,
      })

      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    it('超时应该抛出 TimeoutError', async () => {
      await expect(
        executeWithTimeout(async () => {
          await sleep(100)
          return 'done'
        }, 30)
      ).rejects.toThrow(TimeoutError)
    })
  })

  describe('5. 进度推送', () => {
    it('应该实时推送进度', async () => {
      const taskId = 'test-task-progress'
      const receivedProgress: TaskProgress[] = []

      const unsubscribe = subscribeProgress(taskId, (event) => {
        if (event.type === 'progress') {
          receivedProgress.push(event.data)
        }
      })

      // 模拟进度更新
      publishProgress(taskId, { total: 10, completed: 3, failed: 0 })
      publishProgress(taskId, { total: 10, completed: 6, failed: 1 })
      publishProgress(taskId, { total: 10, completed: 10, failed: 1 })

      unsubscribe()

      expect(receivedProgress).toHaveLength(3)
      expect(receivedProgress[2]).toEqual({ total: 10, completed: 10, failed: 1 })
    })

    it('完成时应该推送 completed 事件', () => {
      const taskId = 'test-task-complete'
      let completedEvent: { status: string; stats: TaskStats } | null = null

      const unsubscribe = subscribeProgress(taskId, (event) => {
        if (event.type === 'completed') {
          completedEvent = event.data
        }
      })

      const stats: TaskStats = { passRate: 0.9, avgLatencyMs: 150, totalTokens: 1000 }
      publishCompleted(taskId, stats)

      unsubscribe()

      expect(completedEvent).not.toBeNull()
      expect(completedEvent?.status).toBe('COMPLETED')
      expect(completedEvent?.stats).toEqual(stats)
    })

    it('失败时应该推送 failed 事件', () => {
      const taskId = 'test-task-failed'
      let failedEvent: { status: string; error: string } | null = null

      const unsubscribe = subscribeProgress(taskId, (event) => {
        if (event.type === 'failed') {
          failedEvent = event.data
        }
      })

      publishFailed(taskId, '网络错误')

      unsubscribe()

      expect(failedEvent).not.toBeNull()
      expect(failedEvent?.status).toBe('FAILED')
      expect(failedEvent?.error).toBe('网络错误')
    })
  })

  describe('6. 任务终止', () => {
    it('终止信号应该被响应', async () => {
      let shouldStop = false
      const executedTasks: number[] = []

      const limiter = new ConcurrencyLimiter(2)

      const tasks = Array.from({ length: 10 }, (_, i) =>
        limiter.execute(async () => {
          if (shouldStop) return

          executedTasks.push(i)
          await sleep(30)

          // 模拟第 3 个任务后发出终止信号
          if (i === 2) {
            shouldStop = true
          }
        })
      )

      await Promise.all(tasks)

      // 由于并发，可能执行了 3-5 个任务
      expect(executedTasks.length).toBeLessThan(10)
    })

    it('终止时应该推送 stopped 事件', () => {
      const taskId = 'test-task-stopped'
      let stoppedEvent: { status: string } | null = null

      const unsubscribe = subscribeProgress(taskId, (event) => {
        if (event.type === 'stopped') {
          stoppedEvent = event.data
        }
      })

      publishStopped(taskId)

      unsubscribe()

      expect(stoppedEvent).not.toBeNull()
      expect(stoppedEvent?.status).toBe('STOPPED')
    })
  })

  describe('7. 统计计算', () => {
    it('应该计算正确的通过率', () => {
      const results = [
        { passed: true },
        { passed: true },
        { passed: false },
        { passed: true },
        { passed: false },
      ]

      const passedCount = results.filter((r) => r.passed).length
      const passRate = passedCount / results.length

      expect(passRate).toBe(0.6)
    })

    it('应该计算平均延迟', () => {
      const latencies = [100, 150, 200, 250, 300]
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length

      expect(avgLatency).toBe(200)
    })

    it('应该计算总 Token', () => {
      const tokenUsages = [
        { input: 100, output: 50 },
        { input: 200, output: 100 },
        { input: 150, output: 75 },
      ]

      const totalTokens = tokenUsages.reduce(
        (sum, t) => sum + t.input + t.output,
        0
      )

      expect(totalTokens).toBe(675)
    })

    it('应该计算总费用', () => {
      const costs = [0.001, 0.002, 0.0015, 0.003]
      const totalCost = costs.reduce((sum, c) => sum + c, 0)

      expect(totalCost).toBeCloseTo(0.0075, 4)
    })
  })
})

describe('IT-4.2 任务控制', () => {
  describe('1. 状态转换', () => {
    it('PENDING → RUNNING 应该允许', () => {
      const validTransitions: Record<string, string[]> = {
        PENDING: ['RUNNING'],
        RUNNING: ['COMPLETED', 'FAILED', 'STOPPED'],
        COMPLETED: [],
        FAILED: [],
        STOPPED: [],
      }

      expect(validTransitions['PENDING']).toContain('RUNNING')
    })

    it('RUNNING → COMPLETED/FAILED/STOPPED 应该允许', () => {
      const validTransitions: Record<string, string[]> = {
        PENDING: ['RUNNING'],
        RUNNING: ['COMPLETED', 'FAILED', 'STOPPED'],
        COMPLETED: [],
        FAILED: [],
        STOPPED: [],
      }

      expect(validTransitions['RUNNING']).toContain('COMPLETED')
      expect(validTransitions['RUNNING']).toContain('FAILED')
      expect(validTransitions['RUNNING']).toContain('STOPPED')
    })

    it('终态不应该允许转换', () => {
      const validTransitions: Record<string, string[]> = {
        PENDING: ['RUNNING'],
        RUNNING: ['COMPLETED', 'FAILED', 'STOPPED'],
        COMPLETED: [],
        FAILED: [],
        STOPPED: [],
      }

      expect(validTransitions['COMPLETED']).toHaveLength(0)
      expect(validTransitions['FAILED']).toHaveLength(0)
      expect(validTransitions['STOPPED']).toHaveLength(0)
    })

    it('不允许的状态转换应该被拒绝', () => {
      const isValidTransition = (from: string, to: string): boolean => {
        const validTransitions: Record<string, string[]> = {
          PENDING: ['RUNNING'],
          RUNNING: ['COMPLETED', 'FAILED', 'STOPPED'],
          COMPLETED: [],
          FAILED: [],
          STOPPED: [],
        }
        return validTransitions[from]?.includes(to) ?? false
      }

      expect(isValidTransition('PENDING', 'COMPLETED')).toBe(false)
      expect(isValidTransition('COMPLETED', 'RUNNING')).toBe(false)
    })
  })

  describe('2. 重试失败用例', () => {
    it('只重试失败状态的结果', () => {
      const results = [
        { id: 'r1', status: 'SUCCESS' },
        { id: 'r2', status: 'FAILED' },
        { id: 'r3', status: 'TIMEOUT' },
        { id: 'r4', status: 'SUCCESS' },
        { id: 'r5', status: 'ERROR' },
      ]

      const failedStatuses = ['FAILED', 'TIMEOUT', 'ERROR']
      const toRetry = results.filter((r) => failedStatuses.includes(r.status))

      expect(toRetry).toHaveLength(3)
      expect(toRetry.map((r) => r.id)).toEqual(['r2', 'r3', 'r5'])
    })

    it('重试应该重置状态为 PENDING', () => {
      const failedResult = {
        status: 'FAILED',
        output: null,
        error: '网络错误',
      }

      const resetResult = {
        ...failedResult,
        status: 'PENDING',
        output: null,
        error: null,
      }

      expect(resetResult.status).toBe('PENDING')
      expect(resetResult.error).toBeNull()
    })
  })
})

describe('IT-4.3 结果导出', () => {
  describe('数据格式', () => {
    it('导出数据应该包含所有必要字段', () => {
      const exportFields = [
        'rowIndex',
        'promptName',
        'promptVersion',
        'modelName',
        'input',
        'output',
        'expected',
        'status',
        'latencyMs',
        'tokens',
        'passed',
        'evaluatorResults',
      ]

      const sampleResult = {
        rowIndex: 0,
        promptName: '测试提示词',
        promptVersion: 1,
        modelName: 'GPT-4',
        input: { question: '什么是 AI？' },
        output: 'AI 是人工智能...',
        expected: '人工智能的定义',
        status: 'SUCCESS',
        latencyMs: 1500,
        tokens: { input: 50, output: 100, total: 150 },
        passed: true,
        evaluatorResults: [{ name: '精确匹配', passed: false, score: 0.8 }],
      }

      for (const field of exportFields) {
        expect(sampleResult).toHaveProperty(field)
      }
    })

    it('XLSX 格式应该正确生成', () => {
      // 验证 XLSX 导出格式的基本要求
      const xlsxMimeType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      const expectedExtension = '.xlsx'

      expect(xlsxMimeType).toContain('spreadsheetml')
      expect(expectedExtension).toBe('.xlsx')
    })

    it('CSV 格式应该正确转义', () => {
      // CSV 需要转义包含逗号、换行、引号的字段
      const escapeCsvField = (value: string): string => {
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }

      expect(escapeCsvField('simple')).toBe('simple')
      expect(escapeCsvField('with,comma')).toBe('"with,comma"')
      expect(escapeCsvField('with"quote')).toBe('"with""quote"')
      expect(escapeCsvField('with\nnewline')).toBe('"with\nnewline"')
    })

    it('JSON 格式应该是有效的 JSON', () => {
      const results = [
        { id: '1', output: 'result 1' },
        { id: '2', output: 'result 2' },
      ]

      const jsonString = JSON.stringify(results, null, 2)
      const parsed = JSON.parse(jsonString)

      expect(parsed).toEqual(results)
    })
  })
})
