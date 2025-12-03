// 文件解析工具 - 支持 xlsx 和 csv 格式

import * as XLSX from 'xlsx'
import Papa from 'papaparse'

type ParsedRow = Record<string, unknown>

type ParseResult = {
  headers: string[]
  rows: ParsedRow[]
  totalRows: number
}

type SchemaColumn = {
  name: string
  type: 'string' | 'number' | 'boolean' | 'json'
}

/**
 * 解析 Excel 文件 (xlsx/xls)
 */
export async function parseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })

        // 读取第一个工作表
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // 转换为 JSON
        const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, {
          defval: '', // 空单元格默认值
        })

        if (jsonData.length === 0) {
          resolve({ headers: [], rows: [], totalRows: 0 })
          return
        }

        // 获取表头
        const headers = Object.keys(jsonData[0])

        resolve({
          headers,
          rows: jsonData,
          totalRows: jsonData.length,
        })
      } catch (err) {
        reject(new Error('Excel 文件解析失败'))
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * 解析 CSV 文件
 */
export async function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as ParsedRow[]

        if (data.length === 0) {
          resolve({ headers: [], rows: [], totalRows: 0 })
          return
        }

        const headers = Object.keys(data[0])

        resolve({
          headers,
          rows: data,
          totalRows: data.length,
        })
      },
      error: (err) => {
        reject(new Error(`CSV 解析失败: ${err.message}`))
      },
    })
  })
}

/**
 * 根据文件类型解析文件
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file)
  } else if (ext === 'csv') {
    return parseCSV(file)
  }

  throw new Error('不支持的文件格式，请上传 xlsx 或 csv 文件')
}

/**
 * 推断列类型
 */
export function inferColumnType(values: unknown[]): 'string' | 'number' | 'boolean' {
  // 过滤空值
  const nonEmptyValues = values.filter((v) => v !== null && v !== undefined && v !== '')

  if (nonEmptyValues.length === 0) {
    return 'string'
  }

  // 检查是否全是布尔值
  const allBoolean = nonEmptyValues.every((v) => {
    const str = String(v).toLowerCase()
    return str === 'true' || str === 'false' || str === '0' || str === '1'
  })
  if (allBoolean) {
    return 'boolean'
  }

  // 检查是否全是数字
  const allNumber = nonEmptyValues.every((v) => !isNaN(Number(v)))
  if (allNumber) {
    return 'number'
  }

  return 'string'
}

/**
 * 从解析结果生成 Schema
 */
export function generateSchema(parseResult: ParseResult): SchemaColumn[] {
  const { headers, rows } = parseResult

  return headers.map((header) => {
    const columnValues = rows.map((row) => row[header])
    const type = inferColumnType(columnValues)

    return {
      name: header,
      type,
    }
  })
}

/**
 * 导出为 Excel 文件
 */
export function exportToExcel(
  data: ParsedRow[],
  filename: string,
  sheetName = 'Sheet1'
): void {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // 生成并下载文件
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

/**
 * 导出为 CSV 文件
 */
export function exportToCSV(data: ParsedRow[], filename: string): void {
  const csv = Papa.unparse(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

/**
 * 生成基础模板
 */
export function generateBasicTemplate(): ParsedRow[] {
  return [
    { input: '示例输入1' },
    { input: '示例输入2' },
    { input: '示例输入3' },
  ]
}

/**
 * 生成带期望输出的模板
 */
export function generateTemplateWithExpected(): ParsedRow[] {
  return [
    { input: '示例输入1', expected: '期望输出1' },
    { input: '示例输入2', expected: '期望输出2' },
    { input: '示例输入3', expected: '期望输出3' },
  ]
}

/**
 * 下载模板文件
 */
export function downloadTemplate(type: 'basic' | 'with-expected'): void {
  const data = type === 'basic' ? generateBasicTemplate() : generateTemplateWithExpected()
  const filename = type === 'basic' ? '数据集模板-基础.xlsx' : '数据集模板-带期望输出.xlsx'
  exportToExcel(data, filename)
}
