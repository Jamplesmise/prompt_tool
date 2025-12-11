# dev-admin 融合计划

> 将 FastGPT Pro 后端 (dev-admin) 的团队管理增强功能和 FastGPT API 融合到本项目

## 一、融合概述

### 1.1 融合目标

| 模块 | 说明 |
|------|------|
| **团队管理增强** | 成员分组、组织架构、协作者权限（位运算） |
| **FastGPT API** | 应用协作者、数据集协作者、模型协作者 |

### 1.2 融合原则

- **认证复用**：使用本项目已有的登录认证
- **数据库共存**：PostgreSQL (本项目核心) + MongoDB (FastGPT 业务数据)
- **团队关联**：通过 `teamId` (UUID) 关联两边数据

### 1.3 难度评估

| 维度 | 评估 |
|------|------|
| 难度 | **3/10** (低) |
| 工期 | **1-2 周** |
| 风险 | 低，不影响现有功能 |

---

## 二、模块详解

### 2.1 团队管理增强

#### 2.1.1 成员分组 (MemberGroup)

允许将团队成员分成多个组，便于批量授权。

**数据模型**：
```typescript
// 分组
type MemberGroupSchema = {
  _id: ObjectId;
  teamId: string;      // 关联本项目 Team UUID
  name: string;
  avatar?: string;
  createTime: Date;
  updateTime: Date;
};

// 分组成员关系
type GroupMemberSchema = {
  _id: ObjectId;
  teamId: string;
  groupId: ObjectId;
  tmbId: string;       // TeamMember UUID
  role: 'admin' | 'member';
  createTime: Date;
};
```

**API**：
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/team/groups` | 分组列表 |
| POST | `/api/team/groups` | 创建分组 |
| PUT | `/api/team/groups/[id]` | 更新分组 |
| DELETE | `/api/team/groups/[id]` | 删除分组 |
| GET | `/api/team/groups/[id]/members` | 分组成员 |
| POST | `/api/team/groups/[id]/members` | 添加成员 |
| DELETE | `/api/team/groups/[id]/members` | 移除成员 |

#### 2.1.2 组织架构 (Org)

树形部门结构，支持多级组织。

**数据模型**：
```typescript
// 组织/部门
type OrgSchema = {
  _id: ObjectId;
  teamId: string;
  pathId: string;      // 路径 ID (如 "001.002.003")
  path: string;        // 路径名称 (如 "公司/研发部/前端组")
  name: string;
  avatar: string;
  description?: string;
  updateTime: Date;
};

// 组织成员
type OrgMemberSchema = {
  _id: ObjectId;
  teamId: string;
  orgId: ObjectId;
  tmbId: string;       // TeamMember UUID
};
```

**API**：
| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/team/orgs` | 组织列表（树形） |
| POST | `/api/team/orgs` | 创建组织 |
| PUT | `/api/team/orgs/[id]` | 更新组织 |
| DELETE | `/api/team/orgs/[id]` | 删除组织 |
| POST | `/api/team/orgs/[id]/move` | 移动组织位置 |
| GET | `/api/team/orgs/[id]/members` | 组织成员 |
| POST | `/api/team/orgs/[id]/members` | 添加成员 |
| DELETE | `/api/team/orgs/[id]/members` | 移除成员 |

#### 2.1.3 协作者权限 (Permission)

基于位运算的细粒度权限系统，支持三种协作者类型。

**权限值**：
```typescript
// 权限位定义
const PermissionBits = {
  read:   0b100,  // 4 - 读取
  write:  0b010,  // 2 - 写入
  manage: 0b001   // 1 - 管理
};

// 组合示例
// 只读: 4 (0b100)
// 读写: 6 (0b110)
// 全部: 7 (0b111)
// Owner: ~0 >>> 0 (全 1)
```

**协作者类型**：
```typescript
// 协作者可以是：个人、分组、组织 三选一
type CollaboratorIdType =
  | { tmbId: string }      // 个人 (TeamMember)
  | { groupId: string }    // 分组 (MemberGroup)
  | { orgId: string };     // 组织 (Org)

type CollaboratorItemType = CollaboratorIdType & {
  permission: number;      // 权限值 (位运算)
};
```

**数据模型**：
```typescript
// 资源协作者
type ResourcePermissionSchema = {
  _id: ObjectId;
  teamId: string;
  resourceType: 'app' | 'dataset' | 'model';
  resourceId: string;

  // 三选一
  tmbId?: string;
  groupId?: ObjectId;
  orgId?: ObjectId;

  permission: number;
  createTime: Date;
  updateTime: Date;
};
```

---

### 2.2 FastGPT 协作者 API

为 FastGPT 的应用、数据集、模型提供协作者管理能力。

#### 2.2.1 应用协作者 (App Collaborator)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/core/app/collaborator/list` | 获取应用协作者列表 |
| POST | `/api/core/app/collaborator/update` | 添加/更新协作者 |
| DELETE | `/api/core/app/collaborator/delete` | 删除协作者 |

#### 2.2.2 数据集协作者 (Dataset Collaborator)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/core/dataset/collaborator/list` | 获取数据集协作者列表 |
| POST | `/api/core/dataset/collaborator/update` | 添加/更新协作者 |
| DELETE | `/api/core/dataset/collaborator/delete` | 删除协作者 |

#### 2.2.3 模型协作者 (Model Collaborator)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/system/model/collaborator/list` | 获取模型协作者列表 |
| POST | `/api/system/model/collaborator/update` | 添加/更新协作者 |

---

## 三、技术方案

### 3.1 架构图

```
┌─────────────────────────────────────────────────────────┐
│                      融合后架构                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              API 层 (App Router)                 │   │
│  │                                                  │   │
│  │  /api/prompts/*      → Prisma (PostgreSQL)      │   │
│  │  /api/tasks/*        → Prisma (PostgreSQL)      │   │
│  │  /api/team/groups/*  → Mongoose (MongoDB) ← NEW │   │
│  │  /api/team/orgs/*    → Mongoose (MongoDB) ← NEW │   │
│  │  /api/core/*/collaborator/* → MongoDB    ← NEW  │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│         ┌───────────────┼───────────────┐              │
│         │               │               │              │
│  ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐      │
│  │   Prisma    │ │  Mongoose   │ │   Redis     │      │
│  │ PostgreSQL  │ │  MongoDB    │ │             │      │
│  │             │ │             │ │             │      │
│  │ - User      │ │ - Group     │ │ - Session   │      │
│  │ - Team      │ │ - Org       │ │ - Cache     │      │
│  │ - Prompt    │ │ - Permission│ │             │      │
│  │ - Task      │ │             │ │             │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                         │
│  关联方式: MongoDB 文档中存储 PostgreSQL 的 UUID        │
│  - teamId  → Team.id (UUID)                            │
│  - tmbId   → TeamMember.id (UUID)                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 ID 映射策略

MongoDB 文档通过 UUID 字符串关联 PostgreSQL 数据：

```typescript
// MongoDB Schema 示例
const MemberGroupSchema = new Schema({
  teamId: {
    type: String,        // PostgreSQL Team.id (UUID)
    required: true,
    index: true
  },
  // ...
});

const GroupMemberSchema = new Schema({
  teamId: { type: String, required: true },
  groupId: { type: Schema.Types.ObjectId, ref: 'member_groups' },
  tmbId: {
    type: String,        // PostgreSQL TeamMember.id (UUID)
    required: true
  },
  // ...
});
```

### 3.3 认证适配

复用本项目 Session，在 MongoDB API 中获取用户信息：

```typescript
// apps/web/src/lib/mongodb/middleware.ts
import { getServerSession } from '@/lib/auth';

export async function withAuth(handler: Function) {
  return async (req: Request) => {
    const session = await getServerSession();
    if (!session?.user) {
      return Response.json({ code: 401, message: '未登录' }, { status: 401 });
    }

    // 注入用户信息
    const context = {
      userId: session.user.id,
      teamId: session.user.currentTeamId,
      tmbId: session.user.currentMemberId,
    };

    return handler(req, context);
  };
}
```

---

## 四、融合步骤

### Phase 1: 基础设施 (1 天)

- [ ] 安装 mongoose 依赖
- [ ] 创建 MongoDB 连接模块 `lib/mongodb/index.ts`
- [ ] 添加环境变量 `MONGODB_URI`
- [ ] 创建认证适配中间件

### Phase 2: 成员分组 (2 天)

- [ ] 创建 MemberGroup Schema
- [ ] 创建 GroupMember Schema
- [ ] 实现分组 CRUD API
- [ ] 实现分组成员管理 API

### Phase 3: 组织架构 (2 天)

- [ ] 创建 Org Schema
- [ ] 创建 OrgMember Schema
- [ ] 实现组织 CRUD API
- [ ] 实现组织成员管理 API
- [ ] 实现树形结构查询

### Phase 4: 协作者权限 (2 天)

- [ ] 创建 ResourcePermission Schema
- [ ] 实现权限位运算工具函数
- [ ] 实现 Permission 类

### Phase 5: FastGPT 协作者 API (2 天)

- [ ] 实现应用协作者 API
- [ ] 实现数据集协作者 API
- [ ] 实现模型协作者 API

### Phase 6: 测试 (1 天)

- [ ] 单元测试
- [ ] API 集成测试

---

## 五、文件结构

```
apps/web/src/
├── lib/
│   └── mongodb/
│       ├── index.ts                    # MongoDB 连接
│       ├── middleware.ts               # 认证适配中间件
│       └── schemas/
│           ├── memberGroup.ts          # 成员分组
│           ├── groupMember.ts          # 分组成员关系
│           ├── org.ts                  # 组织/部门
│           ├── orgMember.ts            # 组织成员关系
│           └── resourcePermission.ts   # 资源协作者权限
│
├── lib/
│   └── permission/
│       ├── constant.ts                 # 权限常量 (位运算)
│       ├── controller.ts               # Permission 类
│       └── utils.ts                    # 权限工具函数
│
├── app/api/
│   ├── team/
│   │   ├── groups/
│   │   │   ├── route.ts                # GET 列表 / POST 创建
│   │   │   └── [id]/
│   │   │       ├── route.ts            # GET/PUT/DELETE 单个
│   │   │       └── members/route.ts    # 成员管理
│   │   └── orgs/
│   │       ├── route.ts
│   │       └── [id]/
│   │           ├── route.ts
│   │           ├── move/route.ts
│   │           └── members/route.ts
│   │
│   └── core/
│       ├── app/collaborator/
│       │   ├── list/route.ts
│       │   ├── update/route.ts
│       │   └── delete/route.ts
│       ├── dataset/collaborator/
│       │   ├── list/route.ts
│       │   ├── update/route.ts
│       │   └── delete/route.ts
│       └── model/collaborator/
│           ├── list/route.ts
│           └── update/route.ts
│
├── services/
│   ├── memberGroup.ts
│   ├── org.ts
│   └── collaborator.ts
│
└── hooks/
    ├── useMemberGroups.ts
    ├── useOrgs.ts
    └── useCollaborators.ts
```

---

## 六、环境配置

```bash
# .env.local 新增
MONGODB_URI="mongodb://username:password@host:port/database?authSource=admin"
```

```bash
# 安装依赖
pnpm add mongoose
pnpm add -D @types/mongoose
```

---

## 七、权限系统详解

### 7.1 权限位定义

```typescript
// lib/permission/constant.ts

// 权限位
export const PermissionBits = {
  read:   0b100,  // 4
  write:  0b010,  // 2
  manage: 0b001   // 1
} as const;

// 特殊值
export const NullPermission = 0;
export const OwnerPermission = ~0 >>> 0;  // 全 1 (4294967295)

// 预设角色
export const RolePermissions = {
  viewer:  0b100,  // 4  - 只读
  editor:  0b110,  // 6  - 读写
  manager: 0b111   // 7  - 全部
} as const;
```

### 7.2 Permission 类

```typescript
// lib/permission/controller.ts

export class Permission {
  private value: number;

  constructor(value: number = 0) {
    this.value = value;
  }

  get isOwner(): boolean {
    return this.value === OwnerPermission;
  }

  get canRead(): boolean {
    return this.isOwner || (this.value & PermissionBits.read) !== 0;
  }

  get canWrite(): boolean {
    return this.isOwner || (this.value & PermissionBits.write) !== 0;
  }

  get canManage(): boolean {
    return this.isOwner || (this.value & PermissionBits.manage) !== 0;
  }

  add(perm: number): this {
    if (!this.isOwner) this.value |= perm;
    return this;
  }

  remove(perm: number): this {
    if (!this.isOwner) this.value &= ~perm;
    return this;
  }

  check(perm: number): boolean {
    if (perm === OwnerPermission) return this.isOwner;
    return (this.value & perm) === perm;
  }
}
```

### 7.3 使用示例

```typescript
// 检查用户对某资源的权限
async function checkResourcePermission(
  resourceType: 'app' | 'dataset' | 'model',
  resourceId: string,
  tmbId: string,
  teamId: string
): Promise<Permission> {
  // 1. 查询用户直接权限
  const directPerm = await ResourcePermission.findOne({
    resourceType, resourceId, tmbId
  });

  // 2. 查询用户所在分组的权限
  const groupPerms = await getGroupPermissions(tmbId, resourceType, resourceId);

  // 3. 查询用户所在组织的权限
  const orgPerms = await getOrgPermissions(tmbId, resourceType, resourceId);

  // 4. 合并权限 (取并集)
  let finalValue = directPerm?.permission ?? 0;
  for (const p of [...groupPerms, ...orgPerms]) {
    finalValue |= p.permission;
  }

  return new Permission(finalValue);
}
```

---

## 八、API 请求/响应格式

### 8.1 统一响应格式

```typescript
// 成功
{ code: 200, message: 'success', data: T }

// 错误
{ code: 4xxxxx, message: '错误描述', data: null }
```

### 8.2 协作者 API 示例

**获取协作者列表**：
```typescript
// GET /api/core/app/collaborator/list?appId=xxx

// Response
{
  code: 200,
  data: {
    clbs: [
      { tmbId: 'uuid', name: '张三', avatar: '...', permission: { role: 6, ... } },
      { groupId: 'objectId', name: '开发组', avatar: '...', permission: { role: 4, ... } },
      { orgId: 'objectId', name: '研发部', avatar: '...', permission: { role: 7, ... } }
    ]
  }
}
```

**更新协作者权限**：
```typescript
// POST /api/core/app/collaborator/update
{
  appId: 'xxx',
  collaborators: [
    { tmbId: 'uuid', permission: 6 },      // 个人
    { groupId: 'objectId', permission: 4 } // 分组
  ]
}
```

---

## 九、分阶段开发文档

| 阶段 | 目录 | 内容 | 工期 |
|------|------|------|------|
| Phase 1 | `phase-1-infrastructure/` | MongoDB 连接、认证中间件 | 1 天 |
| Phase 2 | `phase-2-member-group/` | 成员分组 CRUD、成员管理 | 2 天 |
| Phase 3 | `phase-3-organization/` | 组织架构、树形结构、移动 | 2 天 |
| Phase 4 | `phase-4-permission/` | 协作者权限、位运算、Permission 类 | 2 天 |
| Phase 5 | `phase-5-fastgpt-api/` | FastGPT 兼容 API (app/dataset/model) | 2 天 |
| Phase 6 | `phase-6-testing/` | 单元测试、集成测试、验收 | 1 天 |

每个阶段包含：
- `CONTEXT.md` - 上下文、背景、设计
- `TASKS.md` - 任务清单、代码示例

---

## 十、参考资料

| 资源 | 路径 |
|------|------|
| dev-admin 项目 | `/home/sinocare/dev/dev-admin` |
| 分组 Schema | `src/packages/global/support_user_team/group/` |
| 组织 Schema | `src/packages/global/support_user_team/org/` |
| 权限定义 | `src/packages/global/support/permission/` |
| 协作者 API | `pages/api/core/*/collaborator/` |
