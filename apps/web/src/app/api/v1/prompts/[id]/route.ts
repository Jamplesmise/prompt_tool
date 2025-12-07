import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized } from '@/lib/api'
import { mergeVariables, extractVariableNames } from '@/lib/template'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

type RouteParams = { params: Promise<{ id: string }> }

// GET /api/v1/prompts/:id - 获取提示词详情
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const prompt = await prisma.prompt.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!prompt) {
      return NextResponse.json(
        error(ERROR_CODES.PROMPT_NOT_FOUND, '提示词不存在'),
        { status: 404 }
      )
    }

    return NextResponse.json(success(prompt))
  } catch (err) {
    console.error('Get prompt error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取提示词失败'),
      { status: 500 }
    )
  }
}

// PUT /api/v1/prompts/:id - 更新提示词草稿
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, systemPrompt, content, tags, variables: inputVariables } = body

    const existingPrompt = await prisma.prompt.findUnique({
      where: { id },
    })

    if (!existingPrompt) {
      return NextResponse.json(
        error(ERROR_CODES.PROMPT_NOT_FOUND, '提示词不存在'),
        { status: 404 }
      )
    }

    // 如果内容更新，重新提取并合并变量（从 systemPrompt 和 content 合并提取）
    type VariableType = { name: string; type: 'string' | 'number' | 'boolean' | 'json'; required?: boolean; description?: string; defaultValue?: unknown }
    let variables = existingPrompt.variables as VariableType[]
    const finalSystemPrompt = systemPrompt !== undefined ? systemPrompt : existingPrompt.systemPrompt
    const finalContent = content !== undefined ? content : existingPrompt.content
    if (content !== undefined || systemPrompt !== undefined) {
      const allContent = `${finalSystemPrompt || ''}\n${finalContent}`
      const newVariableNames = extractVariableNames(allContent)
      variables = mergeVariables(
        inputVariables || variables,
        newVariableNames
      )
    }

    const prompt = await prisma.prompt.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(content !== undefined && { content }),
        ...(tags !== undefined && { tags }),
        variables: variables as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json(success(prompt))
  } catch (err) {
    console.error('Update prompt error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '更新提示词失败'),
      { status: 500 }
    )
  }
}

// DELETE /api/v1/prompts/:id - 删除提示词
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id } = await params

    const existingPrompt = await prisma.prompt.findUnique({
      where: { id },
    })

    if (!existingPrompt) {
      return NextResponse.json(
        error(ERROR_CODES.PROMPT_NOT_FOUND, '提示词不存在'),
        { status: 404 }
      )
    }

    // 级联删除会自动删除关联的版本
    await prisma.prompt.delete({
      where: { id },
    })

    return NextResponse.json(success({ id }))
  } catch (err) {
    console.error('Delete prompt error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '删除提示词失败'),
      { status: 500 }
    )
  }
}
