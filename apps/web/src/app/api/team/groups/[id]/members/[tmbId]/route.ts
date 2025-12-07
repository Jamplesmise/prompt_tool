export const dynamic = 'force-dynamic'

/**
 * 移除成员 / 更新成员角色
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { removeGroupMember, updateGroupMemberRole, isGroupOwner } from '@/services/memberGroup'

type Params = { params: Promise<{ id: string; tmbId: string }> }

// DELETE /api/team/groups/[id]/members/[tmbId] - 移除成员
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { tmbId: currentTmbId } = await requireAuth()
    const { id, tmbId } = await params

    const canEdit = await isGroupOwner({ groupId: id, tmbId: currentTmbId })
    if (!canEdit) {
      return jsonResponse(null, 403, '无权管理此分组')
    }

    const removed = await removeGroupMember(id, tmbId)

    if (!removed) {
      return jsonResponse(null, 404, '成员不存在')
    }

    return jsonResponse({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}

// PUT /api/team/groups/[id]/members/[tmbId] - 更新成员角色
export async function PUT(req: Request, { params }: Params) {
  try {
    const { tmbId: currentTmbId } = await requireAuth()
    const { id, tmbId } = await params

    const canEdit = await isGroupOwner({ groupId: id, tmbId: currentTmbId })
    if (!canEdit) {
      return jsonResponse(null, 403, '无权管理此分组')
    }

    const body = await req.json()

    if (!body.role) {
      return jsonResponse(null, 400, '请指定角色')
    }

    const member = await updateGroupMemberRole(id, tmbId, body.role)

    if (!member) {
      return jsonResponse(null, 404, '成员不存在')
    }

    return jsonResponse(member)
  } catch (error) {
    return errorResponse(error)
  }
}
