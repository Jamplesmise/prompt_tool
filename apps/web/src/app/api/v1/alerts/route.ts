import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, internalError } from '@/lib/api'
import type { AlertStatus } from '@platform/shared'

// GET /api/v1/alerts - 获取告警列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const status = searchParams.get('status')
    const ruleId = searchParams.get('ruleId')

    const where = {
      rule: {
        createdById: session.id,
      },
      ...(status ? { status: status as AlertStatus } : {}),
      ...(ruleId ? { ruleId } : {}),
    }

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          rule: {
            select: {
              id: true,
              name: true,
              metric: true,
              condition: true,
              threshold: true,
              severity: true,
            },
          },
          acknowledgedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.alert.count({ where }),
    ])

    return NextResponse.json(
      success({
        list: alerts,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get alerts error:', err)
    return NextResponse.json(internalError('获取告警列表失败'), { status: 500 })
  }
}
