import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/v1/datasets/:id/rows - 获取数据行列表
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    const dataset = await prisma.dataset.findUnique({
      where: { id },
    })

    if (!dataset) {
      return NextResponse.json(
        error(ERROR_CODES.DATASET_NOT_FOUND, '数据集不存在'),
        { status: 404 }
      )
    }

    const [rows, total] = await Promise.all([
      prisma.datasetRow.findMany({
        where: { datasetId: id },
        orderBy: { rowIndex: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.datasetRow.count({ where: { datasetId: id } }),
    ])

    return NextResponse.json(
      success({
        list: rows,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get dataset rows error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取数据行失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/datasets/:id/rows - 新增数据行
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { data } = body

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        badRequest('数据格式不正确'),
        { status: 400 }
      )
    }

    const dataset = await prisma.dataset.findUnique({
      where: { id },
    })

    if (!dataset) {
      return NextResponse.json(
        error(ERROR_CODES.DATASET_NOT_FOUND, '数据集不存在'),
        { status: 404 }
      )
    }

    // 获取当前最大行索引
    const maxRow = await prisma.datasetRow.findFirst({
      where: { datasetId: id },
      orderBy: { rowIndex: 'desc' },
    })

    const newRowIndex = (maxRow?.rowIndex ?? -1) + 1

    // 使用事务创建行并更新计数
    const row = await prisma.$transaction(async (tx) => {
      const newRow = await tx.datasetRow.create({
        data: {
          datasetId: id,
          rowIndex: newRowIndex,
          data,
        },
      })

      await tx.dataset.update({
        where: { id },
        data: { rowCount: { increment: 1 } },
      })

      return newRow
    })

    return NextResponse.json(success(row), { status: 201 })
  } catch (err) {
    console.error('Create dataset row error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '新增数据行失败'),
      { status: 500 }
    )
  }
}
