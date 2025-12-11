import { describe, it, expect, beforeEach } from 'vitest'
import {
  render,
  compile,
  extractVariables,
  validateTemplate,
  TemplateEngine,
  clearCache,
} from '../template/templateEngine'

describe('TemplateEngine', () => {
  beforeEach(() => {
    clearCache()
  })

  describe('简单变量替换', () => {
    it('应该替换简单变量', () => {
      const template = '你好，{{name}}！'
      const result = render(template, { name: '张三' })
      expect(result).toBe('你好，张三！')
    })

    it('应该替换多个变量', () => {
      const template = '{{greeting}}，{{name}}！今天是{{day}}。'
      const result = render(template, {
        greeting: '你好',
        name: '李四',
        day: '周一',
      })
      expect(result).toBe('你好，李四！今天是周一。')
    })

    it('应该处理缺失变量', () => {
      const template = '你好，{{name}}！'
      const result = render(template, {})
      expect(result).toBe('你好，！')
    })

    it('应该处理 null 和 undefined', () => {
      const template = '值: {{value}}'
      expect(render(template, { value: null })).toBe('值: ')
      expect(render(template, { value: undefined })).toBe('值: ')
    })
  })

  describe('嵌套属性访问', () => {
    it('应该访问嵌套属性', () => {
      const template = '用户: {{user.name}}，设备: {{user.device.model}}'
      const result = render(template, {
        user: {
          name: '张三',
          device: { model: 'iPhone 15' },
        },
      })
      expect(result).toBe('用户: 张三，设备: iPhone 15')
    })

    it('应该处理不存在的嵌套路径', () => {
      const template = '值: {{a.b.c}}'
      const result = render(template, { a: {} })
      expect(result).toBe('值: ')
    })
  })

  describe('#each 循环', () => {
    it('应该遍历数组', () => {
      const template = '{{#each items}}- {{this}}\n{{/each}}'
      const result = render(template, { items: ['苹果', '香蕉', '橙子'] })
      expect(result).toBe('- 苹果\n- 香蕉\n- 橙子\n')
    })

    it('应该遍历对象数组', () => {
      const template = '{{#each users}}{{name}}: {{age}}\n{{/each}}'
      const result = render(template, {
        users: [
          { name: '张三', age: 25 },
          { name: '李四', age: 30 },
        ],
      })
      expect(result).toBe('张三: 25\n李四: 30\n')
    })

    it('应该提供 @index', () => {
      const template = '{{#each items}}{{@index}}: {{this}}\n{{/each}}'
      const result = render(template, { items: ['a', 'b', 'c'] })
      expect(result).toBe('0: a\n1: b\n2: c\n')
    })

    it('应该提供 @first 和 @last', () => {
      const template = '{{#each items}}{{#if @first}}[{{/if}}{{this}}{{#if @last}}]{{/if}}{{/each}}'
      const result = render(template, { items: ['a', 'b', 'c'] })
      expect(result).toBe('[abc]')
    })

    it('应该处理空数组', () => {
      const template = '{{#each items}}item{{/each}}'
      const result = render(template, { items: [] })
      expect(result).toBe('')
    })

    it('应该处理非数组', () => {
      const template = '{{#each items}}item{{/each}}'
      const result = render(template, { items: 'not an array' })
      expect(result).toBe('')
    })
  })

  describe('#if 条件', () => {
    it('应该处理真值', () => {
      const template = '{{#if show}}显示{{/if}}'
      expect(render(template, { show: true })).toBe('显示')
      expect(render(template, { show: 'yes' })).toBe('显示')
      expect(render(template, { show: 1 })).toBe('显示')
    })

    it('应该处理假值', () => {
      const template = '{{#if show}}显示{{/if}}'
      expect(render(template, { show: false })).toBe('')
      expect(render(template, { show: null })).toBe('')
      expect(render(template, { show: undefined })).toBe('')
    })

    it('应该处理 else 分支', () => {
      const template = '{{#if show}}是{{else}}否{{/if}}'
      expect(render(template, { show: true })).toBe('是')
      expect(render(template, { show: false })).toBe('否')
    })

    it('应该检查数组是否为空', () => {
      const template = '{{#if items}}有数据{{else}}无数据{{/if}}'
      expect(render(template, { items: [1, 2, 3] })).toBe('有数据')
      expect(render(template, { items: [] })).toBe('无数据')
    })

    it('应该支持嵌套条件', () => {
      const template = '{{#if a}}{{#if b}}AB{{else}}A{{/if}}{{else}}无{{/if}}'
      expect(render(template, { a: true, b: true })).toBe('AB')
      expect(render(template, { a: true, b: false })).toBe('A')
      expect(render(template, { a: false, b: true })).toBe('无')
    })
  })

  describe('#unless 条件', () => {
    it('应该在值为假时显示内容', () => {
      const template = '{{#unless hide}}显示{{/unless}}'
      expect(render(template, { hide: false })).toBe('显示')
      expect(render(template, { hide: true })).toBe('')
    })
  })

  describe('#with 上下文切换', () => {
    it('应该切换上下文', () => {
      const template = '{{#with user}}姓名: {{name}}, 年龄: {{age}}{{/with}}'
      const result = render(template, {
        user: { name: '张三', age: 25 },
      })
      expect(result).toBe('姓名: 张三, 年龄: 25')
    })

    it('应该保留外层上下文访问', () => {
      const template = '{{#with user}}{{name}} ({{@root.company}}){{/with}}'
      const result = render(template, {
        user: { name: '张三' },
        company: 'ABC公司',
      })
      expect(result).toBe('张三 (ABC公司)')
    })
  })

  describe('Helper 函数', () => {
    it('json helper 应该输出 JSON', () => {
      const template = '{{json data}}'
      const result = render(template, {
        data: { name: 'test', value: 123 },
      })
      expect(JSON.parse(result)).toEqual({ name: 'test', value: 123 })
    })

    it('length helper 应该返回长度', () => {
      const template = '数组长度: {{length items}}'
      const result = render(template, { items: [1, 2, 3, 4, 5] })
      expect(result).toBe('数组长度: 5')
    })
  })

  describe('extractVariables', () => {
    it('应该提取简单变量', () => {
      const template = '{{name}} {{age}}'
      const vars = extractVariables(template)
      expect(vars).toContain('name')
      expect(vars).toContain('age')
    })

    it('应该提取嵌套变量的根名', () => {
      const template = '{{user.name}} {{user.profile.bio}}'
      const vars = extractVariables(template)
      expect(vars).toContain('user')
      expect(vars).not.toContain('name')
    })

    it('应该从块语法中提取变量', () => {
      const template = '{{#each items}}{{/each}}{{#if show}}{{/if}}'
      const vars = extractVariables(template)
      expect(vars).toContain('items')
      expect(vars).toContain('show')
    })

    it('应该排除特殊变量', () => {
      const template = '{{#each items}}{{@index}} {{this}}{{/each}}'
      const vars = extractVariables(template)
      expect(vars).not.toContain('@index')
      expect(vars).not.toContain('this')
    })
  })

  describe('validateTemplate', () => {
    it('应该验证有效模板', () => {
      const template = '{{#if show}}{{name}}{{/if}}'
      const result = validateTemplate(template)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该检测未闭合的 if', () => {
      const template = '{{#if show}}内容'
      const result = validateTemplate(template)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('if')
    })

    it('应该检测未闭合的 each', () => {
      const template = '{{#each items}}内容'
      const result = validateTemplate(template)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('each')
    })

    it('应该检测多余的闭合标签', () => {
      const template = '内容{{/if}}'
      const result = validateTemplate(template)
      expect(result.valid).toBe(false)
    })
  })

  describe('TemplateEngine 类', () => {
    it('应该正确工作', () => {
      const engine = new TemplateEngine()
      const template = '{{greeting}}, {{name}}!'

      const result = engine.render(template, {
        greeting: 'Hello',
        name: 'World',
      })

      expect(result).toBe('Hello, World!')
    })

    it('应该缓存编译结果', () => {
      const engine = new TemplateEngine()
      const template = '{{name}}'

      const compiled1 = engine.compile(template)
      const compiled2 = engine.compile(template)

      expect(compiled1).toBe(compiled2)
    })

    it('应该提取变量', () => {
      const engine = new TemplateEngine()
      const vars = engine.extractVariables('{{a}} {{b.c}}')

      expect(vars).toContain('a')
      expect(vars).toContain('b')
    })

    it('应该验证模板', () => {
      const engine = new TemplateEngine()
      const result = engine.validate('{{#if x}}{{/if}}')

      expect(result.valid).toBe(true)
    })
  })

  describe('复杂场景', () => {
    it('应该处理智能客服提示词模板', () => {
      const template = `你是一个智能客服助手。

用户当前设备: {{current_device}}

用户所有设备:
{{#each devices}}- {{this}}
{{/each}}

{{#if history}}对话历史:
{{#each history}}[{{role}}]: {{content}}
{{/each}}{{/if}}

用户问题: {{question}}`

      const result = render(template, {
        current_device: 'iPhone 15 Pro',
        devices: ['iPhone 15 Pro', 'iPad Air', 'MacBook Pro'],
        history: [
          { role: 'user', content: '蓝牙连不上' },
          { role: 'assistant', content: '请问是什么设备？' },
        ],
        question: '我的 AirPods 连不上手机',
      })

      expect(result).toContain('iPhone 15 Pro')
      expect(result).toContain('- iPad Air')
      expect(result).toContain('[user]: 蓝牙连不上')
      expect(result).toContain('AirPods 连不上手机')
    })
  })
})
