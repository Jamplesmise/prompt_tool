import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/v1/datasets/:id - 获取数据集详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const dataset = await prisma.dataset.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!dataset) {
      return NextResponse.json(
        error(ERROR_CODES.DATASET_NOT_FOUND, '数据集不存在'),
        { status: 404 }
      )
    }

    return NextResponse.json(success(dataset))
  } catch (err) {
    console.error('Get dataset error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取数据集失败'),
      { status: 500 }
    )
  }
}

// PUT /api/v1/datasets/:id - 更新数据集
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, schema, isPersistent } = body

    const existingDataset = await prisma.dataset.findUnique({
      where: { id },
    })

    if (!existingDataset) {
      return NextResponse.json(
        error(ERROR_CODES.DATASET_NOT_FOUND, '数据集不存在'),
        { status: 404 }
      )
    }

    const dataset = await prisma.dataset.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(schema !== undefined && { schema }),
        ...(isPersistent !== undefined && { isPersistent }),
      },
    })

    return NextResponse.json(success(dataset))
  } catch (err) {
    console.error('Update dataset error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '更新数据集失败'),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/datasets/:id - 删除数据集
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const existingDataset = await prisma.dataset.findUnique({
      where: { id },
    })

    if (!existingDataset) {
      return NextResponse.json(
        error(ERROR_CODES.DATASET_NOT_FOUND, '数据集不存在'),
        { status: 404 }
      )
    }

    // 级联删除会自动删除关联的数据行
    await prisma.dataset.delete({
      where: { id },
    })

    return NextResponse.json(success({ id }))
  } catch (err) {
    console.error('Delete dataset error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除数据集失败'),
      { status: 500 }
    )
  }
}
