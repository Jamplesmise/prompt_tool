import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, internalError } from '@/lib/api'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/scheduled-tasks/[id]/executions - 获取定时任务执行历史
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const status = searchParams.get('status')

    // 检查定时任务是否存在
    const existingTask = await prisma.scheduledTask.findFirst({
      where: {
        id,
        createdById: session.id,
      },
    })

    if (!existingTask) {
      return NextResponse.json(notFound('定时任务不存在'), { status: 404 })
    }

    const where = {
      scheduledTaskId: id,
      ...(status ? { status: status as 'PENDING' | 'SUCCESS' | 'FAILED' } : {}),
    }

    const [executions, total] = await Promise.all([
      prisma.scheduledExecution.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              name: true,
              status: true,
              progress: true,
              stats: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.scheduledExecution.count({ where }),
    ])

    return NextResponse.json(
      success({
        list: executions,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get scheduled task executions error:', err)
    return NextResponse.json(internalError('获取执行历史失败'), { status: 500 })
  }
}
