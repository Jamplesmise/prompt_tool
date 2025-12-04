/**
 * Phase 10: 分支详情、更新、删除 API
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { getBranch, updateBranch, deleteBranch } from '@/lib/branch'
import { prisma } from '@/lib/prisma'
import { ERROR_CODES } from '@platform/shared'

type RouteParams = { params: Promise<{ id: string; branchId: string }> }

// GET /api/v1/prompts/:id/branches/:branchId - 获取分支详情
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

    return NextResponse.json(success(branch))
  } catch (err) {
    console.error('Get branch error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取分支详情失败'),
      { status: 500 }
    )
  }
}

// PUT /api/v1/prompts/:id/branches/:branchId - 更新分支信息
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id, branchId } = await params
    const body = await request.json()
    const { name, description } = body

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

    const branch = await updateBranch(id, branchId, {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description }),
    })

    return NextResponse.json(success(branch))
  } catch (err) {
    console.error('Update branch error:', err)
    const message = err instanceof Error ? err.message : '更新分支失败'
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, message),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/prompts/:id/branches/:branchId - 删除分支
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await deleteBranch(id, branchId)

    return NextResponse.json(success({ id: branchId }))
  } catch (err) {
    console.error('Delete branch error:', err)
    const message = err instanceof Error ? err.message : '删除分支失败'
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, message),
      { status: 500 }
    )
  }
}
