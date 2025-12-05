import { describe, it, expect } from 'vitest'
import {
  transformResultsForExport,
  exportToCSV,
  exportToJSON,
  exportResults,
} from '../exporter'
import type { ExportRow } from '../exporter'

describe('导出工具函数', () => {
  // 模拟测试结果数据
  const mockResults = [
    {
      datasetRow: { rowIndex: 0 },
      promptVersion: {
        version: 1,
        prompt: { name: '测试提示词' },
      },
      model: { name: 'gpt-4' },
      input: { question: '什么是AI？' },
      output: '人工智能是...',
      expected: '人工智能是一种技术',
      status: 'SUCCESS',
      latencyMs: 1500,
      error: null,
      evaluations: [{ passed: true }],
    },
    {
      datasetRow: { rowIndex: 1 },
      promptVersion: {
        version: 2,
        prompt: { name: '测试提示词' },
      },
      model: { name: 'claude-3' },
      input: { question: '什么是机器学习？' },
      output: null,
      expected: null,
      status: 'FAILED',
      latencyMs: null,
      error: 'API 超时',
      evaluations: [{ passed: false }],
    },
  ]

  describe('transformResultsForExport', () => {
    it('应正确转换结果为导出格式', () => {
      const exportData = transformResultsForExport(mockResults)

      expect(exportData).toHaveLength(2)

      expect(exportData[0]).toEqual({
        序号: 1,
        提示词: '测试提示词',
        版本: 1,
        模型: 'gpt-4',
        输入: JSON.stringify({ question: '什么是AI？' }),
        输出: '人工智能是...',
        期望输出: '人工智能是一种技术',
        状态: '成功',
        评估结果: '通过',
        耗时ms: 1500,
        错误: null,
      })

      expect(exportData[1]).toEqual({
        序号: 2,
        提示词: '测试提示词',
        版本: 2,
        模型: 'claude-3',
        输入: JSON.stringify({ question: '什么是机器学习？' }),
        输出: null,
        期望输出: null,
        状态: '失败',
        评估结果: '未通过',
        耗时ms: null,
        错误: 'API 超时',
      })
    })

    it('应正确翻译各种状态', () => {
      const testCases = [
        { status: 'PENDING', expected: '待执行' },
        { status: 'SUCCESS', expected: '成功' },
        { status: 'FAILED', expected: '失败' },
        { status: 'TIMEOUT', expected: '超时' },
        { status: 'ERROR', expected: '错误' },
      ]

      testCases.forEach(({ status, expected }) => {
        const result = transformResultsForExport([
          {
            ...mockResults[0],
            status,
          },
        ])
        expect(result[0].状态).toBe(expected)
      })
    })

    it('未知状态应保持原样', () => {
      const result = transformResultsForExport([
        {
          ...mockResults[0],
          status: 'UNKNOWN_STATUS',
        },
      ])
      expect(result[0].状态).toBe('UNKNOWN_STATUS')
    })

    it('多个评估全部通过时应显示通过', () => {
      const result = transformResultsForExport([
        {
          ...mockResults[0],
          evaluations: [{ passed: true }, { passed: true }, { passed: true }],
        },
      ])
      expect(result[0].评估结果).toBe('通过')
    })

    it('任一评估失败时应显示未通过', () => {
      const result = transformResultsForExport([
        {
          ...mockResults[0],
          evaluations: [{ passed: true }, { passed: false }, { passed: true }],
        },
      ])
      expect(result[0].评估结果).toBe('未通过')
    })

    it('空评估列表应显示通过', () => {
      const result = transformResultsForExport([
        {
          ...mockResults[0],
          evaluations: [],
        },
      ])
      expect(result[0].评估结果).toBe('通过')
    })
  })

  describe('exportToCSV', () => {
    it('应生成有效的 CSV 格式', () => {
      const exportData: ExportRow[] = [
        {
          序号: 1,
          提示词: '测试',
          版本: 1,
          模型: 'gpt-4',
          输入: '{"q":"test"}',
          输出: '回答',
          期望输出: '期望',
          状态: '成功',
          评估结果: '通过',
          耗时ms: 1000,
          错误: null,
        },
      ]

      const csv = exportToCSV(exportData)

      // 验证 CSV 头部
      expect(csv).toContain('序号')
      expect(csv).toContain('提示词')
      expect(csv).toContain('版本')
      expect(csv).toContain('模型')

      // 验证数据行
      expect(csv).toContain('测试')
      expect(csv).toContain('gpt-4')
      expect(csv).toContain('回答')
    })

    it('应正确处理包含逗号的数据', () => {
      const exportData: ExportRow[] = [
        {
          序号: 1,
          提示词: '测试,包含逗号',
          版本: 1,
          模型: 'gpt-4',
          输入: '{}',
          输出: 'a,b,c',
          期望输出: null,
          状态: '成功',
          评估结果: '通过',
          耗时ms: 1000,
          错误: null,
        },
      ]

      const csv = exportToCSV(exportData)

      // 包含逗号的字段应被引号包裹
      expect(csv).toContain('"测试,包含逗号"')
      expect(csv).toContain('"a,b,c"')
    })

    it('应正确处理 null 值', () => {
      const exportData: ExportRow[] = [
        {
          序号: 1,
          提示词: '测试',
          版本: 1,
          模型: 'gpt-4',
          输入: '{}',
          输出: null,
          期望输出: null,
          状态: '成功',
          评估结果: '通过',
          耗时ms: null,
          错误: null,
        },
      ]

      const csv = exportToCSV(exportData)
      expect(typeof csv).toBe('string')
    })
  })

  describe('exportToJSON', () => {
    it('应生成格式化的 JSON', () => {
      const exportData: ExportRow[] = [
        {
          序号: 1,
          提示词: '测试',
          版本: 1,
          模型: 'gpt-4',
          输入: '{}',
          输出: '回答',
          期望输出: '期望',
          状态: '成功',
          评估结果: '通过',
          耗时ms: 1000,
          错误: null,
        },
      ]

      const json = exportToJSON(exportData)

      // 验证是有效的 JSON
      const parsed = JSON.parse(json)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].序号).toBe(1)
      expect(parsed[0].提示词).toBe('测试')

      // 验证格式化（包含缩进）
      expect(json).toContain('  ')
    })

    it('空数组应返回空 JSON 数组', () => {
      const json = exportToJSON([])
      expect(json).toBe('[]')
    })
  })

  describe('exportResults', () => {
    const testData: ExportRow[] = [
      {
        序号: 1,
        提示词: '测试',
        版本: 1,
        模型: 'gpt-4',
        输入: '{}',
        输出: '回答',
        期望输出: null,
        状态: '成功',
        评估结果: '通过',
        耗时ms: 1000,
        错误: null,
      },
    ]

    it('xlsx 格式应返回正确的元信息', () => {
      const result = exportResults(testData, 'xlsx')

      expect(result.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      expect(result.extension).toBe('xlsx')
      expect(result.content).toBeInstanceOf(Uint8Array)
    })

    it('csv 格式应返回正确的元信息', () => {
      const result = exportResults(testData, 'csv')

      expect(result.contentType).toBe('text/csv; charset=utf-8')
      expect(result.extension).toBe('csv')
      expect(typeof result.content).toBe('string')
    })

    it('json 格式应返回正确的元信息', () => {
      const result = exportResults(testData, 'json')

      expect(result.contentType).toBe('application/json')
      expect(result.extension).toBe('json')
      expect(typeof result.content).toBe('string')
    })

    it('不支持的格式应抛出错误', () => {
      expect(() => {
        exportResults(testData, 'pdf' as 'xlsx')
      }).toThrow('Unsupported export format: pdf')
    })
  })
})
