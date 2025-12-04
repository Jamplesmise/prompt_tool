/**
 * Phase 10: 分支列表和创建 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { createBranch, getBranches, ensureDefaultBranch } from '@/lib/branch'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/v1/prompts/:id/branches - 获取分支列表
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

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

    // 确保有默认分支（兼容旧数据）
    await ensureDefaultBranch(id, session.id)

    const branches = await getBranches(id)

    return NextResponse.json(success(branches))
  } catch (err) {
    console.error('Get branches error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取分支列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/prompts/:id/branches - 创建分支
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, sourceVersionId } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '分支名称不能为空'),
        { status: 400 }
      )
    }

    if (!sourceVersionId || typeof sourceVersionId !== 'string') {
      return NextResponse.json(
        error(ERROR_CODES.VALIDATION_ERROR, '源版本ID不能为空'),
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

    const branch = await createBranch({
      promptId: id,
      name: name.trim(),
      description,
      sourceVersionId,
      createdById: session.id,
    })

    return NextResponse.json(success(branch), { status: 201 })
  } catch (err) {
    console.error('Create branch error:', err)
    const message = err instanceof Error ? err.message : '创建分支失败'
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, message),
      { status: 500 }
    )
  }
}
