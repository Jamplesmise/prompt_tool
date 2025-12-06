import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

type ParsedRow = Record<string, unknown>

// POST /api/v1/datasets/:id/upload - 上传数据文件
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const dataset = await prisma.dataset.findUnique({
      where: { id },
    })

    if (!dataset) {
      return NextResponse.json(
        error(ERROR_CODES.DATASET_NOT_FOUND, '数据集不存在'),
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const isPersistent = formData.get('isPersistent') === 'true'
    const fieldMappingStr = formData.get('fieldMapping') as string

    if (!file) {
      return NextResponse.json(
        badRequest('请上传文件'),
        { status: 400 }
      )
    }

    // 解析字段映射
    let fieldMapping: Record<string, string> = {}
    if (fieldMappingStr) {
      try {
        fieldMapping = JSON.parse(fieldMappingStr)
      } catch {
        // 忽略解析错误
      }
    }

    // 解析文件
    const ext = file.name.split('.').pop()?.toLowerCase()
    let rows: ParsedRow[] = []
    let headers: string[] = []

    const buffer = await file.arrayBuffer()

    if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      rows = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, { defval: '' })
      if (rows.length > 0) {
        headers = Object.keys(rows[0])
      }
    } else if (ext === 'csv') {
      const text = new TextDecoder().decode(buffer)
      const result = Papa.parse<ParsedRow>(text, {
        header: true,
        skipEmptyLines: true,
      })
      rows = result.data
      if (rows.length > 0) {
        headers = Object.keys(rows[0])
      }
    } else {
      return NextResponse.json(
        badRequest('不支持的文件格式，请上传 xlsx 或 csv 文件'),
        { status: 400 }
      )
    }

    if (rows.length === 0) {
      return NextResponse.json(
        badRequest('文件为空或格式不正确'),
        { status: 400 }
      )
    }

    // 应用字段映射
    if (Object.keys(fieldMapping).length > 0) {
      rows = rows.map((row) => {
        const newRow: ParsedRow = {}
        for (const [newKey, oldKey] of Object.entries(fieldMapping)) {
          if (oldKey && row[oldKey] !== undefined) {
            newRow[newKey] = row[oldKey]
          }
        }
        // 保留未映射的字段
        for (const key of Object.keys(row)) {
          if (!Object.values(fieldMapping).includes(key)) {
            newRow[key] = row[key]
          }
        }
        return newRow
      })
      // 更新 headers
      const mappedHeaders = Object.keys(fieldMapping)
      const unmappedHeaders = headers.filter((h) => !Object.values(fieldMapping).includes(h))
      headers = [...mappedHeaders, ...unmappedHeaders]
    }

    // 生成 schema
    const schema = headers.map((name) => ({
      name,
      type: 'string' as const,
    }))

    // 使用事务更新数据集和数据行
    await prisma.$transaction(async (tx) => {
      // 删除旧的数据行
      await tx.datasetRow.deleteMany({
        where: { datasetId: id },
      })

      // 创建新的数据行
      const rowsToCreate = rows.map((rowData, index) => ({
        datasetId: id,
        rowIndex: index,
        data: rowData as Prisma.InputJsonValue,
      }))

      await tx.datasetRow.createMany({
        data: rowsToCreate,
      })

      // 更新数据集
      await tx.dataset.update({
        where: { id },
        data: {
          schema,
          rowCount: rows.length,
          isPersistent,
          filePath: file.name,
        },
      })
    })

    return NextResponse.json(
      success({
        id,
        rowCount: rows.length,
        schema,
      })
    )
  } catch (err) {
    console.error('Upload dataset error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '上传文件失败'),
      { status: 500 }
    )
  }
}
