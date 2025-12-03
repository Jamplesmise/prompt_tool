import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/alerts/[id]/resolve - 解决告警
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

    if (existingAlert.status === 'RESOLVED') {
      return NextResponse.json(badRequest('告警已解决'), { status: 400 })
    }

    // 解决告警
    const alert = await prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
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
    console.error('Resolve alert error:', err)
    return NextResponse.json(internalError('解决告警失败'), { status: 500 })
  }
}
