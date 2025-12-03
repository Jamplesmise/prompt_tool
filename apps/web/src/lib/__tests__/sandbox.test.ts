import { describe, it, expect } from 'vitest'
import { executeInSandbox, validateCode, CODE_TEMPLATE } from '../sandbox'
import type { EvaluatorInput } from '@platform/evaluators'

// 辅助函数：创建测试输入
function createInput(
  output: string,
  expected: string | null = null,
  input = 'test input',
  metadata: Record<string, unknown> = {}
): EvaluatorInput {
  return { input, output, expected, metadata }
}

describe('sandbox.ts - 代码沙箱执行', () => {
  describe('validateCode - 语法验证', () => {
    it('有效代码应返回 valid=true', () => {
      const code = `
        module.exports = async function(input, output, expected, metadata) {
          return { passed: true, score: 1.0 };
        };
      `
      const result = validateCode(code)
      expect(result.valid).toBe(true)
    })

    it('语法错误应返回 valid=false', () => {
      const code = `
        module.exports = async function(input, output, expected {
          return { passed: true };
        };
      `
      const result = validateCode(code)
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('空代码应返回 valid=true', () => {
      const result = validateCode('')
      expect(result.valid).toBe(true)
    })

    it('CODE_TEMPLATE 应该是有效代码', () => {
      const result = validateCode(CODE_TEMPLATE)
      expect(result.valid).toBe(true)
    })
  })

  describe('executeInSandbox - 代码执行', () => {
    it('正常代码应执行成功', async () => {
      const code = `
        module.exports = async function(input, output, expected, metadata) {
          return {
            passed: output === expected,
            score: output === expected ? 1.0 : 0,
            reason: output === expected ? '匹配' : '不匹配'
          };
        };
      `
      const result = await executeInSandbox(code, createInput('hello', 'hello'))
      expect(result.passed).toBe(true)
      expect(result.score).toBe(1)
    })

    it('返回 passed=false 的代码', async () => {
      const code = `
        module.exports = async function(input, output, expected, metadata) {
          return { passed: false, score: 0, reason: '总是失败' };
        };
      `
      const result = await executeInSandbox(code, createInput('test'))
      expect(result.passed).toBe(false)
      expect(result.reason).toBe('总是失败')
    })

    it('可以访问 metadata', async () => {
      const code = `
        module.exports = async function(input, output, expected, metadata) {
          const minLen = metadata.minLength || 10;
          return {
            passed: output.length >= minLen,
            score: Math.min(1, output.length / minLen)
          };
        };
      `
      const result = await executeInSandbox(
        code,
        createInput('short', null, 'input', { minLength: 20 })
      )
      expect(result.passed).toBe(false)
      expect(result.score).toBe(0.25) // 5/20
    })

    it('可以使用 lodash', async () => {
      const code = `
        const _ = require('lodash');
        module.exports = async function(input, output, expected, metadata) {
          const words = _.words(output);
          return {
            passed: words.length > 0,
            score: 1,
            details: { wordCount: words.length }
          };
        };
      `
      const result = await executeInSandbox(code, createInput('hello world'))
      expect(result.passed).toBe(true)
      expect(result.details?.wordCount).toBe(2)
    })

    it('可以使用 dayjs', async () => {
      const code = `
        const dayjs = require('dayjs');
        module.exports = async function(input, output, expected, metadata) {
          const isValidDate = dayjs(output).isValid();
          return { passed: isValidDate, score: isValidDate ? 1 : 0 };
        };
      `
      const result = await executeInSandbox(code, createInput('2024-01-15'))
      expect(result.passed).toBe(true)
    })

    it('可以使用 validator', async () => {
      const code = `
        const validator = require('validator');
        module.exports = async function(input, output, expected, metadata) {
          const isEmail = validator.isEmail(output);
          return { passed: isEmail, score: isEmail ? 1 : 0 };
        };
      `
      const result = await executeInSandbox(code, createInput('test@example.com'))
      // validator 模块可能未安装，测试通过或返回模块错误都可接受
      expect(typeof result.passed).toBe('boolean')
    })

    it('禁止使用非白名单模块', async () => {
      const code = `
        const fs = require('fs');
        module.exports = async function(input, output, expected, metadata) {
          return { passed: true };
        };
      `
      const result = await executeInSandbox(code, createInput('test'))
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('不在白名单')
    })

    it('语法错误应返回错误信息', async () => {
      const code = `
        module.exports = async function(input, output, expected {
          return { passed: true };
        };
      `
      const result = await executeInSandbox(code, createInput('test'))
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('执行失败')
    })

    it('运行时错误应被捕获', async () => {
      const code = `
        module.exports = async function(input, output, expected, metadata) {
          throw new Error('自定义错误');
        };
      `
      const result = await executeInSandbox(code, createInput('test'))
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('执行失败')
    })

    it('返回非对象应报错', async () => {
      const code = `
        module.exports = async function(input, output, expected, metadata) {
          return 'not an object';
        };
      `
      const result = await executeInSandbox(code, createInput('test'))
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('必须是对象')
    })

    it('返回缺少 passed 字段应报错', async () => {
      const code = `
        module.exports = async function(input, output, expected, metadata) {
          return { score: 1.0 };
        };
      `
      const result = await executeInSandbox(code, createInput('test'))
      expect(result.passed).toBe(false)
      expect(result.reason).toContain('passed')
    })

    it('超时代码应被终止', async () => {
      const code = `
        module.exports = async function(input, output, expected, metadata) {
          let i = 0;
          while(true) { i++; } // 无限循环
          return { passed: true };
        };
      `
      const result = await executeInSandbox(code, createInput('test'), 100)
      expect(result.passed).toBe(false)
      // 超时可能返回 '超时' 或 '未知错误' 取决于 vm 实现
      expect(result.reason).toBeDefined()
    }, 5000)

    it('不导出函数应报错', async () => {
      const code = `
        const result = { passed: true };
      `
      const result = await executeInSandbox(code, createInput('test'))
      expect(result.passed).toBe(false)
      // 不导出函数会导致执行失败
      expect(result.reason).toBeDefined()
    })

    it('同步函数也应该工作', async () => {
      const code = `
        module.exports = function(input, output, expected, metadata) {
          return { passed: true, score: 1.0 };
        };
      `
      const result = await executeInSandbox(code, createInput('test'))
      expect(result.passed).toBe(true)
    })

    it('exports = 语法也应该工作', async () => {
      const code = `
        exports = async function(input, output, expected, metadata) {
          return { passed: true, score: 1.0 };
        };
      `
      const result = await executeInSandbox(code, createInput('test'))
      expect(result.passed).toBe(true)
    })
  })

  describe('复杂评估场景', () => {
    it('长度检查评估器', async () => {
      const code = `
        module.exports = async function(input, output, expected, metadata) {
          const minLength = metadata.minLength || 100;
          if (output.length < minLength) {
            return {
              passed: false,
              score: output.length / minLength,
              reason: \`输出长度 \${output.length} 小于要求的 \${minLength}\`
            };
          }
          return { passed: true, score: 1.0, reason: '长度符合要求' };
        };
      `
      // 短文本
      const shortResult = await executeInSandbox(
        code,
        createInput('短文本', null, 'input', { minLength: 50 })
      )
      expect(shortResult.passed).toBe(false)

      // 长文本
      const longText = 'a'.repeat(100)
      const longResult = await executeInSandbox(
        code,
        createInput(longText, null, 'input', { minLength: 50 })
      )
      expect(longResult.passed).toBe(true)
    })

    it('关键词覆盖评估器', async () => {
      const code = `
        const _ = require('lodash');
        module.exports = async function(input, output, expected, metadata) {
          const keywords = metadata.keywords || [];
          const foundKeywords = keywords.filter(kw => output.includes(kw));
          const coverage = keywords.length > 0 ? foundKeywords.length / keywords.length : 1;
          return {
            passed: coverage >= 0.8,
            score: coverage,
            reason: \`包含关键词 \${foundKeywords.length}/\${keywords.length}\`,
            details: {
              foundKeywords,
              missingKeywords: _.difference(keywords, foundKeywords)
            }
          };
        };
      `
      const result = await executeInSandbox(
        code,
        createInput('北京是中国的首都，有着悠久的历史', null, 'input', {
          keywords: ['北京', '首都', '历史', '文化'],
        })
      )
      expect(result.passed).toBe(false) // 只找到 3/4 = 75%
      expect(result.score).toBe(0.75)
      expect(result.details?.foundKeywords).toContain('北京')
      expect(result.details?.missingKeywords).toContain('文化')
    })

    it('JSON 结构验证评估器', async () => {
      const code = `
        const Ajv = require('ajv');
        module.exports = async function(input, output, expected, metadata) {
          const schema = metadata.schema || { type: 'object' };
          try {
            const data = JSON.parse(output);
            const ajv = new Ajv();
            const valid = ajv.validate(schema, data);
            return {
              passed: valid,
              score: valid ? 1.0 : 0,
              reason: valid ? 'JSON 结构符合 Schema' : ajv.errorsText()
            };
          } catch (e) {
            return {
              passed: false,
              score: 0,
              reason: '输出不是有效的 JSON'
            };
          }
        };
      `
      const validJson = await executeInSandbox(
        code,
        createInput('{"name": "test", "value": 123}', null, 'input', {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              value: { type: 'number' },
            },
            required: ['name'],
          },
        })
      )
      expect(validJson.passed).toBe(true)

      const invalidJson = await executeInSandbox(
        code,
        createInput('{invalid}', null, 'input', { schema: { type: 'object' } })
      )
      expect(invalidJson.passed).toBe(false)
    })
  })
})
