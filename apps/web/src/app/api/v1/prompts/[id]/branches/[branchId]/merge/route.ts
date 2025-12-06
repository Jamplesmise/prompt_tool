/**
 * Phase 10: 分支合并 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { mergeBranch } from '@/lib/branch'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string; branchId: string }> }

// POST /api/v1/prompts/:id/branches/:branchId/merge - 合并分支
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id, branchId } = await params
    const body = await request.json()
    const { targetBranchId, changeLog } = body

    if (!targetBranchId || typeof targetBranchId !== 'string') {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '目标分支ID不能为空'),
        { status: 400 }
      )
    }

    // 验证提示词存在
    const prompt = await prisma.prompt.findUnique({
      where: { id },
    })

    if (!prompt) {
      return NextResponse.json(
        error(ERROR_CODES.PROMPT_NOT_FOUND, '提示词不存在'),
        { status: 404 }
      )
    }

    const newVersion = await mergeBranch({
      sourceBranchId: branchId,
      targetBranchId,
      changeLog,
      userId: session.id,
    })

    return NextResponse.json(success(newVersion), { status: 201 })
  } catch (err) {
    console.error('Merge branch error:', err)
    const message = err instanceof Error ? err.message : '合并分支失败'
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, message),
      { status: 500 }
    )
  }
}
