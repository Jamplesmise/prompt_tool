import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, forbidden } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

// GET /api/v1/audit-logs - 查询审计日志
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    // 只有管理员可以查看所有日志
    const isAdmin = session.role === 'ADMIN'

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const action = searchParams.get('action')
    const resource = searchParams.get('resource')
    const userId = searchParams.get('userId')
    const teamId = searchParams.get('teamId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // 构建查询条件
    const where: Record<string, unknown> = {}

    // 非管理员只能查看自己的日志
    if (!isAdmin) {
      where.userId = session.id
    } else if (userId) {
      where.userId = userId
    }

    if (action) where.action = action
    if (resource) where.resource = resource
    if (teamId) where.teamId = teamId

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate)
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json(
      success({
        list: logs,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get audit logs error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取审计日志失败'),
      { status: 500 }
    )
  }
}
