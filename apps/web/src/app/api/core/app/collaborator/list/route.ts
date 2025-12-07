/**
 * 应用协作者列表 API
 * GET /api/core/app/collaborator/list?appId=xxx
 */
export const dynamic = 'force-dynamic'

import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { getFastGPTCollaborators } from '@/services/fastgptCollaborator'

export async function GET(req: Request) {
  try {
    const { teamId } = await requireAuth()
    const appId = new URL(req.url).searchParams.get('appId')

    if (!appId) {
      return jsonResponse(null, 400, '缺少 appId')
    }

    const clbs = await getFastGPTCollaborators('app', appId, teamId)

    return jsonResponse({ clbs })
  } catch (error) {
    return errorResponse(error)
  }
}
