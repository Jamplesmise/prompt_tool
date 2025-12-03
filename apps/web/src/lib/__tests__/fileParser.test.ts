import { describe, it, expect } from 'vitest'
import {
  inferColumnType,
  generateSchema,
  generateBasicTemplate,
  generateTemplateWithExpected,
} from '../fileParser'

describe('fileParser.ts', () => {
  describe('inferColumnType', () => {
    it('空数组应返回 string', () => {
      expect(inferColumnType([])).toBe('string')
    })

    it('全是空值应返回 string', () => {
      expect(inferColumnType([null, undefined, ''])).toBe('string')
    })

    it('全是数字应返回 number', () => {
      expect(inferColumnType([1, 2, 3])).toBe('number')
      expect(inferColumnType(['1', '2', '3'])).toBe('number')
      expect(inferColumnType([1.5, '2.5', 3])).toBe('number')
    })

    it('全是布尔值应返回 boolean', () => {
      expect(inferColumnType([true, false])).toBe('boolean')
      expect(inferColumnType(['true', 'false'])).toBe('boolean')
      expect(inferColumnType(['0', '1'])).toBe('boolean')
      expect(inferColumnType([true, 'false', '1'])).toBe('boolean')
    })

    it('混合类型应返回 string', () => {
      expect(inferColumnType(['hello', 123])).toBe('string')
      expect(inferColumnType([true, 'hello'])).toBe('string')
    })

    it('包含空值的数字列应返回 number', () => {
      expect(inferColumnType([1, null, 2, '', 3])).toBe('number')
    })
  })

  describe('generateSchema', () => {
    it('应该生成正确的 schema', () => {
      const parseResult = {
        headers: ['name', 'age', 'active'],
        rows: [
          { name: '张三', age: 25, active: true },
          { name: '李四', age: 30, active: false },
        ],
        totalRows: 2,
      }

      const schema = generateSchema(parseResult)

      expect(schema).toEqual([
        { name: 'name', type: 'string' },
        { name: 'age', type: 'number' },
        { name: 'active', type: 'boolean' },
      ])
    })

    it('空数据应生成 string 类型', () => {
      const parseResult = {
        headers: ['col1'],
        rows: [{ col1: '' }, { col1: null }],
        totalRows: 2,
      }

      const schema = generateSchema(parseResult)
      expect(schema[0].type).toBe('string')
    })
  })

  describe('generateBasicTemplate', () => {
    it('应该生成基础模板', () => {
      const template = generateBasicTemplate()

      expect(template).toHaveLength(3)
      expect(template[0]).toHaveProperty('input')
      expect(template[0].input).toBe('示例输入1')
    })
  })

  describe('generateTemplateWithExpected', () => {
    it('应该生成带期望输出的模板', () => {
      const template = generateTemplateWithExpected()

      expect(template).toHaveLength(3)
      expect(template[0]).toHaveProperty('input')
      expect(template[0]).toHaveProperty('expected')
      expect(template[0].input).toBe('示例输入1')
      expect(template[0].expected).toBe('期望输出1')
    })
  })

  // 注意：parseExcel, parseCSV, parseFile 需要 File 对象和 FileReader
  // 这些需要在浏览器环境或使用 jsdom + mock 才能测试
  // 以下是集成测试的占位，实际项目中可使用 happy-dom 或 jest-environment-jsdom

  describe('parseFile (集成测试需浏览器环境)', () => {
    it.skip('应该解析 xlsx 文件', () => {
      // 需要浏览器环境
    })

    it.skip('应该解析 csv 文件', () => {
      // 需要浏览器环境
    })

    it.skip('不支持的格式应抛出错误', () => {
      // 需要浏览器环境
    })
  })

  // exportToExcel 和 exportToCSV 依赖 DOM，需要浏览器环境测试
  describe('export functions (需浏览器环境)', () => {
    it.skip('exportToExcel 应生成 xlsx 文件', () => {
      // 需要浏览器环境
    })

    it.skip('exportToCSV 应生成 csv 文件', () => {
      // 需要浏览器环境
    })
  })
})
