/**
 * 成员分组 Schema
 * 复制自: dev-admin/src/packages/service/support_permission/memberGroup/memberGroupSchema.ts
 */
import { Schema, model, models } from 'mongoose'

// 成员分组 Schema 类型
export type MemberGroupSchemaType = {
  _id: string
  teamId: string
  name: string
  avatar?: string
  createTime: Date
  updateTime: Date
}

// 分组列表项类型（含成员数量）
export type MemberGroupListItemType = MemberGroupSchemaType & {
  memberCount: number
}

const MemberGroupSchema = new Schema(
  {
    teamId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 50,
    },
    avatar: {
      type: String,
    },
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: 'updateTime',
    },
  }
)

// 虚拟字段：关联成员
MemberGroupSchema.virtual('members', {
  ref: 'GroupMember',
  localField: '_id',
  foreignField: 'groupId',
})

// 索引
try {
  MemberGroupSchema.index({ teamId: 1 })
  MemberGroupSchema.index({ teamId: 1, name: 1 })
  MemberGroupSchema.index({ teamId: 1, createTime: -1 })
} catch (error) {
  console.log(error)
}

export const MemberGroupModel =
  models.MemberGroup || model<MemberGroupSchemaType>('MemberGroup', MemberGroupSchema, 'member_groups')
