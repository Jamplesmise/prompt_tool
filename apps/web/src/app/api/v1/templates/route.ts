import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// 模板配置类型
type TemplateConfig = {
  promptId?: string
  promptVersionId?: string
  modelId?: string
  datasetId?: string
  evaluatorIds?: string[]
  samplingConfig?: {
    type: 'all' | 'random' | 'first'
    count?: number
  }
  abTest?: {
    enabled: boolean
    compareType?: 'prompt' | 'model'
  }
}

/**
 * GET /api/v1/templates - 获取模板列表
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未登录', data: null },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'all' // 'mine' | 'team' | 'all'
    const teamId = searchParams.get('teamId')

    // 构建查询条件
    const where: Record<string, unknown> = {}

    if (scope === 'mine') {
      where.createdById = session.id
    } else if (scope === 'team' && teamId) {
      where.teamId = teamId
      where.isPublic = true
    } else {
      // all: 我的模板 + 团队公开模板
      where.OR = [
        { createdById: session.id },
        ...(teamId ? [{ teamId, isPublic: true }] : []),
      ]
    }

    const templates = await prisma.taskTemplate.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
        team: {
          select: { id: true, name: true },
        },
      },
      orderBy: [
        { usageCount: 'desc' },
        { updatedAt: 'desc' },
      ],
    })

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: templates,
    })
  } catch (error) {
    console.error('获取模板列表失败:', error)
    return NextResponse.json(
      { code: 500001, message: '获取模板列表失败', data: null },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/templates - 创建模板
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未登录', data: null },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, description, config, isPublic = false, teamId } = body

    if (!name?.trim()) {
      return NextResponse.json(
        { code: 400001, message: '模板名称不能为空', data: null },
        { status: 400 }
      )
    }

    if (!config || typeof config !== 'object') {
      return NextResponse.json(
        { code: 400002, message: '模板配置不能为空', data: null },
        { status: 400 }
      )
    }

    const template = await prisma.taskTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        config: config as TemplateConfig,
        isPublic,
        createdById: session.id,
        teamId: teamId || null,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })

    return NextResponse.json({
      code: 200,
      message: '创建成功',
      data: template,
    })
  } catch (error) {
    console.error('创建模板失败:', error)
    return NextResponse.json(
      { code: 500001, message: '创建模板失败', data: null },
      { status: 500 }
    )
  }
}
