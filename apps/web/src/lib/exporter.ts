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

// 字段级评估导出行类型
type FieldEvaluationExportRow = {
  序号: number
  字段名: string
  字段Key: string
  实际值: string
  期望值: string
  评估器: string
  通过: string
  得分: string
  原因: string | null
  是否关键: string
}

// 聚合详情导出行类型
type AggregationExportRow = {
  序号: number
  聚合模式: string
  关键字段总数: number
  关键字段通过数: number
  关键字段通过: string
  加权得分: string
  最终结果: string
  结果原因: string
}

// 导出格式类型
type ExportFormat = 'xlsx' | 'csv' | 'json'

// 导出选项
type ExportOptions = {
  includeFieldEvaluations?: boolean
  includeAggregation?: boolean
}

// 聚合数据输入类型
type AggregationInput = {
  rowIndex: number
  aggregationMode: string
  criticalTotal: number
  criticalPassed: number
  weightedScore: number
  passed: boolean
  reason: string
}

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

// 字段评估数据输入类型
type FieldEvaluationInput = {
  rowIndex: number
  fieldName: string
  fieldKey: string
  fieldValue: unknown
  expectedValue: unknown
  evaluatorName: string | null
  passed: boolean
  score: unknown
  reason: string | null
  isCritical: boolean
}

// 将字段评估结果转换为导出行格式
export function transformFieldEvaluationsForExport(
  fieldEvaluations: FieldEvaluationInput[]
): FieldEvaluationExportRow[] {
  return fieldEvaluations.map((fe) => ({
    序号: fe.rowIndex + 1,
    字段名: fe.fieldName,
    字段Key: fe.fieldKey,
    实际值: fe.fieldValue !== undefined && fe.fieldValue !== null
      ? (typeof fe.fieldValue === 'object' ? JSON.stringify(fe.fieldValue) : String(fe.fieldValue))
      : '',
    期望值: fe.expectedValue !== undefined && fe.expectedValue !== null
      ? (typeof fe.expectedValue === 'object' ? JSON.stringify(fe.expectedValue) : String(fe.expectedValue))
      : '',
    评估器: fe.evaluatorName || '-',
    通过: fe.passed ? '是' : '否',
    得分: fe.score !== undefined && fe.score !== null ? String(fe.score) : '-',
    原因: fe.reason,
    是否关键: fe.isCritical ? '是' : '否',
  }))
}

// 聚合模式翻译
const aggregationModeLabels: Record<string, string> = {
  all_pass: '全部通过',
  weighted_average: '加权平均',
  critical_first: '关键优先',
  custom: '自定义',
}

// 将聚合结果转换为导出行格式
export function transformAggregationForExport(
  aggregations: AggregationInput[]
): AggregationExportRow[] {
  return aggregations.map((agg) => ({
    序号: agg.rowIndex + 1,
    聚合模式: aggregationModeLabels[agg.aggregationMode] || agg.aggregationMode,
    关键字段总数: agg.criticalTotal,
    关键字段通过数: agg.criticalPassed,
    关键字段通过: agg.criticalTotal > 0
      ? `${agg.criticalPassed}/${agg.criticalTotal}`
      : '-',
    加权得分: agg.weightedScore >= 0 ? `${(agg.weightedScore * 100).toFixed(1)}%` : '-',
    最终结果: agg.passed ? '通过' : '未通过',
    结果原因: agg.reason || '-',
  }))
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

// 导出为 Excel（包含字段级评估和聚合详情）
export function exportToExcelWithDetails(
  data: ExportRow[],
  options?: {
    fieldEvaluations?: FieldEvaluationExportRow[]
    aggregations?: AggregationExportRow[]
  }
): Uint8Array {
  const wb = XLSX.utils.book_new()

  // Sheet 1: 测试结果概览
  const ws1 = XLSX.utils.json_to_sheet(data)
  ws1['!cols'] = [
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
  XLSX.utils.book_append_sheet(wb, ws1, '结果概览')

  // Sheet 2: 字段级评估
  if (options?.fieldEvaluations && options.fieldEvaluations.length > 0) {
    const ws2 = XLSX.utils.json_to_sheet(options.fieldEvaluations)
    ws2['!cols'] = [
      { wch: 6 }, // 序号
      { wch: 15 }, // 字段名
      { wch: 15 }, // 字段Key
      { wch: 30 }, // 实际值
      { wch: 30 }, // 期望值
      { wch: 15 }, // 评估器
      { wch: 6 }, // 通过
      { wch: 8 }, // 得分
      { wch: 40 }, // 原因
      { wch: 8 }, // 是否关键
    ]
    XLSX.utils.book_append_sheet(wb, ws2, '字段级评估')
  }

  // Sheet 3: 聚合详情
  if (options?.aggregations && options.aggregations.length > 0) {
    const ws3 = XLSX.utils.json_to_sheet(options.aggregations)
    ws3['!cols'] = [
      { wch: 6 }, // 序号
      { wch: 12 }, // 聚合模式
      { wch: 12 }, // 关键字段总数
      { wch: 14 }, // 关键字段通过数
      { wch: 14 }, // 关键字段通过
      { wch: 10 }, // 加权得分
      { wch: 10 }, // 最终结果
      { wch: 40 }, // 结果原因
    ]
    XLSX.utils.book_append_sheet(wb, ws3, '聚合详情')
  }

  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))
}

// 导出为 Excel（包含字段级评估）- 保持向后兼容
export function exportToExcelWithFieldEvaluations(
  data: ExportRow[],
  fieldEvaluations: FieldEvaluationExportRow[]
): Uint8Array {
  return exportToExcelWithDetails(data, { fieldEvaluations })
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
  format: ExportFormat,
  options?: ExportOptions & {
    fieldEvaluations?: FieldEvaluationExportRow[]
    aggregations?: AggregationExportRow[]
  }
): { content: Uint8Array | string; contentType: string; extension: string } {
  switch (format) {
    case 'xlsx':
      // 如果包含字段级评估或聚合详情，使用多 Sheet 导出
      if ((options?.includeFieldEvaluations && options.fieldEvaluations) ||
          (options?.includeAggregation && options.aggregations)) {
        return {
          content: exportToExcelWithDetails(data, {
            fieldEvaluations: options?.fieldEvaluations,
            aggregations: options?.aggregations,
          }),
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          extension: 'xlsx',
        }
      }
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
      // 如果包含字段级评估或聚合详情，将其一起导出
      if ((options?.includeFieldEvaluations && options.fieldEvaluations) ||
          (options?.includeAggregation && options.aggregations)) {
        const exportObj: Record<string, unknown> = { results: data }
        if (options?.includeFieldEvaluations && options.fieldEvaluations) {
          exportObj.fieldEvaluations = options.fieldEvaluations
        }
        if (options?.includeAggregation && options.aggregations) {
          exportObj.aggregations = options.aggregations
        }
        return {
          content: JSON.stringify(exportObj, null, 2),
          contentType: 'application/json',
          extension: 'json',
        }
      }
      return {
        content: exportToJSON(data),
        contentType: 'application/json',
        extension: 'json',
      }
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

export type {
  ExportRow,
  ExportFormat,
  ExportOptions,
  FieldEvaluationExportRow,
  FieldEvaluationInput,
  AggregationExportRow,
  AggregationInput,
}
