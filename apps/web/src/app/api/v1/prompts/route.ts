import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import type { Prisma as PrismaTypes } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { extractVariables } from '@/lib/template'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// GET /api/v1/prompts - 获取提示词列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const keyword = searchParams.get('keyword') || ''
    const tagsParam = searchParams.get('tags')
    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : []

    // 构建查询条件
    const conditions: PrismaTypes.PromptWhereInput[] = []

    if (keyword) {
      conditions.push({
        OR: [
          { name: { contains: keyword, mode: 'insensitive' as const } },
          { description: { contains: keyword, mode: 'insensitive' as const } },
        ],
      })
    }

    if (tags.length > 0) {
      conditions.push({
        tags: { hasSome: tags },
      })
    }

    const where: PrismaTypes.PromptWhereInput = conditions.length > 0 ? { AND: conditions } : {}

    const [prompts, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          currentVersion: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.prompt.count({ where }),
    ])

    return NextResponse.json(
      success({
        list: prompts,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get prompts error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取提示词列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/prompts - 创建提示词（自动创建 v1）
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { name, description, systemPrompt, content, tags } = body

    if (!name || !content) {
      return NextResponse.json(
        badRequest('名称和内容不能为空'),
        { status: 400 }
      )
    }

    // 自动提取变量（从 systemPrompt 和 content 合并提取）
    const allContent = `${systemPrompt || ''}\n${content}`
    const variables = extractVariables(allContent)
    const variablesJson = variables as Prisma.InputJsonValue

    // 使用事务创建提示词和第一个版本
    const prompt = await prisma.$transaction(async (tx) => {
      const newPrompt = await tx.prompt.create({
        data: {
          name,
          description: description || null,
          systemPrompt: systemPrompt || '',
          content,
          variables: variablesJson,
          tags: tags || [],
          currentVersion: 1,
          createdById: session.id,
        },
      })

      await tx.promptVersion.create({
        data: {
          promptId: newPrompt.id,
          version: 1,
          systemPrompt: systemPrompt || '',
          content,
          variables: variablesJson,
          changeLog: '初始版本',
          createdById: session.id,
        },
      })

      return newPrompt
    })

    return NextResponse.json(success(prompt), { status: 201 })
  } catch (err) {
    console.error('Create prompt error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '创建提示词失败'),
      { status: 500 }
    )
  }
}
