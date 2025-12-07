/**
 * 资源协作者 API
 */
export const dynamic = 'force-dynamic'

import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { ResourceTypes, type ResourceType } from '@/lib/permission'
import {
  getResourceCollaborators,
  updateResourceCollaborators,
  deleteResourceCollaborator,
} from '@/services/resourcePermission'

type Params = { params: Promise<{ type: string; id: string }> }

function validateResourceType(type: string): type is ResourceType {
  return Object.values(ResourceTypes).includes(type as ResourceType)
}

// GET /api/permission/[type]/[id]/collaborators
export async function GET(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth()
    const { type, id } = await params

    if (!validateResourceType(type)) {
      return jsonResponse(null, 400, '无效的资源类型')
    }

    const collaborators = await getResourceCollaborators(type, id, teamId)

    return jsonResponse({ collaborators })
  } catch (error) {
    return errorResponse(error)
  }
}

// POST /api/permission/[type]/[id]/collaborators
export async function POST(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth()
    const { type, id } = await params

    if (!validateResourceType(type)) {
      return jsonResponse(null, 400, '无效的资源类型')
    }

    const body = await req.json()

    if (!Array.isArray(body.collaborators) || body.collaborators.length === 0) {
      return jsonResponse(null, 400, '请提供协作者列表')
    }

    await updateResourceCollaborators(type, id, teamId, body.collaborators)

    return jsonResponse({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}

// DELETE /api/permission/[type]/[id]/collaborators
export async function DELETE(req: Request, { params }: Params) {
  try {
    await requireAuth()
    const { type, id } = await params

    if (!validateResourceType(type)) {
      return jsonResponse(null, 400, '无效的资源类型')
    }

    const body = await req.json()

    const collaboratorId = body.tmbId
      ? { tmbId: body.tmbId }
      : body.groupId
        ? { groupId: body.groupId }
        : body.orgId
          ? { orgId: body.orgId }
          : null

    if (!collaboratorId) {
      return jsonResponse(null, 400, '请指定要删除的协作者')
    }

    const deleted = await deleteResourceCollaborator(
      type,
      id,
      collaboratorId as { tmbId: string } | { groupId: string } | { orgId: string }
    )

    if (!deleted) {
      return jsonResponse(null, 404, '协作者不存在')
    }

    return jsonResponse({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
