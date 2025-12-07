export const dynamic = 'force-dynamic'

/**
 * 组织列表 / 创建组织
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { getOrgs, createOrg } from '@/services/org'

// GET /api/team/orgs - 获取组织列表
export async function GET() {
  try {
    const { teamId } = await requireAuth()
    const orgs = await getOrgs(teamId)
    return jsonResponse(orgs)
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/team/orgs - 创建组织
export async function POST(req: Request) {
  try {
    const { teamId } = await requireAuth()
    const body = await req.json()

    if (!body.name?.trim()) {
      return jsonResponse(null, 400, '组织名称不能为空')
    }

    const org = await createOrg(teamId, {
      name: body.name.trim(),
      parentId: body.parentId,
      avatar: body.avatar,
      description: body.description,
    })

    return jsonResponse(org)
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return jsonResponse(null, 400, '组织已存在')
    }
    return errorResponse(error)
  }
}
