import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { success, error, unauthorized, notFound, forbidden, badRequest } from '@/lib/api'
import { ERROR_CODES } from '@platform/shared'

type Params = { params: Promise<{ id: string }> }

// POST /api/v1/projects/[id]/transfer - 转让项目所有权
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(unauthorized(), { status: 401 })
    }

    const { id: projectId } = await params

    // 检查用户是否是项目所有者
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: session.id },
      },
    })

    if (!membership) {
      return NextResponse.json(
        error(ERROR_CODES.PROJECT_NOT_FOUND, '项目不存在或无权访问'),
        { status: 404 }
      )
    }

    if (membership.role !== 'OWNER') {
      return NextResponse.json(forbidden('只有项目所有者可以转让所有权'), {
        status: 403,
      })
    }

    const body = await request.json()
    const { newOwnerId } = body as { newOwnerId: string }

    if (!newOwnerId) {
      return NextResponse.json(badRequest('新所有者 ID 不能为空'), {
        status: 400,
      })
    }

    // 检查新所有者是否是项目成员
    const newOwnerMembership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: newOwnerId },
      },
    })

    if (!newOwnerMembership) {
      return NextResponse.json(
        error(ERROR_CODES.MEMBER_NOT_FOUND, '新所有者必须是项目成员'),
        { status: 404 }
      )
    }

    // 使用事务转让所有权
    await prisma.$transaction(async (tx) => {
      // 更新项目所有者
      await tx.project.update({
        where: { id: projectId },
        data: { ownerId: newOwnerId },
      })

      // 将原所有者降级为管理员
      await tx.projectMember.update({
        where: {
          projectId_userId: { projectId, userId: session.id },
        },
        data: { role: 'ADMIN' },
      })

      // 将新所有者提升为所有者
      await tx.projectMember.update({
        where: {
          projectId_userId: { projectId, userId: newOwnerId },
        },
        data: { role: 'OWNER' },
      })
    })

    return NextResponse.json(success(null))
  } catch (err) {
    console.error('Transfer ownership error:', err)
    return NextResponse.json(
      error(ERROR_CODES.INTERNAL_ERROR, '转让所有权失败'),
      { status: 500 }
    )
  }
}
