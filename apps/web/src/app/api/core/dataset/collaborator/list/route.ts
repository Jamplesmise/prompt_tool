/**
 * 数据集协作者列表 API
 * GET /api/core/dataset/collaborator/list?datasetId=xxx
 */
export const dynamic = 'force-dynamic'

import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { getFastGPTCollaborators } from '@/services/fastgptCollaborator'

export async function GET(req: Request) {
  try {
    const { teamId } = await requireAuth()
    const datasetId = new URL(req.url).searchParams.get('datasetId')

    if (!datasetId) {
      return jsonResponse(null, 400, '缺少 datasetId')
    }

    const clbs = await getFastGPTCollaborators('dataset', datasetId, teamId)

    return jsonResponse({ clbs })
  } catch (error) {
    return errorResponse(error)
  }
}
