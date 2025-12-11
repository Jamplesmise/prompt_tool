import { describe, it, expect } from 'vitest'
import {
  FieldEvaluationEngine,
  evaluateFields,
} from '../evaluation/fieldEvaluationEngine'
import type { OutputFieldDefinition } from '../types/schema'

describe('FieldEvaluationEngine', () => {
  const baseFields: OutputFieldDefinition[] = [
    {
      name: '问题分类',
      key: 'category',
      type: 'enum',
      required: true,
      enumValues: ['bluetooth', 'wifi', 'battery'],
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
      required: false,
      evaluation: { weight: 0.3, isCritical: false },
    },
  ]

  describe('基础评估', () => {
    it('应该评估所有字段并返回正确结果', async () => {
      const engine = new FieldEvaluationEngine()

      const result = await engine.evaluate({
        parsedOutput: {
          category: 'bluetooth',
          confidence: 0.95,
          solution: '重启蓝牙',
        },
        expectedValues: {
          category: 'bluetooth',
          confidence: 0.95,
          solution: '重启蓝牙',
        },
        fields: baseFields,
      })

      expect(result.allPassed).toBe(true)
      expect(result.totalFields).toBe(3)
      expect(result.evaluatedFields).toBe(3)
      expect(result.passedFields).toBe(3)
      expect(result.skippedFields).toBe(0)
    })

    it('应该检测值不匹配', async () => {
      const engine = new FieldEvaluationEngine()

      const result = await engine.evaluate({
        parsedOutput: {
          category: 'wifi', // 不匹配
          confidence: 0.95,
        },
        expectedValues: {
          category: 'bluetooth',
          confidence: 0.95,
        },
        fields: baseFields,
      })

      expect(result.allPassed).toBe(false)
      expect(result.fieldResults[0].passed).toBe(false)
      expect(result.fieldResults[0].reason).toContain('bluetooth')
    })

    it('应该处理必填字段缺失', async () => {
      const engine = new FieldEvaluationEngine()

      const result = await engine.evaluate({
        parsedOutput: {
          confidence: 0.95,
          // category 缺失
        },
        expectedValues: {
          category: 'bluetooth',
          confidence: 0.95,
        },
        fields: baseFields,
      })

      expect(result.allPassed).toBe(false)
      expect(result.fieldResults[0].passed).toBe(false)
      expect(result.fieldResults[0].reason).toBe('必填字段缺失')
    })

    it('应该跳过可选字段', async () => {
      const engine = new FieldEvaluationEngine()

      const result = await engine.evaluate({
        parsedOutput: {
          category: 'bluetooth',
          confidence: 0.95,
          // solution 可选，不提供
        },
        expectedValues: {
          category: 'bluetooth',
          confidence: 0.95,
        },
        fields: baseFields,
      })

      expect(result.allPassed).toBe(true)
      expect(result.skippedFields).toBe(1)
      expect(result.fieldResults[2].skipped).toBe(true)
    })
  })

  describe('无期望值评估', () => {
    it('应该在没有期望值时仅检查字段存在', async () => {
      const engine = new FieldEvaluationEngine()

      const result = await engine.evaluate({
        parsedOutput: {
          category: 'bluetooth',
          confidence: 0.95,
        },
        expectedValues: {},
        fields: baseFields,
      })

      // 所有字段都应通过（因为没有期望值）
      expect(result.fieldResults[0].passed).toBe(true)
      expect(result.fieldResults[0].reason).toContain('无期望值')
      expect(result.fieldResults[1].passed).toBe(true)
    })
  })

  describe('自定义评估器', () => {
    it('应该使用自定义评估器', async () => {
      const customExecutor = async (
        fieldValue: unknown,
        expectedValue: unknown,
        evaluatorId: string
      ) => {
        // 自定义逻辑：数字容差比较
        if (evaluatorId === 'numeric_tolerance') {
          const diff = Math.abs(
            Number(fieldValue) - Number(expectedValue)
          )
          const passed = diff <= 0.1
          return {
            passed,
            score: passed ? 1 : 0,
            reason: `差值 ${diff}`,
          }
        }
        return {
          passed: fieldValue === expectedValue,
          score: fieldValue === expectedValue ? 1 : 0,
        }
      }

      const engine = new FieldEvaluationEngine({
        evaluatorExecutor: customExecutor,
      })

      const fields: OutputFieldDefinition[] = [
        {
          name: '分数',
          key: 'score',
          type: 'number',
          required: true,
          evaluation: {
            evaluatorId: 'numeric_tolerance',
            weight: 1,
            isCritical: false,
          },
        },
      ]

      const result = await engine.evaluate({
        parsedOutput: { score: 0.95 },
        expectedValues: { score: 1.0 },
        fields,
      })

      expect(result.fieldResults[0].passed).toBe(true)
      expect(result.fieldResults[0].reason).toContain('0.05')
    })
  })

  describe('深度比较', () => {
    it('应该比较数组', async () => {
      const engine = new FieldEvaluationEngine()

      const fields: OutputFieldDefinition[] = [
        {
          name: '标签',
          key: 'tags',
          type: 'array',
          itemType: 'string',
          required: true,
          evaluation: { weight: 1, isCritical: false },
        },
      ]

      const result = await engine.evaluate({
        parsedOutput: { tags: ['a', 'b', 'c'] },
        expectedValues: { tags: ['a', 'b', 'c'] },
        fields,
      })

      expect(result.fieldResults[0].passed).toBe(true)
    })

    it('应该比较对象', async () => {
      const engine = new FieldEvaluationEngine()

      const fields: OutputFieldDefinition[] = [
        {
          name: '元数据',
          key: 'meta',
          type: 'object',
          required: true,
          evaluation: { weight: 1, isCritical: false },
        },
      ]

      const result = await engine.evaluate({
        parsedOutput: { meta: { a: 1, b: { c: 2 } } },
        expectedValues: { meta: { a: 1, b: { c: 2 } } },
        fields,
      })

      expect(result.fieldResults[0].passed).toBe(true)
    })

    it('应该检测数组差异', async () => {
      const engine = new FieldEvaluationEngine()

      const fields: OutputFieldDefinition[] = [
        {
          name: '标签',
          key: 'tags',
          type: 'array',
          required: true,
          evaluation: { weight: 1, isCritical: false },
        },
      ]

      const result = await engine.evaluate({
        parsedOutput: { tags: ['a', 'b'] },
        expectedValues: { tags: ['a', 'b', 'c'] },
        fields,
      })

      expect(result.fieldResults[0].passed).toBe(false)
    })
  })

  describe('便捷函数', () => {
    it('evaluateFields 应该正常工作', async () => {
      const result = await evaluateFields({
        parsedOutput: { category: 'bluetooth', confidence: 0.95 },
        expectedValues: { category: 'bluetooth', confidence: 0.95 },
        fields: baseFields,
      })

      expect(result.allPassed).toBe(true)
    })
  })
})
