import * as XLSX from 'xlsx'
import Papa from 'papaparse'

// 导出数据行类型
type ExportRow = {
  序号: number
  提示词: string
  版本: number
  模型: string
  输入: string
  输出: string | null
  期望输出: string | null
  状态: string
  评估结果: string
  耗时ms: number | null
  错误: string | null
}

// 导出格式类型
type ExportFormat = 'xlsx' | 'csv' | 'json'

// 将任务结果转换为导出行格式
export function transformResultsForExport(
  results: Array<{
    datasetRow: { rowIndex: number }
    promptVersion: {
      version: number
      prompt: { name: string }
    }
    model: { name: string }
    input: unknown
    output: string | null
    expected: string | null
    status: string
    latencyMs: number | null
    error: string | null
    evaluations: Array<{ passed: boolean }>
  }>
): ExportRow[] {
  return results.map((r) => ({
    序号: r.datasetRow.rowIndex + 1,
    提示词: r.promptVersion.prompt.name,
    版本: r.promptVersion.version,
    模型: r.model.name,
    输入: JSON.stringify(r.input),
    输出: r.output,
    期望输出: r.expected,
    状态: translateStatus(r.status),
    评估结果: r.evaluations.every((e) => e.passed) ? '通过' : '未通过',
    耗时ms: r.latencyMs,
    错误: r.error,
  }))
}

// 翻译状态
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: '待执行',
    SUCCESS: '成功',
    FAILED: '失败',
    TIMEOUT: '超时',
    ERROR: '错误',
  }
  return statusMap[status] || status
}

// 导出为 Excel
export function exportToExcel(data: ExportRow[]): Uint8Array {
  const ws = XLSX.utils.json_to_sheet(data)

  // 设置列宽
  ws['!cols'] = [
    { wch: 6 }, // 序号
    { wch: 20 }, // 提示词
    { wch: 6 }, // 版本
    { wch: 20 }, // 模型
    { wch: 40 }, // 输入
    { wch: 40 }, // 输出
    { wch: 40 }, // 期望输出
    { wch: 8 }, // 状态
    { wch: 10 }, // 评估结果
    { wch: 10 }, // 耗时
    { wch: 30 }, // 错误
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '测试结果')

  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))
}

// 导出为 CSV
export function exportToCSV(data: ExportRow[]): string {
  return Papa.unparse(data, {
    quotes: true,
    header: true,
  })
}

// 导出为 JSON
export function exportToJSON(data: ExportRow[]): string {
  return JSON.stringify(data, null, 2)
}

// 统一导出函数
export function exportResults(
  data: ExportRow[],
  format: ExportFormat
): { content: Uint8Array | string; contentType: string; extension: string } {
  switch (format) {
    case 'xlsx':
      return {
        content: exportToExcel(data),
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        extension: 'xlsx',
      }
    case 'csv':
      return {
        content: exportToCSV(data),
        contentType: 'text/csv; charset=utf-8',
        extension: 'csv',
      }
    case 'json':
      return {
        content: exportToJSON(data),
        contentType: 'application/json',
        extension: 'json',
      }
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

export type { ExportRow, ExportFormat }
