import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, internalError } from '@/lib/api'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

// POST /api/v1/alert-rules/[id]/toggle - 启用/禁用告警规则
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查规则是否存在
    const existingRule = await prisma.alertRule.findFirst({
      where: {
        id,
        createdById: session.id,
      },
    })

    if (!existingRule) {
      return NextResponse.json(notFound('告警规则不存在'), { status: 404 })
    }

    // 切换状态
    const rule = await prisma.alertRule.update({
      where: { id },
      data: { isActive: !existingRule.isActive },
    })

    return NextResponse.json(success(rule))
  } catch (err) {
    console.error('Toggle alert rule error:', err)
    return NextResponse.json(internalError('切换告警规则状态失败'), { status: 500 })
  }
}
