/**
 * Phase 10: 数据集版本对比 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { getVersionsForDiff } from '@/lib/dataset'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/v1/datasets/:id/versions/diff?v1=1&v2=2 - 版本对比
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const v1 = searchParams.get('v1')
    const v2 = searchParams.get('v2')

    if (!v1 || !v2) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '需要提供 v1 和 v2 版本号'),
        { status: 400 }
      )
    }

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

    const result = await getVersionsForDiff(id, parseInt(v1, 10), parseInt(v2, 10))

    return NextResponse.json(success(result))
  } catch (err) {
    console.error('Diff dataset versions error:', err)
    const message = err instanceof Error ? err.message : '版本对比失败'
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, message),
      { status: 500 }
    )
  }
}
