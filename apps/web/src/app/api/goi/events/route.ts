import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { eventBus, eventStore } from '@/lib/events'
import { ERROR_CODES } from '@platform/shared'
import type { GoiEventType, EventCategory, EventSource } from '@platform/shared'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * GET /api/goi/events - 查询事件列表
 *
 * Query params:
 * - sessionId: 会话 ID（必填）
 * - types: 事件类型（逗号分隔）
 * - categories: 事件分类（逗号分隔）
 * - sources: 事件来源（逗号分隔）
 * - from: 开始时间（ISO 字符串）
 * - to: 结束时间（ISO 字符串）
 * - limit: 返回数量限制（默认 100）
 * - offset: 偏移量（默认 0）
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(badRequest('sessionId 参数是必填的'), { status: 400 })
    }

    // 解析查询参数
    const typesParam = searchParams.get('types')
    const categoriesParam = searchParams.get('categories')
    const sourcesParam = searchParams.get('sources')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const options = {
      sessionId,
      types: typesParam ? (typesParam.split(',') as GoiEventType[]) : undefined,
      categories: categoriesParam ? (categoriesParam.split(',') as EventCategory[]) : undefined,
      sources: sourcesParam ? (sourcesParam.split(',') as EventSource[]) : undefined,
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
      limit: limitParam ? parseInt(limitParam, 10) : 100,
      offset: offsetParam ? parseInt(offsetParam, 10) : 0,
    }

    const [events, total] = await Promise.all([
      eventStore.query(options),
      eventStore.count({
        sessionId: options.sessionId,
        types: options.types,
        categories: options.categories,
        sources: options.sources,
        from: options.from,
        to: options.to,
      }),
    ])

    return NextResponse.json(
      success({
        list: events,
        total,
        limit: options.limit,
        offset: options.offset,
      })
    )
  } catch (err) {
    console.error('Get GOI events error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取事件列表失败'),
      { status: 500 }
    )
  }
}

/**
 * POST /api/goi/events - 发布事件（调试用）
 *
 * Body:
 * - sessionId: 会话 ID（必填）
 * - type: 事件类型（必填）
 * - payload: 事件数据（必填）
 * - source: 事件来源（可选，默认 'user'）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { sessionId, type, payload, source = 'user' } = body

    if (!sessionId) {
      return NextResponse.json(badRequest('sessionId 是必填的'), { status: 400 })
    }

    if (!type) {
      return NextResponse.json(badRequest('type 是必填的'), { status: 400 })
    }

    if (!payload) {
      return NextResponse.json(badRequest('payload 是必填的'), { status: 400 })
    }

    // 发布事件
    const event = await eventBus.publish({
      sessionId,
      type: type as GoiEventType,
      source: source as EventSource,
      payload,
      metadata: {
        userId: session.id,
      },
    })

    return NextResponse.json(success(event), { status: 201 })
  } catch (err) {
    console.error('Publish GOI event error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '发布事件失败'),
      { status: 500 }
    )
  }
}
