/**
 * 权限常量定义
 * 复制自: dev-admin/src/packages/global/support/permission/constant.ts
 */

// 权限位定义
export const PermissionBits = {
  read: 0b100, // 4 - 读取
  write: 0b010, // 2 - 写入
  manage: 0b001, // 1 - 管理
} as const

// 特殊权限值
export const NullPermission = 0
export const OwnerPermission = ~0 >>> 0 // 4294967295 (全1)

// 预设角色权限
export const RolePermissions = {
  viewer: 0b100, // 4 - 只读
  editor: 0b110, // 6 - 读写
  manager: 0b111, // 7 - 全部
} as const

// 角色名称映射
export const RoleNames: Record<number, string> = {
  [RolePermissions.viewer]: '查看者',
  [RolePermissions.editor]: '编辑者',
  [RolePermissions.manager]: '管理者',
}

// 资源类型
export const ResourceTypes = {
  app: 'app',
  dataset: 'dataset',
  model: 'model',
} as const

export type ResourceType = (typeof ResourceTypes)[keyof typeof ResourceTypes]
export type PermissionValue = number
export type RoleKey = keyof typeof RolePermissions
