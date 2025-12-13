/**
 * 控制权转移 API
 * POST /api/goi/collaboration/transfer
 */

import { NextRequest, NextResponse } from 'next/server'
import { getControlTransferManager } from '@/lib/goi/collaboration'
import type { Controller, TransferReason } from '@platform/shared'

type RequestBody = {
  sessionId: string
  to: Controller
  reason?: TransferReason
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json()

    if (!body.sessionId) {
      return NextResponse.json(
        { code: 400001, message: 'sessionId is required', data: null },
        { status: 400 }
      )
    }

    if (!body.to) {
      return NextResponse.json(
        { code: 400002, message: 'to is required', data: null },
        { status: 400 }
      )
    }

    const validControllers: Controller[] = ['user', 'ai']
    if (!validControllers.includes(body.to)) {
      return NextResponse.json(
        {
          code: 400003,
          message: `Invalid to. Must be one of: ${validControllers.join(', ')}`,
          data: null,
        },
        { status: 400 }
      )
    }

    const transferManager = getControlTransferManager()

    // 检查是否可以转移
    if (!transferManager.canTransferTo(body.to)) {
      return NextResponse.json(
        { code: 400004, message: 'Cannot transfer to this controller', data: null },
        { status: 400 }
      )
    }

    // 执行转移
    const result = await transferManager.transferTo(
      body.to,
      body.reason || 'user_request',
      body.message
    )

    if (!result.success) {
      return NextResponse.json(
        { code: 400005, message: result.error || 'Transfer failed', data: null },
        { status: 400 }
      )
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        from: result.from,
        to: result.to,
        transferredAt: result.transferredAt,
      },
    })
  } catch (error) {
    console.error('[Collaboration API] Failed to transfer:', error)
    return NextResponse.json(
      { code: 500001, message: 'Failed to transfer control', data: null },
      { status: 500 }
    )
  }
}
