import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound } from '@/lib/api'
import { snapshotStore } from '@/lib/snapshot'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * GET /api/goi/snapshots/[id] - 获取单个快照
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const snapshot = await snapshotStore.getById(id)

    if (!snapshot) {
      return NextResponse.json(notFound('快照不存在'), { status: 404 })
    }

    return NextResponse.json(success(snapshot))
  } catch (err) {
    console.error('Get GOI snapshot error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取快照失败'),
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/goi/snapshots/[id] - 删除快照
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const deleted = await snapshotStore.delete(id)

    if (!deleted) {
      return NextResponse.json(notFound('快照不存在'), { status: 404 })
    }

    return NextResponse.json(success({ deleted: true }))
  } catch (err) {
    console.error('Delete GOI snapshot error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除快照失败'),
      { status: 500 }
    )
  }
}
