import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// GET /api/v1/datasets - 获取数据集列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const keyword = searchParams.get('keyword') || ''

    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword, mode: 'insensitive' as const } },
            { description: { contains: keyword, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [datasets, total] = await Promise.all([
      prisma.dataset.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          schema: true,
          rowCount: true,
          isPersistent: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.dataset.count({ where }),
    ])

    return NextResponse.json(
      success({
        list: datasets,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get datasets error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取数据集列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/datasets - 创建数据集元信息
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { name, description, schema, isPersistent = false } = body

    if (!name) {
      return NextResponse.json(
        badRequest('数据集名称不能为空'),
        { status: 400 }
      )
    }

    const dataset = await prisma.dataset.create({
      data: {
        name,
        description: description || null,
        schema: schema || null,
        isPersistent,
        createdById: session.id,
      },
    })

    return NextResponse.json(success(dataset), { status: 201 })
  } catch (err) {
    console.error('Create dataset error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '创建数据集失败'),
      { status: 500 }
    )
  }
}
