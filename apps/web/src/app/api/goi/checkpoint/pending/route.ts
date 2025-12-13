/**
 * 获取待处理检查点 API
 * GET /api/goi/checkpoint/pending?sessionId={id}
 */

import { NextRequest, NextResponse } from 'next/server'

// 强制动态渲染，因为使用了 searchParams
export const dynamic = 'force-dynamic'
import { getCheckpointController } from '@/lib/goi/checkpoint'
import type { PendingCheckpointStatus } from '@platform/shared'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { code: 400001, message: 'sessionId is required', data: null },
        { status: 400 }
      )
    }

    const statusParam = searchParams.get('status')
    let statuses: PendingCheckpointStatus[] | undefined

    if (statusParam) {
      statuses = statusParam.split(',') as PendingCheckpointStatus[]
    }

    const controller = getCheckpointController()
    const checkpoints = await controller.getPendingCheckpoints(sessionId)

    // 过滤状态（如果指定）
    const filtered = statuses
      ? checkpoints.filter((c) => statuses!.includes(c.status))
      : checkpoints

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        checkpoints: filtered.map((c) => ({
          id: c.id,
          sessionId: c.sessionId,
          todoItemId: c.todoItemId,
          todoItem: {
            id: c.todoItem.id,
            title: c.todoItem.title,
            description: c.todoItem.description,
            category: c.todoItem.category,
          },
          reason: c.reason,
          preview: c.preview,
          options: c.options,
          status: c.status,
          createdAt: c.createdAt,
          expiresAt: c.expiresAt,
          remainingTime: c.expiresAt
            ? Math.max(0, c.expiresAt.getTime() - Date.now())
            : null,
        })),
        total: filtered.length,
      },
    })
  } catch (error) {
    console.error('[Checkpoint API] Failed to get pending checkpoints:', error)
    return NextResponse.json(
      {
        code: 500001,
        message: 'Failed to get pending checkpoints',
        data: null,
      },
      { status: 500 }
    )
  }
}
