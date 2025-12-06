import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, internalError } from '@/lib/api'
import { testNotifyChannel } from '@/lib/notify/dispatcher'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/notify-channels/[id]/test - 测试通知渠道
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查渠道是否存在
    const existingChannel = await prisma.notifyChannel.findFirst({
      where: {
        id,
        createdById: session.id,
      },
    })

    if (!existingChannel) {
      return NextResponse.json(notFound('通知渠道不存在'), { status: 404 })
    }

    // 测试通知
    const result = await testNotifyChannel(id)

    return NextResponse.json(success(result))
  } catch (err) {
    console.error('Test notify channel error:', err)
    return NextResponse.json(internalError('测试通知渠道失败'), { status: 500 })
  }
}
