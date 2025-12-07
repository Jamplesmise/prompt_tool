# Phase 3: 组织架构

## 目标

实现树形组织架构功能，支持多级部门结构，用于反映公司行政关系。

## 前置条件

- Phase 1 完成（MongoDB 连接就绪）
- Phase 2 完成（成员分组可参考）
- 本项目已有 Team 和 TeamMember 模型

## 业务背景

### 什么是组织架构

组织架构是树形结构，反映公司的行政关系：

```
公司 (根组织)
├── 研发部
│   ├── 前端组
│   ├── 后端组
│   └── 测试组
├── 产品部
│   ├── 产品组
│   └── 设计组
└── 运营部
    ├── 市场组
    └── 客服组
```

### 与成员分组的区别

| 维度 | 组织架构 (Org) | 成员分组 (Group) |
|------|----------------|------------------|
| 结构 | 树形（有层级） | 扁平（无层级） |
| 用途 | 行政关系 | 协作关系 |
| 成员 | 一人只能在一个部门 | 一人可在多个分组 |
| 示例 | 研发部/前端组 | 项目A组、评审组 |

### 路径设计

使用 `pathId` 和 `path` 记录组织的层级位置：

```typescript
{
  _id: 'org_003',
  name: '前端组',
  pathId: '001.002.003',      // 数字路径，用于排序和层级判断
  path: '公司/研发部/前端组', // 可读路径，用于显示
}
```

## 数据模型

### Org（组织/部门）

```typescript
type OrgSchema = {
  _id: ObjectId;
  teamId: string;           // 所属团队
  pathId: string;           // 路径 ID (如 "001.002.003")
  path: string;             // 路径名称 (如 "公司/研发部/前端组")
  name: string;             // 组织名称
  avatar: string;           // 组织头像
  description?: string;     // 描述
  updateTime: Date;
};
```

### OrgMember（组织成员）

```typescript
type OrgMemberSchema = {
  _id: ObjectId;
  teamId: string;
  orgId: ObjectId;
  tmbId: string;            // TeamMember UUID
};
```

## API 设计

### 组织管理

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/team/orgs` | 组织列表（树形） | 团队成员 |
| POST | `/api/team/orgs` | 创建组织 | 团队管理员 |
| GET | `/api/team/orgs/[id]` | 组织详情 | 团队成员 |
| PUT | `/api/team/orgs/[id]` | 更新组织 | 团队管理员 |
| DELETE | `/api/team/orgs/[id]` | 删除组织 | 团队管理员 |
| POST | `/api/team/orgs/[id]/move` | 移动组织位置 | 团队管理员 |

### 组织成员管理

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/team/orgs/[id]/members` | 成员列表 | 团队成员 |
| POST | `/api/team/orgs/[id]/members` | 添加成员 | 团队管理员 |
| DELETE | `/api/team/orgs/[id]/members/[tmbId]` | 移除成员 | 团队管理员 |

## 响应格式

### 组织列表（树形）

```typescript
// GET /api/team/orgs
{
  code: 200,
  data: [
    {
      _id: 'org_001',
      name: '公司',
      pathId: '001',
      path: '公司',
      memberCount: 50,
      children: [
        {
          _id: 'org_002',
          name: '研发部',
          pathId: '001.002',
          path: '公司/研发部',
          memberCount: 20,
          children: [
            {
              _id: 'org_003',
              name: '前端组',
              pathId: '001.002.003',
              path: '公司/研发部/前端组',
              memberCount: 8,
              children: []
            }
          ]
        }
      ]
    }
  ]
}
```

### 组织详情

```typescript
// GET /api/team/orgs/[id]
{
  code: 200,
  data: {
    _id: 'org_003',
    name: '前端组',
    pathId: '001.002.003',
    path: '公司/研发部/前端组',
    description: '负责前端开发',
    members: [
      { tmbId: 'uuid', name: '张三', avatar: '...' },
      { tmbId: 'uuid', name: '李四', avatar: '...' }
    ]
  }
}
```

## 核心算法

### 路径 ID 生成

```typescript
// 生成下一个同级 pathId
function generateNextPathId(parentPathId: string, siblingCount: number): string {
  const nextNum = (siblingCount + 1).toString().padStart(3, '0');
  return parentPathId ? `${parentPathId}.${nextNum}` : nextNum;
}

// 示例
generateNextPathId('001', 2)     // '001.003'
generateNextPathId('001.002', 0) // '001.002.001'
generateNextPathId('', 0)        // '001'
```

### 构建树形结构

```typescript
function buildOrgTree(orgs: OrgSchema[]): OrgTreeNode[] {
  // 按 pathId 排序
  const sorted = orgs.sort((a, b) => a.pathId.localeCompare(b.pathId));

  const root: OrgTreeNode[] = [];
  const map = new Map<string, OrgTreeNode>();

  for (const org of sorted) {
    const node: OrgTreeNode = { ...org, children: [] };
    map.set(org._id.toString(), node);

    const parentPathId = org.pathId.split('.').slice(0, -1).join('.');
    const parent = [...map.values()].find((n) => n.pathId === parentPathId);

    if (parent) {
      parent.children.push(node);
    } else {
      root.push(node);
    }
  }

  return root;
}
```

## 文件结构

```
apps/web/src/
├── lib/mongodb/schemas/
│   ├── org.ts              # Org Schema
│   └── orgMember.ts        # OrgMember Schema
│
├── app/api/team/orgs/
│   ├── route.ts            # GET 列表 / POST 创建
│   └── [id]/
│       ├── route.ts        # GET/PUT/DELETE 单个
│       ├── move/route.ts   # POST 移动
│       └── members/
│           ├── route.ts    # GET 列表 / POST 添加
│           └── [tmbId]/route.ts  # DELETE 移除
│
├── services/
│   └── org.ts              # 业务逻辑
│
└── hooks/
    └── useOrgs.ts          # React Query hooks
```

## 参考实现

- dev-admin 组织 Schema: `/home/sinocare/dev/dev-admin/src/packages/global/support_user_team/org/`
- dev-admin 组织 API: `/home/sinocare/dev/dev-admin/pages/api/support/user/team/org/`
- dev-admin 组织 Service: `/home/sinocare/dev/dev-admin/src/packages/service/support_permission/org/`

## 验收标准

1. 可以创建、查看、编辑、删除组织
2. 组织列表正确返回树形结构
3. 可以移动组织位置（改变父组织）
4. 可以向组织添加/移除成员
5. 删除组织时：
   - 子组织一并删除
   - 成员关系自动清理
6. pathId 和 path 自动维护
