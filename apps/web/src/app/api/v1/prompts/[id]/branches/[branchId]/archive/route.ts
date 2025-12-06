/**
 * Phase 10: 分支归档 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { archiveBranch } from '@/lib/branch'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string; branchId: string }> }

// POST /api/v1/prompts/:id/branches/:branchId/archive - 归档分支
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id, branchId } = await params

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

    const branch = await archiveBranch(id, branchId)

    return NextResponse.json(success(branch))
  } catch (err) {
    console.error('Archive branch error:', err)
    const message = err instanceof Error ? err.message : '归档分支失败'
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, message),
      { status: 500 }
    )
  }
}
