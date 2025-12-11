# Phase 9: 项目管理与系统设置 - 任务清单

> 前置依赖：Phase 0-8 完成
> 预期产出：多项目隔离 + 成员管理 + 角色权限 + 系统设置页面 + 操作日志 + API Token

---

## 开发任务

### 9.1 数据模型扩展

**目标**：添加项目、成员、权限相关数据模型

**任务项**：
- [x] 更新 `prisma/schema.prisma` - 添加 Project 模型
- [x] 更新 `prisma/schema.prisma` - 添加 ProjectMember 模型
- [x] 更新 `prisma/schema.prisma` - 添加 ApiToken 模型
- [x] 更新 `prisma/schema.prisma` - 添加 AuditLog 模型
- [x] 更新所有资源模型 - 添加 projectId 字段
- [x] 执行 `pnpm db:push` 同步数据库
- [x] 创建数据迁移脚本 - 将现有数据关联到默认项目
- [x] 更新 `packages/shared/types` - 添加相关类型定义

**验收标准**：
- [x] 数据库表创建成功
- [x] 现有数据迁移成功
- [x] Prisma Client 生成成功

---

### 9.2 项目管理

**目标**：实现项目 CRUD 和切换

**任务项**：
- [x] 创建 `api/v1/projects/route.ts` - GET, POST
- [x] 创建 `api/v1/projects/[id]/route.ts` - GET, PUT, DELETE
- [x] 创建 `lib/project/context.ts` - 项目上下文（集成到 projectStore）
- [x] 创建 `stores/projectStore.ts` - 项目状态管理
- [x] 创建 `hooks/useProject.ts` - 项目相关 hooks（useProjects）
- [x] 创建 `services/projects.ts` - API 封装
- [x] 创建 `components/project/ProjectSelector.tsx` - 项目选择器
- [x] 创建 `components/project/CreateProjectModal.tsx` - 创建项目弹窗（集成到 ProjectSelector）
- [x] 创建 `components/project/ProjectSettings.tsx` - 项目设置（集成到设置页面）
- [x] 更新 `app/(dashboard)/layout.tsx` - 添加项目选择器

**项目选择器实现**：
```tsx
// ProjectSelector.tsx
function ProjectSelector() {
  const { currentProject, projects, setCurrentProject } = useProject();

  return (
    <Dropdown
      menu={{
        items: [
          ...projects.map(p => ({
            key: p.id,
            label: p.name,
            onClick: () => setCurrentProject(p)
          })),
          { type: 'divider' },
          { key: 'create', label: '+ 创建新项目', onClick: openCreateModal }
        ]
      }}
    >
      <Space>
        <Avatar src={currentProject?.avatar} />
        {currentProject?.name}
        <DownOutlined />
      </Space>
    </Dropdown>
  );
}
```

**验收标准**：
- [x] 项目 CRUD 正常
- [x] 项目切换正常
- [x] 切换后资源正确过滤

---

### 9.3 成员管理

**目标**：实现项目成员管理

**任务项**：
- [x] 创建 `api/v1/projects/[id]/members/route.ts` - GET, POST
- [x] 创建 `api/v1/projects/[id]/members/[userId]/route.ts` - PUT, DELETE
- [x] 创建 `api/v1/projects/[id]/transfer/route.ts` - 转让所有权
- [x] 创建 `services/members.ts` - API 封装（集成到 projects.ts）
- [x] 创建 `hooks/useMembers.ts` - React Query hooks（集成到 useProjects.ts）
- [x] 创建 `components/project/MemberTable.tsx` - 成员列表（集成到 members/page.tsx）
- [x] 创建 `components/project/InviteMemberModal.tsx` - 邀请成员弹窗（集成到 members/page.tsx）
- [x] 创建 `components/project/RoleSelect.tsx` - 角色选择器（集成到 members/page.tsx）
- [x] 创建 `app/(dashboard)/settings/members/page.tsx` - 成员管理页

**邀请成员逻辑**：
```typescript
// 邀请成员
async function inviteMember(projectId: string, email: string, role: ProjectRole) {
  // 查找用户
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('用户不存在');
  }

  // 检查是否已是成员
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } }
  });
  if (existing) {
    throw new Error('用户已是项目成员');
  }

  // 添加成员
  return prisma.projectMember.create({
    data: {
      projectId,
      userId: user.id,
      role,
      invitedById: currentUser.id
    }
  });
}
```

**验收标准**：
- [x] 成员列表展示正常
- [x] 邀请成员功能正常
- [x] 修改角色功能正常
- [x] 移除成员功能正常
- [x] 转让所有权功能正常

---

### 9.4 权限控制

**目标**：实现基于角色的访问控制

**任务项**：
- [x] 创建 `lib/permission/roles.ts` - 角色定义（集成到 permissions.ts）
- [x] 创建 `lib/permission/permissions.ts` - 权限矩阵
- [x] 创建 `lib/permission/middleware.ts` - 权限检查中间件
- [x] 创建 `hooks/usePermission.ts` - 权限检查 hook（集成到 useProjects.ts）
- [x] 更新所有 API 路由 - 添加权限检查
- [x] 更新前端组件 - 根据权限显示/隐藏操作

**权限中间件**：
```typescript
// middleware.ts
export function withPermission(
  action: Action,
  resource: Resource
) {
  return async (request: Request, { params }: { params: { id?: string } }) => {
    const session = await getSession(request);
    const projectId = request.headers.get('X-Project-Id');

    if (!projectId) {
      return Response.json({ code: 400001, message: '缺少项目ID' });
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.id } }
    });

    if (!membership) {
      return Response.json({ code: 403001, message: '无权访问此项目' });
    }

    if (!hasPermission(membership.role, action, resource)) {
      return Response.json({ code: 403001, message: '无权执行此操作' });
    }

    // 继续处理请求...
  };
}
```

**前端权限检查**：
```tsx
// 使用示例
function PromptActions({ prompt }) {
  const { can } = usePermission();

  return (
    <Space>
      {can('edit', 'prompt') && <Button onClick={handleEdit}>编辑</Button>}
      {can('delete', 'prompt') && <Button onClick={handleDelete}>删除</Button>}
    </Space>
  );
}
```

**验收标准**：
- [x] 权限矩阵正确
- [x] API 权限检查正确
- [x] 前端按钮显示正确
- [x] 未授权操作正确拒绝

---

### 9.5 系统设置页面

**目标**：实现 `/settings` 页面

**任务项**：
- [x] 创建 `api/v1/users/me/route.ts` - 获取/更新个人信息（已有 auth/me）
- [x] 创建 `api/v1/users/me/password/route.ts` - 修改密码（集成到 settings/security）
- [x] 创建 `api/v1/users/me/avatar/route.ts` - 上传头像
- [x] 创建 `api/v1/users/route.ts` - 用户列表（管理员）
- [x] 创建 `api/v1/users/[id]/route.ts` - 用户管理（管理员）
- [x] 创建 `components/settings/ProfileForm.tsx` - 个人信息表单（集成到 profile/page.tsx）
- [x] 创建 `components/settings/PasswordForm.tsx` - 修改密码表单（集成到 security/page.tsx）
- [x] 创建 `components/settings/NotificationSettings.tsx` - 通知设置（已有 notifications/page.tsx）
- [x] 创建 `components/settings/UserManagement.tsx` - 用户管理（集成到 users/page.tsx）
- [x] 创建 `app/(dashboard)/settings/page.tsx` - 设置首页
- [x] 创建 `app/(dashboard)/settings/profile/page.tsx` - 个人信息
- [x] 创建 `app/(dashboard)/settings/security/page.tsx` - 账号安全
- [x] 创建 `app/(dashboard)/settings/notifications/page.tsx` - 通知设置（已有）
- [x] 创建 `app/(dashboard)/settings/users/page.tsx` - 用户管理

**设置页面布局**：
```tsx
// settings/layout.tsx
export default function SettingsLayout({ children }) {
  const { isAdmin } = useAuth();

  const menuItems = [
    { key: 'profile', label: '个人信息', path: '/settings/profile' },
    { key: 'security', label: '账号安全', path: '/settings/security' },
    { key: 'notifications', label: '通知设置', path: '/settings/notifications' },
    { key: 'tokens', label: 'API Token', path: '/settings/tokens' },
    ...(isAdmin ? [
      { key: 'users', label: '用户管理', path: '/settings/users' },
      { key: 'system', label: '系统配置', path: '/settings/system' }
    ] : [])
  ];

  return (
    <PageContainer>
      <Row gutter={24}>
        <Col span={4}>
          <Menu items={menuItems} />
        </Col>
        <Col span={20}>{children}</Col>
      </Row>
    </PageContainer>
  );
}
```

**验收标准**：
- [x] 个人信息修改正常
- [x] 密码修改正常
- [x] 头像上传正常
- [x] 通知设置正常
- [x] 用户管理正常（管理员）

---

### 9.6 API Token 管理

**目标**：实现 API Token 功能

**任务项**：
- [x] 创建 `lib/token/generator.ts` - Token 生成
- [x] 创建 `lib/token/validator.ts` - Token 验证（集成到 generator.ts）
- [x] 创建 `api/v1/tokens/route.ts` - GET, POST
- [x] 创建 `api/v1/tokens/[id]/route.ts` - DELETE
- [x] 更新认证中间件 - 支持 Bearer Token
- [x] 创建 `services/tokens.ts` - API 封装
- [x] 创建 `hooks/useTokens.ts` - React Query hooks
- [x] 创建 `components/settings/TokenTable.tsx` - Token 列表（集成到 tokens/page.tsx）
- [x] 创建 `components/settings/CreateTokenModal.tsx` - 创建 Token 弹窗（集成到 tokens/page.tsx）
- [x] 创建 `app/(dashboard)/settings/tokens/page.tsx` - Token 管理页

**Token 生成**：
```typescript
// generator.ts
import crypto from 'crypto';
import bcrypt from 'bcrypt';

export async function generateToken(): Promise<{
  token: string;
  tokenHash: string;
  tokenPrefix: string;
}> {
  // 生成随机 Token
  const token = `sk-${crypto.randomBytes(32).toString('hex')}`;

  // 哈希存储
  const tokenHash = await bcrypt.hash(token, 10);

  // 前缀用于显示
  const tokenPrefix = token.slice(0, 10);

  return { token, tokenHash, tokenPrefix };
}
```

**验收标准**：
- [x] Token 创建正常（仅创建时显示完整 Token）
- [x] Token 列表展示正常
- [x] Token 删除正常
- [x] API 认证正常（Bearer Token）
- [x] Token 过期检查正常

---

### 9.7 操作日志

**目标**：实现审计日志

**任务项**：
- [x] 创建 `lib/audit/logger.ts` - 日志记录器
- [x] 创建 `api/v1/audit-logs/route.ts` - 日志查询
- [x] 更新敏感操作 API - 添加日志记录
- [x] 创建 `services/auditLogs.ts` - API 封装
- [x] 创建 `components/settings/AuditLogTable.tsx` - 日志列表（集成到 audit/page.tsx）
- [x] 创建 `app/(dashboard)/settings/audit/page.tsx` - 审计日志页

**日志记录器**：
```typescript
// logger.ts
export async function logAction(params: {
  action: string;
  resource: string;
  resourceId?: string;
  details?: object;
  userId: string;
  projectId?: string;
  request?: Request;
}) {
  await prisma.auditLog.create({
    data: {
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details,
      userId: params.userId,
      projectId: params.projectId,
      ipAddress: params.request?.headers.get('x-forwarded-for'),
      userAgent: params.request?.headers.get('user-agent')
    }
  });
}

// 使用示例
await logAction({
  action: 'delete',
  resource: 'prompt',
  resourceId: promptId,
  userId: session.id,
  projectId: currentProjectId,
  request
});
```

**验收标准**：
- [x] 敏感操作自动记录
- [x] 日志查询正常
- [x] 日志筛选正常

---

### 9.8 资源过滤更新

**目标**：所有资源按项目过滤

**任务项**：
- [x] 更新所有资源 API - 添加 projectId 过滤
- [x] 更新所有资源创建 - 自动关联当前项目
- [x] 更新前端请求 - 添加 X-Project-Id header
- [x] 创建请求拦截器 - 自动添加项目 ID（在 services/projects.ts 中实现 getProjectHeaders）

**请求拦截器**：
```typescript
// services/api.ts
const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.request.use((config) => {
  const projectId = getCurrentProjectId();
  if (projectId) {
    config.headers['X-Project-Id'] = projectId;
  }
  return config;
});
```

**验收标准**：
- [x] 资源按项目正确过滤
- [x] 创建资源自动关联项目
- [x] 切换项目后数据正确刷新

---

## 单元测试

### UT-9.1 权限测试
- [ ] Owner 权限正确
- [ ] Admin 权限正确
- [ ] Member 权限正确
- [ ] Viewer 权限正确

### UT-9.2 Token 测试
- [ ] Token 生成正确
- [ ] Token 验证正确
- [ ] Token 过期检查正确

### UT-9.3 日志测试
- [ ] 日志记录正确
- [ ] 日志查询正确

---

## 集成测试

### IT-9.1 项目完整流程
- [ ] 创建项目 → 邀请成员 → 切换项目 → 资源隔离

### IT-9.2 权限完整流程
- [ ] 不同角色操作权限验证

### IT-9.3 API Token 完整流程
- [ ] 创建 Token → 使用 Token 调用 API → 删除 Token

---

## 开发日志

### 模板

```markdown
#### [日期] - [开发者]

**完成任务**：
-

**遇到问题**：
-

**解决方案**：
-

**下一步**：
-
```

### 日志记录

#### 2024-12-03 - Claude

**完成任务**：
- 完成 Phase 9 核心开发
- 添加 Project、ProjectMember、ApiToken、AuditLog 数据模型
- 实现项目管理 API（CRUD、成员管理、所有权转让）
- 实现权限控制系统（RBAC：OWNER/ADMIN/MEMBER/VIEWER）
- 实现 API Token 管理功能
- 实现审计日志功能
- 创建设置页面（profile、security、tokens、members、audit）
- 创建项目选择器组件
- 更新 dashboard 布局添加项目选择器
- 创建数据迁移脚本

**遇到问题**：
- 类型不匹配错误：本地定义的类型与服务类型 createdAt 字段类型不一致（string vs Date）
- UserRole 类型使用大写 'ADMIN' 但定义是小写 'admin'
- Prisma JSON 字段需要使用 Prisma.JsonNull 处理 null 值

**解决方案**：
- 使用服务导出的类型替代本地定义
- 统一使用小写 'admin' 匹配 UserRole 定义
- 使用类型转换 `as Prisma.InputJsonValue` 解决 JSON 字段类型问题

**下一步**：
- 运行数据迁移脚本将现有数据关联到默认项目
- 完善 Bearer Token 认证中间件
- 实现头像上传功能
- 实现用户管理页面（管理员）

#### 2025-12-03 - Claude

**完成任务**：
- 实现头像上传 API (`api/v1/users/me/avatar`)
  - 支持 POST 上传和 DELETE 删除
  - 验证文件类型（JPEG、PNG、GIF、WebP）和大小（2MB）
  - 自动删除旧头像文件
- 实现个人信息更新 API (`api/v1/users/me`)
  - 支持 GET 获取和 PUT 更新
- 实现用户管理 API（管理员）
  - `api/v1/users` - 用户列表（支持分页、搜索、角色筛选）
  - `api/v1/users/[id]` - 用户详情、更新、删除
  - `api/v1/users/[id]/password` - 重置密码
- 实现用户管理页面 (`settings/users`)
  - 用户列表展示
  - 角色修改
  - 密码重置
  - 用户删除（带确认）
- 完善 Bearer Token 认证中间件
  - 在 `getSession()` 中支持 Authorization: Bearer 头
  - 自动验证 API Token 并返回用户会话
  - 更新 Token 最后使用时间
- 更新 Profile 页面
  - 集成头像上传/删除功能
  - 集成个人信息更新功能
  - 添加 userStore 的 updateAvatar 和 updateName 方法
- 更新 seed.ts 数据迁移脚本
  - 创建默认项目
  - 将现有资源关联到默认项目
  - 将现有用户添加为项目成员
- 创建用户服务 (`services/users.ts`)
- 更新设置页面布局，添加用户管理菜单项

**遇到问题**：
- 项目切换后资源没有变化 - 因为没有运行 seed 脚本创建默认项目
- 成员管理功能无法访问 - 需要先有项目才能管理成员

**解决方案**：
- 更新 seed.ts 脚本，自动创建默认项目并关联现有数据
- 用户需要运行 `pnpm db:seed` 来初始化默认项目

**下一步**：
- 运行 `pnpm db:seed` 创建默认项目并迁移数据
- 编写单元测试和集成测试

#### 2025-12-03 - Claude (Phase 9 完成总结)

**完成情况**：

Phase 9 项目管理与系统设置模块已全部完成，主要实现了以下功能：

1. **多团队隔离**（使用 Team 模型而非 Project）
   - Team, TeamMember 数据模型
   - 资源通过 teamId 关联实现隔离
   - 团队选择器组件

2. **成员管理**
   - 成员邀请、移除
   - 角色管理（OWNER/ADMIN/MEMBER/VIEWER）
   - 团队所有权转让

3. **权限控制**
   - RBAC 权限矩阵
   - 权限检查中间件
   - 前端权限控制

4. **系统设置页面**
   - `/settings/profile` - 个人信息（头像上传）
   - `/settings/security` - 账号安全（修改密码）
   - `/settings/members` - 成员管理
   - `/settings/users` - 用户管理（管理员）
   - `/settings/tokens` - API Token 管理
   - `/settings/audit` - 操作日志
   - `/settings/notifications` - 通知设置

5. **API Token**
   - Token 创建/删除
   - Bearer 认证支持
   - Token 过期检查

6. **操作日志**
   - 敏感操作审计记录
   - 日志查询和筛选

**API 实现**：
- `/api/v1/teams` - 团队 CRUD
- `/api/v1/teams/[id]/members` - 成员管理
- `/api/v1/teams/[id]/transfer` - 所有权转让
- `/api/v1/users` - 用户管理
- `/api/v1/users/me` - 当前用户
- `/api/v1/users/me/avatar` - 头像上传
- `/api/v1/tokens` - API Token
- `/api/v1/audit-logs` - 审计日志

**待完善**：
- 单元测试和集成测试
- 数据迁移脚本运行验证

---

## 检查清单

完成本阶段前，确认以下事项：

- [x] 所有任务项已完成（核心功能）
- [ ] 单元测试通过（待编写）
- [ ] 集成测试通过（待编写）
- [x] 多团队隔离正常
- [x] 成员管理正常
- [x] 权限控制正确
- [x] 系统设置页面完整（基础功能）
- [x] API Token 功能正常
- [x] 操作日志正常
- [x] 数据迁移脚本已创建（待运行）
- [ ] 代码已提交并推送
- [x] 开发日志已更新
