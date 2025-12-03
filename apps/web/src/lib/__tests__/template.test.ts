import { describe, it, expect } from 'vitest'
import {
  extractVariableNames,
  extractVariables,
  mergeVariables,
  renderTemplate,
  validateVariables,
  getDefaultValues,
  getVariableRanges,
  isReservedVariable,
  RESERVED_VARIABLES,
} from '../template'
import type { PromptVariable } from '@platform/shared'

describe('template.ts', () => {
  describe('extractVariableNames', () => {
    it('应该提取单个变量', () => {
      const content = '你好，{{name}}！'
      const result = extractVariableNames(content)
      expect(result).toEqual(['name'])
    })

    it('应该提取多个变量', () => {
      const content = '你好，{{name}}！你的角色是{{role}}。'
      const result = extractVariableNames(content)
      expect(result).toEqual(['name', 'role'])
    })

    it('应该对重复变量去重', () => {
      const content = '{{name}}说：{{name}}你好'
      const result = extractVariableNames(content)
      expect(result).toEqual(['name'])
    })

    it('无变量时应返回空数组', () => {
      const content = '这是一段没有变量的文本'
      const result = extractVariableNames(content)
      expect(result).toEqual([])
    })

    it('应该支持下划线和数字的变量名', () => {
      const content = '{{user_name}} {{item1}} {{_private}}'
      const result = extractVariableNames(content)
      expect(result).toEqual(['user_name', 'item1', '_private'])
    })

    it('不应该匹配不完整的变量语法', () => {
      const content = '{name} {{name {{}}'
      const result = extractVariableNames(content)
      expect(result).toEqual([])
    })
  })

  describe('extractVariables', () => {
    it('应该返回变量对象数组', () => {
      const content = '{{name}} {{role}}'
      const result = extractVariables(content)
      expect(result).toEqual([
        { name: 'name', type: 'string', required: true },
        { name: 'role', type: 'string', required: true },
      ])
    })

    it('无变量时应返回空数组', () => {
      const result = extractVariables('普通文本')
      expect(result).toEqual([])
    })
  })

  describe('mergeVariables', () => {
    it('应该保留已有变量的配置', () => {
      const existing: PromptVariable[] = [
        { name: 'name', type: 'string', required: false, defaultValue: '张三' },
      ]
      const newNames = ['name', 'role']
      const result = mergeVariables(existing, newNames)

      expect(result).toEqual([
        { name: 'name', type: 'string', required: false, defaultValue: '张三' },
        { name: 'role', type: 'string', required: true },
      ])
    })

    it('应该移除不再使用的变量', () => {
      const existing: PromptVariable[] = [
        { name: 'old', type: 'string', required: true },
        { name: 'keep', type: 'number', required: true },
      ]
      const newNames = ['keep', 'new']
      const result = mergeVariables(existing, newNames)

      expect(result.map((v) => v.name)).toEqual(['keep', 'new'])
      expect(result.find((v) => v.name === 'old')).toBeUndefined()
    })
  })

  describe('renderTemplate', () => {
    it('应该替换单个变量', () => {
      const content = '你好，{{name}}！'
      const result = renderTemplate(content, { name: '张三' })
      expect(result).toBe('你好，张三！')
    })

    it('应该替换多个变量', () => {
      const content = '{{greeting}}，{{name}}！'
      const result = renderTemplate(content, { greeting: '你好', name: '李四' })
      expect(result).toBe('你好，李四！')
    })

    it('应该保留未提供的变量占位符', () => {
      const content = '{{greeting}}，{{name}}！'
      const result = renderTemplate(content, { greeting: '你好' })
      expect(result).toBe('你好，{{name}}！')
    })

    it('应该将 null 和 undefined 保留为占位符', () => {
      const content = '{{a}} {{b}}'
      const result = renderTemplate(content, { a: null, b: undefined })
      expect(result).toBe('{{a}} {{b}}')
    })

    it('应该将数字转换为字符串', () => {
      const content = '数量：{{count}}'
      const result = renderTemplate(content, { count: 42 })
      expect(result).toBe('数量：42')
    })
  })

  describe('validateVariables', () => {
    it('必填变量缺失时应返回错误', () => {
      const definitions: PromptVariable[] = [{ name: 'name', type: 'string', required: true }]
      const result = validateVariables(definitions, {})
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('变量 "name" 是必填项')
    })

    it('非必填变量缺失时不应报错', () => {
      const definitions: PromptVariable[] = [{ name: 'name', type: 'string', required: false }]
      const result = validateVariables(definitions, {})
      expect(result.valid).toBe(true)
    })

    it('number 类型应验证数字', () => {
      const definitions: PromptVariable[] = [{ name: 'count', type: 'number', required: true }]

      // 有效数字
      expect(validateVariables(definitions, { count: 42 }).valid).toBe(true)
      expect(validateVariables(definitions, { count: '42' }).valid).toBe(true)

      // 无效数字
      const invalid = validateVariables(definitions, { count: 'abc' })
      expect(invalid.valid).toBe(false)
      expect(invalid.errors).toContain('变量 "count" 应为数字类型')
    })

    it('boolean 类型应验证布尔值', () => {
      const definitions: PromptVariable[] = [{ name: 'flag', type: 'boolean', required: true }]

      // 有效布尔值
      expect(validateVariables(definitions, { flag: true }).valid).toBe(true)
      expect(validateVariables(definitions, { flag: 'true' }).valid).toBe(true)
      expect(validateVariables(definitions, { flag: 'false' }).valid).toBe(true)

      // 无效布尔值
      const invalid = validateVariables(definitions, { flag: 'yes' })
      expect(invalid.valid).toBe(false)
    })

    it('json 类型应验证 JSON 格式', () => {
      const definitions: PromptVariable[] = [{ name: 'data', type: 'json', required: true }]

      // 有效 JSON
      expect(validateVariables(definitions, { data: '{"key": "value"}' }).valid).toBe(true)
      expect(validateVariables(definitions, { data: '[]' }).valid).toBe(true)

      // 无效 JSON
      const invalid = validateVariables(definitions, { data: '{invalid}' })
      expect(invalid.valid).toBe(false)
      expect(invalid.errors).toContain('变量 "data" 应为有效的 JSON 格式')
    })

    it('空字符串应视为空值', () => {
      const definitions: PromptVariable[] = [{ name: 'name', type: 'string', required: true }]
      const result = validateVariables(definitions, { name: '' })
      expect(result.valid).toBe(false)
    })
  })

  describe('getDefaultValues', () => {
    it('应该返回有默认值的变量映射', () => {
      const definitions: PromptVariable[] = [
        { name: 'a', type: 'string', required: true, defaultValue: '默认A' },
        { name: 'b', type: 'string', required: true },
        { name: 'c', type: 'number', required: false, defaultValue: 10 },
      ]
      const result = getDefaultValues(definitions)
      expect(result).toEqual({
        a: '默认A',
        c: 10,
      })
    })

    it('无默认值时应返回空对象', () => {
      const definitions: PromptVariable[] = [{ name: 'a', type: 'string', required: true }]
      const result = getDefaultValues(definitions)
      expect(result).toEqual({})
    })
  })

  describe('getVariableRanges', () => {
    it('应该返回变量的位置范围', () => {
      const content = '你好{{name}}再见'
      const result = getVariableRanges(content)
      expect(result).toEqual([{ start: 2, end: 10, name: 'name' }])
    })

    it('应该返回多个变量的范围', () => {
      const content = '{{a}}中间{{b}}'
      const result = getVariableRanges(content)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('a')
      expect(result[1].name).toBe('b')
    })
  })

  describe('isReservedVariable', () => {
    it('应该识别保留变量', () => {
      expect(isReservedVariable('input')).toBe(true)
      expect(isReservedVariable('expected')).toBe(true)
    })

    it('非保留变量应返回 false', () => {
      expect(isReservedVariable('name')).toBe(false)
      expect(isReservedVariable('role')).toBe(false)
    })
  })

  describe('RESERVED_VARIABLES', () => {
    it('应该包含 INPUT 和 EXPECTED', () => {
      expect(RESERVED_VARIABLES.INPUT).toBe('input')
      expect(RESERVED_VARIABLES.EXPECTED).toBe('expected')
    })
  })
})
