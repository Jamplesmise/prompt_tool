/**
 * 协作状态 API
 * GET /api/goi/collaboration/status?sessionId={id}
 */

import { NextRequest, NextResponse } from 'next/server'

// 强制动态渲染，因为使用了 searchParams
export const dynamic = 'force-dynamic'
import { getControlTransferManager } from '@/lib/goi/collaboration'
import { getSyncManager } from '@/lib/goi/collaboration'
import { getCheckpointController } from '@/lib/goi/checkpoint'

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

    const transferManager = getControlTransferManager()
    const syncManager = getSyncManager()
    const checkpointController = getCheckpointController()

    // 获取当前状态
    const controller = transferManager.getController()
    const understanding = syncManager.getUnderstanding()
    const pendingCheckpoints = await checkpointController.getPendingCheckpoints(sessionId)

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        sessionId,
        controller,
        understanding: {
          summary: understanding.summary,
          currentGoal: understanding.currentGoal,
          selectedResources: understanding.selectedResources,
          currentPhase: understanding.currentPhase,
          confidence: understanding.confidence,
          updatedAt: understanding.updatedAt,
        },
        hasPendingCheckpoint: pendingCheckpoints.length > 0,
        pendingCheckpointCount: pendingCheckpoints.length,
        lastActivityAt: understanding.updatedAt,
      },
    })
  } catch (error) {
    console.error('[Collaboration API] Failed to get status:', error)
    return NextResponse.json(
      { code: 500001, message: 'Failed to get status', data: null },
      { status: 500 }
    )
  }
}
