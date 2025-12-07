/**
 * E2E 测试：团队协作完整流程
 * 测试从创建分组/组织到分配权限的完整流程
 */
import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'

// Mock prisma - must be before imports
vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'tmb-e2e-001',
        teamId: 'team-e2e-001',
        user: { name: 'E2E测试用户', avatar: '' },
      }),
      findMany: vi.fn().mockResolvedValue([
        { id: 'tmb-e2e-001', user: { name: '管理员', avatar: '' } },
        { id: 'tmb-e2e-002', user: { name: '开发者', avatar: '' } },
        { id: 'tmb-e2e-003', user: { name: '查看者', avatar: '' } },
      ]),
    },
  },
}))

import { setupTestDB, cleanupTestDB, closeTestDB } from '../utils/mongodb'
import * as memberGroupService from '@/services/memberGroup'
import * as orgService from '@/services/org'
import * as permissionService from '@/services/resourcePermission'
import * as fastgptService from '@/services/fastgptCollaborator'
import { Permission, PermissionBits } from '@/lib/permission'

// E2E 测试使用独立的 teamId，避免与其他测试冲突
const E2E_TEAM_ID = `team-e2e-${Date.now()}`

describe('E2E: 团队协作完整流程', () => {
  beforeAll(async () => {
    await setupTestDB()
  })

  afterAll(async () => {
    await closeTestDB()
  })

  beforeEach(async () => {
    // 不做全局清理，每个测试用唯一 ID
  })

  describe('场景1: 创建开发团队并分配应用权限', () => {
    const scenarioId = `scenario1-${Date.now()}`
    let devGroupId: string
    const appId = `app-${scenarioId}`

    test('步骤1: 创建开发组', async () => {
      const group = await memberGroupService.createGroup(E2E_TEAM_ID, {
        name: `开发组-${scenarioId}`,
        avatar: 'https://example.com/dev-group.png',
      })

      expect(group).toBeDefined()
      expect(group.name).toContain('开发组')
      expect(group._id).toBeDefined()

      devGroupId = group._id
    })

    test('步骤2: 添加成员到开发组', async () => {
      const added = await memberGroupService.addGroupMembers({
        teamId: E2E_TEAM_ID,
        groupId: devGroupId,
        tmbIds: ['tmb-e2e-001', 'tmb-e2e-002'],
      })

      expect(added).toBe(2)

      // 验证成员已添加
      const members = await memberGroupService.getGroupMembers(devGroupId, E2E_TEAM_ID)
      expect(members.length).toBe(2)
    })

    test('步骤3: 为开发组分配应用读写权限', async () => {
      await permissionService.updateResourceCollaborators('app', appId, E2E_TEAM_ID, [
        { groupId: devGroupId, permission: PermissionBits.read | PermissionBits.write },
      ])

      // 验证权限已添加
      const clbs = await permissionService.getResourceCollaborators('app', appId, E2E_TEAM_ID)
      expect(clbs.length).toBe(1)
      expect(clbs[0].groupId).toBe(devGroupId)
      expect(clbs[0].permission.canRead).toBe(true)
      expect(clbs[0].permission.canWrite).toBe(true)
    })

    test('步骤4: 验证开发组成员有应用权限', async () => {
      const perm = await permissionService.getUserResourcePermission(
        'app',
        appId,
        'tmb-e2e-001',
        E2E_TEAM_ID
      )

      expect(perm.canRead).toBe(true)
      expect(perm.canWrite).toBe(true)
      expect(perm.canManage).toBe(false)
    })

    test('步骤5: 清理 - 删除开发组', async () => {
      const deleted = await memberGroupService.deleteGroup(devGroupId, E2E_TEAM_ID)
      expect(deleted).toBe(true)

      // 验证成员关系也被删除
      const count = await memberGroupService.getGroupMemberCount({ groupId: devGroupId })
      expect(count).toBe(0)
    })
  })

  describe('场景2: 创建组织架构并分配数据集权限', () => {
    const scenarioId = `scenario2-${Date.now()}`
    let companyId: string
    let rdDeptId: string
    const datasetId = `dataset-${scenarioId}`

    test('步骤1: 创建公司根组织', async () => {
      const company = await orgService.createOrg(E2E_TEAM_ID, {
        name: `测试公司-${scenarioId}`,
      })

      expect(company).toBeDefined()
      expect(company.name).toContain('测试公司')
      expect(company.path).toBe('')

      companyId = company._id
    })

    test('步骤2: 创建研发部子组织', async () => {
      const rdDept = await orgService.createOrg(E2E_TEAM_ID, {
        name: `研发部-${scenarioId}`,
        parentId: companyId,
      })

      expect(rdDept).toBeDefined()
      expect(rdDept.name).toContain('研发部')
      expect(rdDept.path).not.toBe('')

      rdDeptId = rdDept._id
    })

    test('步骤3: 添加成员到研发部', async () => {
      const added = await orgService.addOrgMembers({
        teamId: E2E_TEAM_ID,
        orgId: rdDeptId,
        tmbIds: ['tmb-e2e-001', 'tmb-e2e-002', 'tmb-e2e-003'],
      })

      expect(added).toBe(3)
    })

    test('步骤4: 为研发部分配数据集只读权限', async () => {
      await permissionService.updateResourceCollaborators('dataset', datasetId, E2E_TEAM_ID, [
        { orgId: rdDeptId, permission: PermissionBits.read },
      ])

      const clbs = await permissionService.getResourceCollaborators('dataset', datasetId, E2E_TEAM_ID)
      expect(clbs.length).toBe(1)
      expect(clbs[0].permission.canRead).toBe(true)
      expect(clbs[0].permission.canWrite).toBe(false)
    })

    test('步骤5: 清理 - 删除公司（级联删除子组织）', async () => {
      const deleted = await orgService.deleteOrg(companyId, E2E_TEAM_ID)
      expect(deleted).toBe(true)

      // 验证子组织也被删除
      const orgs = await orgService.getOrgs(E2E_TEAM_ID)
      const remaining = orgs.filter((o) => o.name.includes(scenarioId))
      expect(remaining.length).toBe(0)
    })
  })

  describe('场景3: FastGPT API 兼容性测试', () => {
    const scenarioId = `scenario3-${Date.now()}`
    const appId = `fastgpt-app-${scenarioId}`
    let groupId: string

    test('步骤1: 创建分组用于 FastGPT 测试', async () => {
      const group = await memberGroupService.createGroup(E2E_TEAM_ID, {
        name: `FastGPT测试组-${scenarioId}`,
      })
      groupId = group._id
    })

    test('步骤2: 使用 FastGPT 服务添加应用协作者', async () => {
      await fastgptService.updateFastGPTCollaborators('app', appId, E2E_TEAM_ID, [
        { tmbId: 'tmb-e2e-001', permission: 6 }, // read + write
      ])

      // 使用 FastGPT 格式获取协作者
      const clbs = await fastgptService.getFastGPTCollaborators('app', appId, E2E_TEAM_ID)

      expect(clbs.length).toBe(1)
      // 验证 FastGPT 格式
      expect(clbs[0].permission.hasReadPer).toBe(true)
      expect(clbs[0].permission.hasWritePer).toBe(true)
      expect(clbs[0].permission.hasManagePer).toBe(false)
      expect(clbs[0].permission.value).toBe(6)
    })

    test('步骤3: 使用 FastGPT 服务删除协作者', async () => {
      const deleted = await fastgptService.deleteFastGPTCollaborator('app', appId, {
        tmbId: 'tmb-e2e-001',
      })

      expect(deleted).toBe(true)

      // 验证已删除
      const clbs = await fastgptService.getFastGPTCollaborators('app', appId, E2E_TEAM_ID)
      expect(clbs.length).toBe(0)
    })

    test('步骤4: 清理', async () => {
      await memberGroupService.deleteGroup(groupId, E2E_TEAM_ID)
    })
  })

  describe('场景4: Permission 类功能验证', () => {
    test('权限位运算正确性', () => {
      // read = 0b100 = 4
      // write = 0b010 = 2
      // manage = 0b001 = 1

      const readOnly = new Permission(PermissionBits.read)
      expect(readOnly.canRead).toBe(true)
      expect(readOnly.canWrite).toBe(false)
      expect(readOnly.rawValue).toBe(4)

      const readWrite = new Permission(PermissionBits.read | PermissionBits.write)
      expect(readWrite.canRead).toBe(true)
      expect(readWrite.canWrite).toBe(true)
      expect(readWrite.rawValue).toBe(6)

      const full = Permission.manager()
      expect(full.canRead).toBe(true)
      expect(full.canWrite).toBe(true)
      expect(full.canManage).toBe(true)
      expect(full.rawValue).toBe(7)
    })

    test('权限合并正确性', () => {
      const perm1 = new Permission(PermissionBits.read) // 4
      const perm2 = new Permission(PermissionBits.write) // 2

      perm1.merge(perm2)

      expect(perm1.rawValue).toBe(6)
      expect(perm1.canRead).toBe(true)
      expect(perm1.canWrite).toBe(true)
    })

    test('Owner 权限特性', () => {
      const owner = Permission.owner()

      expect(owner.isOwner).toBe(true)
      expect(owner.canRead).toBe(true)
      expect(owner.canWrite).toBe(true)
      expect(owner.canManage).toBe(true)

      // Owner 权限不可修改
      owner.remove(PermissionBits.read)
      expect(owner.canRead).toBe(true) // 仍然为 true
    })

    test('FastGPT 格式转换正确性', async () => {
      const perm = Permission.editor() // read + write = 6

      const json = perm.toJSON()
      expect(json.value).toBe(6)
      expect(json.canRead).toBe(true)
      expect(json.canWrite).toBe(true)
      expect(json.canManage).toBe(false)
      expect(json.roleName).toBe('编辑者')
    })
  })

  describe('场景5: 权限检查完整流程', () => {
    const scenarioId = `scenario5-${Date.now()}`
    const appId = `perm-check-app-${scenarioId}`

    test('无权限用户检查', async () => {
      const hasAccess = await permissionService.checkResourcePermission(
        'app',
        appId,
        'tmb-no-access',
        E2E_TEAM_ID,
        PermissionBits.read
      )

      expect(hasAccess).toBe(false)
    })

    test('有权限用户检查', async () => {
      // 先添加权限
      await permissionService.updateResourceCollaborators('app', appId, E2E_TEAM_ID, [
        { tmbId: 'tmb-e2e-001', permission: PermissionBits.read },
      ])

      const hasRead = await permissionService.checkResourcePermission(
        'app',
        appId,
        'tmb-e2e-001',
        E2E_TEAM_ID,
        PermissionBits.read
      )
      expect(hasRead).toBe(true)

      const hasWrite = await permissionService.checkResourcePermission(
        'app',
        appId,
        'tmb-e2e-001',
        E2E_TEAM_ID,
        PermissionBits.write
      )
      expect(hasWrite).toBe(false)

      // 清理
      await permissionService.deleteAllResourcePermissions('app', appId)
    })
  })
})
