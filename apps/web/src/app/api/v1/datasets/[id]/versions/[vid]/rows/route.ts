/**
 * Phase 10: 数据集版本行数据 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { getDatasetVersionRows, getDatasetVersion } from '@/lib/dataset'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = { params: Promise<{ id: string; vid: string }> }

// GET /api/v1/datasets/:id/versions/:vid/rows - 获取版本数据行
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id, vid } = await params
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const limit = parseInt(searchParams.get('limit') || '100', 10)

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

    // 验证版本存在
    const version = await getDatasetVersion(id, vid)

    if (!version) {
      return NextResponse.json(
        error(ERROR_CODES.NOT_FOUND, '版本不存在'),
        { status: 404 }
      )
    }

    const rows = await getDatasetVersionRows(vid, { offset, limit })

    return NextResponse.json(
      success({
        rows,
        total: version.rowCount,
        offset,
        limit,
      })
    )
  } catch (err) {
    console.error('Get dataset version rows error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取版本数据行失败'),
      { status: 500 }
    )
  }
}
