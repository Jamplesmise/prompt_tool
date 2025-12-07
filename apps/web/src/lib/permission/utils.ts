/**
 * 权限工具函数
 * 复制自: dev-admin/src/packages/global/support/permission/utils.ts
 */
import { PermissionBits, RolePermissions, OwnerPermission } from './constant'

/**
 * 合并多个权限值
 */
export function mergePermissions(...values: number[]): number {
  if (values.length === 0) return 0
  const res = values.reduce((acc, val) => acc | val, 0)
  if (res < 0) {
    return OwnerPermission
  }
  return res
}

/**
 * 检查权限值是否包含指定权限（位运算）
 */
export function hasBitPermission(value: number, perm: number): boolean {
  if (perm === OwnerPermission) {
    return value === OwnerPermission
  }
  return (value & perm) === perm
}

/**
 * 根据权限值获取角色名称
 */
export function getRoleName(value: number): string {
  if (value === OwnerPermission) return '所有者'
  if (value === RolePermissions.viewer) return '查看者'
  if (value === RolePermissions.editor) return '编辑者'
  if (value === RolePermissions.manager) return '管理者'
  return '自定义'
}

/**
 * 将权限值转换为权限位数组
 */
export function permissionToBits(value: number): string[] {
  const bits: string[] = []
  if (value & PermissionBits.read) bits.push('read')
  if (value & PermissionBits.write) bits.push('write')
  if (value & PermissionBits.manage) bits.push('manage')
  return bits
}

/**
 * 将权限位数组转换为权限值
 */
export function bitsToPermission(bits: string[]): number {
  let value = 0
  if (bits.includes('read')) value |= PermissionBits.read
  if (bits.includes('write')) value |= PermissionBits.write
  if (bits.includes('manage')) value |= PermissionBits.manage
  return value
}

/**
 * 获取协作者 ID
 */
export function getCollaboratorId(clb: { tmbId?: string; groupId?: string; orgId?: string }): string {
  return (clb.tmbId || clb.groupId || clb.orgId)!
}
