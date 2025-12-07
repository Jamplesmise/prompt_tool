/**
 * 模型协作者更新 API
 * POST /api/system/model/collaborator/update
 */
export const dynamic = 'force-dynamic'

import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { updateFastGPTCollaborators } from '@/services/fastgptCollaborator'

export async function POST(req: Request) {
  try {
    const { teamId } = await requireAuth()
    const body = await req.json()

    if (!body.modelId) {
      return jsonResponse(null, 400, '缺少 modelId')
    }

    if (!Array.isArray(body.collaborators) || body.collaborators.length === 0) {
      return jsonResponse(null, 400, '请提供协作者列表')
    }

    await updateFastGPTCollaborators('model', body.modelId, teamId, body.collaborators)

    return jsonResponse({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
