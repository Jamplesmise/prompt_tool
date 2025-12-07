import { describe, test, expect } from 'vitest'
import { Permission, PermissionBits, OwnerPermission } from '@/lib/permission'

describe('Permission', () => {
  describe('基础权限', () => {
    test('空权限', () => {
      const perm = new Permission(0)
      expect(perm.canRead).toBe(false)
      expect(perm.canWrite).toBe(false)
      expect(perm.canManage).toBe(false)
      expect(perm.isOwner).toBe(false)
    })

    test('只读权限', () => {
      const perm = new Permission(PermissionBits.read)
      expect(perm.canRead).toBe(true)
      expect(perm.canWrite).toBe(false)
      expect(perm.canManage).toBe(false)
    })

    test('读写权限', () => {
      const perm = new Permission(PermissionBits.read | PermissionBits.write)
      expect(perm.canRead).toBe(true)
      expect(perm.canWrite).toBe(true)
      expect(perm.canManage).toBe(false)
    })

    test('全部权限', () => {
      const perm = new Permission(0b111)
      expect(perm.canRead).toBe(true)
      expect(perm.canWrite).toBe(true)
      expect(perm.canManage).toBe(true)
    })

    test('Owner 权限', () => {
      const perm = Permission.owner()
      expect(perm.isOwner).toBe(true)
      expect(perm.canRead).toBe(true)
      expect(perm.canWrite).toBe(true)
      expect(perm.canManage).toBe(true)
    })
  })

  describe('权限操作', () => {
    test('添加权限', () => {
      const perm = new Permission(PermissionBits.read)
      perm.add(PermissionBits.write)
      expect(perm.rawValue).toBe(0b110)
    })

    test('移除权限', () => {
      const perm = new Permission(0b110)
      perm.remove(PermissionBits.write)
      expect(perm.rawValue).toBe(0b100)
    })

    test('合并权限', () => {
      const perm1 = new Permission(0b100)
      const perm2 = new Permission(0b010)
      perm1.merge(perm2)
      expect(perm1.rawValue).toBe(0b110)
    })

    test('合并数字权限', () => {
      const perm = new Permission(0b100)
      perm.merge(0b010)
      expect(perm.rawValue).toBe(0b110)
    })

    test('Owner 权限不可修改', () => {
      const perm = Permission.owner()
      perm.add(0b100)
      perm.remove(0b100)
      expect(perm.isOwner).toBe(true)
      expect(perm.rawValue).toBe(OwnerPermission)
    })

    test('检查权限', () => {
      const perm = new Permission(0b110)
      expect(perm.check(PermissionBits.read)).toBe(true)
      expect(perm.check(PermissionBits.write)).toBe(true)
      expect(perm.check(PermissionBits.manage)).toBe(false)
    })
  })

  describe('静态工厂方法', () => {
    test('viewer', () => {
      const perm = Permission.viewer()
      expect(perm.canRead).toBe(true)
      expect(perm.canWrite).toBe(false)
      expect(perm.rawValue).toBe(0b100)
    })

    test('editor', () => {
      const perm = Permission.editor()
      expect(perm.canRead).toBe(true)
      expect(perm.canWrite).toBe(true)
      expect(perm.canManage).toBe(false)
      expect(perm.rawValue).toBe(0b110)
    })

    test('manager', () => {
      const perm = Permission.manager()
      expect(perm.canRead).toBe(true)
      expect(perm.canWrite).toBe(true)
      expect(perm.canManage).toBe(true)
      expect(perm.rawValue).toBe(0b111)
    })

    test('fromValue', () => {
      const perm = Permission.fromValue(0b101)
      expect(perm.canRead).toBe(true)
      expect(perm.canWrite).toBe(false)
      expect(perm.canManage).toBe(true)
    })
  })

  describe('序列化', () => {
    test('toJSON', () => {
      const perm = new Permission(0b110)
      const json = perm.toJSON()
      expect(json.value).toBe(6)
      expect(json.canRead).toBe(true)
      expect(json.canWrite).toBe(true)
      expect(json.canManage).toBe(false)
      expect(json.isOwner).toBe(false)
    })

    test('owner toJSON', () => {
      const perm = Permission.owner()
      const json = perm.toJSON()
      expect(json.isOwner).toBe(true)
      expect(json.roleName).toBe('所有者')
    })
  })

  describe('roleName', () => {
    test('查看者角色名', () => {
      const perm = Permission.viewer()
      expect(perm.roleName).toBe('查看者')
    })

    test('编辑者角色名', () => {
      const perm = Permission.editor()
      expect(perm.roleName).toBe('编辑者')
    })

    test('管理者角色名', () => {
      const perm = Permission.manager()
      expect(perm.roleName).toBe('管理者')
    })

    test('自定义角色名', () => {
      const perm = new Permission(0b101)
      expect(perm.roleName).toBe('自定义')
    })
  })
})
