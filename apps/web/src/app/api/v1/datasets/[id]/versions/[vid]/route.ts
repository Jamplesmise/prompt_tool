/**
 * Phase 10: 数据集版本详情 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { getDatasetVersion } from '@/lib/dataset'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string; vid: string }> }

// GET /api/v1/datasets/:id/versions/:vid - 获取版本详情
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const version = await getDatasetVersion(id, vid)

    if (!version) {
      return NextResponse.json(
        error(ERROR_CODES.NOT_FOUND, '版本不存在'),
        { status: 404 }
      )
    }

    return NextResponse.json(success(version))
  } catch (err) {
    console.error('Get dataset version error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取版本详情失败'),
      { status: 500 }
    )
  }
}
