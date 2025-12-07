/**
 * 模型协作者列表 API
 * GET /api/system/model/collaborator/list?modelId=xxx
 */
export const dynamic = 'force-dynamic'

import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { getFastGPTCollaborators } from '@/services/fastgptCollaborator'

export async function GET(req: Request) {
  try {
    const { teamId } = await requireAuth()
    const modelId = new URL(req.url).searchParams.get('modelId')

    if (!modelId) {
      return jsonResponse(null, 400, '缺少 modelId')
    }

    const clbs = await getFastGPTCollaborators('model', modelId, teamId)

    return jsonResponse({ clbs })
  } catch (error) {
    return errorResponse(error)
  }
}
