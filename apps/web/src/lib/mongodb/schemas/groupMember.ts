/**
 * 分组成员关系 Schema
 * 复制自: dev-admin/src/packages/service/support_permission/memberGroup/groupMemberSchema.ts
 */
import { Schema, model, models } from 'mongoose'

// 分组成员角色 - 同步自官方 FastGPT
export enum GroupMemberRole {
  owner = 'owner',
  admin = 'admin',
  member = 'member',
}

// 分组成员关系 Schema 类型
export type GroupMemberSchemaType = {
  _id: string
  teamId: string
  groupId: string
  tmbId: string
  role: `${GroupMemberRole}`
  createTime: Date
}

// 分组成员项类型
export type GroupMemberItemType = {
  tmbId: string
  name: string
  avatar: string
  role: `${GroupMemberRole}`
}

const GroupMemberSchema = new Schema(
  {
    teamId: {
      type: String,
      required: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'MemberGroup',
      required: true,
    },
    tmbId: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(GroupMemberRole),
      default: GroupMemberRole.member,
    },
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: false,
    },
  }
)

// 虚拟字段：关联分组
GroupMemberSchema.virtual('group', {
  ref: 'MemberGroup',
  localField: 'groupId',
  foreignField: '_id',
  justOne: true,
})

// 索引
try {
  // 唯一约束：同一成员不能重复加入同一分组
  GroupMemberSchema.index({ groupId: 1, tmbId: 1 }, { unique: true })
  // 查询索引
  GroupMemberSchema.index({ teamId: 1, groupId: 1 })
  GroupMemberSchema.index({ teamId: 1, tmbId: 1 })
} catch (error) {
  console.log(error)
}

export const GroupMemberModel =
  models.GroupMember || model<GroupMemberSchemaType>('GroupMember', GroupMemberSchema, 'group_members')
