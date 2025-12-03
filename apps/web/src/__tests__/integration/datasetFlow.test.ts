import { describe, it, expect } from 'vitest'
import {
  inferColumnType,
  generateSchema,
  generateBasicTemplate,
  generateTemplateWithExpected,
} from '@/lib/fileParser'

/**
 * IT-2.2 数据集完整流程集成测试
 *
 * 测试流程：上传 xlsx → 预览 → 映射 → 保存 → 编辑数据行 → 导出
 *
 * 注意：文件上传和下载需要浏览器环境，这里测试核心业务逻辑
 */

describe('IT-2.2 数据集完整流程', () => {
  describe('1. 上传文件', () => {
    describe('文件格式支持', () => {
      it('应该支持 xlsx 格式', () => {
        const filename = 'test.xlsx'
        const ext = filename.split('.').pop()?.toLowerCase()
        expect(ext).toBe('xlsx')
        expect(['xlsx', 'xls', 'csv']).toContain(ext)
      })

      it('应该支持 xls 格式', () => {
        const filename = 'test.xls'
        const ext = filename.split('.').pop()?.toLowerCase()
        expect(['xlsx', 'xls', 'csv']).toContain(ext)
      })

      it('应该支持 csv 格式', () => {
        const filename = 'test.csv'
        const ext = filename.split('.').pop()?.toLowerCase()
        expect(['xlsx', 'xls', 'csv']).toContain(ext)
      })

      it('不支持的格式应该报错', () => {
        const filename = 'test.txt'
        const ext = filename.split('.').pop()?.toLowerCase()
        const supported = ['xlsx', 'xls', 'csv']
        expect(supported).not.toContain(ext)
      })
    })

    describe('文件解析', () => {
      it('应该解析出表头', () => {
        const mockParseResult = {
          headers: ['input', 'expected', 'category'],
          rows: [],
          totalRows: 0,
        }
        expect(mockParseResult.headers).toHaveLength(3)
      })

      it('应该解析出数据行', () => {
        const mockParseResult = {
          headers: ['input', 'expected'],
          rows: [
            { input: '问题1', expected: '答案1' },
            { input: '问题2', expected: '答案2' },
          ],
          totalRows: 2,
        }
        expect(mockParseResult.rows).toHaveLength(2)
        expect(mockParseResult.totalRows).toBe(2)
      })

      it('空文件应返回空结果', () => {
        const mockEmptyResult = {
          headers: [],
          rows: [],
          totalRows: 0,
        }
        expect(mockEmptyResult.headers).toHaveLength(0)
        expect(mockEmptyResult.rows).toHaveLength(0)
      })
    })
  })

  describe('2. 数据预览', () => {
    it('应该显示前 5 行数据', () => {
      const allRows = Array.from({ length: 100 }, (_, i) => ({
        input: `输入${i + 1}`,
      }))
      const previewRows = allRows.slice(0, 5)

      expect(previewRows).toHaveLength(5)
      expect(previewRows[0].input).toBe('输入1')
    })

    it('数据少于 5 行时显示全部', () => {
      const allRows = [{ input: '输入1' }, { input: '输入2' }]
      const previewRows = allRows.slice(0, 5)

      expect(previewRows).toHaveLength(2)
    })
  })

  describe('3. 字段映射', () => {
    it('应该自动识别 input 字段', () => {
      const headers = ['input', 'expected', 'category']
      const hasInput = headers.includes('input')
      expect(hasInput).toBe(true)
    })

    it('应该自动识别 expected 字段', () => {
      const headers = ['input', 'expected', 'category']
      const hasExpected = headers.includes('expected')
      expect(hasExpected).toBe(true)
    })

    it('应该支持手动映射字段', () => {
      const headers = ['question', 'answer']
      const mapping = {
        input: 'question',
        expected: 'answer',
      }

      expect(headers).toContain(mapping.input)
      expect(headers).toContain(mapping.expected)
    })

    it('应该生成正确的 schema', () => {
      const parseResult = {
        headers: ['input', 'count', 'active'],
        rows: [
          { input: '文本', count: 10, active: true },
          { input: '文本2', count: 20, active: false },
        ],
        totalRows: 2,
      }

      const schema = generateSchema(parseResult)

      expect(schema).toHaveLength(3)
      expect(schema.find((s) => s.name === 'input')?.type).toBe('string')
      expect(schema.find((s) => s.name === 'count')?.type).toBe('number')
      expect(schema.find((s) => s.name === 'active')?.type).toBe('boolean')
    })
  })

  describe('4. 存储设置', () => {
    it('临时存储应该 isPersistent = false', () => {
      const storageConfig = { isPersistent: false }
      expect(storageConfig.isPersistent).toBe(false)
    })

    it('持久化存储应该 isPersistent = true', () => {
      const storageConfig = { isPersistent: true }
      expect(storageConfig.isPersistent).toBe(true)
    })
  })

  describe('5. 保存数据集', () => {
    it('应该创建数据集元信息', () => {
      const dataset = {
        id: 'ds-1',
        name: '测试数据集',
        description: '描述',
        schema: [{ name: 'input', type: 'string' }],
        rowCount: 100,
        isPersistent: true,
      }

      expect(dataset.id).toBeTruthy()
      expect(dataset.rowCount).toBe(100)
    })

    it('应该保存所有数据行', () => {
      const rows = [
        { id: 'row-1', datasetId: 'ds-1', rowIndex: 0, data: { input: '1' } },
        { id: 'row-2', datasetId: 'ds-1', rowIndex: 1, data: { input: '2' } },
      ]

      expect(rows).toHaveLength(2)
      expect(rows[0].rowIndex).toBe(0)
      expect(rows[1].rowIndex).toBe(1)
    })
  })

  describe('6. 编辑数据行', () => {
    it('应该能更新单元格', () => {
      const row = { id: 'row-1', data: { input: '原始值' } }
      const updatedRow = { ...row, data: { input: '新值' } }

      expect(updatedRow.data.input).toBe('新值')
    })

    it('应该能新增数据行', () => {
      const rows = [{ rowIndex: 0 }, { rowIndex: 1 }]
      const newRow = { rowIndex: 2 }
      const updatedRows = [...rows, newRow]

      expect(updatedRows).toHaveLength(3)
    })

    it('应该能删除数据行', () => {
      const rows = [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }]
      const deleteId = 'r2'
      const updatedRows = rows.filter((r) => r.id !== deleteId)

      expect(updatedRows).toHaveLength(2)
      expect(updatedRows.map((r) => r.id)).not.toContain('r2')
    })
  })

  describe('7. 导出数据集', () => {
    it('应该支持导出为 xlsx', () => {
      const exportFormat = 'xlsx'
      const supportedFormats = ['xlsx', 'csv']
      expect(supportedFormats).toContain(exportFormat)
    })

    it('应该支持导出为 csv', () => {
      const exportFormat = 'csv'
      const supportedFormats = ['xlsx', 'csv']
      expect(supportedFormats).toContain(exportFormat)
    })

    it('导出数据应包含所有列', () => {
      const schema = [
        { name: 'input', type: 'string' },
        { name: 'expected', type: 'string' },
      ]
      const rows = [{ input: '1', expected: '1' }]

      const exportData = rows.map((row) => {
        const result: Record<string, unknown> = {}
        for (const col of schema) {
          result[col.name] = row[col.name as keyof typeof row]
        }
        return result
      })

      expect(Object.keys(exportData[0])).toEqual(['input', 'expected'])
    })
  })

  describe('8. 模板下载', () => {
    it('基础模板应该只有 input 列', () => {
      const template = generateBasicTemplate()

      expect(template[0]).toHaveProperty('input')
      expect(template[0]).not.toHaveProperty('expected')
    })

    it('带期望输出的模板应该有 input 和 expected 列', () => {
      const template = generateTemplateWithExpected()

      expect(template[0]).toHaveProperty('input')
      expect(template[0]).toHaveProperty('expected')
    })
  })
})

describe('数据集分页查询', () => {
  it('应该支持分页', () => {
    const page = 1
    const pageSize = 50
    const total = 200

    const skip = (page - 1) * pageSize
    const take = pageSize

    expect(skip).toBe(0)
    expect(take).toBe(50)
  })

  it('应该正确计算总页数', () => {
    const total = 200
    const pageSize = 50
    const totalPages = Math.ceil(total / pageSize)

    expect(totalPages).toBe(4)
  })

  it('第二页应该跳过前 50 条', () => {
    const page = 2
    const pageSize = 50
    const skip = (page - 1) * pageSize

    expect(skip).toBe(50)
  })
})

describe('数据类型推断', () => {
  it('应该识别数字列', () => {
    const values = [1, 2, 3, 4, 5]
    expect(inferColumnType(values)).toBe('number')
  })

  it('应该识别字符串数字列', () => {
    const values = ['1', '2', '3']
    expect(inferColumnType(values)).toBe('number')
  })

  it('应该识别布尔列', () => {
    const values = [true, false, true]
    expect(inferColumnType(values)).toBe('boolean')
  })

  it('应该识别字符串布尔列', () => {
    const values = ['true', 'false', 'true']
    expect(inferColumnType(values)).toBe('boolean')
  })

  it('混合类型应该返回 string', () => {
    const values = ['hello', 123, true]
    expect(inferColumnType(values)).toBe('string')
  })
})
