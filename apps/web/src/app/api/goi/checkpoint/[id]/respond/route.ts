/**
 * 响应检查点 API
 * POST /api/goi/checkpoint/{id}/respond
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCheckpointController } from '@/lib/goi/checkpoint'
import type { CheckpointResponseAction } from '@platform/shared'

type RequestBody = {
  action: CheckpointResponseAction
  modifications?: Record<string, unknown>
  reason?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: RequestBody = await request.json()

    // 验证参数
    if (!body.action) {
      return NextResponse.json(
        { code: 400001, message: 'action is required', data: null },
        { status: 400 }
      )
    }

    const validActions: CheckpointResponseAction[] = [
      'approve',
      'modify',
      'reject',
      'takeover',
    ]
    if (!validActions.includes(body.action)) {
      return NextResponse.json(
        {
          code: 400002,
          message: `Invalid action. Must be one of: ${validActions.join(', ')}`,
          data: null,
        },
        { status: 400 }
      )
    }

    // 如果是 modify 动作，需要提供 modifications
    if (body.action === 'modify' && !body.modifications) {
      return NextResponse.json(
        {
          code: 400003,
          message: 'modifications is required for modify action',
          data: null,
        },
        { status: 400 }
      )
    }

    const controller = getCheckpointController()

    await controller.respond(id, {
      action: body.action,
      modifications: body.modifications,
      reason: body.reason,
    })

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        checkpointId: id,
        action: body.action,
        respondedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('[Checkpoint API] Failed to respond:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    // 检查是否是检查点未找到的错误
    if (errorMessage.includes('not found')) {
      return NextResponse.json(
        { code: 404001, message: 'Checkpoint not found', data: null },
        { status: 404 }
      )
    }

    // 检查是否是状态错误
    if (errorMessage.includes('not pending')) {
      return NextResponse.json(
        {
          code: 400004,
          message: 'Checkpoint is not in pending status',
          data: null,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { code: 500001, message: 'Failed to respond to checkpoint', data: null },
      { status: 500 }
    )
  }
}
