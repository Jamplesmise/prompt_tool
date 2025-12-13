import { describe, it, expect, vi } from 'vitest'
import { aggregate, runCompositeEvaluator, detectCycle } from '../composite'
import type { EvaluatorInput, EvaluatorOutput, CompositeEvaluatorConfig } from '../types'

// 辅助函数：创建评估结果
function createResult(passed: boolean, score?: number, reason?: string): EvaluatorOutput {
  return {
    passed,
    score: score ?? (passed ? 1 : 0),
    reason: reason ?? (passed ? '通过' : '失败'),
  }
}

describe('组合评估器测试', () => {
  describe('aggregate - 结果聚合', () => {
    describe('AND 聚合', () => {
      it('全部通过应返回 passed=true', () => {
        const results = [
          createResult(true, 0.9),
          createResult(true, 0.8),
          createResult(true, 0.7),
        ]
        const result = aggregate(results, 'and')

        expect(result.passed).toBe(true)
        expect(result.score).toBe(0.7) // 最小分数
        expect(result.details?.passedCount).toBe(3)
      })

      it('部分失败应返回 passed=false', () => {
        const results = [
          createResult(true, 0.9),
          createResult(false, 0.4),
          createResult(true, 0.8),
        ]
        const result = aggregate(results, 'and')

        expect(result.passed).toBe(false)
        expect(result.score).toBe(0.4) // 最小分数
        expect(result.details?.failedCount).toBe(1)
      })

      it('全部失败应返回 passed=false', () => {
        const results = [
          createResult(false, 0.3),
          createResult(false, 0.2),
        ]
        const result = aggregate(results, 'and')

        expect(result.passed).toBe(false)
        expect(result.score).toBe(0.2)
        expect(result.details?.failedCount).toBe(2)
      })

      it('空结果应返回 passed=true', () => {
        const result = aggregate([], 'and')
        expect(result.passed).toBe(true)
        expect(result.score).toBe(1)
      })
    })

    describe('OR 聚合', () => {
      it('至少一个通过应返回 passed=true', () => {
        const results = [
          createResult(false, 0.3),
          createResult(true, 0.8),
          createResult(false, 0.4),
        ]
        const result = aggregate(results, 'or')

        expect(result.passed).toBe(true)
        expect(result.score).toBe(0.8) // 最大分数
        expect(result.details?.passedCount).toBe(1)
      })

      it('全部失败应返回 passed=false', () => {
        const results = [
          createResult(false, 0.3),
          createResult(false, 0.4),
        ]
        const result = aggregate(results, 'or')

        expect(result.passed).toBe(false)
        expect(result.score).toBe(0.4) // 最大分数
      })

      it('全部通过应返回 passed=true', () => {
        const results = [
          createResult(true, 0.9),
          createResult(true, 0.8),
        ]
        const result = aggregate(results, 'or')

        expect(result.passed).toBe(true)
        expect(result.score).toBe(0.9)
      })
    })

    describe('加权平均聚合', () => {
      it('等权重平均', () => {
        const results = [
          createResult(true, 0.8),
          createResult(true, 0.6),
        ]
        const result = aggregate(results, 'weighted_average')

        expect(result.score).toBeCloseTo(0.7, 5) // (0.8 + 0.6) / 2
        expect(result.passed).toBe(true) // 0.7 >= 0.6
      })

      it('自定义权重', () => {
        const results = [
          createResult(true, 0.9),
          createResult(true, 0.5),
        ]
        const result = aggregate(results, 'weighted_average', [3, 1])

        // (0.9 * 3 + 0.5 * 1) / 4 = 3.2 / 4 = 0.8
        expect(result.score).toBeCloseTo(0.8, 5)
        expect(result.details?.weights).toEqual([3, 1])
      })

      it('低于阈值应返回 passed=false', () => {
        const results = [
          createResult(true, 0.5),
          createResult(false, 0.4),
        ]
        const result = aggregate(results, 'weighted_average')

        expect(result.score).toBeCloseTo(0.45, 5)
        expect(result.passed).toBe(false) // 0.45 < 0.6
      })

      it('权重数量不匹配时使用等权重', () => {
        const results = [
          createResult(true, 0.8),
          createResult(true, 0.6),
          createResult(true, 0.4),
        ]
        const result = aggregate(results, 'weighted_average', [1, 2]) // 只有2个权重，但有3个结果

        expect(result.score).toBeCloseTo(0.6, 5) // 等权重平均
      })
    })

    it('保留各子评估器结果在 details 中', () => {
      const results = [
        createResult(true, 0.9, '评估器A通过'),
        createResult(false, 0.4, '评估器B失败'),
      ]
      const result = aggregate(results, 'and')

      const individualResults = result.details?.individualResults as Array<{ reason: string }>
      expect(individualResults).toHaveLength(2)
      expect(individualResults[0].reason).toBe('评估器A通过')
    })
  })

  describe('runCompositeEvaluator - 组合执行', () => {
    const mockInput: EvaluatorInput = {
      input: 'test input',
      output: 'test output',
      expected: null,
      metadata: {},
    }

    it('并行执行所有评估器', async () => {
      const executor = vi.fn()
        .mockResolvedValueOnce(createResult(true, 0.9))
        .mockResolvedValueOnce(createResult(true, 0.8))

      const config: CompositeEvaluatorConfig = {
        evaluatorIds: ['eval-1', 'eval-2'],
        mode: 'parallel',
        aggregation: 'and',
      }

      const result = await runCompositeEvaluator({
        config,
        input: mockInput,
        executor,
      })

      expect(result.passed).toBe(true)
      expect(executor).toHaveBeenCalledTimes(2)
    })

    it('串行执行评估器', async () => {
      const executionOrder: string[] = []
      const executor = vi.fn().mockImplementation(async (id: string) => {
        executionOrder.push(id)
        return createResult(true, 0.8)
      })

      const config: CompositeEvaluatorConfig = {
        evaluatorIds: ['eval-1', 'eval-2', 'eval-3'],
        mode: 'serial',
        aggregation: 'and',
      }

      await runCompositeEvaluator({
        config,
        input: mockInput,
        executor,
      })

      expect(executionOrder).toEqual(['eval-1', 'eval-2', 'eval-3'])
    })

    it('串行 AND 模式失败时短路', async () => {
      const executor = vi.fn()
        .mockResolvedValueOnce(createResult(true, 0.9))
        .mockResolvedValueOnce(createResult(false, 0.3)) // 这个失败
        .mockResolvedValueOnce(createResult(true, 0.8))

      const config: CompositeEvaluatorConfig = {
        evaluatorIds: ['eval-1', 'eval-2', 'eval-3'],
        mode: 'serial',
        aggregation: 'and',
      }

      const result = await runCompositeEvaluator({
        config,
        input: mockInput,
        executor,
      })

      expect(result.passed).toBe(false)
      expect(executor).toHaveBeenCalledTimes(2) // 第三个不执行
    })

    it('空评估器列表应返回通过', async () => {
      const executor = vi.fn()

      const config: CompositeEvaluatorConfig = {
        evaluatorIds: [],
        mode: 'parallel',
        aggregation: 'and',
      }

      const result = await runCompositeEvaluator({
        config,
        input: mockInput,
        executor,
      })

      expect(result.passed).toBe(true)
      expect(executor).not.toHaveBeenCalled()
    })

    it('加权平均聚合', async () => {
      const executor = vi.fn()
        .mockResolvedValueOnce(createResult(true, 0.9))
        .mockResolvedValueOnce(createResult(true, 0.5))

      const config: CompositeEvaluatorConfig = {
        evaluatorIds: ['eval-1', 'eval-2'],
        mode: 'parallel',
        aggregation: 'weighted_average',
        weights: [2, 1],
      }

      const result = await runCompositeEvaluator({
        config,
        input: mockInput,
        executor,
      })

      // (0.9 * 2 + 0.5 * 1) / 3 ≈ 0.767
      expect(result.score).toBeCloseTo(0.767, 2)
      expect(result.passed).toBe(true)
    })

    it('执行器抛出错误应捕获', async () => {
      const executor = vi.fn().mockRejectedValue(new Error('执行失败'))

      const config: CompositeEvaluatorConfig = {
        evaluatorIds: ['eval-1'],
        mode: 'parallel',
        aggregation: 'and',
      }

      const result = await runCompositeEvaluator({
        config,
        input: mockInput,
        executor,
      })

      expect(result.passed).toBe(false)
      expect(result.reason).toContain('执行失败')
    })

    it('检测循环依赖', async () => {
      const executor = vi.fn()

      const config: CompositeEvaluatorConfig = {
        evaluatorIds: ['eval-1', 'eval-2'],
        mode: 'parallel',
        aggregation: 'and',
      }

      // 模拟 eval-1 已经在访问路径中
      const visitedIds = new Set(['eval-1'])

      const result = await runCompositeEvaluator({
        config,
        input: mockInput,
        executor,
        visitedIds,
      })

      expect(result.passed).toBe(false)
      expect(result.reason).toContain('循环依赖')
    })
  })

  describe('detectCycle - 循环依赖检测', () => {
    it('无循环应返回 false', () => {
      const getConfig = (id: string): CompositeEvaluatorConfig | null => {
        if (id === 'composite-1') {
          return {
            evaluatorIds: ['eval-a', 'eval-b'],
            mode: 'parallel',
            aggregation: 'and',
          }
        }
        return null // 非组合评估器
      }

      const hasCycle = detectCycle(
        'composite-1',
        {
          evaluatorIds: ['eval-a', 'eval-b'],
          mode: 'parallel',
          aggregation: 'and',
        },
        getConfig
      )

      expect(hasCycle).toBe(false)
    })

    it('直接循环应返回 true', () => {
      const getConfig = (id: string): CompositeEvaluatorConfig | null => {
        if (id === 'composite-1') {
          return {
            evaluatorIds: ['composite-1'], // 直接引用自己
            mode: 'parallel',
            aggregation: 'and',
          }
        }
        return null
      }

      const hasCycle = detectCycle(
        'composite-1',
        {
          evaluatorIds: ['composite-1'],
          mode: 'parallel',
          aggregation: 'and',
        },
        getConfig
      )

      expect(hasCycle).toBe(true)
    })

    it('间接循环应返回 true', () => {
      const getConfig = (id: string): CompositeEvaluatorConfig | null => {
        const configs: Record<string, CompositeEvaluatorConfig> = {
          'composite-a': {
            evaluatorIds: ['composite-b'],
            mode: 'parallel',
            aggregation: 'and',
          },
          'composite-b': {
            evaluatorIds: ['composite-c'],
            mode: 'parallel',
            aggregation: 'and',
          },
          'composite-c': {
            evaluatorIds: ['composite-a'], // 回到 A，形成循环
            mode: 'parallel',
            aggregation: 'and',
          },
        }
        return configs[id] || null
      }

      const hasCycle = detectCycle(
        'composite-a',
        {
          evaluatorIds: ['composite-b'],
          mode: 'parallel',
          aggregation: 'and',
        },
        getConfig
      )

      expect(hasCycle).toBe(true)
    })

    it('多层嵌套无循环应返回 false', () => {
      const getConfig = (id: string): CompositeEvaluatorConfig | null => {
        const configs: Record<string, CompositeEvaluatorConfig> = {
          'composite-a': {
            evaluatorIds: ['composite-b', 'eval-1'],
            mode: 'parallel',
            aggregation: 'and',
          },
          'composite-b': {
            evaluatorIds: ['eval-2', 'eval-3'],
            mode: 'parallel',
            aggregation: 'and',
          },
        }
        return configs[id] || null
      }

      const hasCycle = detectCycle(
        'composite-a',
        {
          evaluatorIds: ['composite-b', 'eval-1'],
          mode: 'parallel',
          aggregation: 'and',
        },
        getConfig
      )

      expect(hasCycle).toBe(false)
    })
  })
})
