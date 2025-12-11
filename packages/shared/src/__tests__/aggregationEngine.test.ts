import { describe, it, expect } from 'vitest'
import {
  AggregationEngine,
  aggregateFieldResults,
} from '../evaluation/aggregationEngine'
import type { OutputFieldDefinition, AggregationConfig } from '../types/schema'
import type { FieldEvaluationResultData } from '../evaluation/fieldEvaluationEngine'

describe('AggregationEngine', () => {
  const fields: OutputFieldDefinition[] = [
    {
      name: '问题分类',
      key: 'category',
      type: 'enum',
      required: true,
      evaluation: { weight: 0.4, isCritical: true },
    },
    {
      name: '置信度',
      key: 'confidence',
      type: 'number',
      required: true,
      evaluation: { weight: 0.3, isCritical: false },
    },
    {
      name: '解决方案',
      key: 'solution',
      type: 'string',
      required: true,
      evaluation: { weight: 0.3, isCritical: false },
    },
  ]

  const allPassedResults: FieldEvaluationResultData[] = [
    {
      fieldName: '问题分类',
      fieldKey: 'category',
      fieldValue: 'bluetooth',
      expectedValue: 'bluetooth',
      passed: true,
      score: 1,
      skipped: false,
    },
    {
      fieldName: '置信度',
      fieldKey: 'confidence',
      fieldValue: 0.95,
      expectedValue: 0.95,
      passed: true,
      score: 1,
      skipped: false,
    },
    {
      fieldName: '解决方案',
      fieldKey: 'solution',
      fieldValue: '重启',
      expectedValue: '重启',
      passed: true,
      score: 1,
      skipped: false,
    },
  ]

  const mixedResults: FieldEvaluationResultData[] = [
    {
      fieldName: '问题分类',
      fieldKey: 'category',
      fieldValue: 'wifi',
      expectedValue: 'bluetooth',
      passed: false, // 关键字段失败
      score: 0,
      skipped: false,
    },
    {
      fieldName: '置信度',
      fieldKey: 'confidence',
      fieldValue: 0.95,
      expectedValue: 0.95,
      passed: true,
      score: 1,
      skipped: false,
    },
    {
      fieldName: '解决方案',
      fieldKey: 'solution',
      fieldValue: '重启',
      expectedValue: '重启',
      passed: true,
      score: 1,
      skipped: false,
    },
  ]

  const nonCriticalFailedResults: FieldEvaluationResultData[] = [
    {
      fieldName: '问题分类',
      fieldKey: 'category',
      fieldValue: 'bluetooth',
      expectedValue: 'bluetooth',
      passed: true,
      score: 1,
      skipped: false,
    },
    {
      fieldName: '置信度',
      fieldKey: 'confidence',
      fieldValue: 0.5,
      expectedValue: 0.95,
      passed: false, // 非关键字段失败
      score: 0,
      skipped: false,
    },
    {
      fieldName: '解决方案',
      fieldKey: 'solution',
      fieldValue: '重启',
      expectedValue: '重启',
      passed: true,
      score: 1,
      skipped: false,
    },
  ]

  describe('all_pass 模式', () => {
    const config: AggregationConfig = { mode: 'all_pass' }

    it('所有字段通过时应返回通过', () => {
      const engine = new AggregationEngine()
      const result = engine.aggregate(allPassedResults, fields, config)

      expect(result.passed).toBe(true)
      expect(result.score).toBe(1)
      expect(result.details.passedFields).toBe(3)
      expect(result.details.failedFields).toBe(0)
    })

    it('有字段失败时应返回失败', () => {
      const engine = new AggregationEngine()
      const result = engine.aggregate(mixedResults, fields, config)

      expect(result.passed).toBe(false)
      expect(result.score).toBeCloseTo(2 / 3)
      expect(result.reason).toContain('问题分类')
    })
  })

  describe('weighted_average 模式', () => {
    it('加权平均达到阈值时应返回通过', () => {
      const config: AggregationConfig = {
        mode: 'weighted_average',
        passThreshold: 0.6,
      }
      const engine = new AggregationEngine()
      const result = engine.aggregate(allPassedResults, fields, config)

      expect(result.passed).toBe(true)
      expect(result.score).toBeCloseTo(1)
    })

    it('加权平均未达到阈值时应返回失败', () => {
      const config: AggregationConfig = {
        mode: 'weighted_average',
        passThreshold: 0.8,
      }
      const engine = new AggregationEngine()
      // 一个权重 0.4 的字段失败，加权分数 = 0 * 0.4 + 1 * 0.3 + 1 * 0.3 = 0.6
      const result = engine.aggregate(mixedResults, fields, config)

      expect(result.passed).toBe(false)
      expect(result.score).toBeCloseTo(0.6)
      expect(result.reason).toContain('60.0%')
    })

    it('应该正确计算加权分数', () => {
      const config: AggregationConfig = {
        mode: 'weighted_average',
        passThreshold: 0.5,
      }
      const engine = new AggregationEngine()
      // 非关键字段失败：加权分数 = 1 * 0.4 + 0 * 0.3 + 1 * 0.3 = 0.7
      const result = engine.aggregate(nonCriticalFailedResults, fields, config)

      expect(result.passed).toBe(true)
      expect(result.score).toBeCloseTo(0.7)
      expect(result.details.weightedScores).toBeDefined()
    })
  })

  describe('critical_first 模式', () => {
    const config: AggregationConfig = { mode: 'critical_first' }

    it('关键字段失败时应直接返回失败', () => {
      const engine = new AggregationEngine()
      const result = engine.aggregate(mixedResults, fields, config)

      expect(result.passed).toBe(false)
      expect(result.score).toBe(0)
      expect(result.reason).toContain('关键字段未通过')
      expect(result.details.criticalFailed).toBe(true)
      expect(result.details.criticalFields).toContain('category')
    })

    it('关键字段通过时应计算加权平均', () => {
      const engine = new AggregationEngine()
      const result = engine.aggregate(nonCriticalFailedResults, fields, config)

      expect(result.passed).toBe(true)
      expect(result.score).toBeCloseTo(0.7)
      expect(result.details.criticalFailed).toBe(false)
    })

    it('所有字段通过时应返回满分', () => {
      const engine = new AggregationEngine()
      const result = engine.aggregate(allPassedResults, fields, config)

      expect(result.passed).toBe(true)
      expect(result.score).toBe(1)
    })
  })

  describe('跳过字段处理', () => {
    it('应该正确统计跳过的字段', () => {
      const resultsWithSkipped: FieldEvaluationResultData[] = [
        ...allPassedResults.slice(0, 2),
        {
          fieldName: '解决方案',
          fieldKey: 'solution',
          fieldValue: undefined,
          expectedValue: undefined,
          passed: true,
          skipped: true,
          skipReason: '可选字段未返回',
        },
      ]

      const config: AggregationConfig = { mode: 'all_pass' }
      const engine = new AggregationEngine()
      const result = engine.aggregate(resultsWithSkipped, fields, config)

      expect(result.passed).toBe(true)
      expect(result.details.skippedFields).toBe(1)
      expect(result.details.evaluatedFields).toBe(2)
    })
  })

  describe('便捷函数', () => {
    it('aggregateFieldResults 应该正常工作', () => {
      const config: AggregationConfig = { mode: 'all_pass' }
      const result = aggregateFieldResults(allPassedResults, fields, config)

      expect(result.passed).toBe(true)
    })
  })

  describe('边界情况', () => {
    it('空结果应返回通过', () => {
      const config: AggregationConfig = { mode: 'all_pass' }
      const engine = new AggregationEngine()
      const result = engine.aggregate([], [], config)

      expect(result.passed).toBe(true)
      expect(result.score).toBe(1)
    })

    it('自定义模式无表达式时回退到加权平均', () => {
      const config: AggregationConfig = { mode: 'custom', passThreshold: 0.6 }
      const engine = new AggregationEngine()
      const result = engine.aggregate(allPassedResults, fields, config)

      // 无表达式时回退到 weighted_average
      expect(result.passed).toBe(true)
      expect(result.score).toBe(1)
    })

    it('自定义模式应执行表达式', () => {
      const config: AggregationConfig = {
        mode: 'custom',
        customExpression: 'fields.category.passed && fields.confidence.passed',
        passThreshold: 0.6,
      }
      const engine = new AggregationEngine()
      const result = engine.aggregate(allPassedResults, fields, config)

      expect(result.passed).toBe(true)
      expect(result.reason).toContain('自定义表达式')
    })

    it('自定义模式表达式返回数字', () => {
      const config: AggregationConfig = {
        mode: 'custom',
        customExpression: '(fields.category.score + fields.confidence.score) / 2',
        passThreshold: 0.5,
      }
      const engine = new AggregationEngine()
      const result = engine.aggregate(allPassedResults, fields, config)

      expect(result.passed).toBe(true)
      expect(result.score).toBe(1)
    })
  })
})
