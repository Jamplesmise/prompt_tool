import { describe, it, expect, vi } from 'vitest'
import { parseLLMOutput, extractScoreFromText, renderTemplate, runLLMEvaluator } from '../llm'
import type { EvaluatorInput } from '../types'

describe('LLM 评估器测试', () => {
  describe('parseLLMOutput - 解析 LLM 输出', () => {
    it('正常 JSON 对象应正确解析', () => {
      const output = '{"overall": 8, "reason": "回答质量良好"}'
      const result = parseLLMOutput(output)

      expect(result.passed).toBe(true)
      expect(result.score).toBe(0.8) // 8/10 = 0.8
      expect(result.reason).toBe('回答质量良好')
    })

    it('带代码块的 JSON 应正确解析', () => {
      const output = `评估结果如下：
\`\`\`json
{
  "overall": 7,
  "reason": "答案基本正确"
}
\`\`\`
以上是评估结果。`

      const result = parseLLMOutput(output)
      expect(result.passed).toBe(true)
      expect(result.score).toBeCloseTo(0.7, 5)
    })

    it('混合文本中的 JSON 应正确提取', () => {
      const output = '根据我的评估，结果是 {"overall": 6, "reason": "有改进空间"} 希望有帮助。'
      const result = parseLLMOutput(output)

      expect(result.passed).toBe(true) // 6/10 = 0.6 >= 0.6
      expect(result.score).toBeCloseTo(0.6, 5)
    })

    it('自定义分数范围应正确归一化', () => {
      const output = '{"overall": 80}'
      const result = parseLLMOutput(output, { min: 0, max: 100 })

      expect(result.score).toBe(0.8) // 80/100 = 0.8
    })

    it('自定义通过阈值应正确判断', () => {
      const output = '{"overall": 5}'
      const result = parseLLMOutput(output, { min: 0, max: 10 }, 0.7)

      expect(result.passed).toBe(false) // 0.5 < 0.7
      expect(result.score).toBe(0.5)
    })

    it('无法提取 JSON 应返回失败', () => {
      const output = '这是一个没有 JSON 的回复'
      const result = parseLLMOutput(output)

      expect(result.passed).toBe(false)
      expect(result.score).toBe(0)
      expect(result.reason).toContain('无法从 LLM 输出中提取 JSON')
    })

    it('JSON 缺少 overall 字段应返回失败', () => {
      const output = '{"score": 8, "reason": "test"}'
      const result = parseLLMOutput(output)

      expect(result.passed).toBe(false)
      expect(result.reason).toContain('缺少 overall 评分')
    })

    it('无效 JSON 格式应返回失败', () => {
      const output = '{"overall": invalid}'
      const result = parseLLMOutput(output)

      expect(result.passed).toBe(false)
      expect(result.reason).toContain('解析 LLM 输出失败')
    })

    it('分数超出范围应被限制', () => {
      const output = '{"overall": 15}'
      const result = parseLLMOutput(output, { min: 0, max: 10 })

      expect(result.score).toBe(1) // 超出上限，限制为 1
    })

    it('分数低于范围应被限制', () => {
      const output = '{"overall": -5}'
      const result = parseLLMOutput(output, { min: 0, max: 10 })

      expect(result.score).toBe(0) // 低于下限，限制为 0
    })

    it('包含维度信息应保留在 details 中', () => {
      const output = `{
        "overall": 8,
        "dimensions": {
          "relevance": 9,
          "accuracy": 7,
          "clarity": 8
        },
        "reason": "综合评价良好"
      }`
      const result = parseLLMOutput(output)

      expect(result.details?.dimensions).toEqual({
        relevance: 9,
        accuracy: 7,
        clarity: 8,
      })
    })
  })

  describe('extractScoreFromText - 从文本提取分数', () => {
    it('匹配 "评分: X" 格式', () => {
      const score = extractScoreFromText('评分: 8')
      expect(score).toBe(0.8)
    })

    it('匹配 "score: X" 格式', () => {
      const score = extractScoreFromText('The score: 7')
      expect(score).toBe(0.7)
    })

    it('匹配 "X/Y" 格式', () => {
      const score = extractScoreFromText('评分为 8/10')
      expect(score).toBe(0.8)
    })

    it('匹配 "overall: X" 格式', () => {
      const score = extractScoreFromText('overall: 9')
      expect(score).toBe(0.9)
    })

    it('无法匹配应返回 null', () => {
      const score = extractScoreFromText('没有分数的文本')
      expect(score).toBeNull()
    })

    it('支持小数分数', () => {
      const score = extractScoreFromText('评分: 7.5')
      expect(score).toBe(0.75)
    })

    it('自定义分数范围', () => {
      const score = extractScoreFromText('评分: 80', { min: 0, max: 100 })
      expect(score).toBe(0.8)
    })
  })

  describe('renderTemplate - 模板渲染', () => {
    it('替换简单变量', () => {
      const template = '输入: {{input}}, 输出: {{output}}'
      const result = renderTemplate(template, {
        input: 'hello',
        output: 'world',
      })

      expect(result).toBe('输入: hello, 输出: world')
    })

    it('替换 expected 变量', () => {
      const template = '期望: {{expected}}'
      const result = renderTemplate(template, {
        input: 'x',
        output: 'y',
        expected: 'z',
      })

      expect(result).toBe('期望: z')
    })

    it('条件块 - expected 存在时显示', () => {
      const template = '{{#if expected}}期望: {{expected}}{{/if}}'
      const result = renderTemplate(template, {
        input: 'x',
        output: 'y',
        expected: 'z',
      })

      expect(result).toBe('期望: z')
    })

    it('条件块 - expected 不存在时隐藏', () => {
      const template = '输出: {{output}}{{#if expected}} 期望: {{expected}}{{/if}}'
      const result = renderTemplate(template, {
        input: 'x',
        output: 'y',
        expected: null,
      })

      expect(result).toBe('输出: y')
    })

    it('多个变量替换', () => {
      const template = '{{input}} -> {{output}} (期望: {{expected}})'
      const result = renderTemplate(template, {
        input: 'a',
        output: 'b',
        expected: 'c',
      })

      expect(result).toBe('a -> b (期望: c)')
    })
  })

  describe('runLLMEvaluator - LLM 评估执行', () => {
    const mockInput: EvaluatorInput = {
      input: '什么是人工智能？',
      output: '人工智能是计算机科学的一个分支。',
      expected: null,
      metadata: {},
    }

    it('正常执行应返回评估结果', async () => {
      const mockModelInvoker = vi.fn().mockResolvedValue({
        output: '{"overall": 8, "reason": "回答正确"}',
        tokens: { input: 100, output: 50, total: 150 },
        latencyMs: 500,
        cost: 0.001,
      })

      const config = {
        modelId: 'test-model',
        prompt: '评估输出质量',
        scoreRange: { min: 0, max: 10 },
        passThreshold: 0.6,
      }

      const result = await runLLMEvaluator(config, mockInput, mockModelInvoker)

      expect(result.passed).toBe(true)
      expect(result.score).toBe(0.8)
      expect(result.tokenUsage).toEqual({ input: 100, output: 50, total: 150 })
      expect(result.cost).toBe(0.001)
      expect(mockModelInvoker).toHaveBeenCalledOnce()
    })

    it('模型调用失败应返回错误', async () => {
      const mockModelInvoker = vi.fn().mockRejectedValue(new Error('API 调用失败'))

      const config = {
        modelId: 'test-model',
        prompt: '评估输出质量',
      }

      const result = await runLLMEvaluator(config, mockInput, mockModelInvoker)

      expect(result.passed).toBe(false)
      expect(result.reason).toContain('LLM 评估失败')
    })

    it('提示词模板应正确渲染', async () => {
      const mockModelInvoker = vi.fn().mockResolvedValue({
        output: '{"overall": 7}',
        tokens: { input: 50, output: 20, total: 70 },
        latencyMs: 300,
        cost: null,
      })

      const config = {
        modelId: 'test-model',
        prompt: '评估: {{input}} -> {{output}}',
      }

      await runLLMEvaluator(config, mockInput, mockModelInvoker)

      const calledMessages = mockModelInvoker.mock.calls[0][1]
      expect(calledMessages[0].content).toContain('什么是人工智能？')
      expect(calledMessages[0].content).toContain('人工智能是计算机科学的一个分支。')
    })

    it('使用默认配置', async () => {
      const mockModelInvoker = vi.fn().mockResolvedValue({
        output: '{"overall": 6}',
        tokens: { input: 50, output: 20, total: 70 },
        latencyMs: 300,
        cost: null,
      })

      const config = {
        modelId: 'test-model',
        prompt: 'test',
      }

      const result = await runLLMEvaluator(config, mockInput, mockModelInvoker)

      // 默认阈值 0.6，分数 0.6 应该通过
      expect(result.passed).toBe(true)
      expect(result.score).toBe(0.6)
    })
  })
})
