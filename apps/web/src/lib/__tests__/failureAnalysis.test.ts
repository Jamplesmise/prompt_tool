import { describe, it, expect } from 'vitest'
import { analyzeFailures, getFailureTypeName, getFailureTypeColor } from '../failureAnalysis'

// 简化的 TaskResultItem 类型（与实际实现匹配）
type TaskResultItem = {
  passed: boolean
  output?: string
  expectedOutput?: string
  evaluatorResults?: Array<{
    evaluatorName: string
    passed: boolean
    reason?: string
  }>
}

describe('failureAnalysis', () => {
  describe('analyzeFailures', () => {
    it('应该返回空数组当没有失败结果时', () => {
      const results: TaskResultItem[] = [
        { passed: true, output: '{"result": "ok"}' },
        { passed: true, output: 'success' },
      ]

      const patterns = analyzeFailures(results)
      expect(patterns).toHaveLength(0)
    })

    it('应该识别 JSON 格式错误', () => {
      const results: TaskResultItem[] = [
        {
          passed: false,
          output: 'not json',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: '期望 JSON 格式' }],
        },
        {
          passed: false,
          output: 'invalid',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: '无效的 JSON' }],
        },
        { passed: true, output: '{"ok": true}' },
      ]

      const patterns = analyzeFailures(results)
      const formatPattern = patterns.find((p) => p.type === 'format')

      expect(formatPattern).toBeDefined()
      expect(formatPattern?.count).toBe(2)
    })

    it('应该识别关键词缺失错误', () => {
      const results: TaskResultItem[] = [
        {
          passed: false,
          output: 'hello',
          evaluatorResults: [{ evaluatorName: 'keyword', passed: false, reason: '缺少关键词: world' }],
        },
        {
          passed: false,
          output: 'foo',
          evaluatorResults: [{ evaluatorName: 'keyword', passed: false, reason: '未包含必要关键词' }],
        },
      ]

      const patterns = analyzeFailures(results)
      const keywordPattern = patterns.find((p) => p.type === 'keyword')

      expect(keywordPattern).toBeDefined()
      expect(keywordPattern?.count).toBe(2)
    })

    it('应该识别内容质量问题', () => {
      const results: TaskResultItem[] = [
        {
          passed: false,
          output: 'bad content',
          evaluatorResults: [{ evaluatorName: 'quality', passed: false, reason: '内容不符合要求' }],
        },
        {
          passed: false,
          output: 'wrong',
          evaluatorResults: [{ evaluatorName: 'quality', passed: false, reason: '语义不准确' }],
        },
      ]

      const patterns = analyzeFailures(results)
      const contentPattern = patterns.find((p) => p.type === 'content')

      expect(contentPattern).toBeDefined()
      expect(contentPattern?.count).toBe(2)
    })

    it('应该识别长度问题', () => {
      const results: TaskResultItem[] = [
        {
          passed: false,
          output: 'x',
          evaluatorResults: [{ evaluatorName: 'length', passed: false, reason: '输出太短' }],
        },
        {
          passed: false,
          output: 'a'.repeat(1000),
          evaluatorResults: [{ evaluatorName: 'length', passed: false, reason: '超出长度限制' }],
        },
      ]

      const patterns = analyzeFailures(results)
      const lengthPattern = patterns.find((p) => p.type === 'length')

      expect(lengthPattern).toBeDefined()
      expect(lengthPattern?.count).toBe(2)
    })

    it('应该将无法识别的错误归类为 other', () => {
      const results: TaskResultItem[] = [
        {
          passed: false,
          output: 'test',
          evaluatorResults: [{ evaluatorName: 'custom', passed: false, reason: '未知错误类型xyz' }],
        },
      ]

      const patterns = analyzeFailures(results)
      const otherPattern = patterns.find((p) => p.type === 'other')

      expect(otherPattern).toBeDefined()
      expect(otherPattern?.count).toBe(1)
    })

    it('应该按失败数量降序排列', () => {
      const results: TaskResultItem[] = [
        {
          passed: false,
          output: 'x',
          evaluatorResults: [{ evaluatorName: 'custom', passed: false, reason: '未知错误' }],
        },
        {
          passed: false,
          output: 'not json',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: 'JSON 格式错误' }],
        },
        {
          passed: false,
          output: 'bad',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: 'JSON 解析失败' }],
        },
        {
          passed: false,
          output: 'wrong',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: 'JSON 无效' }],
        },
      ]

      const patterns = analyzeFailures(results)

      // format 类型有 3 个，应该排在前面
      expect(patterns[0].type).toBe('format')
      expect(patterns[0].count).toBe(3)
    })

    it('应该收集失败示例（最多3个）', () => {
      const results: TaskResultItem[] = [
        {
          passed: false,
          output: 'err1',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: 'JSON 错误1' }],
        },
        {
          passed: false,
          output: 'err2',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: 'JSON 错误2' }],
        },
        {
          passed: false,
          output: 'err3',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: 'JSON 错误3' }],
        },
        {
          passed: false,
          output: 'err4',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: 'JSON 错误4' }],
        },
        {
          passed: false,
          output: 'err5',
          evaluatorResults: [{ evaluatorName: 'json', passed: false, reason: 'JSON 错误5' }],
        },
      ]

      const patterns = analyzeFailures(results)
      const formatPattern = patterns.find((p) => p.type === 'format')

      expect(formatPattern?.examples).toHaveLength(3)
    })

    it('应该处理空结果数组', () => {
      const patterns = analyzeFailures([])
      expect(patterns).toHaveLength(0)
    })

    it('应该处理没有 evaluatorResults 的失败结果', () => {
      const results: TaskResultItem[] = [{ passed: false, output: 'test' }]

      const patterns = analyzeFailures(results)
      // 没有 evaluatorResults，归类为 other
      expect(patterns).toHaveLength(1)
      expect(patterns[0].type).toBe('other')
    })

    it('应该基于输出长度差异检测长度问题', () => {
      const results: TaskResultItem[] = [
        {
          passed: false,
          output: 'short',
          expectedOutput: 'this is a much longer expected output that differs significantly',
        },
      ]

      const patterns = analyzeFailures(results)
      const lengthPattern = patterns.find((p) => p.type === 'length')

      expect(lengthPattern).toBeDefined()
    })
  })

  describe('getFailureTypeName', () => {
    it('应该返回正确的中文名称', () => {
      expect(getFailureTypeName('format')).toBe('格式错误')
      expect(getFailureTypeName('content')).toBe('内容问题')
      expect(getFailureTypeName('keyword')).toBe('关键词缺失')
      expect(getFailureTypeName('length')).toBe('长度不符')
      expect(getFailureTypeName('other')).toBe('其他问题')
    })
  })

  describe('getFailureTypeColor', () => {
    it('应该返回正确的颜色', () => {
      expect(getFailureTypeColor('format')).toBe('#faad14')
      expect(getFailureTypeColor('content')).toBe('#ff4d4f')
      expect(getFailureTypeColor('keyword')).toBe('#722ed1')
      expect(getFailureTypeColor('length')).toBe('#EF4444')
      expect(getFailureTypeColor('other')).toBe('#8c8c8c')
    })
  })
})
