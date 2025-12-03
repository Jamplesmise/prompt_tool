import { describe, it, expect } from 'vitest'
import {
  renderPrompt,
  extractExpectedOutput,
  buildMessages,
} from '../promptRenderer'

describe('promptRenderer.ts', () => {
  describe('renderPrompt', () => {
    it('应该渲染简单模板', () => {
      const template = '你好，{{name}}！请介绍一下{{topic}}。'
      const data = { name: '张三', topic: 'AI' }

      const result = renderPrompt(template, data)

      expect(result.content).toBe('你好，张三！请介绍一下AI。')
      expect(result.variables).toEqual(data)
    })

    it('应该保留未提供的变量占位符', () => {
      const template = '{{greeting}}，{{name}}！'
      const data = { greeting: '你好' }

      const result = renderPrompt(template, data)

      expect(result.content).toBe('你好，{{name}}！')
    })

    it('应该处理没有变量的模板', () => {
      const template = '这是一段普通文本。'
      const data = { unused: 'value' }

      const result = renderPrompt(template, data)

      expect(result.content).toBe('这是一段普通文本。')
    })

    it('应该处理空数据', () => {
      const template = '{{name}}'
      const data = {}

      const result = renderPrompt(template, data)

      expect(result.content).toBe('{{name}}')
    })

    it('应该将数字转换为字符串', () => {
      const template = '数量：{{count}}，价格：{{price}}'
      const data = { count: 10, price: 99.9 }

      const result = renderPrompt(template, data)

      expect(result.content).toBe('数量：10，价格：99.9')
    })

    it('应该处理布尔值', () => {
      const template = '状态：{{enabled}}'
      const data = { enabled: true }

      const result = renderPrompt(template, data)

      expect(result.content).toBe('状态：true')
    })

    it('应该处理多行模板', () => {
      const template = `第一行：{{line1}}
第二行：{{line2}}
第三行：{{line3}}`
      const data = { line1: 'A', line2: 'B', line3: 'C' }

      const result = renderPrompt(template, data)

      expect(result.content).toBe(`第一行：A
第二行：B
第三行：C`)
    })
  })

  describe('extractExpectedOutput', () => {
    it('应该提取 expected 字段', () => {
      const data = { input: '问题', expected: '答案' }

      const result = extractExpectedOutput(data)

      expect(result).toBe('答案')
    })

    it('应该使用自定义字段名', () => {
      const data = { input: '问题', answer: '正确答案' }

      const result = extractExpectedOutput(data, 'answer')

      expect(result).toBe('正确答案')
    })

    it('字段不存在时应返回 null', () => {
      const data = { input: '问题' }

      const result = extractExpectedOutput(data)

      expect(result).toBeNull()
    })

    it('字段为 null 时应返回 null', () => {
      const data = { input: '问题', expected: null }

      const result = extractExpectedOutput(data)

      expect(result).toBeNull()
    })

    it('字段为 undefined 时应返回 null', () => {
      const data = { input: '问题', expected: undefined }

      const result = extractExpectedOutput(data)

      expect(result).toBeNull()
    })

    it('应该将数字转换为字符串', () => {
      const data = { expected: 42 }

      const result = extractExpectedOutput(data)

      expect(result).toBe('42')
    })

    it('应该将布尔值转换为字符串', () => {
      const data = { expected: true }

      const result = extractExpectedOutput(data)

      expect(result).toBe('true')
    })
  })

  describe('buildMessages', () => {
    it('应该构建只有用户消息的数组', () => {
      const result = buildMessages('你好')

      expect(result).toEqual([{ role: 'user', content: '你好' }])
    })

    it('应该包含系统提示', () => {
      const result = buildMessages('你好', '你是一个助手')

      expect(result).toEqual([
        { role: 'system', content: '你是一个助手' },
        { role: 'user', content: '你好' },
      ])
    })

    it('应该处理空系统提示', () => {
      const result = buildMessages('你好', '')

      expect(result).toEqual([{ role: 'user', content: '你好' }])
    })

    it('系统提示为 undefined 时不应包含', () => {
      const result = buildMessages('你好', undefined)

      expect(result).toEqual([{ role: 'user', content: '你好' }])
    })

    it('应该保留多行内容', () => {
      const prompt = `第一行
第二行`
      const result = buildMessages(prompt)

      expect(result[0].content).toBe(prompt)
    })
  })
})
