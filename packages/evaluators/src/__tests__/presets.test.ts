import { describe, it, expect } from 'vitest'
import {
  exactMatch,
  contains,
  regex,
  jsonSchema,
  similarity,
  calculateSimilarity,
  runPresetEvaluator,
} from '../presets'
import type { EvaluatorInput } from '../types'

// 辅助函数：创建测试输入
function createInput(
  output: string,
  expected: string | null = null,
  input = 'test input',
  metadata: Record<string, unknown> = {}
): EvaluatorInput {
  return { input, output, expected, metadata }
}

describe('预置评估器测试', () => {
  describe('exactMatch - 精确匹配', () => {
    it('完全相等应返回 passed=true', () => {
      const result = exactMatch(createInput('中国', '中国'))
      expect(result.passed).toBe(true)
      expect(result.score).toBe(1)
    })

    it('不相等应返回 passed=false', () => {
      const result = exactMatch(createInput('中国', '日本'))
      expect(result.passed).toBe(false)
      expect(result.score).toBe(0)
    })

    it('缺少 expected 应返回 passed=false', () => {
      const result = exactMatch(createInput('中国', null))
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('缺少期望值')
    })

    it('空字符串匹配空字符串应通过', () => {
      const result = exactMatch(createInput('', ''))
      expect(result.passed).toBe(true)
    })

    it('大小写敏感', () => {
      const result = exactMatch(createInput('Hello', 'hello'))
      expect(result.passed).toBe(false)
    })
  })

  describe('contains - 包含匹配', () => {
    it('输出包含期望内容应返回 passed=true', () => {
      const result = contains(createInput('北京是中国的首都', '首都'))
      expect(result.passed).toBe(true)
      expect(result.score).toBe(1)
    })

    it('输出不包含期望内容应返回 passed=false', () => {
      const result = contains(createInput('北京是中国的首都', '省会'))
      expect(result.passed).toBe(false)
      expect(result.score).toBe(0)
    })

    it('expected 为空字符串应通过', () => {
      const result = contains(createInput('任何内容', ''))
      expect(result.passed).toBe(true)
    })

    it('缺少 expected 应返回 passed=false', () => {
      const result = contains(createInput('任何内容', null))
      expect(result.passed).toBe(false)
    })

    it('完全匹配也应通过', () => {
      const result = contains(createInput('完全匹配', '完全匹配'))
      expect(result.passed).toBe(true)
    })
  })

  describe('regex - 正则匹配', () => {
    it('匹配应返回 passed=true', () => {
      const result = regex(createInput('test@example.com'), {
        pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$',
      })
      expect(result.passed).toBe(true)
    })

    it('不匹配应返回 passed=false', () => {
      const result = regex(createInput('invalid-email'), {
        pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$',
      })
      expect(result.passed).toBe(false)
    })

    it('支持 flags 参数（忽略大小写）', () => {
      const result = regex(createInput('HELLO'), {
        pattern: 'hello',
        flags: 'i',
      })
      expect(result.passed).toBe(true)
    })

    it('无效正则表达式应返回错误', () => {
      const result = regex(createInput('test'), {
        pattern: '[invalid(',
      })
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('无效的正则表达式')
    })

    it('缺少 pattern 参数应返回错误', () => {
      const result = regex(createInput('test'), {})
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('缺少正则表达式')
    })

    it('日期格式验证', () => {
      const result = regex(createInput('2024-01-15'), {
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      })
      expect(result.passed).toBe(true)
    })
  })

  describe('jsonSchema - JSON Schema 校验', () => {
    const userSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    }

    it('有效 JSON 且符合 Schema 应返回 passed=true', () => {
      const result = jsonSchema(createInput('{"name": "张三", "age": 25}'), {
        schema: userSchema,
      })
      expect(result.passed).toBe(true)
      expect(result.score).toBe(1)
    })

    it('有效 JSON 但不符合 Schema 应返回 passed=false', () => {
      const result = jsonSchema(createInput('{"age": 25}'), {
        schema: userSchema,
      })
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('不符合')
    })

    it('无效 JSON 应返回 passed=false', () => {
      const result = jsonSchema(createInput('{invalid json}'), {
        schema: userSchema,
      })
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('不是有效的 JSON')
    })

    it('缺少 schema 参数应返回错误', () => {
      const result = jsonSchema(createInput('{}'), {})
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('缺少 JSON Schema')
    })

    it('数组 Schema 校验', () => {
      const arraySchema = {
        type: 'array',
        items: { type: 'number' },
      }
      const result = jsonSchema(createInput('[1, 2, 3]'), {
        schema: arraySchema,
      })
      expect(result.passed).toBe(true)
    })

    it('类型不匹配应返回错误详情', () => {
      const result = jsonSchema(createInput('{"name": 123}'), {
        schema: userSchema,
      })
      expect(result.passed).toBe(false)
      expect(result.details?.errors).toBeDefined()
    })
  })

  describe('similarity - 相似度匹配', () => {
    it('相似度 >= 阈值应返回 passed=true', () => {
      const result = similarity(createInput('hello world', 'hello world'), {
        threshold: 0.8,
      })
      expect(result.passed).toBe(true)
      expect(result.score).toBe(1)
    })

    it('相似度 < 阈值应返回 passed=false', () => {
      const result = similarity(createInput('hello', 'completely different'), {
        threshold: 0.8,
      })
      expect(result.passed).toBe(false)
    })

    it('默认阈值为 0.8', () => {
      const result = similarity(createInput('hello world', 'hello worlds'))
      expect(result.passed).toBe(true)
      expect(result.details?.threshold).toBe(0.8)
    })

    it('缺少 expected 应返回 passed=false', () => {
      const result = similarity(createInput('hello', null), { threshold: 0.8 })
      expect(result.passed).toBe(false)
    })

    it('返回详细信息', () => {
      const result = similarity(createInput('test', 'test'), { threshold: 0.5 })
      expect(result.details?.algorithm).toBe('levenshtein')
      expect(result.details?.similarity).toBeDefined()
    })
  })

  describe('calculateSimilarity - 相似度算法', () => {
    describe('Levenshtein 算法', () => {
      it('相同字符串应返回 1', () => {
        expect(calculateSimilarity('hello', 'hello', 'levenshtein')).toBe(1)
      })

      it('完全不同应返回较低值', () => {
        const score = calculateSimilarity('abc', 'xyz', 'levenshtein')
        expect(score).toBeLessThan(0.5)
      })

      it('单字符差异', () => {
        const score = calculateSimilarity('hello', 'hallo', 'levenshtein')
        expect(score).toBe(0.8) // 1 - 1/5
      })

      it('空字符串', () => {
        expect(calculateSimilarity('', '', 'levenshtein')).toBe(1)
        expect(calculateSimilarity('hello', '', 'levenshtein')).toBe(0)
      })
    })

    describe('Cosine 算法', () => {
      it('相同文本应返回 1', () => {
        const score = calculateSimilarity('hello world', 'hello world', 'cosine')
        expect(score).toBeCloseTo(1, 5)
      })

      it('部分重叠', () => {
        const score = calculateSimilarity('hello world', 'hello there', 'cosine')
        expect(score).toBeGreaterThan(0)
        expect(score).toBeLessThan(1)
      })

      it('完全不同', () => {
        const score = calculateSimilarity('apple orange', 'car bus', 'cosine')
        expect(score).toBe(0)
      })
    })

    describe('Jaccard 算法', () => {
      it('相同集合应返回 1', () => {
        const score = calculateSimilarity('a b c', 'a b c', 'jaccard')
        expect(score).toBe(1)
      })

      it('部分重叠', () => {
        const score = calculateSimilarity('a b c', 'a b d', 'jaccard')
        expect(score).toBe(0.5) // 交集 2，并集 4
      })

      it('无重叠', () => {
        const score = calculateSimilarity('a b', 'c d', 'jaccard')
        expect(score).toBe(0)
      })
    })
  })

  describe('runPresetEvaluator - 统一执行', () => {
    it('应正确执行 exact_match', () => {
      const result = runPresetEvaluator('exact_match', createInput('test', 'test'))
      expect(result.passed).toBe(true)
    })

    it('应正确执行 contains', () => {
      const result = runPresetEvaluator('contains', createInput('hello world', 'world'))
      expect(result.passed).toBe(true)
    })

    it('应正确执行 regex', () => {
      const result = runPresetEvaluator('regex', createInput('123'), {
        pattern: '^\\d+$',
      })
      expect(result.passed).toBe(true)
    })

    it('应正确执行 json_schema', () => {
      const result = runPresetEvaluator('json_schema', createInput('{"a":1}'), {
        schema: { type: 'object' },
      })
      expect(result.passed).toBe(true)
    })

    it('应正确执行 similarity', () => {
      const result = runPresetEvaluator('similarity', createInput('test', 'test'), {
        threshold: 0.8,
      })
      expect(result.passed).toBe(true)
    })
  })
})
