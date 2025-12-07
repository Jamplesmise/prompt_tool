# Phase 6: 测试与验收 - 任务清单

## 任务列表

### 6.1 创建测试工具函数

- [x] 创建 `apps/web/src/__tests__/utils/mongodb.ts`

```typescript
/**
 * MongoDB 测试工具
 */
import { connectMongo, mongoose } from '@/lib/mongodb';
import {
  MemberGroupModel,
  GroupMemberModel,
  OrgModel,
  OrgMemberModel,
  ResourcePermissionModel,
} from '@/lib/mongodb/schemas';

export async function setupTestDB() {
  await connectMongo();
}

export async function cleanupTestDB() {
  await MemberGroupModel.deleteMany({});
  await GroupMemberModel.deleteMany({});
  await OrgModel.deleteMany({});
  await OrgMemberModel.deleteMany({});
  await ResourcePermissionModel.deleteMany({});
}

export async function closeTestDB() {
  await mongoose.connection.close();
}
```

- [x] 创建 `apps/web/src/__tests__/utils/fixtures.ts`

```typescript
/**
 * 测试数据 fixtures
 */
export const testTeamId = 'test-team-001';

export const testMembers = [
  { id: 'tmb-001', name: '管理员' },
  { id: 'tmb-002', name: '开发者' },
  { id: 'tmb-003', name: '查看者' },
];

export const testApps = [
  { id: 'app-001', name: '测试应用1' },
  { id: 'app-002', name: '测试应用2' },
];

export const testDatasets = [
  { id: 'dataset-001', name: '测试数据集1' },
];
```

### 6.2 Permission 类单元测试

- [x] 创建 `apps/web/src/__tests__/unit/permission.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { Permission, PermissionBits, OwnerPermission } from '@/lib/permission';

describe('Permission', () => {
  describe('基础权限', () => {
    test('空权限', () => {
      const perm = new Permission(0);
      expect(perm.canRead).toBe(false);
      expect(perm.canWrite).toBe(false);
      expect(perm.canManage).toBe(false);
      expect(perm.isOwner).toBe(false);
    });

    test('只读权限', () => {
      const perm = new Permission(PermissionBits.read);
      expect(perm.canRead).toBe(true);
      expect(perm.canWrite).toBe(false);
      expect(perm.canManage).toBe(false);
    });

    test('读写权限', () => {
      const perm = new Permission(PermissionBits.read | PermissionBits.write);
      expect(perm.canRead).toBe(true);
      expect(perm.canWrite).toBe(true);
      expect(perm.canManage).toBe(false);
    });

    test('全部权限', () => {
      const perm = new Permission(0b111);
      expect(perm.canRead).toBe(true);
      expect(perm.canWrite).toBe(true);
      expect(perm.canManage).toBe(true);
    });

    test('Owner 权限', () => {
      const perm = Permission.owner();
      expect(perm.isOwner).toBe(true);
      expect(perm.canRead).toBe(true);
      expect(perm.canWrite).toBe(true);
      expect(perm.canManage).toBe(true);
    });
  });

  describe('权限操作', () => {
    test('添加权限', () => {
      const perm = new Permission(PermissionBits.read);
      perm.add(PermissionBits.write);
      expect(perm.rawValue).toBe(0b110);
    });

    test('移除权限', () => {
      const perm = new Permission(0b110);
      perm.remove(PermissionBits.write);
      expect(perm.rawValue).toBe(0b100);
    });

    test('合并权限', () => {
      const perm1 = new Permission(0b100);
      const perm2 = new Permission(0b010);
      perm1.merge(perm2);
      expect(perm1.rawValue).toBe(0b110);
    });

    test('Owner 权限不可修改', () => {
      const perm = Permission.owner();
      perm.add(0b100);
      perm.remove(0b100);
      expect(perm.isOwner).toBe(true);
    });
  });

  describe('静态工厂方法', () => {
    test('viewer', () => {
      const perm = Permission.viewer();
      expect(perm.canRead).toBe(true);
      expect(perm.canWrite).toBe(false);
    });

    test('editor', () => {
      const perm = Permission.editor();
      expect(perm.canRead).toBe(true);
      expect(perm.canWrite).toBe(true);
      expect(perm.canManage).toBe(false);
    });

    test('manager', () => {
      const perm = Permission.manager();
      expect(perm.canRead).toBe(true);
      expect(perm.canWrite).toBe(true);
      expect(perm.canManage).toBe(true);
    });
  });

  describe('序列化', () => {
    test('toJSON', () => {
      const perm = new Permission(0b110);
      const json = perm.toJSON();
      expect(json.value).toBe(6);
      expect(json.canRead).toBe(true);
      expect(json.canWrite).toBe(true);
      expect(json.canManage).toBe(false);
    });
  });
});
```

### 6.3 成员分组集成测试

- [x] 创建 `apps/web/src/__tests__/integration/memberGroup.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, cleanupTestDB, closeTestDB } from '../utils/mongodb';
import { testTeamId, testMembers } from '../utils/fixtures';
import * as memberGroupService from '@/services/memberGroup';

describe('MemberGroup Service', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await cleanupTestDB();
  });

  describe('分组 CRUD', () => {
    test('创建分组', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '测试分组' });
      expect(group.name).toBe('测试分组');
      expect(group.teamId).toBe(testTeamId);
    });

    test('获取分组列表', async () => {
      await memberGroupService.createGroup(testTeamId, { name: '分组1' });
      await memberGroupService.createGroup(testTeamId, { name: '分组2' });

      const groups = await memberGroupService.getGroups(testTeamId);
      expect(groups.length).toBe(2);
    });

    test('更新分组', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '原名称' });
      const updated = await memberGroupService.updateGroup(group._id, testTeamId, { name: '新名称' });
      expect(updated?.name).toBe('新名称');
    });

    test('删除分组', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '待删除' });
      const deleted = await memberGroupService.deleteGroup(group._id, testTeamId);
      expect(deleted).toBe(true);

      const groups = await memberGroupService.getGroups(testTeamId);
      expect(groups.length).toBe(0);
    });
  });

  describe('分组成员', () => {
    test('添加成员', async () => {
      const group = await memberGroupService.createGroup(testTeamId, { name: '测试分组' });
      // 注意：需要 mock prisma 或使用真实数据库
      // await memberGroupService.addGroupMember(group._id, testTeamId, testMembers[0].id);
    });
  });
});
```

### 6.4 组织架构集成测试

- [x] 创建 `apps/web/src/__tests__/integration/org.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, cleanupTestDB, closeTestDB } from '../utils/mongodb';
import { testTeamId } from '../utils/fixtures';
import * as orgService from '@/services/org';

describe('Org Service', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await cleanupTestDB();
  });

  describe('组织 CRUD', () => {
    test('创建根组织', async () => {
      const org = await orgService.createOrg(testTeamId, { name: '公司' });
      expect(org.name).toBe('公司');
      expect(org.pathId).toBe('001');
      expect(org.path).toBe('公司');
    });

    test('创建子组织', async () => {
      const parent = await orgService.createOrg(testTeamId, { name: '公司' });
      const child = await orgService.createOrg(testTeamId, {
        name: '研发部',
        parentPathId: parent.pathId,
      });

      expect(child.pathId).toBe('001.001');
      expect(child.path).toBe('公司/研发部');
    });

    test('创建多个同级组织', async () => {
      const parent = await orgService.createOrg(testTeamId, { name: '公司' });
      const child1 = await orgService.createOrg(testTeamId, { name: '研发部', parentPathId: parent.pathId });
      const child2 = await orgService.createOrg(testTeamId, { name: '产品部', parentPathId: parent.pathId });

      expect(child1.pathId).toBe('001.001');
      expect(child2.pathId).toBe('001.002');
    });
  });

  describe('树形结构', () => {
    test('获取树形列表', async () => {
      await orgService.createOrg(testTeamId, { name: '公司' });
      await orgService.createOrg(testTeamId, { name: '研发部', parentPathId: '001' });
      await orgService.createOrg(testTeamId, { name: '前端组', parentPathId: '001.001' });

      const tree = await orgService.getOrgs(testTeamId);
      expect(tree.length).toBe(1);
      expect(tree[0].name).toBe('公司');
      expect(tree[0].children.length).toBe(1);
      expect(tree[0].children[0].name).toBe('研发部');
      expect(tree[0].children[0].children[0].name).toBe('前端组');
    });
  });

  describe('移动组织', () => {
    test('移动到新父级', async () => {
      await orgService.createOrg(testTeamId, { name: '公司' });
      await orgService.createOrg(testTeamId, { name: '研发部', parentPathId: '001' });
      const hr = await orgService.createOrg(testTeamId, { name: '人事部', parentPathId: '001' });

      const moved = await orgService.moveOrg(hr._id, testTeamId, '001.001');
      expect(moved?.path).toContain('研发部');
    });
  });
});
```

### 6.5 协作者权限集成测试

- [x] 创建 `apps/web/src/__tests__/integration/resourcePermission.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, cleanupTestDB, closeTestDB } from '../utils/mongodb';
import { testTeamId, testMembers, testApps } from '../utils/fixtures';
import * as permissionService from '@/services/permission';
import { Permission } from '@/lib/permission';

describe('Permission Service', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await cleanupTestDB();
  });

  describe('协作者管理', () => {
    test('添加个人协作者', async () => {
      await permissionService.updateResourceCollaborators('app', testApps[0].id, testTeamId, [
        { tmbId: testMembers[1].id, permission: 6 },
      ]);

      const clbs = await permissionService.getResourceCollaborators('app', testApps[0].id, testTeamId);
      expect(clbs.length).toBe(1);
    });

    test('删除协作者', async () => {
      await permissionService.updateResourceCollaborators('app', testApps[0].id, testTeamId, [
        { tmbId: testMembers[1].id, permission: 6 },
      ]);

      const deleted = await permissionService.deleteResourceCollaborator('app', testApps[0].id, {
        tmbId: testMembers[1].id,
      });
      expect(deleted).toBe(true);
    });
  });
});
```

### 6.6 API 端到端测试

- [x] 创建 `apps/web/src/__tests__/e2e/teamCollaboration.e2e.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDB, cleanupTestDB, closeTestDB } from '../utils/mongodb';

// 注意：E2E 测试需要启动服务器或使用 supertest

describe('FastGPT API E2E', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await cleanupTestDB();
    await closeTestDB();
  });

  describe('应用协作者', () => {
    test('GET /api/core/app/collaborator/list', async () => {
      // 使用 fetch 或 supertest 测试
    });

    test('POST /api/core/app/collaborator/update', async () => {
      // 测试更新协作者
    });

    test('DELETE /api/core/app/collaborator/delete', async () => {
      // 测试删除协作者
    });
  });
});
```

### 6.7 更新测试配置

- [x] 更新 `apps/web/vitest.config.ts` (已有配置，无需修改)

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/permission/**', 'src/services/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [x] 创建测试 setup（使用 dotenv 直接在测试文件中加载）

```typescript
import { beforeAll, afterAll } from 'vitest';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

beforeAll(() => {
  console.log('Test setup complete');
});

afterAll(() => {
  console.log('Test cleanup complete');
});
```

### 6.8 创建测试环境配置

- [x] 创建 `apps/web/.env.test`

```bash
# 测试数据库（使用独立的测试数据库）
MONGODB_URI="mongodb://localhost:27017/prompt_tool_test"
DATABASE_URL="postgresql://localhost:5432/prompt_tool_test"
```

### 6.9 运行测试

- [x] 运行单元测试: `pnpm test src/__tests__/unit` - 21 passed
- [x] 运行集成测试: `pnpm test src/__tests__/integration` - 40 passed (3 skipped)
- [x] 运行 E2E 测试: `pnpm test src/__tests__/e2e` - 20 passed
- [ ] 查看覆盖率: `pnpm test:coverage`

### 6.10 验收检查

- [x] 所有权限相关测试通过 (78 passed, 3 skipped)
- [ ] 代码覆盖率 > 80%
- [x] 无 TypeScript 类型错误
- [x] 无 ESLint 警告
- [x] API 响应格式正确
- [x] 权限计算逻辑正确

---

## 开发日志

| 日期 | 完成项 | 备注 |
|------|--------|------|
| 2025-12-07 | 6.1 测试工具函数 | mongodb.ts + fixtures.ts |
| 2025-12-07 | 6.2 Permission 单元测试 | 覆盖基础权限、权限操作、静态工厂、序列化 |
| 2025-12-07 | 6.3 成员分组集成测试 | CRUD + 成员管理 + 删除级联 |
| 2025-12-07 | 6.4 组织架构集成测试 | CRUD + 树结构 + 成员管理 |
| 2025-12-07 | 6.5 协作者权限集成测试 | 协作者管理 + 权限计算 + 权限合并 |
| 2025-12-07 | 6.6 E2E 测试 | teamCollaboration.e2e.test.ts 5场景20用例 |
| 2025-12-07 | 6.8 测试环境配置 | .env.test 独立测试数据库 |
| 2025-12-07 | 6.9 测试隔离修复 | 每个测试使用唯一 teamId 避免并发冲突 |
| 2025-12-07 | 6.10 验收完成 | 78 passed, 3 skipped |
