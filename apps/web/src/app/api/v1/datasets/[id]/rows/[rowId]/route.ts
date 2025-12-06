import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string; rowId: string }> }

// PUT /api/v1/datasets/:id/rows/:rowId - 更新数据行
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id, rowId } = await params
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

    const existingRow = await prisma.datasetRow.findUnique({
      where: { id: rowId },
    })

    if (!existingRow || existingRow.datasetId !== id) {
      return NextResponse.json(
        error(ERROR_CODES.NOT_FOUND, '数据行不存在'),
        { status: 404 }
      )
    }

    const row = await prisma.datasetRow.update({
      where: { id: rowId },
      data: { data },
    })

    return NextResponse.json(success(row))
  } catch (err) {
    console.error('Update dataset row error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '更新数据行失败'),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/datasets/:id/rows/:rowId - 删除数据行
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id, rowId } = await params

    const dataset = await prisma.dataset.findUnique({
      where: { id },
    })

    if (!dataset) {
      return NextResponse.json(
        error(ERROR_CODES.DATASET_NOT_FOUND, '数据集不存在'),
        { status: 404 }
      )
    }

    const existingRow = await prisma.datasetRow.findUnique({
      where: { id: rowId },
    })

    if (!existingRow || existingRow.datasetId !== id) {
      return NextResponse.json(
        error(ERROR_CODES.NOT_FOUND, '数据行不存在'),
        { status: 404 }
      )
    }

    // 使用事务删除行并更新计数
    await prisma.$transaction(async (tx) => {
      await tx.datasetRow.delete({
        where: { id: rowId },
      })

      await tx.dataset.update({
        where: { id },
        data: { rowCount: { decrement: 1 } },
      })
    })

    return NextResponse.json(success({ id: rowId }))
  } catch (err) {
    console.error('Delete dataset row error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除数据行失败'),
      { status: 500 }
    )
  }
}
