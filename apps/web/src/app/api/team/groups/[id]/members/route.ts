export const dynamic = 'force-dynamic'

/**
 * 分组成员列表 / 添加成员
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { getGroupMembers, addGroupMember, isGroupOwner } from '@/services/memberGroup'

type Params = { params: Promise<{ id: string }> }

// GET /api/team/groups/[id]/members - 获取成员列表
export async function GET(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth()
    const { id } = await params
    const members = await getGroupMembers(id, teamId)
    return jsonResponse(members)
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/team/groups/[id]/members - 添加成员
export async function POST(req: Request, { params }: Params) {
  try {
    const { teamId, tmbId } = await requireAuth()
    const { id } = await params

    const canEdit = await isGroupOwner({ groupId: id, tmbId })
    if (!canEdit) {
      return jsonResponse(null, 403, '无权管理此分组')
    }

    const body = await req.json()

    if (!body.tmbId) {
      return jsonResponse(null, 400, '请选择要添加的成员')
    }

    const member = await addGroupMember(id, teamId, body.tmbId, body.role || 'member')

    return jsonResponse(member)
  } catch (error) {
    return errorResponse(error)
  }
}
