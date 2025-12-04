/**
 * Phase 10: 分支对比 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { compareBranches } from '@/lib/branch'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/v1/prompts/:id/branches/diff?source=xxx&target=xxx - 分支对比
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const sourceBranchId = searchParams.get('source')
    const targetBranchId = searchParams.get('target')

    if (!sourceBranchId || !targetBranchId) {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '需要提供 source 和 target 分支ID'),
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

    const diff = await compareBranches(id, sourceBranchId, targetBranchId)

    return NextResponse.json(success(diff))
  } catch (err) {
    console.error('Compare branches error:', err)
    const message = err instanceof Error ? err.message : '分支对比失败'
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, message),
      { status: 500 }
    )
  }
}
