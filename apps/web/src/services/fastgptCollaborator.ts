/**
 * FastGPT 协作者服务
 * 提供与 FastGPT 官方 API 兼容的协作者管理功能
 */
import { connectMongo } from '@/lib/mongodb'
import {
  ResourcePermissionModel,
  MemberGroupModel,
  OrgModel,
} from '@/lib/mongodb/schemas'
import {
  Permission,
  toFastGPTPermission,
  type FastGPTCollaboratorItem,
  type ResourceType,
} from '@/lib/permission'
import { prisma } from '@/lib/prisma'

// ============ 类型定义 ============

type CollaboratorIdType =
  | { tmbId: string; groupId?: never; orgId?: never }
  | { tmbId?: never; groupId: string; orgId?: never }
  | { tmbId?: never; groupId?: never; orgId: string }

type CollaboratorInput = {
  tmbId?: string
  groupId?: string
  orgId?: string
  permission: number
}

// ============ 获取协作者列表（FastGPT 格式）============

export async function getFastGPTCollaborators(
  resourceType: ResourceType,
  resourceId: string,
  teamId: string
): Promise<FastGPTCollaboratorItem[]> {
  await connectMongo()

  const permissions = await ResourcePermissionModel.find({
    resourceType,
    resourceId,
    teamId,
  }).lean()

  const result: FastGPTCollaboratorItem[] = []

  for (const perm of permissions) {
    const permission = new Permission(perm.permission)

    if (perm.tmbId) {
      // 个人协作者
      const teamMember = await prisma.teamMember.findFirst({
        where: { id: perm.tmbId },
        include: { user: { select: { name: true, avatar: true } } },
      })

      if (teamMember) {
        result.push({
          tmbId: perm.tmbId,
          name: teamMember.user.name,
          avatar: teamMember.user.avatar || '',
          permission: toFastGPTPermission(permission),
        })
      }
    } else if (perm.groupId) {
      // 分组协作者
      const group = await MemberGroupModel.findById(perm.groupId).lean()
      if (group) {
        result.push({
          groupId: perm.groupId,
          name: group.name,
          avatar: group.avatar || '',
          permission: toFastGPTPermission(permission),
        })
      }
    } else if (perm.orgId) {
      // 组织协作者
      const org = await OrgModel.findById(perm.orgId).lean()
      if (org) {
        result.push({
          orgId: perm.orgId,
          name: org.name,
          avatar: org.avatar || '',
          permission: toFastGPTPermission(permission),
        })
      }
    }
  }

  return result
}

// ============ 更新协作者 ============

export async function updateFastGPTCollaborators(
  resourceType: ResourceType,
  resourceId: string,
  teamId: string,
  collaborators: CollaboratorInput[]
): Promise<void> {
  await connectMongo()

  for (const clb of collaborators) {
    const filter: Record<string, unknown> = { resourceType, resourceId, teamId }

    if (clb.tmbId) {
      filter.tmbId = clb.tmbId
    } else if (clb.groupId) {
      filter.groupId = clb.groupId
    } else if (clb.orgId) {
      filter.orgId = clb.orgId
    } else {
      continue
    }

    await ResourcePermissionModel.findOneAndUpdate(
      filter,
      {
        $set: { permission: clb.permission },
        $setOnInsert: { createTime: new Date() },
      },
      { upsert: true }
    )
  }
}

// ============ 删除协作者 ============

export async function deleteFastGPTCollaborator(
  resourceType: ResourceType,
  resourceId: string,
  collaboratorId: CollaboratorIdType
): Promise<boolean> {
  await connectMongo()

  const filter: Record<string, unknown> = { resourceType, resourceId }

  if (collaboratorId.tmbId) {
    filter.tmbId = collaboratorId.tmbId
  } else if (collaboratorId.groupId) {
    filter.groupId = collaboratorId.groupId
  } else if (collaboratorId.orgId) {
    filter.orgId = collaboratorId.orgId
  } else {
    return false
  }

  const result = await ResourcePermissionModel.deleteOne(filter)
  return result.deletedCount > 0
}
