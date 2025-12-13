import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { snapshotStore, snapshotManager } from '@/lib/snapshot'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * POST /api/goi/snapshots/[id]/restore - 恢复到快照
 *
 * 将系统状态恢复到指定快照的时间点
 * 这会撤销快照创建后的所有资源变更
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    // 检查快照是否存在
    const snapshot = await snapshotStore.getById(id)
    if (!snapshot) {
      return NextResponse.json(notFound('快照不存在'), { status: 404 })
    }

    // 执行恢复
    const result = await snapshotManager.restoreSnapshot(id)

    if (!result.success) {
      return NextResponse.json(
        error(ERROR_CODES.INTERNAL_ERROR, '恢复快照时发生部分错误'),
        { status: 500 }
      )
    }

    return NextResponse.json(success(result))
  } catch (err) {
    console.error('Restore GOI snapshot error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '恢复快照失败'),
      { status: 500 }
    )
  }
}
