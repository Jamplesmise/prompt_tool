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
      ]),
    },
  },
}))

import { setupTestDB, cleanupTestDB, closeTestDB } from '../utils/mongodb'
import { generateTestTeamId } from '../utils/fixtures'
import * as memberGroupService from '@/services/memberGroup'

describe('MemberGroup Service', () => {
  // 每个 describe 块使用唯一的 teamId
  const testTeamId = generateTestTeamId('membergroup')

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

  describe('分组 CRUD', () => {
    test('创建分组', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '测试分组' })
      expect(group.name).toBe('测试分组')
      expect(group.teamId).toBe(testTeamId)
      expect(group._id).toBeDefined()
    })

    test('创建带头像的分组', async () => {
      const group = await memberGroupService.createGroup(testTeamId, {
        name: '测试分组',
        avatar: 'https://example.com/avatar.png',
      })
      expect(group.avatar).toBe('https://example.com/avatar.png')
    })

    test('获取分组列表', async () => {
      await memberGroupService.createGroup(testTeamId, { name: '分组1' })
      await memberGroupService.createGroup(testTeamId, { name: '分组2' })

      const groups = await memberGroupService.getGroups(testTeamId)
      expect(groups.length).toBe(2)
      expect(groups[0].memberCount).toBeDefined()
    })

    test('获取分组详情', async () => {
      const created = await memberGroupService.createGroup(testTeamId, { name: '测试分组' })
      const group = await memberGroupService.getGroupById(created._id, testTeamId)

      expect(group).not.toBeNull()
      expect(group?.name).toBe('测试分组')
      expect(group?.members).toBeDefined()
    })

    test('更新分组', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '原名称' })
      const updated = await memberGroupService.updateGroup(group._id, testTeamId, { name: '新名称' })
      expect(updated?.name).toBe('新名称')
    })

    test('更新不存在的分组返回 null', async () => {
      const updated = await memberGroupService.updateGroup(
        '507f1f77bcf86cd799439011',
        testTeamId,
        { name: '新名称' }
      )
      expect(updated).toBeNull()
    })

    test('删除分组', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '待删除' })
      const deleted = await memberGroupService.deleteGroup(group._id, testTeamId)
      expect(deleted).toBe(true)

      const groups = await memberGroupService.getGroups(testTeamId)
      expect(groups.length).toBe(0)
    })

    test('删除不存在的分组返回 false', async () => {
      const deleted = await memberGroupService.deleteGroup('507f1f77bcf86cd799439011', testTeamId)
      expect(deleted).toBe(false)
    })
  })

  describe('分组成员管理', () => {
    test('批量添加成员', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '测试分组' })
      const added = await memberGroupService.addGroupMembers({
        teamId: testTeamId,
        groupId: group._id,
        tmbIds: ['tmb-001', 'tmb-002'],
      })
      expect(added).toBe(2)
    })

    test('重复添加成员不重复', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '测试分组' })
      await memberGroupService.addGroupMembers({
        teamId: testTeamId,
        groupId: group._id,
        tmbIds: ['tmb-001'],
      })

      const added = await memberGroupService.addGroupMembers({
        teamId: testTeamId,
        groupId: group._id,
        tmbIds: ['tmb-001', 'tmb-002'],
      })
      expect(added).toBe(1) // 只添加了 tmb-002
    })

    test('获取分组成员列表', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '测试分组' })
      await memberGroupService.addGroupMembers({
        teamId: testTeamId,
        groupId: group._id,
        tmbIds: ['tmb-001', 'tmb-002'],
      })

      const members = await memberGroupService.getGroupMembers(group._id, testTeamId)
      expect(members.length).toBe(2)
    })

    test('移除成员', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '测试分组' })
      await memberGroupService.addGroupMembers({
        teamId: testTeamId,
        groupId: group._id,
        tmbIds: ['tmb-001', 'tmb-002'],
      })

      const removed = await memberGroupService.removeGroupMembers({
        groupId: group._id,
        tmbIds: ['tmb-001'],
      })
      expect(removed).toBe(1)

      const count = await memberGroupService.getGroupMemberCount({ groupId: group._id })
      expect(count).toBe(1)
    })

    test('获取用户所在分组', async () => {
      const group1 = await memberGroupService.createGroup(testTeamId, { name: '分组1' })
      const group2 = await memberGroupService.createGroup(testTeamId, { name: '分组2' })

      await memberGroupService.addGroupMembers({
        teamId: testTeamId,
        groupId: group1._id,
        tmbIds: ['tmb-001'],
      })
      await memberGroupService.addGroupMembers({
        teamId: testTeamId,
        groupId: group2._id,
        tmbIds: ['tmb-001'],
      })

      const groupIds = await memberGroupService.getGroupIdsByTmbId({
        teamId: testTeamId,
        tmbId: 'tmb-001',
      })
      expect(groupIds.length).toBe(2)
    })
  })

  describe('删除级联', () => {
    test('删除分组同时删除成员关系', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '测试分组' })
      await memberGroupService.addGroupMembers({
        teamId: testTeamId,
        groupId: group._id,
        tmbIds: ['tmb-001', 'tmb-002'],
      })

      await memberGroupService.deleteGroup(group._id, testTeamId)

      const count = await memberGroupService.getGroupMemberCount({ groupId: group._id })
      expect(count).toBe(0)
    })
  })
})
