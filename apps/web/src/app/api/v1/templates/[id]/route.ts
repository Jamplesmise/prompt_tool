import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/templates/[id] - 获取模板详情
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未登录', data: null },
        { status: 401 }
      )
    }

    const { id } = await params

    const template = await prisma.taskTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
        team: {
          select: { id: true, name: true },
        },
      },
    })

    if (!template) {
      return NextResponse.json(
        { code: 404001, message: '模板不存在', data: null },
        { status: 404 }
      )
    }

    // 检查权限：只能查看自己的或团队公开的
    const canView =
      template.createdById === session.id ||
      (template.isPublic && template.teamId)

    if (!canView) {
      return NextResponse.json(
        { code: 403001, message: '无权访问此模板', data: null },
        { status: 403 }
      )
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: template,
    })
  } catch (error) {
    console.error('获取模板详情失败:', error)
    return NextResponse.json(
      { code: 500001, message: '获取模板详情失败', data: null },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/v1/templates/[id] - 更新模板
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未登录', data: null },
        { status: 401 }
      )
    }

    const { id } = await params

    const template = await prisma.taskTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json(
        { code: 404001, message: '模板不存在', data: null },
        { status: 404 }
      )
    }

    // 只能更新自己创建的模板
    if (template.createdById !== session.id) {
      return NextResponse.json(
        { code: 403001, message: '无权修改此模板', data: null },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, config, isPublic } = body

    const updated = await prisma.taskTemplate.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(config && { config }),
        ...(isPublic !== undefined && { isPublic }),
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })

    return NextResponse.json({
      code: 200,
      message: '更新成功',
      data: updated,
    })
  } catch (error) {
    console.error('更新模板失败:', error)
    return NextResponse.json(
      { code: 500001, message: '更新模板失败', data: null },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/v1/templates/[id] - 删除模板
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未登录', data: null },
        { status: 401 }
      )
    }

    const { id } = await params

    const template = await prisma.taskTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json(
        { code: 404001, message: '模板不存在', data: null },
        { status: 404 }
      )
    }

    // 只能删除自己创建的模板
    if (template.createdById !== session.id) {
      return NextResponse.json(
        { code: 403001, message: '无权删除此模板', data: null },
        { status: 403 }
      )
    }

    await prisma.taskTemplate.delete({
      where: { id },
    })

    return NextResponse.json({
      code: 200,
      message: '删除成功',
      data: { id },
    })
  } catch (error) {
    console.error('删除模板失败:', error)
    return NextResponse.json(
      { code: 500001, message: '删除模板失败', data: null },
      { status: 500 }
    )
  }
}

/**
 * POST /api/v1/templates/[id]/use - 使用模板（增加使用次数）
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { code: 401001, message: '未登录', data: null },
        { status: 401 }
      )
    }

    const { id } = await params

    const template = await prisma.taskTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json(
        { code: 404001, message: '模板不存在', data: null },
        { status: 404 }
      )
    }

    // 增加使用次数
    await prisma.taskTemplate.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
      },
    })

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: { config: template.config },
    })
  } catch (error) {
    console.error('使用模板失败:', error)
    return NextResponse.json(
      { code: 500001, message: '使用模板失败', data: null },
      { status: 500 }
    )
  }
}
