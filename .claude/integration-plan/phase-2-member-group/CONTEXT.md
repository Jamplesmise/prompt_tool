# Phase 2: 成员分组

## 目标

实现成员分组功能，允许将团队成员分成多个组，便于批量授权管理。

## 前置条件

- Phase 1 完成（MongoDB 连接、认证中间件就绪）
- 本项目已有 Team 和 TeamMember 模型 (PostgreSQL)

## 业务背景

### 什么是成员分组

成员分组是一种将团队成员按职能、项目或其他维度进行分类的机制。与组织架构（Org）不同，分组是扁平的、灵活的：

- **组织架构**：树形结构，反映公司行政关系（部门→小组）
- **成员分组**：扁平结构，反映协作关系（项目组、兴趣组）

### 使用场景

1. **项目组**：将参与同一项目的成员分到一组
2. **权限组**：管理员组、开发组、测试组
3. **临时组**：评审组、值班组

### 分组角色

每个成员在分组中有角色：

| 角色 | 说明 |
|------|------|
| `owner` | 分组管理员，可管理分组和成员 |
| `member` | 普通成员 |

## 数据模型

### MemberGroup（成员分组）

```typescript
type MemberGroupSchema = {
  _id: ObjectId;
  teamId: string;           // 所属团队 (PostgreSQL Team.id)
  name: string;             // 分组名称
  avatar?: string;          // 分组头像
  createTime: Date;
  updateTime: Date;
};
```

### GroupMember（分组成员关系）

```typescript
type GroupMemberSchema = {
  _id: ObjectId;
  teamId: string;           // 所属团队
  groupId: ObjectId;        // 所属分组
  tmbId: string;            // 成员 (PostgreSQL TeamMember.id)
  role: 'owner' | 'member'; // 分组内角色
  createTime: Date;
};
```

## API 设计

### 分组管理

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/team/groups` | 分组列表 | 团队成员 |
| POST | `/api/team/groups` | 创建分组 | 团队管理员 |
| GET | `/api/team/groups/[id]` | 分组详情 | 团队成员 |
| PUT | `/api/team/groups/[id]` | 更新分组 | 分组 Owner |
| DELETE | `/api/team/groups/[id]` | 删除分组 | 分组 Owner |

### 分组成员管理

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | `/api/team/groups/[id]/members` | 成员列表 | 团队成员 |
| POST | `/api/team/groups/[id]/members` | 添加成员 | 分组 Owner |
| DELETE | `/api/team/groups/[id]/members/[tmbId]` | 移除成员 | 分组 Owner |
| PUT | `/api/team/groups/[id]/members/[tmbId]` | 更新成员角色 | 分组 Owner |

## 响应格式

### 分组列表

```typescript
// GET /api/team/groups
{
  code: 200,
  data: [
    {
      _id: 'objectId',
      name: '前端开发组',
      avatar: '',
      memberCount: 5,
      createTime: '2024-01-01T00:00:00Z'
    }
  ]
}
```

### 分组详情（含成员）

```typescript
// GET /api/team/groups/[id]
{
  code: 200,
  data: {
    _id: 'objectId',
    name: '前端开发组',
    avatar: '',
    members: [
      {
        tmbId: 'uuid',
        name: '张三',
        avatar: '...',
        role: 'owner'
      },
      {
        tmbId: 'uuid',
        name: '李四',
        avatar: '...',
        role: 'member'
      }
    ]
  }
}
```

## 文件结构

```
apps/web/src/
├── lib/mongodb/schemas/
│   ├── memberGroup.ts      # MemberGroup Schema
│   └── groupMember.ts      # GroupMember Schema
│
├── app/api/team/groups/
│   ├── route.ts            # GET 列表 / POST 创建
│   └── [id]/
│       ├── route.ts        # GET/PUT/DELETE 单个
│       └── members/
│           ├── route.ts    # GET 列表 / POST 添加
│           └── [tmbId]/route.ts  # DELETE/PUT 单个成员
│
├── services/
│   └── memberGroup.ts      # 业务逻辑
│
└── hooks/
    └── useMemberGroups.ts  # React Query hooks
```

## 参考实现

- dev-admin 分组 Schema: `/home/sinocare/dev/dev-admin/src/packages/global/support_user_team/group/`
- dev-admin 分组 API: `/home/sinocare/dev/dev-admin/pages/api/support/user/team/group/`

## 验收标准

1. 可以创建、查看、编辑、删除分组
2. 可以向分组添加/移除成员
3. 分组 Owner 可以管理分组，普通成员只能查看
4. 删除分组时自动清理成员关系
5. API 响应格式符合规范
