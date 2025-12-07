export const dynamic = 'force-dynamic'

/**
 * 分组列表 / 创建分组
 */

import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { getGroups, createGroup } from '@/services/memberGroup'

// GET /api/team/groups - 获取分组列表
export async function GET() {
  try {
    const { teamId } = await requireAuth()
    const groups = await getGroups(teamId)
    return jsonResponse(groups)
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/team/groups - 创建分组
export async function POST(req: Request) {
  try {
    const { teamId } = await requireAuth()
    const body = await req.json()

    if (!body.name?.trim()) {
      return jsonResponse(null, 400, '分组名称不能为空')
    }

    const group = await createGroup(teamId, {
      name: body.name.trim(),
      avatar: body.avatar,
    })

    return jsonResponse(group)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return jsonResponse(null, 400, '分组名称已存在')
    }
    return errorResponse(error)
  }
}
