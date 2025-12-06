/**
 * Phase 10: 数据集版本回滚 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { rollbackToVersion } from '@/lib/dataset'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string; vid: string }> }

// POST /api/v1/datasets/:id/versions/:vid/rollback - 回滚到指定版本
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id, vid } = await params

    // 验证数据集存在
    const dataset = await prisma.dataset.findUnique({
      where: { id },
    })

    if (!dataset) {
      return NextResponse.json(
        error(ERROR_CODES.DATASET_NOT_FOUND, '数据集不存在'),
        { status: 404 }
      )
    }

    const result = await rollbackToVersion(id, vid, session.id)

    return NextResponse.json(success(result))
  } catch (err) {
    console.error('Rollback dataset version error:', err)
    const message = err instanceof Error ? err.message : '版本回滚失败'
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, message),
      { status: 500 }
    )
  }
}
