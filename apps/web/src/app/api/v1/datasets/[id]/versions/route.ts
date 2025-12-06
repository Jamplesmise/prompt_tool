/**
 * Phase 10: 数据集版本列表和创建 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { createDatasetVersion, getDatasetVersions } from '@/lib/dataset'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/v1/datasets/:id/versions - 获取版本列表
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

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

    const versions = await getDatasetVersions(id)

    return NextResponse.json(success(versions))
  } catch (err) {
    console.error('Get dataset versions error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取版本列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/datasets/:id/versions - 创建版本快照
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { changeLog } = body

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

    const version = await createDatasetVersion(id, changeLog, session.id)

    return NextResponse.json(success(version), { status: 201 })
  } catch (err) {
    console.error('Create dataset version error:', err)
    const message = err instanceof Error ? err.message : '创建版本失败'
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, message),
      { status: 500 }
    )
  }
}
