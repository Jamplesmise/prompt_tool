/**
 * Permission 权限控制类
 * 复制自: dev-admin/src/packages/global/support/permission/controller.ts
 */
import { PermissionBits, NullPermission, OwnerPermission, RoleNames } from './constant'

export type PermissionJSON = {
  value: number
  isOwner: boolean
  canRead: boolean
  canWrite: boolean
  canManage: boolean
  roleName: string
}

export class Permission {
  private value: number

  constructor(value: number = NullPermission) {
    this.value = value
  }

  // ============ Getters ============

  get rawValue(): number {
    return this.value
  }

  get isOwner(): boolean {
    return this.value === OwnerPermission
  }

  get canRead(): boolean {
    return this.isOwner || (this.value & PermissionBits.read) !== 0
  }

  get canWrite(): boolean {
    return this.isOwner || (this.value & PermissionBits.write) !== 0
  }

  get canManage(): boolean {
    return this.isOwner || (this.value & PermissionBits.manage) !== 0
  }

  get roleName(): string {
    if (this.isOwner) return '所有者'
    return RoleNames[this.value] || '自定义'
  }

  // ============ 权限操作 ============

  /**
   * 添加权限
   */
  add(...perms: number[]): this {
    if (this.isOwner) return this
    for (const perm of perms) {
      this.value |= perm
    }
    return this
  }

  /**
   * 移除权限
   */
  remove(...perms: number[]): this {
    if (this.isOwner) return this
    for (const perm of perms) {
      this.value &= ~perm
    }
    return this
  }

  /**
   * 检查是否拥有指定权限
   */
  check(perm: number): boolean {
    if (perm === OwnerPermission) {
      return this.isOwner
    }
    return (this.value & perm) === perm
  }

  /**
   * 合并另一个权限（取并集）
   */
  merge(other: Permission | number): this {
    if (this.isOwner) return this
    const otherValue = other instanceof Permission ? other.rawValue : other
    this.value |= otherValue
    return this
  }

  // ============ 序列化 ============

  toJSON(): PermissionJSON {
    return {
      value: this.value,
      isOwner: this.isOwner,
      canRead: this.canRead,
      canWrite: this.canWrite,
      canManage: this.canManage,
      roleName: this.roleName,
    }
  }

  // ============ 静态方法 ============

  static fromValue(value: number): Permission {
    return new Permission(value)
  }

  static owner(): Permission {
    return new Permission(OwnerPermission)
  }

  static viewer(): Permission {
    return new Permission(PermissionBits.read)
  }

  static editor(): Permission {
    return new Permission(PermissionBits.read | PermissionBits.write)
  }

  static manager(): Permission {
    return new Permission(PermissionBits.read | PermissionBits.write | PermissionBits.manage)
  }
}
