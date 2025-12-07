export const dynamic = 'force-dynamic'

/**
 * 组织详情 / 更新 / 删除 / 移动
 */
import { requireAuth, jsonResponse, errorResponse } from '@/lib/mongodb'
import { getOrgById, updateOrg, deleteOrg, moveOrg } from '@/services/org'

type Params = { params: Promise<{ id: string }> }

// GET /api/team/orgs/[id] - 获取组织详情
export async function GET(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth()
    const { id } = await params

    const org = await getOrgById(id, teamId)

    if (!org) {
      return jsonResponse(null, 404, '组织不存在')
    }

    return jsonResponse(org)
  } catch (error) {
    return errorResponse(error)
  }
}

// PUT /api/team/orgs/[id] - 更新组织
export async function PUT(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth()
    const { id } = await params
    const body = await req.json()

    const org = await updateOrg(id, teamId, {
      name: body.name?.trim(),
      avatar: body.avatar,
      description: body.description,
    })

    if (!org) {
      return jsonResponse(null, 404, '组织不存在')
    }

    return jsonResponse(org)
  } catch (error) {
    return errorResponse(error)
  }
}

// DELETE /api/team/orgs/[id] - 删除组织
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth()
    const { id } = await params

    const deleted = await deleteOrg(id, teamId)

    if (!deleted) {
      return jsonResponse(null, 404, '组织不存在')
    }

    return jsonResponse({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}

// PATCH /api/team/orgs/[id] - 移动组织
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { teamId } = await requireAuth()
    const { id } = await params
    const body = await req.json()

    await moveOrg(id, teamId, body.parentId)

    return jsonResponse({ success: true })
  } catch (error) {
    return errorResponse(error)
  }
}
