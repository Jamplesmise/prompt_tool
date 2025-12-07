/**
 * 成员分组服务
 * 复制自: dev-admin/src/packages/service/support_permission/memberGroup/controller.ts
 */
import type { ClientSession } from 'mongoose'
import { connectMongo } from '@/lib/mongodb'
import {
  MemberGroupModel,
  GroupMemberModel,
  GroupMemberRole,
  type MemberGroupSchemaType,
  type MemberGroupListItemType,
  type GroupMemberItemType,
} from '@/lib/mongodb/schemas'
import { prisma } from '@/lib/prisma'

// ============ 分组查询 ============

// 获取分组列表（含成员数量）
export async function getGroups(teamId: string): Promise<MemberGroupListItemType[]> {
  await connectMongo()

  const groups = await MemberGroupModel.find({ teamId })
    .sort({ createTime: -1 })
    .lean<MemberGroupSchemaType[]>()

  // 统计每个分组的成员数
  const groupIds = groups.map((g) => g._id)
  const memberCounts = await GroupMemberModel.aggregate([
    { $match: { groupId: { $in: groupIds } } },
    { $group: { _id: '$groupId', count: { $sum: 1 } } },
  ])

  const countMap = new Map(memberCounts.map((m) => [m._id.toString(), m.count]))

  return groups.map((g) => ({
    ...g,
    _id: g._id.toString(),
    memberCount: countMap.get(g._id.toString()) || 0,
  }))
}

// 获取分组详情（含成员列表）
export async function getGroupById(groupId: string, teamId: string) {
  await connectMongo()

  const group = await MemberGroupModel.findOne({
    _id: groupId,
    teamId,
  }).lean<MemberGroupSchemaType>()

  if (!group) return null

  const members = await getGroupMembers(groupId, teamId)

  return {
    ...group,
    _id: group._id.toString(),
    members,
  }
}

// ============ 分组 CRUD ============

export async function createGroup(teamId: string, data: { name: string; avatar?: string }) {
  await connectMongo()

  const group = await MemberGroupModel.create({
    teamId,
    name: data.name,
    avatar: data.avatar || '',
  })

  return {
    ...group.toObject(),
    _id: group._id.toString(),
  }
}

export async function updateGroup(
  groupId: string,
  teamId: string,
  data: { name?: string; avatar?: string }
) {
  await connectMongo()

  const group = await MemberGroupModel.findOneAndUpdate(
    { _id: groupId, teamId },
    { $set: data },
    { new: true }
  ).lean<MemberGroupSchemaType>()

  if (!group) return null

  return {
    ...group,
    _id: group._id.toString(),
  }
}

export async function deleteGroup(groupId: string, teamId: string) {
  await connectMongo()

  const result = await MemberGroupModel.deleteOne({ _id: groupId, teamId })

  if (result.deletedCount > 0) {
    await GroupMemberModel.deleteMany({ groupId })
  }

  return result.deletedCount > 0
}

// 删除分组及其所有成员关系（带事务支持）
export async function deleteGroupWithMembers({
  groupId,
  teamId,
  session,
}: {
  groupId: string
  teamId: string
  session?: ClientSession
}): Promise<void> {
  await connectMongo()

  await Promise.all([
    MemberGroupModel.deleteOne({ _id: groupId, teamId }, { session }),
    GroupMemberModel.deleteMany({ groupId, teamId }, { session }),
  ])
}

// ============ 分组成员管理 ============

// 获取分组成员列表
export async function getGroupMembers(
  groupId: string,
  teamId: string
): Promise<GroupMemberItemType[]> {
  await connectMongo()

  const members = await GroupMemberModel.find({ groupId, teamId }).lean()

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
      tmbId: m.tmbId,
      name: tmb?.user.name || '未知用户',
      avatar: tmb?.user.avatar || '',
      role: m.role,
    }
  })
}

// 获取用户所在的所有分组 ID
export async function getGroupIdsByTmbId({
  teamId,
  tmbId,
}: {
  teamId: string
  tmbId: string
}): Promise<string[]> {
  await connectMongo()

  const groupMembers = await GroupMemberModel.find({ teamId, tmbId }, 'groupId').lean()
  return groupMembers.map((item) => String(item.groupId))
}

// 获取分组成员数量
export async function getGroupMemberCount({ groupId }: { groupId: string }): Promise<number> {
  await connectMongo()
  return GroupMemberModel.countDocuments({ groupId })
}

// 批量添加分组成员
export async function addGroupMembers({
  teamId,
  groupId,
  tmbIds,
  role = GroupMemberRole.member,
  session,
}: {
  teamId: string
  groupId: string
  tmbIds: string[]
  role?: `${GroupMemberRole}`
  session?: ClientSession
}): Promise<number> {
  if (!tmbIds.length) return 0

  await connectMongo()

  // 过滤已存在的成员
  const existingMembers = await GroupMemberModel.find({
    groupId,
    tmbId: { $in: tmbIds },
  }).lean()
  const existingTmbIds = new Set(existingMembers.map((m) => String(m.tmbId)))

  const newTmbIds = tmbIds.filter((id) => !existingTmbIds.has(id))
  if (!newTmbIds.length) return 0

  const newMembers = newTmbIds.map((tmbId) => ({
    teamId,
    groupId,
    tmbId,
    role,
  }))

  await GroupMemberModel.insertMany(newMembers, { session })
  return newTmbIds.length
}

// 添加单个分组成员
export async function addGroupMember(
  groupId: string,
  teamId: string,
  tmbId: string,
  role: `${GroupMemberRole}` = GroupMemberRole.member
) {
  await connectMongo()

  // 检查成员是否存在于团队中
  const teamMember = await prisma.teamMember.findFirst({
    where: { id: tmbId, teamId },
  })

  if (!teamMember) {
    throw new Error('成员不存在于该团队')
  }

  const member = await GroupMemberModel.findOneAndUpdate(
    { groupId, tmbId },
    { $setOnInsert: { teamId, role, createTime: new Date() } },
    { upsert: true, new: true }
  ).lean()

  return member
}

// 移除分组成员
export async function removeGroupMembers({
  groupId,
  tmbIds,
  session,
}: {
  groupId: string
  tmbIds: string[]
  session?: ClientSession
}): Promise<number> {
  if (!tmbIds.length) return 0

  await connectMongo()

  const result = await GroupMemberModel.deleteMany(
    { groupId, tmbId: { $in: tmbIds } },
    { session }
  )
  return result.deletedCount
}

// 移除单个分组成员
export async function removeGroupMember(groupId: string, tmbId: string) {
  await connectMongo()

  const result = await GroupMemberModel.deleteOne({ groupId, tmbId })
  return result.deletedCount > 0
}

// 更新成员角色
export async function updateGroupMemberRole(
  groupId: string,
  tmbId: string,
  role: `${GroupMemberRole}`
) {
  await connectMongo()

  const member = await GroupMemberModel.findOneAndUpdate(
    { groupId, tmbId },
    { $set: { role } },
    { new: true }
  ).lean()

  return member
}

// ============ 权限检查 ============

// 检查用户是否是分组管理员
export async function isGroupOwner({
  groupId,
  tmbId,
}: {
  groupId: string
  tmbId: string
}): Promise<boolean> {
  await connectMongo()

  const member = await GroupMemberModel.findOne({
    groupId,
    tmbId,
    role: GroupMemberRole.owner,
  }).lean()

  return !!member
}
