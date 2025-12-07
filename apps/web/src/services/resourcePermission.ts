/**
 * 资源协作者权限服务
 */
import { connectMongo } from '@/lib/mongodb'
import {
  ResourcePermissionModel,
  GroupMemberModel,
  OrgMemberModel,
  OrgModel,
  MemberGroupModel,
  type CollaboratorDetailType,
} from '@/lib/mongodb/schemas'
import { Permission, type ResourceType } from '@/lib/permission'
import { prisma } from '@/lib/prisma'

// ============ 类型定义 ============

type CollaboratorIdType =
  | { tmbId: string; groupId?: never; orgId?: never }
  | { tmbId?: never; groupId: string; orgId?: never }
  | { tmbId?: never; groupId?: never; orgId: string }

type CollaboratorInput = CollaboratorIdType & { permission: number }

// ============ 获取资源协作者 ============

export async function getResourceCollaborators(
  resourceType: ResourceType,
  resourceId: string,
  teamId: string
): Promise<CollaboratorDetailType[]> {
  await connectMongo()

  const permissions = await ResourcePermissionModel.find({
    resourceType,
    resourceId,
    teamId,
  }).lean()

  const result: CollaboratorDetailType[] = []

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
          permission: permission.toJSON(),
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
          permission: permission.toJSON(),
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
          permission: permission.toJSON(),
        })
      }
    }
  }

  return result
}

// ============ 更新资源协作者 ============

export async function updateResourceCollaborators(
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

// ============ 删除资源协作者 ============

export async function deleteResourceCollaborator(
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

// ============ 计算用户对资源的最终权限 ============

export async function getUserResourcePermission(
  resourceType: ResourceType,
  resourceId: string,
  tmbId: string,
  teamId: string
): Promise<Permission> {
  await connectMongo()

  // 1. 直接权限
  const directPerm = await ResourcePermissionModel.findOne({
    resourceType,
    resourceId,
    tmbId,
  })

  // 2. 用户所在分组
  const groupMemberships = await GroupMemberModel.find({ tmbId })
  const groupIds = groupMemberships.map((m) => m.groupId)

  // 3. 分组权限
  const groupPerms = await ResourcePermissionModel.find({
    resourceType,
    resourceId,
    groupId: { $in: groupIds },
  })

  // 4. 用户所在组织
  const orgMembership = await OrgMemberModel.findOne({ teamId, tmbId })

  // 5. 组织权限（包括上级组织）
  let orgPerms: { permission: number }[] = []
  if (orgMembership) {
    const org = await OrgModel.findById(orgMembership.orgId)
    if (org && org.path) {
      // 获取所有祖先组织（通过 path 解析）
      const pathParts = org.path.split('/').filter(Boolean)
      const ancestorPaths: string[] = []
      for (let i = 0; i < pathParts.length; i++) {
        ancestorPaths.push(pathParts.slice(0, i + 1).join('/'))
      }

      if (ancestorPaths.length > 0) {
        const ancestorOrgs = await OrgModel.find({
          teamId,
          path: { $in: ancestorPaths },
        })
        const ancestorOrgIds = ancestorOrgs.map((o) => o._id)

        orgPerms = await ResourcePermissionModel.find({
          resourceType,
          resourceId,
          orgId: { $in: ancestorOrgIds },
        })
      }
    }
  }

  // 6. 合并权限
  const permission = new Permission(directPerm?.permission ?? 0)

  for (const p of groupPerms) {
    permission.merge(p.permission)
  }
  for (const p of orgPerms) {
    permission.merge(p.permission)
  }

  return permission
}

// ============ 删除资源的所有权限 ============

export async function deleteAllResourcePermissions(
  resourceType: ResourceType,
  resourceId: string
): Promise<void> {
  await connectMongo()
  await ResourcePermissionModel.deleteMany({ resourceType, resourceId })
}

// ============ 检查用户是否有资源权限 ============

export async function checkResourcePermission(
  resourceType: ResourceType,
  resourceId: string,
  tmbId: string,
  teamId: string,
  requiredPermission: number
): Promise<boolean> {
  const permission = await getUserResourcePermission(resourceType, resourceId, tmbId, teamId)
  return permission.check(requiredPermission)
}
