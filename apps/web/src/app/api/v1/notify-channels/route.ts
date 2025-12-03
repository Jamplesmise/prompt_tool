import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, badRequest, internalError } from '@/lib/api'
import type { NotifyChannelType, NotifyChannelConfig } from '@platform/shared'

// GET /api/v1/notify-channels - 获取通知渠道列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const type = searchParams.get('type')
    const isActive = searchParams.get('isActive')

    const where = {
      createdById: session.id,
      ...(type ? { type: type as NotifyChannelType } : {}),
      ...(isActive !== null && isActive !== '' ? { isActive: isActive === 'true' } : {}),
    }

    const [channels, total] = await Promise.all([
      prisma.notifyChannel.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notifyChannel.count({ where }),
    ])

    return NextResponse.json(
      success({
        list: channels,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get notify channels error:', err)
    return NextResponse.json(internalError('获取通知渠道列表失败'), { status: 500 })
  }
}

// 创建通知渠道输入类型
type CreateNotifyChannelInput = {
  name: string
  type: NotifyChannelType
  config: NotifyChannelConfig
  isActive?: boolean
}

// POST /api/v1/notify-channels - 创建通知渠道
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = (await request.json()) as CreateNotifyChannelInput

    // 验证必填字段
    if (!body.name?.trim()) {
      return NextResponse.json(badRequest('渠道名称不能为空'), { status: 400 })
    }
    if (!body.type) {
      return NextResponse.json(badRequest('请选择渠道类型'), { status: 400 })
    }
    if (!body.config) {
      return NextResponse.json(badRequest('请配置渠道参数'), { status: 400 })
    }

    // 验证渠道类型
    const validTypes = ['EMAIL', 'WEBHOOK', 'INTERNAL']
    if (!validTypes.includes(body.type)) {
      return NextResponse.json(badRequest('无效的渠道类型'), { status: 400 })
    }

    // 验证配置
    if (body.type === 'EMAIL') {
      const config = body.config as { recipients?: string[] }
      if (!config.recipients?.length) {
        return NextResponse.json(badRequest('请配置收件人邮箱'), { status: 400 })
      }
    }

    if (body.type === 'WEBHOOK') {
      const config = body.config as { url?: string }
      if (!config.url) {
        return NextResponse.json(badRequest('请配置 Webhook URL'), { status: 400 })
      }
    }

    // 创建通知渠道
    const channel = await prisma.notifyChannel.create({
      data: {
        name: body.name.trim(),
        type: body.type,
        config: body.config,
        isActive: body.isActive ?? true,
        createdById: session.id,
      },
    })

    return NextResponse.json(success(channel), { status: 201 })
  } catch (err) {
    console.error('Create notify channel error:', err)
    return NextResponse.json(internalError('创建通知渠道失败'), { status: 500 })
  }
}
