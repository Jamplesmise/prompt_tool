import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { snapshotStore, snapshotManager } from '@/lib/snapshot'
import { ERROR_CODES } from '@platform/shared'
import type { SnapshotTrigger } from '@platform/shared'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * GET /api/goi/snapshots - 查询快照列表
 *
 * Query params:
 * - sessionId: 会话 ID（必填）
 * - trigger: 触发类型（可选）
 * - from: 开始时间（可选）
 * - to: 结束时间（可选）
 * - limit: 返回数量限制（默认 20）
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

    const triggerParam = searchParams.get('trigger')
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const options = {
      sessionId,
      trigger: triggerParam as SnapshotTrigger | undefined,
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
      limit: limitParam ? parseInt(limitParam, 10) : 20,
      offset: offsetParam ? parseInt(offsetParam, 10) : 0,
    }

    const [snapshots, total] = await Promise.all([
      snapshotStore.query(options),
      snapshotStore.count(sessionId),
    ])

    return NextResponse.json(
      success({
        list: snapshots,
        total,
        limit: options.limit,
        offset: options.offset,
      })
    )
  } catch (err) {
    console.error('Get GOI snapshots error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取快照列表失败'),
      { status: 500 }
    )
  }
}

/**
 * POST /api/goi/snapshots - 创建快照
 *
 * Body:
 * - sessionId: 会话 ID（必填）
 * - trigger: 触发原因（必填）
 * - todoItemId: 关联的 TODO 项 ID（可选）
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { sessionId, trigger, todoItemId } = body

    if (!sessionId) {
      return NextResponse.json(badRequest('sessionId 是必填的'), { status: 400 })
    }

    if (!trigger) {
      return NextResponse.json(badRequest('trigger 是必填的'), { status: 400 })
    }

    const validTriggers: SnapshotTrigger[] = [
      'todo_start',
      'checkpoint',
      'compact',
      'manual',
      'session_start',
      'error',
    ]

    if (!validTriggers.includes(trigger)) {
      return NextResponse.json(badRequest(`无效的 trigger: ${trigger}`), { status: 400 })
    }

    const snapshot = await snapshotManager.createSnapshot(sessionId, trigger, todoItemId)

    return NextResponse.json(success(snapshot), { status: 201 })
  } catch (err) {
    console.error('Create GOI snapshot error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '创建快照失败'),
      { status: 500 }
    )
  }
}
