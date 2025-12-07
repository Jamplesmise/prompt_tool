/**
 * 组织成员 Schema
 * 复制自: dev-admin/src/packages/service/support_permission/org/orgMemberSchema.ts
 */
import { Schema, model, models } from 'mongoose'

// 组织成员 Schema 类型
export type OrgMemberSchemaType = {
  _id: string
  teamId: string
  orgId: string
  tmbId: string
}

// 组织成员列表项类型
export type OrgMemberItemType = OrgMemberSchemaType & {
  memberName?: string
  memberAvatar?: string
}

const OrgMemberSchema = new Schema({
  teamId: {
    type: String,
    required: true,
  },
  orgId: {
    type: String,
    required: true,
  },
  tmbId: {
    type: String,
    required: true,
  },
})

// 虚拟字段：关联组织
OrgMemberSchema.virtual('org', {
  ref: 'Org',
  localField: 'orgId',
  foreignField: '_id',
  justOne: true,
})

// 索引
try {
  OrgMemberSchema.index({ teamId: 1, orgId: 1, tmbId: 1 }, { unique: true })
  OrgMemberSchema.index({ teamId: 1, tmbId: 1 })
} catch (error) {
  console.log(error)
}

export const OrgMemberModel =
  models.OrgMember || model<OrgMemberSchemaType>('OrgMember', OrgMemberSchema, 'team_org_members')
