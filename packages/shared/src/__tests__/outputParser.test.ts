import { describe, it, expect } from 'vitest'
import {
  createOutputParser,
  validateParsedData,
  parseAndValidate,
} from '../parser/outputParser'
import type { OutputFieldDefinition } from '../types/schema'

describe('OutputParser', () => {
  describe('JSON 模式', () => {
    const parser = createOutputParser('JSON')

    it('应该成功解析有效的 JSON 对象', () => {
      const output = '{"name": "test", "value": 123}'
      const result = parser.parse(output)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ name: 'test', value: 123 })
    })

    it('应该处理带空白的 JSON', () => {
      const output = `
        {
          "name": "test",
          "value": 123
        }
      `
      const result = parser.parse(output)

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('test')
    })

    it('应该拒绝无效的 JSON', () => {
      const output = '{"name": test}'
      const result = parser.parse(output)

      expect(result.success).toBe(false)
      expect(result.error).toContain('JSON 解析失败')
    })

    it('应该拒绝 JSON 数组', () => {
      const output = '[1, 2, 3]'
      const result = parser.parse(output)

      expect(result.success).toBe(false)
      expect(result.error).toContain('必须是 JSON 对象')
    })

    it('应该拒绝非对象 JSON 值', () => {
      const output = '"just a string"'
      const result = parser.parse(output)

      expect(result.success).toBe(false)
    })
  })

  describe('JSON_EXTRACT 模式', () => {
    const parser = createOutputParser('JSON_EXTRACT')

    it('应该提取 markdown code block 中的 JSON', () => {
      const output = `
        这是一些说明文字。

        \`\`\`json
        {
          "category": "bluetooth",
          "confidence": 0.95
        }
        \`\`\`

        以上是结果。
      `
      const result = parser.parse(output)

      expect(result.success).toBe(true)
      expect(result.data?.category).toBe('bluetooth')
      expect(result.data?.confidence).toBe(0.95)
    })

    it('应该提取无语言标记的 code block', () => {
      const output = `
        \`\`\`
        {"result": "success"}
        \`\`\`
      `
      const result = parser.parse(output)

      expect(result.success).toBe(true)
      expect(result.data?.result).toBe('success')
    })

    it('应该提取文本中的 JSON 对象', () => {
      const output = '分析结果如下：{"type": "query", "intent": "search"} 这是结果。'
      const result = parser.parse(output)

      expect(result.success).toBe(true)
      expect(result.data?.type).toBe('query')
    })

    it('应该直接解析纯 JSON', () => {
      const output = '{"direct": true}'
      const result = parser.parse(output)

      expect(result.success).toBe(true)
      expect(result.data?.direct).toBe(true)
    })

    it('应该处理复杂嵌套 JSON', () => {
      const output = `
        \`\`\`json
        {
          "thinking": "分析中...",
          "entities": ["iPhone", "蓝牙耳机"],
          "metadata": {
            "version": 1,
            "processed": true
          }
        }
        \`\`\`
      `
      const result = parser.parse(output)

      expect(result.success).toBe(true)
      expect(result.data?.entities).toEqual(['iPhone', '蓝牙耳机'])
      expect((result.data?.metadata as Record<string, unknown>)?.version).toBe(1)
    })

    it('应该返回错误当无法提取 JSON', () => {
      const output = '这段文字中没有任何 JSON 内容'
      const result = parser.parse(output)

      expect(result.success).toBe(false)
      expect(result.error).toContain('无法从输出中提取')
    })
  })

  describe('REGEX 模式', () => {
    it('应该使用正则提取字段', () => {
      const parser = createOutputParser('REGEX', {
        patterns: {
          category: 'Category:\\s*(\\w+)',
          score: 'Score:\\s*(\\d+\\.\\d+)',
        },
      })

      const output = 'Category: bluetooth\nScore: 0.95\nDetails: some text'
      const result = parser.parse(output)

      expect(result.success).toBe(true)
      expect(result.data?.category).toBe('bluetooth')
      expect(result.data?.score).toBe('0.95')
    })

    it('应该处理无匹配的情况', () => {
      const parser = createOutputParser('REGEX', {
        patterns: {
          missing: 'NotFound:\\s*(\\w+)',
        },
      })

      const output = 'Some other content'
      const result = parser.parse(output)

      expect(result.success).toBe(true)
      expect(result.data?.missing).toBeUndefined()
    })
  })
})

describe('validateParsedData', () => {
  const fields: OutputFieldDefinition[] = [
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
      name: '标签',
      key: 'tags',
      type: 'array',
      itemType: 'string',
      required: false,
      evaluation: { weight: 0.2, isCritical: false },
    },
    {
      name: '元数据',
      key: 'metadata',
      type: 'object',
      required: false,
      evaluation: { weight: 0.1, isCritical: false },
    },
  ]

  it('应该验证有效数据', () => {
    const data = {
      category: 'bluetooth',
      confidence: 0.95,
      tags: ['urgent', 'new'],
      metadata: { source: 'api' },
    }

    const result = validateParsedData(data, fields)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('应该检测必填字段缺失', () => {
    const data = {
      category: 'bluetooth',
      // confidence 缺失
    }

    const result = validateParsedData(data, fields)

    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].fieldKey).toBe('confidence')
    expect(result.errors[0].error).toBe('字段缺失')
  })

  it('应该检测类型错误', () => {
    const data = {
      category: 'bluetooth',
      confidence: '0.95', // 应该是数字
    }

    const result = validateParsedData(data, fields)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.fieldKey === 'confidence')).toBe(true)
  })

  it('应该检测枚举值错误', () => {
    const data = {
      category: 'unknown', // 不在枚举范围内
      confidence: 0.95,
    }

    const result = validateParsedData(data, fields)

    expect(result.valid).toBe(false)
    expect(result.errors[0].error).toContain('不在枚举范围内')
  })

  it('应该检测数组类型错误', () => {
    const data = {
      category: 'bluetooth',
      confidence: 0.95,
      tags: 'not-an-array', // 应该是数组
    }

    const result = validateParsedData(data, fields)

    expect(result.valid).toBe(false)
    expect(result.errors[0].fieldKey).toBe('tags')
  })

  it('应该检测数组元素类型错误', () => {
    const data = {
      category: 'bluetooth',
      confidence: 0.95,
      tags: ['valid', 123], // 应该全是字符串
    }

    const result = validateParsedData(data, fields)

    expect(result.valid).toBe(false)
    expect(result.errors[0].error).toContain('数组第 2 项')
  })

  it('应该允许可选字段为空', () => {
    const data = {
      category: 'bluetooth',
      confidence: 0.95,
      // tags 和 metadata 可选，不提供
    }

    const result = validateParsedData(data, fields)

    expect(result.valid).toBe(true)
  })
})

describe('parseAndValidate', () => {
  const fields: OutputFieldDefinition[] = [
    {
      name: '结果',
      key: 'result',
      type: 'string',
      required: true,
      evaluation: { weight: 1, isCritical: true },
    },
  ]

  it('应该解析并验证有效输出', () => {
    const output = '{"result": "success"}'

    const { parseResult, validationResult } = parseAndValidate(
      output,
      'JSON',
      fields
    )

    expect(parseResult.success).toBe(true)
    expect(validationResult?.valid).toBe(true)
  })

  it('应该返回解析错误', () => {
    const output = 'not valid json'

    const { parseResult, validationResult } = parseAndValidate(
      output,
      'JSON',
      fields
    )

    expect(parseResult.success).toBe(false)
    expect(validationResult).toBeUndefined()
  })

  it('应该返回验证错误', () => {
    const output = '{"other": "field"}'

    const { parseResult, validationResult } = parseAndValidate(
      output,
      'JSON',
      fields
    )

    expect(parseResult.success).toBe(true)
    expect(validationResult?.valid).toBe(false)
  })
})
