import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, badRequest } from '@/lib/api'
import { generateApiToken } from '@/lib/token/generator'
import { ERROR_CODES } from '@platform/shared'

// 强制动态渲染，避免构建时预渲染错误
export const dynamic = 'force-dynamic'

// GET /api/v1/tokens - 获取用户的 API Token 列表
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    const [tokens, total] = await Promise.all([
      prisma.apiToken.findMany({
        where: { userId: session.id },
        select: {
          id: true,
          name: true,
          tokenPrefix: true,
          scopes: true,
          expiresAt: true,
          lastUsedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.apiToken.count({ where: { userId: session.id } }),
    ])

    return NextResponse.json(
      success({
        list: tokens,
        total,
        page,
        pageSize,
      })
    )
  } catch (err) {
    console.error('Get tokens error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '获取 Token 列表失败'),
      { status: 500 }
    )
  }
}

// POST /api/v1/tokens - 创建 API Token
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const body = await request.json()
    const { name, scopes, expiresAt } = body

    if (!name || name.trim() === '') {
      return NextResponse.json(badRequest('Token 名称不能为空'), { status: 400 })
    }

    // 验证权限范围
    const validScopes = ['read', 'write', 'execute', 'admin']
    const tokenScopes = scopes || ['read']
    for (const scope of tokenScopes) {
      if (!validScopes.includes(scope)) {
        return NextResponse.json(badRequest(`无效的权限范围: ${scope}`), {
          status: 400,
        })
      }
    }

    // 生成 Token
    const { token, tokenHash, tokenPrefix } = await generateApiToken()

    // 保存到数据库
    const apiToken = await prisma.apiToken.create({
      data: {
        name: name.trim(),
        tokenHash,
        tokenPrefix,
        scopes: tokenScopes,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        userId: session.id,
      },
      select: {
        id: true,
        name: true,
        tokenPrefix: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    // 返回完整 Token（仅此一次）
    return NextResponse.json(
      success({
        ...apiToken,
        token, // 完整 Token，仅创建时返回
      }),
      { status: 201 }
    )
  } catch (err) {
    console.error('Create token error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '创建 Token 失败'),
      { status: 500 }
    )
  }
}
