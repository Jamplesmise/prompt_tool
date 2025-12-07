/**
 * 数据集协作者删除 API
 * DELETE /api/core/dataset/collaborator/delete?datasetId=xxx&tmbId=xxx
 */
export const dynamic = 'force-dynamic'

import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { deleteFastGPTCollaborator } from '@/services/fastgptCollaborator'

export async function DELETE(req: Request) {
  try {
    await requireAuth()
    const params = new URL(req.url).searchParams
    const datasetId = params.get('datasetId')

    if (!datasetId) {
      return jsonResponse(null, 400, '缺少 datasetId')
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

    const deleted = await deleteFastGPTCollaborator('dataset', datasetId, collaboratorId)

    if (!deleted) {
      return jsonResponse(null, 404, '协作者不存在')
    }

    return jsonResponse({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
