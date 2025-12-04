# Phase 9: 项目管理与系统设置 - 上下文

> 前置依赖：Phase 0-8 完成
> 本阶段目标：实现多项目隔离、成员管理、角色权限、系统设置页面

---

## 一、阶段概述

本阶段实现 `docs/01-product-scope.md` 中规划的 V2 项目管理功能和系统设置：

1. **多团队隔离** - 资源按团队隔离
2. **成员管理** - 邀请成员加入项目
3. **角色权限** - 基于角色的访问控制
4. **系统设置** - `/settings` 页面
5. **操作日志** - 审计日志记录
6. **API Token** - 编程接口访问

---

## 二、功能范围

### 2.1 多项目隔离

**功能**：
- 创建/编辑/删除项目
- 项目内资源隔离（提示词、数据集、模型、评估器、任务）
- 项目切换
- 默认项目

**项目结构**：
```typescript
type Project = {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  ownerId: string;        // 项目创建者
  createdAt: Date;
  updatedAt: Date;
};
```

**资源归属**：
- 所有核心资源（Prompt, Dataset, Model, Evaluator, Task）添加 `projectId` 字段
- 查询时自动按当前项目过滤

### 2.2 成员管理

**功能**：
- 邀请成员加入项目
- 移除成员
- 查看成员列表
- 转让项目所有权

**成员角色**：
```typescript
type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';
```

**权限矩阵**：

| 操作 | Owner | Admin | Member | Viewer |
|------|-------|-------|--------|--------|
| 查看资源 | ✓ | ✓ | ✓ | ✓ |
| 创建资源 | ✓ | ✓ | ✓ | ✗ |
| 编辑资源 | ✓ | ✓ | ✓ | ✗ |
| 删除资源 | ✓ | ✓ | ✗ | ✗ |
| 执行任务 | ✓ | ✓ | ✓ | ✗ |
| 管理成员 | ✓ | ✓ | ✗ | ✗ |
| 项目设置 | ✓ | ✓ | ✗ | ✗ |
| 删除项目 | ✓ | ✗ | ✗ | ✗ |
| 转让所有权 | ✓ | ✗ | ✗ | ✗ |

### 2.3 角色权限

**功能**：
- 系统角色（admin/user）
- 项目角色（owner/admin/member/viewer）
- 权限检查中间件

**系统角色**：
- `admin`: 系统管理员，可以管理所有用户和全局设置
- `user`: 普通用户，只能管理自己的资源

### 2.4 系统设置页面

**设置项**：
- 个人信息（头像、昵称）
- 账号安全（修改密码）
- 通知设置（邮件、站内通知开关）
- API Token 管理
- 系统管理（仅管理员）
  - 用户管理
  - 全局配置

### 2.5 操作日志

**功能**：
- 记录敏感操作
- 操作人、操作时间、操作类型、操作对象
- 日志查询和筛选

**日志事件**：
- 用户登录/登出
- 资源创建/删除
- 项目成员变更
- API Token 创建/删除

### 2.6 API Token

**功能**：
- 创建 API Token（用于编程访问）
- Token 列表管理
- Token 权限范围
- Token 过期时间

**Token 结构**：
```typescript
type ApiToken = {
  id: string;
  name: string;
  token: string;          // 仅创建时显示
  tokenPrefix: string;    // 显示前8位
  scopes: string[];       // 权限范围
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdById: string;
  createdAt: Date;
};
```

---

## 三、技术架构

### 3.1 权限检查中间件

```typescript
// middleware/permission.ts
export function checkPermission(
  action: 'view' | 'create' | 'edit' | 'delete' | 'execute' | 'manage',
  resource: 'prompt' | 'dataset' | 'model' | 'evaluator' | 'task' | 'member' | 'project'
) {
  return async (request: Request, context: { projectId: string; userId: string }) => {
    const { projectId, userId } = context;

    // 获取用户在项目中的角色
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId }
      }
    });

    if (!membership) {
      throw new ForbiddenError('无权访问此项目');
    }

    // 检查权限
    if (!hasPermission(membership.role, action, resource)) {
      throw new ForbiddenError('无权执行此操作');
    }
  };
}
```

### 3.2 项目上下文

```typescript
// 全局项目上下文
const ProjectContext = createContext<{
  currentProject: Project | null;
  setCurrentProject: (project: Project) => void;
  projects: Project[];
}>({
  currentProject: null,
  setCurrentProject: () => {},
  projects: []
});

// 使用
function useProject() {
  return useContext(ProjectContext);
}
```

### 3.3 API Token 认证

```typescript
// 支持两种认证方式
// 1. Cookie Session
// 2. Authorization: Bearer <api-token>

async function authenticate(request: Request) {
  // 检查 API Token
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    return await validateApiToken(token);
  }

  // 检查 Session
  return await getSession(request);
}
```

---

## 四、数据模型

### 4.1 项目相关

```prisma
model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  avatar      String?

  ownerId     String
  owner       User     @relation("ProjectOwner", fields: [ownerId], references: [id])

  members     ProjectMember[]
  prompts     Prompt[]
  datasets    Dataset[]
  models      Model[]
  evaluators  Evaluator[]
  tasks       Task[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ProjectMember {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  userId      String
  user        User     @relation(fields: [userId], references: [id])

  role        String   // owner, admin, member, viewer

  invitedById String?
  invitedBy   User?    @relation("InvitedBy", fields: [invitedById], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([projectId, userId])
}
```

### 4.2 API Token

```prisma
model ApiToken {
  id          String   @id @default(cuid())
  name        String
  tokenHash   String   @unique  // 存储哈希值
  tokenPrefix String            // 前8位，用于显示

  scopes      Json     // string[]
  expiresAt   DateTime?
  lastUsedAt  DateTime?

  userId      String
  user        User     @relation(fields: [userId], references: [id])

  createdAt   DateTime @default(now())
}
```

### 4.3 操作日志

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  action      String   // login, logout, create, delete, update
  resource    String   // user, project, prompt, etc.
  resourceId  String?
  details     Json?

  userId      String
  user        User     @relation(fields: [userId], references: [id])

  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id])

  ipAddress   String?
  userAgent   String?

  createdAt   DateTime @default(now())
}
```

---

## 五、页面设计

### 5.1 项目选择器

```
┌─────────────────────────────────────────────────────────────────┐
│ [项目图标] 当前项目名称 ▼                                        │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 🔵 项目 A                                          [当前] │   │
│ │ 🟢 项目 B                                                 │   │
│ │ 🟡 项目 C                                                 │   │
│ ├───────────────────────────────────────────────────────────┤   │
│ │ + 创建新项目                                               │   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 系统设置页面 `/settings`

```
┌─────────────────────────────────────────────────────────────────┐
│ 设置                                                             │
├──────────────┬──────────────────────────────────────────────────┤
│              │                                                   │
│ 个人信息      │  头像: [上传]                                    │
│              │  昵称: [__________]                               │
│ 账号安全      │  邮箱: admin@example.com                         │
│              │                                                   │
│ 通知设置      │  [保存]                                          │
│              │                                                   │
│ API Token    │                                                   │
│              │                                                   │
│ ────────────  │                                                   │
│ 用户管理 *    │                                                   │
│ 系统配置 *    │                                                   │
│              │  * 仅管理员可见                                   │
└──────────────┴──────────────────────────────────────────────────┘
```

### 5.3 API Token 管理

```
┌─────────────────────────────────────────────────────────────────┐
│ API Token                                          [+ 创建 Token] │
├─────────────────────────────────────────────────────────────────┤
│ ┌────────────┬────────────┬────────────┬────────────┬────────┐ │
│ │ 名称       │ Token      │ 权限       │ 过期时间   │ 操作   │ │
│ ├────────────┼────────────┼────────────┼────────────┼────────┤ │
│ │ CI Token   │ sk-abc1... │ 全部       │ 2024-12-31 │ 删除   │ │
│ │ Read Only  │ sk-def2... │ 只读       │ 永不过期   │ 删除   │ │
│ └────────────┴────────────┴────────────┴────────────┴────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、迁移策略

### 6.1 现有数据迁移

1. 创建默认项目 "Default Project"
2. 将所有现有资源关联到默认项目
3. 将所有现有用户设为默认项目的 member

### 6.2 数据库迁移脚本

```typescript
// prisma/migrations/add-projects/migration.ts
async function migrate() {
  // 1. 创建默认项目
  const defaultProject = await prisma.project.create({
    data: {
      name: 'Default Project',
      ownerId: 'admin-user-id'
    }
  });

  // 2. 更新所有资源
  await prisma.prompt.updateMany({
    data: { projectId: defaultProject.id }
  });
  // ... 其他资源

  // 3. 添加所有用户为成员
  const users = await prisma.user.findMany();
  for (const user of users) {
    await prisma.projectMember.create({
      data: {
        projectId: defaultProject.id,
        userId: user.id,
        role: user.role === 'admin' ? 'owner' : 'member'
      }
    });
  }
}
```

---

## 七、依赖关系

### 7.1 外部依赖

- bcrypt（Token 哈希）
- crypto（Token 生成）

### 7.2 内部依赖

- Phase 1：用户认证
- 所有阶段的资源模型
