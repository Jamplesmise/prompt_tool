import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'
import type { NotifyChannelType, NotifyChannelConfig } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/notify-channels/[id] - 获取通知渠道详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const channel = await prisma.notifyChannel.findFirst({
      where: {
        id,
        createdById: session.id,
      },
    })

    if (!channel) {
      return NextResponse.json(notFound('通知渠道不存在'), { status: 404 })
    }

    return NextResponse.json(success(channel))
  } catch (err) {
    console.error('Get notify channel error:', err)
    return NextResponse.json(internalError('获取通知渠道详情失败'), { status: 500 })
  }
}

// 更新通知渠道输入类型
type UpdateNotifyChannelInput = {
  name?: string
  type?: NotifyChannelType
  config?: NotifyChannelConfig
  isActive?: boolean
}

// PUT /api/v1/notify-channels/[id] - 更新通知渠道
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = (await request.json()) as UpdateNotifyChannelInput

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

    // 验证类型
    if (body.type) {
      const validTypes = ['EMAIL', 'WEBHOOK', 'INTERNAL']
      if (!validTypes.includes(body.type)) {
        return NextResponse.json(badRequest('无效的渠道类型'), { status: 400 })
      }
    }

    // 更新渠道
    const channel = await prisma.notifyChannel.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.config !== undefined && { config: body.config }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })

    return NextResponse.json(success(channel))
  } catch (err) {
    console.error('Update notify channel error:', err)
    return NextResponse.json(internalError('更新通知渠道失败'), { status: 500 })
  }
}

// DELETE /api/v1/notify-channels/[id] - 删除通知渠道
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 删除渠道
    await prisma.notifyChannel.delete({
      where: { id },
    })

    return NextResponse.json(success({ deleted: true }))
  } catch (err) {
    console.error('Delete notify channel error:', err)
    return NextResponse.json(internalError('删除通知渠道失败'), { status: 500 })
  }
}
