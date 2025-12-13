import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { snapshotStore } from '@/lib/snapshot'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/goi/snapshots/cleanup - 清理过期快照
 *
 * Query params:
 * - olderThan: 清理早于此时间的快照（ISO 字符串，必填）
 * - sessionId: 仅清理指定会话的快照（可选）
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const olderThanParam = searchParams.get('olderThan')
    const sessionId = searchParams.get('sessionId')

    if (!olderThanParam) {
      return NextResponse.json(badRequest('olderThan 参数是必填的'), { status: 400 })
    }

    const olderThan = new Date(olderThanParam)
    if (isNaN(olderThan.getTime())) {
      return NextResponse.json(badRequest('olderThan 格式无效'), { status: 400 })
    }

    let deletedCount: number

    if (sessionId) {
      // 清理指定会话的过期快照
      const snapshots = await snapshotStore.query({
        sessionId,
        to: olderThan,
      })

      deletedCount = 0
      for (const snapshot of snapshots) {
        const deleted = await snapshotStore.delete(snapshot.id)
        if (deleted) deletedCount++
      }
    } else {
      // 清理所有过期快照
      deletedCount = await snapshotStore.cleanup(olderThan)
    }

    return NextResponse.json(
      success({
        deletedCount,
        olderThan: olderThan.toISOString(),
        sessionId: sessionId || null,
      })
    )
  } catch (err) {
    console.error('Cleanup GOI snapshots error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '清理快照失败'),
      { status: 500 }
    )
  }
}
