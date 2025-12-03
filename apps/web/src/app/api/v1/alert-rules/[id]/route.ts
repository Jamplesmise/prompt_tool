import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, notFound, badRequest, internalError } from '@/lib/api'
import type { AlertMetric, AlertCondition, AlertSeverity, AlertScope } from '@platform/shared'

type RouteParams = {
  params: Promise<{ id: string }>
}

// GET /api/v1/alert-rules/[id] - 获取告警规则详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const rule = await prisma.alertRule.findFirst({
      where: {
        id,
        createdById: session.id,
      },
      include: {
        alerts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        createdBy: {
          select: { id: true, name: true },
        },
      },
    })

    if (!rule) {
      return NextResponse.json(notFound('告警规则不存在'), { status: 404 })
    }

    return NextResponse.json(success(rule))
  } catch (err) {
    console.error('Get alert rule error:', err)
    return NextResponse.json(internalError('获取告警规则详情失败'), { status: 500 })
  }
}

// 更新告警规则输入类型
type UpdateAlertRuleInput = {
  name?: string
  description?: string
  metric?: AlertMetric
  condition?: AlertCondition
  threshold?: number
  duration?: number
  severity?: AlertSeverity
  silencePeriod?: number
  notifyChannels?: string[]
  scope?: AlertScope
}

// PUT /api/v1/alert-rules/[id] - 更新告警规则
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = (await request.json()) as UpdateAlertRuleInput

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

    // 验证字段
    if (body.metric) {
      const validMetrics = ['PASS_RATE', 'AVG_LATENCY', 'ERROR_RATE', 'COST']
      if (!validMetrics.includes(body.metric)) {
        return NextResponse.json(badRequest('无效的监控指标'), { status: 400 })
      }
    }

    if (body.condition) {
      const validConditions = ['LT', 'GT', 'EQ', 'LTE', 'GTE']
      if (!validConditions.includes(body.condition)) {
        return NextResponse.json(badRequest('无效的告警条件'), { status: 400 })
      }
    }

    // 更新规则
    const rule = await prisma.alertRule.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.metric !== undefined && { metric: body.metric }),
        ...(body.condition !== undefined && { condition: body.condition }),
        ...(body.threshold !== undefined && { threshold: body.threshold }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.severity !== undefined && { severity: body.severity }),
        ...(body.silencePeriod !== undefined && { silencePeriod: body.silencePeriod }),
        ...(body.notifyChannels !== undefined && { notifyChannels: body.notifyChannels }),
        ...(body.scope !== undefined && { scope: body.scope }),
      },
    })

    return NextResponse.json(success(rule))
  } catch (err) {
    console.error('Update alert rule error:', err)
    return NextResponse.json(internalError('更新告警规则失败'), { status: 500 })
  }
}

// DELETE /api/v1/alert-rules/[id] - 删除告警规则
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 删除规则（级联删除告警记录）
    await prisma.alertRule.delete({
      where: { id },
    })

    return NextResponse.json(success({ deleted: true }))
  } catch (err) {
    console.error('Delete alert rule error:', err)
    return NextResponse.json(internalError('删除告警规则失败'), { status: 500 })
  }
}
