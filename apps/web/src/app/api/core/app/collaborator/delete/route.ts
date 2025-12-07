/**
 * 应用协作者删除 API
 * DELETE /api/core/app/collaborator/delete?appId=xxx&tmbId=xxx
 */
export const dynamic = 'force-dynamic'

import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { deleteFastGPTCollaborator } from '@/services/fastgptCollaborator'

export async function DELETE(req: Request) {
  try {
    await requireAuth()
    const params = new URL(req.url).searchParams
    const appId = params.get('appId')

    if (!appId) {
      return jsonResponse(null, 400, '缺少 appId')
    }

    const collaboratorId = params.get('tmbId')
      ? { tmbId: params.get('tmbId')! }
      : params.get('groupId')
        ? { groupId: params.get('groupId')! }
        : params.get('orgId')
          ? { orgId: params.get('orgId')! }
          : null

    if (!collaboratorId) {
      return jsonResponse(null, 400, '请指定协作者')
    }

    const deleted = await deleteFastGPTCollaborator('app', appId, collaboratorId)

    if (!deleted) {
      return jsonResponse(null, 404, '协作者不存在')
    }

    return jsonResponse({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
