import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/alerts/[id]/acknowledge - 确认告警
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查告警是否存在
    const existingAlert = await prisma.alert.findFirst({
      where: {
        id,
        rule: {
          createdById: session.id,
        },
      },
    })

    if (!existingAlert) {
      return NextResponse.json(notFound('告警不存在'), { status: 404 })
    }

    if (existingAlert.status !== 'TRIGGERED') {
      return NextResponse.json(badRequest('只能确认触发状态的告警'), { status: 400 })
    }

    // 确认告警
    const alert = await prisma.alert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedById: session.id,
      },
      include: {
        rule: {
          select: {
            id: true,
            name: true,
            metric: true,
            severity: true,
          },
        },
      },
    })

    return NextResponse.json(success(alert))
  } catch (err) {
    console.error('Acknowledge alert error:', err)
    return NextResponse.json(internalError('确认告警失败'), { status: 500 })
  }
}
