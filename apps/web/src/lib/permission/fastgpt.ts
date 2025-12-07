/**
 * FastGPT 权限格式转换
 * 与 FastGPT 官方 API 保持兼容
 */
import { Permission } from './controller'

/**
 * FastGPT 权限格式
 * 使用 hasReadPer/hasWritePer/hasManagePer 命名（与 FastGPT 官方一致）
 */
export type FastGPTPermission = {
  value: number
  isOwner: boolean
  hasReadPer: boolean
  hasWritePer: boolean
  hasManagePer: boolean
}

/**
 * 将 Permission 对象转换为 FastGPT 格式
 */
export function toFastGPTPermission(permission: Permission): FastGPTPermission {
  return {
    value: permission.rawValue,
    isOwner: permission.isOwner,
    hasReadPer: permission.canRead,
    hasWritePer: permission.canWrite,
    hasManagePer: permission.canManage,
  }
}

/**
 * FastGPT 协作者项
 */
export type FastGPTCollaboratorItem = {
  tmbId?: string
  groupId?: string
  orgId?: string
  name: string
  avatar: string
  permission: FastGPTPermission
}
