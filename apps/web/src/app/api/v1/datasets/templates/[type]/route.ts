import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { unauthorized, badRequest } from '@/lib/api'
import * as XLSX from 'xlsx'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ type: string }> }

// GET /api/v1/datasets/templates/:type - 下载模板
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { type } = await params

    let data: Record<string, string>[]
    let filename: string

    if (type === 'basic') {
      data = [
        { input: '示例输入1' },
        { input: '示例输入2' },
        { input: '示例输入3' },
      ]
      filename = '数据集模板-基础.xlsx'
    } else if (type === 'with-expected') {
      data = [
        { input: '示例输入1', expected: '期望输出1' },
        { input: '示例输入2', expected: '期望输出2' },
        { input: '示例输入3', expected: '期望输出3' },
      ]
      filename = '数据集模板-带期望输出.xlsx'
    } else {
      return NextResponse.json(
        badRequest('无效的模板类型，支持 basic 或 with-expected'),
        { status: 400 }
      )
    }

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    })
  } catch (err) {
    console.error('Download template error:', err)
    return new NextResponse('下载模板失败', { status: 500 })
  }
}
