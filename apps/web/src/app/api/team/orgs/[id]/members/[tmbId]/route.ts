export const dynamic = 'force-dynamic'

/**
 * 移除组织成员
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { removeOrgMember } from '@/services/org'

type Params = { params: Promise<{ id: string; tmbId: string }> }

// DELETE /api/team/orgs/[id]/members/[tmbId] - 移除成员
export async function DELETE(req: Request, { params }: Params) {
  try {
    await requireAuth()
    const { id, tmbId } = await params

    const removed = await removeOrgMember(id, tmbId)

    if (!removed) {
      return jsonResponse(null, 404, '成员不存在')
    }

    return jsonResponse({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
