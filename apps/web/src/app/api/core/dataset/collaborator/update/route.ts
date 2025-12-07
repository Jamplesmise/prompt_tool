/**
 * 数据集协作者更新 API
 * POST /api/core/dataset/collaborator/update
 */
export const dynamic = 'force-dynamic'

import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { updateFastGPTCollaborators } from '@/services/fastgptCollaborator'

export async function POST(req: Request) {
  try {
    const { teamId } = await requireAuth()
    const body = await req.json()

    if (!body.datasetId) {
      return jsonResponse(null, 400, '缺少 datasetId')
    }

    if (!Array.isArray(body.collaborators) || body.collaborators.length === 0) {
      return jsonResponse(null, 400, '请提供协作者列表')
    }

    await updateFastGPTCollaborators('dataset', body.datasetId, teamId, body.collaborators)

    return jsonResponse({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
