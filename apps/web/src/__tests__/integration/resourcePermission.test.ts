import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'

// Mock prisma - must be before imports that use it
vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'tmb-001',
        teamId: 'test-team-001',
        user: { name: '测试用户', avatar: '' },
      }),
      findMany: vi.fn().mockResolvedValue([
        { id: 'tmb-001', user: { name: '管理员', avatar: '' } },
        { id: 'tmb-002', user: { name: '开发者', avatar: '' } },
        { id: 'tmb-003', user: { name: '查看者', avatar: '' } },
      ]),
    },
  },
}))

import { setupTestDB, cleanupTestDB, closeTestDB } from '../utils/mongodb'
import { generateTestTeamId, testMembers, testApps } from '../utils/fixtures'
import * as permissionService from '@/services/resourcePermission'
import * as memberGroupService from '@/services/memberGroup'
import { PermissionBits } from '@/lib/permission'

describe('ResourcePermission Service', () => {
  // 每个 describe 块使用唯一的 teamId
  const testTeamId = generateTestTeamId('permission')

  beforeAll(async () => {
    await setupTestDB()
  })

  afterAll(async () => {
    await cleanupTestDB(testTeamId)
    await closeTestDB()
  })

  beforeEach(async () => {
    await cleanupTestDB(testTeamId)
  })

  describe('协作者管理', () => {
    test('添加个人协作者', async () => {
      await permissionService.updateResourceCollaborators('app', testApps[0].id, testTeamId, [
        { tmbId: testMembers[1].id, permission: PermissionBits.read | PermissionBits.write },
      ])

      const clbs = await permissionService.getResourceCollaborators(
        'app',
        testApps[0].id,
        testTeamId
      )
      expect(clbs.length).toBe(1)
      expect(clbs[0].tmbId).toBe(testMembers[1].id)
    })

    // 跳过：需要先清理数据库旧索引
    test.skip('添加多个协作者', async () => {
      const resourceId = `app-multi-${Date.now()}`
      await permissionService.updateResourceCollaborators('app', resourceId, testTeamId, [
        { tmbId: 'tmb-001', permission: 6 },
        { tmbId: 'tmb-002', permission: 4 },
      ])

      const clbs = await permissionService.getResourceCollaborators(
        'app',
        resourceId,
        testTeamId
      )
      expect(clbs.length).toBe(2)
    })

    test('更新协作者权限', async () => {
      await permissionService.updateResourceCollaborators('app', testApps[0].id, testTeamId, [
        { tmbId: 'tmb-001', permission: 4 },
      ])

      await permissionService.updateResourceCollaborators('app', testApps[0].id, testTeamId, [
        { tmbId: 'tmb-001', permission: 7 },
      ])

      const clbs = await permissionService.getResourceCollaborators(
        'app',
        testApps[0].id,
        testTeamId
      )
      expect(clbs.length).toBe(1)
      expect(clbs[0].permission.value).toBe(7)
    })

    test('删除协作者', async () => {
      await permissionService.updateResourceCollaborators('app', testApps[0].id, testTeamId, [
        { tmbId: 'tmb-001', permission: 6 },
      ])

      const deleted = await permissionService.deleteResourceCollaborator(
        'app',
        testApps[0].id,
        { tmbId: 'tmb-001' }
      )
      expect(deleted).toBe(true)

      const clbs = await permissionService.getResourceCollaborators(
        'app',
        testApps[0].id,
        testTeamId
      )
      expect(clbs.length).toBe(0)
    })

    test('删除不存在的协作者', async () => {
      const deleted = await permissionService.deleteResourceCollaborator(
        'app',
        testApps[0].id,
        { tmbId: 'non-existent' }
      )
      expect(deleted).toBe(false)
    })
  })

  describe('分组协作者', () => {
    test('添加分组协作者', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '开发组' })

      await permissionService.updateResourceCollaborators('app', testApps[0].id, testTeamId, [
        { groupId: group._id, permission: 4 },
      ])

      const clbs = await permissionService.getResourceCollaborators(
        'app',
        testApps[0].id,
        testTeamId
      )
      expect(clbs.length).toBe(1)
      expect(clbs[0].groupId).toBe(group._id)
    })
  })

  describe('权限计算', () => {
    test('获取用户直接权限', async () => {
      await permissionService.updateResourceCollaborators('app', testApps[0].id, testTeamId, [
        { tmbId: 'tmb-001', permission: 6 },
      ])

      const perm = await permissionService.getUserResourcePermission(
        'app',
        testApps[0].id,
        'tmb-001',
        testTeamId
      )
      expect(perm.rawValue).toBe(6)
      expect(perm.canRead).toBe(true)
      expect(perm.canWrite).toBe(true)
    })

    // 跳过：需要先清理数据库旧索引
    test.skip('权限合并 - 直接权限 + 分组权限', async () => {
      const resourceId = `app-merge-${Date.now()}`

      // 创建分组并添加成员
      const group = await memberGroupService.createGroup(testTeamId, { name: '开发组合并测试' })
      await memberGroupService.addGroupMembers({
        teamId: testTeamId,
        groupId: group._id,
        tmbIds: ['tmb-001'],
      })

      // 添加直接权限 (read only)
      await permissionService.updateResourceCollaborators('app', resourceId, testTeamId, [
        { tmbId: 'tmb-001', permission: 4 },
      ])

      // 添加分组权限 (write only)
      await permissionService.updateResourceCollaborators('app', resourceId, testTeamId, [
        { groupId: group._id, permission: 2 },
      ])

      const perm = await permissionService.getUserResourcePermission(
        'app',
        resourceId,
        'tmb-001',
        testTeamId
      )

      // 合并后应该是 read + write = 6
      expect(perm.rawValue).toBe(6)
      expect(perm.canRead).toBe(true)
      expect(perm.canWrite).toBe(true)
    })

    test('无权限用户返回空权限', async () => {
      const perm = await permissionService.getUserResourcePermission(
        'app',
        testApps[0].id,
        'tmb-999',
        testTeamId
      )
      expect(perm.rawValue).toBe(0)
      expect(perm.canRead).toBe(false)
      expect(perm.canWrite).toBe(false)
    })
  })

  describe('删除资源权限', () => {
    // 跳过：需要先清理数据库旧索引
    test.skip('删除资源所有权限', async () => {
      const resourceId = `app-delete-${Date.now()}`
      await permissionService.updateResourceCollaborators('app', resourceId, testTeamId, [
        { tmbId: 'tmb-001', permission: 6 },
        { tmbId: 'tmb-002', permission: 4 },
      ])

      await permissionService.deleteAllResourcePermissions('app', resourceId)

      const clbs = await permissionService.getResourceCollaborators(
        'app',
        resourceId,
        testTeamId
      )
      expect(clbs.length).toBe(0)
    })
  })

  describe('权限检查', () => {
    test('检查用户是否有指定权限', async () => {
      await permissionService.updateResourceCollaborators('app', testApps[0].id, testTeamId, [
        { tmbId: 'tmb-001', permission: 6 },
      ])

      const hasRead = await permissionService.checkResourcePermission(
        'app',
        testApps[0].id,
        'tmb-001',
        testTeamId,
        PermissionBits.read
      )
      expect(hasRead).toBe(true)

      const hasManage = await permissionService.checkResourcePermission(
        'app',
        testApps[0].id,
        'tmb-001',
        testTeamId,
        PermissionBits.manage
      )
      expect(hasManage).toBe(false)
    })
  })
})
