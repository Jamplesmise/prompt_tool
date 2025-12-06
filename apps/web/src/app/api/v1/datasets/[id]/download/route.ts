import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/v1/datasets/:id/download - 下载数据集
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const format = searchParams.get('format') || 'xlsx'

    const dataset = await prisma.dataset.findUnique({
      where: { id },
    })

    if (!dataset) {
      return NextResponse.json(
        error(ERROR_CODES.DATASET_NOT_FOUND, '数据集不存在'),
        { status: 404 }
      )
    }

    // 获取所有数据行
    const rows = await prisma.datasetRow.findMany({
      where: { datasetId: id },
      orderBy: { rowIndex: 'asc' },
    })

    const data = rows.map((row) => row.data as Record<string, unknown>)

    if (format === 'csv') {
      // 导出为 CSV
      const csv = Papa.unparse(data)
      const buffer = Buffer.from(csv, 'utf-8')

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(dataset.name)}.csv"`,
        },
      })
    } else {
      // 默认导出为 XLSX
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(dataset.name)}.xlsx"`,
        },
      })
    }
  } catch (err) {
    console.error('Download dataset error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '下载数据集失败'),
      { status: 500 }
    )
  }
}
