/**
 * Phase 10: 分支版本 API
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { publishBranchVersion, getBranch } from '@/lib/branch'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string; branchId: string }> }

// GET /api/v1/prompts/:id/branches/:branchId/versions - 获取分支版本列表
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const branch = await getBranch(id, branchId)

    if (!branch) {
      return NextResponse.json(
        error(ERROR_CODES.NOT_FOUND, '分支不存在'),
        { status: 404 }
      )
    }

    return NextResponse.json(success(branch.versions))
  } catch (err) {
    console.error('Get branch versions error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取分支版本列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/prompts/:id/branches/:branchId/versions - 在分支上发布新版本
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id, branchId } = await params
    const body = await request.json()
    const { content, variables, changeLog } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '内容不能为空'),
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

    const version = await publishBranchVersion(
      id,
      branchId,
      content,
      (variables || prompt.variables) as Prisma.InputJsonValue,
      changeLog,
      session.id
    )

    return NextResponse.json(success(version), { status: 201 })
  } catch (err) {
    console.error('Publish branch version error:', err)
    const message = err instanceof Error ? err.message : '发布版本失败'
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, message),
      { status: 500 }
    )
  }
}
