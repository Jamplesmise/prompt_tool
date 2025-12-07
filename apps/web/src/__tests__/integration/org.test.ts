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
import * as orgService from '@/services/org'

describe('Org Service', () => {
  // 每个 describe 块使用唯一的 teamId
  const testTeamId = generateTestTeamId('org')

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

  describe('组织 CRUD', () => {
    test('创建根组织', async () => {
      const org = await orgService.createOrg(testTeamId, { name: '公司' })
      expect(org.name).toBe('公司')
      expect(org.teamId).toBe(testTeamId)
      expect(org.path).toBe('')
    })

    test('创建子组织', async () => {
      const parent = await orgService.createOrg(testTeamId, { name: '公司' })
      const child = await orgService.createOrg(testTeamId, {
        name: '研发部',
        parentId: parent._id,
      })

      expect(child.name).toBe('研发部')
      // path 包含父组织的 pathId
      expect(child.path).toContain(parent.pathId)
    })

    test('创建多级子组织', async () => {
      const company = await orgService.createOrg(testTeamId, { name: '公司' })
      const rd = await orgService.createOrg(testTeamId, {
        name: '研发部',
        parentId: company._id,
      })
      const frontend = await orgService.createOrg(testTeamId, {
        name: '前端组',
        parentId: rd._id,
      })

      // path 包含父组织的 pathId
      expect(frontend.path).toContain(rd.pathId)
    })

    test('创建子组织 - 父组织不存在', async () => {
      await expect(
        orgService.createOrg(testTeamId, {
          name: '研发部',
          parentId: '507f1f77bcf86cd799439011',
        })
      ).rejects.toThrow('父组织不存在')
    })

    test('获取组织列表', async () => {
      await orgService.createOrg(testTeamId, { name: '公司' })
      await orgService.createOrg(testTeamId, { name: '合作方' })

      const orgs = await orgService.getOrgs(testTeamId)
      expect(orgs.length).toBe(2)
    })

    test('获取组织详情', async () => {
      const created = await orgService.createOrg(testTeamId, { name: '公司' })
      const org = await orgService.getOrgById(created._id, testTeamId)

      expect(org).not.toBeNull()
      expect(org?.name).toBe('公司')
      expect(org?.members).toBeDefined()
      expect(org?.children).toBeDefined()
    })

    test('更新组织', async () => {
      const org = await orgService.createOrg(testTeamId, { name: '原名称' })
      const updated = await orgService.updateOrg(org._id, testTeamId, { name: '新名称' })
      expect(updated?.name).toBe('新名称')
    })

    test('删除组织', async () => {
      const org = await orgService.createOrg(testTeamId, { name: '待删除' })
      const deleted = await orgService.deleteOrg(org._id, testTeamId)
      expect(deleted).toBe(true)

      const orgs = await orgService.getOrgs(testTeamId)
      expect(orgs.length).toBe(0)
    })
  })

  describe('组织树结构', () => {
    test('删除组织同时删除子组织', async () => {
      const company = await orgService.createOrg(testTeamId, { name: '公司' })
      await orgService.createOrg(testTeamId, { name: '研发部', parentId: company._id })
      await orgService.createOrg(testTeamId, { name: '产品部', parentId: company._id })

      await orgService.deleteOrg(company._id, testTeamId)

      const orgs = await orgService.getOrgs(testTeamId)
      expect(orgs.length).toBe(0)
    })
  })

  describe('组织成员管理', () => {
    test('批量添加成员', async () => {
      const org = await orgService.createOrg(testTeamId, { name: '研发部' })
      const added = await orgService.addOrgMembers({
        teamId: testTeamId,
        orgId: org._id,
        tmbIds: ['tmb-001', 'tmb-002'],
      })
      expect(added).toBe(2)
    })

    test('重复添加成员不重复', async () => {
      const org = await orgService.createOrg(testTeamId, { name: '研发部' })
      await orgService.addOrgMembers({
        teamId: testTeamId,
        orgId: org._id,
        tmbIds: ['tmb-001'],
      })

      const added = await orgService.addOrgMembers({
        teamId: testTeamId,
        orgId: org._id,
        tmbIds: ['tmb-001', 'tmb-002'],
      })
      expect(added).toBe(1)
    })

    test('获取组织成员列表', async () => {
      const org = await orgService.createOrg(testTeamId, { name: '研发部' })
      await orgService.addOrgMembers({
        teamId: testTeamId,
        orgId: org._id,
        tmbIds: ['tmb-001', 'tmb-002'],
      })

      const members = await orgService.getOrgMembers(org._id, testTeamId)
      expect(members.length).toBe(2)
    })

    test('移除成员', async () => {
      const org = await orgService.createOrg(testTeamId, { name: '研发部' })
      await orgService.addOrgMembers({
        teamId: testTeamId,
        orgId: org._id,
        tmbIds: ['tmb-001', 'tmb-002'],
      })

      const removed = await orgService.removeOrgMember(org._id, 'tmb-001')
      expect(removed).toBe(true)

      const members = await orgService.getOrgMembers(org._id, testTeamId)
      expect(members.length).toBe(1)
    })

    test('获取用户所属组织', async () => {
      const org1 = await orgService.createOrg(testTeamId, { name: '研发部' })
      const org2 = await orgService.createOrg(testTeamId, { name: '产品部' })

      await orgService.addOrgMembers({
        teamId: testTeamId,
        orgId: org1._id,
        tmbIds: ['tmb-001'],
      })
      await orgService.addOrgMembers({
        teamId: testTeamId,
        orgId: org2._id,
        tmbIds: ['tmb-001'],
      })

      const orgs = await orgService.getOrgsByTmbId({
        teamId: testTeamId,
        tmbId: 'tmb-001',
      })
      expect(orgs.length).toBe(2)
    })
  })

  describe('删除级联', () => {
    test('删除组织同时删除成员关系', async () => {
      const org = await orgService.createOrg(testTeamId, { name: '研发部' })
      await orgService.addOrgMembers({
        teamId: testTeamId,
        orgId: org._id,
        tmbIds: ['tmb-001', 'tmb-002'],
      })

      await orgService.deleteOrg(org._id, testTeamId)

      const members = await orgService.getOrgMembers(org._id, testTeamId)
      expect(members.length).toBe(0)
    })
  })
})
