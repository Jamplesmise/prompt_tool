export const dynamic = 'force-dynamic'

/**
 * 组织成员列表 / 添加成员
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { getOrgMembers, addOrgMember, addOrgMembers } from '@/services/org'

type Params = { params: Promise<{ id: string }> }

// GET /api/team/orgs/[id]/members - 获取组织成员
export async function GET(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth()
    const { id } = await params

    const members = await getOrgMembers(id, teamId)
    return jsonResponse(members)
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/team/orgs/[id]/members - 添加成员
export async function POST(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth()
    const { id } = await params
    const body = await req.json()

    // 支持批量添加
    if (Array.isArray(body.tmbIds)) {
      const count = await addOrgMembers({
        teamId,
        orgId: id,
        tmbIds: body.tmbIds,
      })
      return jsonResponse({ added: count })
    }

    // 单个添加
    if (!body.tmbId) {
      return jsonResponse(null, 400, '请指定成员')
    }

    const member = await addOrgMember(id, teamId, body.tmbId)
    return jsonResponse(member)
  } catch (error) {
    return errorResponse(error)
  }
}
