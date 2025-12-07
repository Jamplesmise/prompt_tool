/**
 * 组织架构服务
 * 复制自: dev-admin/src/packages/service/support_permission/org/controllers.ts
 */
import type { ClientSession } from 'mongoose'
import { connectMongo } from '@/lib/mongodb'
import {
  OrgModel,
  OrgMemberModel,
  getOrgChildrenPath,
  type OrgSchemaType,
  type OrgListItemType,
  type OrgMemberItemType,
} from '@/lib/mongodb/schemas'
import { prisma } from '@/lib/prisma'

// 错误枚举
export enum OrgErrEnum {
  orgNotExist = 'orgNotExist',
  orgNameExists = 'orgNameExists',
}

// ============ 组织查询 ============

// 获取组织列表（含子组织和成员数量）
export async function getOrgs(teamId: string): Promise<OrgListItemType[]> {
  await connectMongo()

  const orgs = await OrgModel.find({ teamId })
    .sort({ path: 1, name: 1 })
    .lean<OrgSchemaType[]>()

  // 统计每个组织的成员数
  const orgIds = orgs.map((o) => o._id)
  const memberCounts = await OrgMemberModel.aggregate([
    { $match: { orgId: { $in: orgIds } } },
    { $group: { _id: '$orgId', count: { $sum: 1 } } },
  ])

  const countMap = new Map(memberCounts.map((m) => [m._id.toString(), m.count]))

  // 统计子组织数量
  const childCounts = orgs.reduce((acc, org) => {
    const childPath = getOrgChildrenPath(org)
    if (childPath) {
      const children = orgs.filter((o) => o.path.startsWith(childPath))
      acc.set(org._id.toString(), children.length)
    } else {
      acc.set(org._id.toString(), 0)
    }
    return acc
  }, new Map<string, number>())

  return orgs.map((o) => ({
    ...o,
    _id: o._id.toString(),
    total: (countMap.get(o._id.toString()) || 0) + (childCounts.get(o._id.toString()) || 0),
  }))
}

// 获取组织详情
export async function getOrgById(orgId: string, teamId: string) {
  await connectMongo()

  const org = await OrgModel.findOne({
    _id: orgId,
    teamId,
  }).lean<OrgSchemaType>()

  if (!org) return null

  const members = await getOrgMembers(orgId, teamId)
  const children = await getChildrenByOrg({ org, teamId })

  return {
    ...org,
    _id: org._id.toString(),
    members,
    children: children.map((c) => ({ ...c, _id: c._id.toString() })),
  }
}

// 获取用户所属的组织 ID
export async function getOrgsByTmbId({ teamId, tmbId }: { teamId: string; tmbId: string }) {
  await connectMongo()
  return OrgMemberModel.find({ teamId, tmbId }, 'orgId').lean()
}

// 获取用户所属的组织 ID 集合（包含父组织）
export async function getOrgIdSetWithParentByTmbId({
  teamId,
  tmbId,
}: {
  teamId: string
  tmbId: string
}) {
  const orgMembers = await OrgMemberModel.find({ teamId, tmbId }, 'orgId').lean()

  const orgIds = Array.from(new Set(orgMembers.map((item) => String(item.orgId))))
  const orgs = await OrgModel.find({ _id: { $in: orgIds } }, 'path').lean()

  const pathIdList = new Set<string>(
    orgs
      .map((org: OrgSchemaType) => {
        const pathIdList = org.path.split('/').filter(Boolean)
        return pathIdList
      })
      .flat()
  )
  const parentOrgs = await OrgModel.find(
    {
      teamId,
      pathId: { $in: Array.from(pathIdList) },
    },
    '_id'
  ).lean()
  const parentOrgIds = parentOrgs.map((item) => String(item._id))

  return new Set([...orgIds, ...parentOrgIds])
}

// 获取子组织
export async function getChildrenByOrg({
  org,
  teamId,
  session,
}: {
  org: OrgSchemaType
  teamId: string
  session?: ClientSession
}) {
  return OrgModel.find(
    { teamId, path: { $regex: `^${getOrgChildrenPath(org)}` } },
    undefined,
    { session }
  ).lean()
}

// 获取组织及其子组织
export async function getOrgAndChildren({
  orgId,
  teamId,
  session,
}: {
  orgId: string
  teamId: string
  session?: ClientSession
}) {
  const org = await OrgModel.findOne({ _id: orgId, teamId }, undefined, { session }).lean()
  if (!org) {
    return Promise.reject(OrgErrEnum.orgNotExist)
  }
  const children = await getChildrenByOrg({ org, teamId, session })
  return { org, children }
}

// ============ 组织 CRUD ============

// 创建根组织
export async function createRootOrg({
  teamId,
  session,
}: {
  teamId: string
  session?: ClientSession
}) {
  await connectMongo()

  return OrgModel.create(
    [
      {
        teamId,
        name: 'ROOT',
        path: '',
      },
    ],
    { session, ordered: true }
  )
}

// 创建组织
export async function createOrg(
  teamId: string,
  data: { name: string; parentId?: string; avatar?: string; description?: string }
) {
  await connectMongo()

  let path = ''
  if (data.parentId) {
    const parent = await OrgModel.findOne({ _id: data.parentId, teamId }).lean()
    if (!parent) {
      throw new Error('父组织不存在')
    }
    path = getOrgChildrenPath(parent)
  }

  const org = await OrgModel.create({
    teamId,
    name: data.name,
    path,
    avatar: data.avatar || '',
    description: data.description || '',
  })

  return {
    ...org.toObject(),
    _id: org._id.toString(),
  }
}

// 更新组织
export async function updateOrg(
  orgId: string,
  teamId: string,
  data: { name?: string; avatar?: string; description?: string }
) {
  await connectMongo()

  const org = await OrgModel.findOneAndUpdate(
    { _id: orgId, teamId },
    { $set: data },
    { new: true }
  ).lean<OrgSchemaType>()

  if (!org) return null

  return {
    ...org,
    _id: org._id.toString(),
  }
}

// 删除组织（包括所有子组织和成员关系）
export async function deleteOrg(orgId: string, teamId: string) {
  await connectMongo()

  const org = await OrgModel.findOne({ _id: orgId, teamId }).lean()
  if (!org) return false

  // 获取所有子组织
  const children = await getChildrenByOrg({ org, teamId })
  const allOrgIds = [orgId, ...children.map((c) => c._id.toString())]

  // 删除组织及成员关系
  await Promise.all([
    OrgModel.deleteMany({ _id: { $in: allOrgIds }, teamId }),
    OrgMemberModel.deleteMany({ orgId: { $in: allOrgIds }, teamId }),
  ])

  return true
}

// 移动组织到新的父组织
export async function moveOrg(
  orgId: string,
  teamId: string,
  newParentId: string | null
) {
  await connectMongo()

  const org = await OrgModel.findOne({ _id: orgId, teamId }).lean()
  if (!org) {
    throw new Error('组织不存在')
  }

  let newPath = ''
  if (newParentId) {
    const newParent = await OrgModel.findOne({ _id: newParentId, teamId }).lean()
    if (!newParent) {
      throw new Error('目标父组织不存在')
    }
    // 防止移动到自己的子组织下
    if (newParent.path.startsWith(getOrgChildrenPath(org))) {
      throw new Error('不能移动到自己的子组织下')
    }
    newPath = getOrgChildrenPath(newParent)
  }

  const oldPath = getOrgChildrenPath(org)

  // 更新自身路径
  await OrgModel.updateOne({ _id: orgId }, { $set: { path: newPath } })

  // 更新所有子组织的路径
  const newChildPath = `${newPath}/${org.pathId}`
  const children = await OrgModel.find({ teamId, path: { $regex: `^${oldPath}` } }).lean()

  for (const child of children) {
    const updatedPath = child.path.replace(oldPath, newChildPath)
    await OrgModel.updateOne({ _id: child._id }, { $set: { path: updatedPath } })
  }

  return true
}

// ============ 组织成员管理 ============

// 获取组织成员列表
export async function getOrgMembers(
  orgId: string,
  teamId: string
): Promise<OrgMemberItemType[]> {
  await connectMongo()

  const members = await OrgMemberModel.find({ orgId, teamId }).lean()

  // 从 PostgreSQL 获取成员详情
  const tmbIds = members.map((m) => m.tmbId)
  const teamMembers = await prisma.teamMember.findMany({
    where: { id: { in: tmbIds } },
    include: { user: { select: { name: true, avatar: true } } },
  })

  const tmbMap = new Map(teamMembers.map((t) => [t.id, t]))

  return members.map((m) => {
    const tmb = tmbMap.get(m.tmbId)
    return {
      _id: m._id.toString(),
      teamId: m.teamId,
      orgId: m.orgId,
      tmbId: m.tmbId,
      memberName: tmb?.user.name || '未知用户',
      memberAvatar: tmb?.user.avatar || '',
    }
  })
}

// 批量添加组织成员
export async function addOrgMembers({
  teamId,
  orgId,
  tmbIds,
  session,
}: {
  teamId: string
  orgId: string
  tmbIds: string[]
  session?: ClientSession
}): Promise<number> {
  if (!tmbIds.length) return 0

  await connectMongo()

  // 过滤已存在的成员
  const existingMembers = await OrgMemberModel.find({
    orgId,
    tmbId: { $in: tmbIds },
  }).lean()
  const existingTmbIds = new Set(existingMembers.map((m) => String(m.tmbId)))

  const newTmbIds = tmbIds.filter((id) => !existingTmbIds.has(id))
  if (!newTmbIds.length) return 0

  const newMembers = newTmbIds.map((tmbId) => ({
    teamId,
    orgId,
    tmbId,
  }))

  await OrgMemberModel.insertMany(newMembers, { session })
  return newTmbIds.length
}

// 添加单个组织成员
export async function addOrgMember(orgId: string, teamId: string, tmbId: string) {
  await connectMongo()

  // 检查成员是否存在于团队中
  const teamMember = await prisma.teamMember.findFirst({
    where: { id: tmbId, teamId },
  })

  if (!teamMember) {
    throw new Error('成员不存在于该团队')
  }

  const member = await OrgMemberModel.findOneAndUpdate(
    { orgId, tmbId },
    { $setOnInsert: { teamId } },
    { upsert: true, new: true }
  ).lean()

  return member
}

// 移除组织成员
export async function removeOrgMember(orgId: string, tmbId: string) {
  await connectMongo()

  const result = await OrgMemberModel.deleteOne({ orgId, tmbId })
  return result.deletedCount > 0
}

// 批量移除组织成员
export async function removeOrgMembers({
  orgId,
  tmbIds,
  session,
}: {
  orgId: string
  tmbIds: string[]
  session?: ClientSession
}): Promise<number> {
  if (!tmbIds.length) return 0

  await connectMongo()

  const result = await OrgMemberModel.deleteMany(
    { orgId, tmbId: { $in: tmbIds } },
    { session }
  )
  return result.deletedCount
}
