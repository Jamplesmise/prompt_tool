# Phase 6: 测试与验收

## 目标

对 Phase 1-5 实现的所有功能进行全面测试，确保功能正确、稳定可靠。

## 前置条件

- Phase 1-5 全部完成
- 开发环境和测试数据库就绪

## 测试范围

### 6.1 单元测试

| 模块 | 测试内容 |
|------|----------|
| Permission 类 | 位运算逻辑、权限判断、合并权限 |
| 权限工具函数 | mergePermissions、hasPermission、permissionToBits |
| 路径工具函数 | generateNextPathId、getParentPathId、buildOrgTree |

### 6.2 集成测试

| 模块 | 测试内容 |
|------|----------|
| MongoDB 连接 | 连接成功、热重载复用、断线重连 |
| 成员分组 API | CRUD、成员管理、权限控制 |
| 组织架构 API | CRUD、树形结构、移动、成员管理 |
| 协作者权限 API | 添加/更新/删除协作者、权限计算 |
| FastGPT API | 应用/数据集/模型协作者 |

### 6.3 端到端测试

| 场景 | 测试内容 |
|------|----------|
| 完整协作流程 | 创建分组 → 添加成员 → 分配权限 → 验证访问 |
| 组织权限继承 | 上级组织权限 → 下级组织成员可访问 |
| 权限合并 | 直接权限 + 分组权限 + 组织权限 = 最终权限 |

## 测试数据准备

### 用户和团队

```typescript
// 测试用户
const testUsers = [
  { id: 'user-1', name: '管理员', email: 'admin@test.com' },
  { id: 'user-2', name: '开发者', email: 'dev@test.com' },
  { id: 'user-3', name: '查看者', email: 'viewer@test.com' },
];

// 测试团队
const testTeam = { id: 'team-1', name: '测试团队', ownerId: 'user-1' };

// 测试成员
const testMembers = [
  { id: 'tmb-1', userId: 'user-1', teamId: 'team-1', role: 'OWNER' },
  { id: 'tmb-2', userId: 'user-2', teamId: 'team-1', role: 'ADMIN' },
  { id: 'tmb-3', userId: 'user-3', teamId: 'team-1', role: 'MEMBER' },
];
```

### 分组和组织

```typescript
// 测试分组
const testGroups = [
  { name: '开发组', teamId: 'team-1' },
  { name: '测试组', teamId: 'team-1' },
];

// 测试组织
const testOrgs = [
  { name: '公司', pathId: '001', path: '公司' },
  { name: '研发部', pathId: '001.001', path: '公司/研发部' },
  { name: '前端组', pathId: '001.001.001', path: '公司/研发部/前端组' },
];
```

## 测试用例

### Permission 类测试

```typescript
describe('Permission', () => {
  test('基础权限判断', () => {
    const perm = new Permission(0b110); // read + write
    expect(perm.canRead).toBe(true);
    expect(perm.canWrite).toBe(true);
    expect(perm.canManage).toBe(false);
  });

  test('Owner 权限', () => {
    const owner = Permission.owner();
    expect(owner.isOwner).toBe(true);
    expect(owner.canRead).toBe(true);
    expect(owner.canWrite).toBe(true);
    expect(owner.canManage).toBe(true);
  });

  test('权限合并', () => {
    const perm1 = new Permission(0b100); // read
    const perm2 = new Permission(0b010); // write
    perm1.merge(perm2);
    expect(perm1.rawValue).toBe(0b110);
  });

  test('权限添加和移除', () => {
    const perm = new Permission(0b100);
    perm.add(0b010);
    expect(perm.rawValue).toBe(0b110);
    perm.remove(0b010);
    expect(perm.rawValue).toBe(0b100);
  });
});
```

### 分组 API 测试

```typescript
describe('MemberGroup API', () => {
  test('创建分组', async () => {
    const res = await api.post('/api/team/groups', { name: '测试分组' });
    expect(res.code).toBe(200);
    expect(res.data.name).toBe('测试分组');
  });

  test('分组名称唯一性', async () => {
    await api.post('/api/team/groups', { name: '重复分组' });
    const res = await api.post('/api/team/groups', { name: '重复分组' });
    expect(res.code).toBe(400);
  });

  test('添加分组成员', async () => {
    const group = await createGroup('测试分组');
    const res = await api.post(`/api/team/groups/${group._id}/members`, {
      tmbId: 'tmb-2',
      role: 'member',
    });
    expect(res.code).toBe(200);
  });

  test('删除分组级联删除成员', async () => {
    const group = await createGroup('待删除分组');
    await addMember(group._id, 'tmb-2');
    await api.delete(`/api/team/groups/${group._id}`);

    const members = await GroupMemberModel.find({ groupId: group._id });
    expect(members.length).toBe(0);
  });
});
```

### 组织架构 API 测试

```typescript
describe('Org API', () => {
  test('创建根组织', async () => {
    const res = await api.post('/api/team/orgs', { name: '公司' });
    expect(res.code).toBe(200);
    expect(res.data.pathId).toBe('001');
  });

  test('创建子组织', async () => {
    const parent = await createOrg('公司');
    const res = await api.post('/api/team/orgs', {
      name: '研发部',
      parentPathId: parent.pathId,
    });
    expect(res.data.pathId).toBe('001.001');
    expect(res.data.path).toBe('公司/研发部');
  });

  test('移动组织', async () => {
    const company = await createOrg('公司');
    const hr = await createOrg('人事部', company.pathId);
    const rd = await createOrg('研发部', company.pathId);

    // 将人事部移动到研发部下
    const res = await api.post(`/api/team/orgs/${hr._id}/move`, {
      parentPathId: rd.pathId,
    });
    expect(res.data.path).toContain('研发部/人事部');
  });

  test('树形结构返回', async () => {
    await createOrg('公司');
    await createOrg('研发部', '001');
    await createOrg('前端组', '001.001');

    const res = await api.get('/api/team/orgs');
    expect(res.data[0].name).toBe('公司');
    expect(res.data[0].children[0].name).toBe('研发部');
    expect(res.data[0].children[0].children[0].name).toBe('前端组');
  });
});
```

### 协作者权限测试

```typescript
describe('Permission API', () => {
  test('添加个人协作者', async () => {
    const res = await api.post('/api/permission/app/app-1/collaborators', {
      collaborators: [{ tmbId: 'tmb-2', permission: 6 }],
    });
    expect(res.code).toBe(200);
  });

  test('添加分组协作者', async () => {
    const group = await createGroup('开发组');
    const res = await api.post('/api/permission/app/app-1/collaborators', {
      collaborators: [{ groupId: group._id, permission: 4 }],
    });
    expect(res.code).toBe(200);
  });

  test('权限合并计算', async () => {
    // tmb-2 直接权限: read (4)
    // tmb-2 所在分组权限: write (2)
    // 最终权限应为: 6

    await addDirectPermission('app-1', 'tmb-2', 4);
    const group = await createGroup('开发组');
    await addMemberToGroup(group._id, 'tmb-2');
    await addGroupPermission('app-1', group._id, 2);

    const perm = await getUserResourcePermission('app', 'app-1', 'tmb-2', 'team-1');
    expect(perm.rawValue).toBe(6);
    expect(perm.canRead).toBe(true);
    expect(perm.canWrite).toBe(true);
  });
});
```

### FastGPT API 兼容性测试

```typescript
describe('FastGPT API Compatibility', () => {
  test('应用协作者列表格式', async () => {
    await setupCollaborators('app', 'app-1');

    const res = await api.get('/api/core/app/collaborator/list?appId=app-1');
    expect(res.code).toBe(200);
    expect(res.data.clbs).toBeDefined();
    expect(res.data.clbs[0].permission.hasReadPer).toBeDefined();
    expect(res.data.clbs[0].permission.hasWritePer).toBeDefined();
    expect(res.data.clbs[0].permission.hasManagePer).toBeDefined();
  });

  test('数据集协作者更新', async () => {
    const res = await api.post('/api/core/dataset/collaborator/update', {
      datasetId: 'dataset-1',
      collaborators: [{ tmbId: 'tmb-2', permission: 6 }],
    });
    expect(res.code).toBe(200);
  });

  test('模型协作者列表', async () => {
    const res = await api.get('/api/system/model/collaborator/list?modelId=model-1');
    expect(res.code).toBe(200);
  });
});
```

## 验收清单

### 功能验收

- [ ] MongoDB 连接正常，热重载不重复创建连接
- [ ] 成员分组 CRUD 正常
- [ ] 分组成员管理正常
- [ ] 组织架构 CRUD 正常
- [ ] 组织树形结构正确
- [ ] 组织移动功能正常
- [ ] 组织成员管理正常
- [ ] 协作者权限 CRUD 正常
- [ ] 权限合并计算正确
- [ ] FastGPT API 格式兼容

### 性能验收

- [ ] API 响应时间 < 500ms
- [ ] 批量操作无超时
- [ ] 大量数据查询正常

### 安全验收

- [ ] 未登录用户无法访问 API
- [ ] 用户只能访问自己团队的数据
- [ ] 权限检查正确

## 测试工具

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test permission
pnpm test memberGroup
pnpm test org

# 查看覆盖率
pnpm test:coverage
```
