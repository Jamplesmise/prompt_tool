/**
 * 资源协作者权限 Schema
 */
import { Schema, model, models } from 'mongoose'
import { ResourceTypes } from '@/lib/permission'

// 资源权限 Schema 类型
export type ResourcePermissionSchemaType = {
  _id: string
  teamId: string
  resourceType: string
  resourceId: string
  tmbId?: string
  groupId?: string
  orgId?: string
  permission: number
  createTime: Date
  updateTime: Date
}

// 协作者详情类型
export type CollaboratorDetailType = {
  tmbId?: string
  groupId?: string
  orgId?: string
  name: string
  avatar: string
  permission: {
    value: number
    isOwner: boolean
    canRead: boolean
    canWrite: boolean
    canManage: boolean
    roleName: string
  }
}

const ResourcePermissionSchema = new Schema(
  {
    teamId: {
      type: String,
      required: true,
    },
    resourceType: {
      type: String,
      required: true,
      enum: Object.values(ResourceTypes),
    },
    resourceId: {
      type: String,
      required: true,
    },
    // 协作者（三选一）
    tmbId: {
      type: String,
      sparse: true,
    },
    groupId: {
      type: String,
      sparse: true,
    },
    orgId: {
      type: String,
      sparse: true,
    },
    // 权限值
    permission: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: 'createTime',
      updatedAt: 'updateTime',
    },
  }
)

// 索引
try {
  ResourcePermissionSchema.index({ teamId: 1, resourceType: 1, resourceId: 1 })
  // 使用 partialFilterExpression 替代 sparse，避免 null 值冲突
  ResourcePermissionSchema.index(
    { resourceType: 1, resourceId: 1, tmbId: 1 },
    { unique: true, partialFilterExpression: { tmbId: { $exists: true, $ne: null } } }
  )
  ResourcePermissionSchema.index(
    { resourceType: 1, resourceId: 1, groupId: 1 },
    { unique: true, partialFilterExpression: { groupId: { $exists: true, $ne: null } } }
  )
  ResourcePermissionSchema.index(
    { resourceType: 1, resourceId: 1, orgId: 1 },
    { unique: true, partialFilterExpression: { orgId: { $exists: true, $ne: null } } }
  )
} catch (error) {
  console.log(error)
}

export const ResourcePermissionModel =
  models.ResourcePermission ||
  model<ResourcePermissionSchemaType>('ResourcePermission', ResourcePermissionSchema, 'resource_permissions')
