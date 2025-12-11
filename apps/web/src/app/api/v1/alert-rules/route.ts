import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, unauthorized, badRequest, internalError } from '@/lib/api'
import type { AlertMetric, AlertCondition, AlertSeverity, AlertScope } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// GET /api/v1/alert-rules - 获取告警规则列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const isActive = searchParams.get('isActive')
    const severity = searchParams.get('severity')

    const where = {
      createdById: session.id,
      ...(isActive !== null && isActive !== '' ? { isActive: isActive === 'true' } : {}),
      ...(severity ? { severity: severity as AlertSeverity } : {}),
    }

    const [rules, total] = await Promise.all([
      prisma.alertRule.findMany({
        where,
        include: {
          _count: {
            select: {
              alerts: {
                where: { status: 'TRIGGERED' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.alertRule.count({ where }),
    ])

    return NextResponse.json(
      success({
        list: rules,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get alert rules error:', err)
    return NextResponse.json(internalError('获取告警规则列表失败'), { status: 500 })
  }
}

// 创建告警规则输入类型
type CreateAlertRuleInput = {
  name: string
  description?: string
  metric: AlertMetric
  condition: AlertCondition
  threshold: number
  duration: number
  severity?: AlertSeverity
  silencePeriod?: number
  notifyChannels?: string[]
  scope?: AlertScope
  isActive?: boolean
}

// POST /api/v1/alert-rules - 创建告警规则
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = (await request.json()) as CreateAlertRuleInput

    // 验证必填字段
    if (!body.name?.trim()) {
      return NextResponse.json(badRequest('规则名称不能为空'), { status: 400 })
    }
    if (!body.metric) {
      return NextResponse.json(badRequest('请选择监控指标'), { status: 400 })
    }
    if (!body.condition) {
      return NextResponse.json(badRequest('请选择告警条件'), { status: 400 })
    }
    if (body.threshold === undefined || body.threshold === null) {
      return NextResponse.json(badRequest('请设置阈值'), { status: 400 })
    }
    if (!body.duration || body.duration < 1) {
      return NextResponse.json(badRequest('持续时间必须大于0'), { status: 400 })
    }

    // 验证指标值
    const validMetrics = [
      'PASS_RATE', 'AVG_LATENCY', 'ERROR_RATE', 'COST',
      'FIELD_PASS_RATE', 'FIELD_AVG_SCORE', 'FIELD_REGRESSION'
    ]
    if (!validMetrics.includes(body.metric)) {
      return NextResponse.json(badRequest('无效的监控指标'), { status: 400 })
    }

    // 验证条件
    const validConditions = ['LT', 'GT', 'EQ', 'LTE', 'GTE']
    if (!validConditions.includes(body.condition)) {
      return NextResponse.json(badRequest('无效的告警条件'), { status: 400 })
    }

    // 创建告警规则
    const rule = await prisma.alertRule.create({
      data: {
        name: body.name.trim(),
        description: body.description?.trim() || null,
        metric: body.metric,
        condition: body.condition,
        threshold: body.threshold,
        duration: body.duration,
        severity: body.severity || 'WARNING',
        silencePeriod: body.silencePeriod || 30,
        notifyChannels: body.notifyChannels || [],
        scope: body.scope ? (body.scope as Prisma.InputJsonValue) : Prisma.JsonNull,
        isActive: body.isActive ?? true,
        createdById: session.id,
      },
    })

    return NextResponse.json(success(rule), { status: 201 })
  } catch (err) {
    console.error('Create alert rule error:', err)
    return NextResponse.json(internalError('创建告警规则失败'), { status: 500 })
  }
}
