/**
 * 组织架构 Schema
 * 复制自: dev-admin/src/packages/service/support_permission/org/orgSchema.ts
 */
import { Schema, model, models } from 'mongoose'
import { customAlphabet } from 'nanoid'

// 生成 pathId 的函数（复制自 dev-admin）
const getNanoid = (size = 16) => {
  const firstChar = customAlphabet('abcdefghijklmnopqrstuvwxyz', 1)()
  if (size === 1) return firstChar
  const randomsStr = customAlphabet(
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890',
    size - 1
  )()
  return `${firstChar}${randomsStr}`
}

// 组织架构 Schema 类型
export type OrgSchemaType = {
  _id: string
  teamId: string
  pathId: string
  path: string
  name: string
  avatar?: string
  description?: string
  updateTime: Date
}

// 组织列表项类型
export type OrgListItemType = OrgSchemaType & {
  total: number // members + children orgs
}

// 获取子组织路径
export const getOrgChildrenPath = (org: OrgSchemaType) => {
  if (org.path === '' && org.pathId === '') return ''
  return `${org.path ?? ''}/${org.pathId}`
}

const OrgSchema = new Schema(
  {
    teamId: {
      type: String,
      required: true,
    },
    pathId: {
      type: String,
      required: true,
      default: () => getNanoid(),
    },
    path: {
      type: String,
      required: function (this: OrgSchemaType) {
        return typeof this.path !== 'string'
      }, // allow empty string, but not null
    },
    name: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
    },
    description: {
      type: String,
    },
    updateTime: {
      type: Date,
      default: () => new Date(),
    },
  },
  {
    timestamps: {
      updatedAt: 'updateTime',
    },
  }
)

// 虚拟字段：关联成员
OrgSchema.virtual('members', {
  ref: 'OrgMember',
  localField: '_id',
  foreignField: 'orgId',
})

// 索引
try {
  OrgSchema.index({ teamId: 1, path: 1 })
  OrgSchema.index({ teamId: 1, pathId: 1 }, { unique: true })
} catch (error) {
  console.log(error)
}

export const OrgModel = models.Org || model<OrgSchemaType>('Org', OrgSchema, 'team_orgs')
