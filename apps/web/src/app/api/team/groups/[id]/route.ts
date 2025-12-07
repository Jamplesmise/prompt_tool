export const dynamic = 'force-dynamic'

/**
 * 分组详情 / 更新 / 删除
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { getGroupById, updateGroup, deleteGroup, isGroupOwner } from '@/services/memberGroup'

type Params = { params: Promise<{ id: string }> }

// GET /api/team/groups/[id] - 获取分组详情
export async function GET(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth()
    const { id } = await params
    const group = await getGroupById(id, teamId)

    if (!group) {
      return jsonResponse(null, 404, '分组不存在')
    }

    return jsonResponse(group)
  } catch (error) {
    return errorResponse(error)
  }
}

// PUT /api/team/groups/[id] - 更新分组
export async function PUT(req: Request, { params }: Params) {
  try {
    const { teamId, tmbId } = await requireAuth()
    const { id } = await params

    // 检查是否是分组 Owner
    const canEdit = await isGroupOwner({ groupId: id, tmbId })
    if (!canEdit) {
      return jsonResponse(null, 403, '无权编辑此分组')
    }

    const body = await req.json()
    const group = await updateGroup(id, teamId, {
      name: body.name?.trim(),
      avatar: body.avatar,
    })

    if (!group) {
      return jsonResponse(null, 404, '分组不存在')
    }

    return jsonResponse(group)
  } catch (error) {
    return errorResponse(error)
  }
}

// DELETE /api/team/groups/[id] - 删除分组
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { teamId, tmbId } = await requireAuth()
    const { id } = await params

    const canDelete = await isGroupOwner({ groupId: id, tmbId })
    if (!canDelete) {
      return jsonResponse(null, 403, '无权删除此分组')
    }

    const deleted = await deleteGroup(id, teamId)

    if (!deleted) {
      return jsonResponse(null, 404, '分组不存在')
    }

    return jsonResponse({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
