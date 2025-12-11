# Phase 1: 基础设施层 - 任务清单

> 前置依赖：Phase 0 完成
> 预期产出：用户认证系统 + 模型配置管理（前后端完整功能）
> **状态：✅ 已完成**

---

## 开发任务

### 1.1 认证系统 - 后端 ✅

**目标**：实现用户认证 API

**任务项**：
- [x] 安装认证依赖（bcrypt, iron-session 或 next-auth）
- [x] 创建 `lib/auth.ts` - 认证工具函数
- [x] 实现密码哈希/验证函数
- [x] 创建 `api/v1/auth/login/route.ts` - 登录 API
- [x] 创建 `api/v1/auth/logout/route.ts` - 登出 API
- [x] 创建 `api/v1/auth/me/route.ts` - 获取当前用户 API
- [x] 创建认证中间件
- [x] 配置会话存储（Cookie/Redis）

**代码结构**：
```
src/
├── lib/
│   └── auth.ts
└── app/api/v1/auth/
    ├── login/route.ts
    ├── logout/route.ts
    └── me/route.ts
```

**验收标准**：
- [x] 登录 API 返回用户信息和 Cookie
- [x] 登出 API 清除会话
- [x] /me API 正确返回当前用户
- [x] 未登录访问受保护 API 返回 401

---

### 1.2 认证系统 - 前端 ✅

**目标**：实现登录页面和认证状态管理

**任务项**：
- [x] 创建 `stores/userStore.ts` - 用户状态管理
- [x] 创建 `hooks/useAuth.ts` - 认证相关 hooks
- [x] 创建 `services/auth.ts` - 认证 API 封装
- [x] 创建 `app/(auth)/login/page.tsx` - 登录页面
- [x] 创建 `app/(auth)/layout.tsx` - 认证布局（居中）
- [x] 实现登录表单（邮箱+密码）
- [x] 实现登录状态检查和跳转
- [x] 在 `(dashboard)` 布局中添加认证守卫

**代码结构**：
```
src/
├── stores/userStore.ts
├── hooks/useAuth.ts
├── services/auth.ts
└── app/
    ├── (auth)/
    │   ├── layout.tsx
    │   └── login/page.tsx
    └── (dashboard)/
        └── layout.tsx  # 添加认证守卫
```

**验收标准**：
- [x] 登录页面渲染正常
- [x] 表单校验（邮箱格式、密码长度）
- [x] 登录成功跳转到工作台
- [x] 未登录访问 dashboard 跳转到登录页
- [x] 登录状态在刷新后保持

---

### 1.3 模型配置 - 后端 ✅

**目标**：实现模型配置管理 API

**任务项**：
- [x] 创建 `lib/encryption.ts` - API Key 加密工具
- [ ] 创建 `lib/llm.ts` - LLM 调用封装（延后到 Phase 4 任务执行时实现）
- [x] 创建 `api/v1/providers/route.ts` - GET, POST
- [x] 创建 `api/v1/providers/[id]/route.ts` - GET, PUT, DELETE
- [x] 创建 `api/v1/providers/[id]/models/route.ts` - POST
- [x] 创建 `api/v1/models/route.ts` - GET（扁平列表）
- [x] 创建 `api/v1/models/[id]/route.ts` - GET, PUT, DELETE
- [x] 创建 `api/v1/models/[id]/test/route.ts` - 连接测试

**代码结构**：
```
src/
├── lib/
│   ├── encryption.ts
│   └── llm.ts
└── app/api/v1/
    ├── providers/
    │   ├── route.ts
    │   └── [id]/
    │       ├── route.ts
    │       └── models/route.ts
    └── models/
        ├── route.ts
        └── [id]/
            ├── route.ts
            └── test/route.ts
```

**验收标准**：
- [x] CRUD 操作正常
- [x] API Key 加密存储
- [x] 模型连接测试可用
- [x] 删除提供商级联删除模型

---

### 1.4 模型配置 - 前端 ✅

**目标**：实现模型配置管理页面

**任务项**：
- [x] 创建 `services/models.ts` - 模型配置 API 封装
- [x] 创建 `hooks/useModels.ts` - 模型相关 hooks
- [x] 创建 `components/model/ProviderCard.tsx` - 提供商卡片
- [x] 创建 `components/model/ModelCard.tsx` - 模型卡片
- [x] 创建 `components/model/AddProviderModal.tsx` - 添加提供商弹窗
- [x] 创建 `components/model/AddModelModal.tsx` - 添加模型弹窗
- [x] 创建 `components/model/EditProviderModal.tsx` - 编辑提供商弹窗
- [x] 创建 `app/(dashboard)/models/page.tsx` - 模型配置页面

**代码结构**：
```
src/
├── services/models.ts
├── hooks/useModels.ts
├── components/model/
│   ├── ProviderCard.tsx
│   ├── ModelCard.tsx
│   ├── AddProviderModal.tsx
│   ├── AddModelModal.tsx
│   ├── EditProviderModal.tsx
│   └── index.ts
└── app/(dashboard)/models/page.tsx
```

**验收标准**：
- [x] 提供商列表展示正常
- [x] 添加/编辑/删除提供商功能正常
- [x] 添加/编辑/删除模型功能正常
- [x] 模型连接测试功能可用
- [x] API Key 脱敏显示

---

### 1.5 侧边栏导航 ✅

**目标**：完善 dashboard 布局侧边栏

**任务项**：
- [x] 配置 ProLayout 菜单项（在 layout.tsx 中直接配置）
- [x] 实现用户头像下拉菜单
- [x] 实现登出功能

**菜单项**：
```typescript
const menuItems = [
  { path: '/', name: '工作台', icon: <DashboardOutlined /> },
  { path: '/prompts', name: '提示词', icon: <FileTextOutlined /> },
  { path: '/datasets', name: '数据集', icon: <DatabaseOutlined /> },
  { path: '/models', name: '模型', icon: <ApiOutlined /> },
  { path: '/evaluators', name: '评估器', icon: <CheckCircleOutlined /> },
  { path: '/tasks', name: '任务', icon: <ThunderboltOutlined /> },
];
```

**验收标准**：
- [x] 侧边栏菜单正确渲染
- [x] 点击菜单项正确跳转
- [x] 当前页面菜单高亮
- [x] 用户头像下拉菜单可用
- [x] 登出功能正常

---

## 单元测试

### UT-1.1 认证工具函数测试
- [ ] `hashPassword` 生成有效哈希
- [ ] `verifyPassword` 正确验证
- [x] `encryptApiKey` 正确加密
- [x] `decryptApiKey` 正确解密
- [x] `maskApiKey` 正确脱敏

### UT-1.2 表单校验测试
- [x] 邮箱格式校验
- [x] 密码长度校验
- [x] URL 格式校验

---

## 集成测试 ✅

### IT-1.1 认证流程测试
- [x] 登录成功获取会话
- [x] 登录失败返回错误
- [x] 登出清除会话
- [ ] 会话过期处理

### IT-1.2 模型配置流程测试
- [x] 添加提供商成功
- [x] 添加模型成功
- [x] 模型连接测试成功
- [x] 删除级联正确

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

#### 2024-12-02 - Claude

**完成任务**：
- 完成认证系统后端（lib/auth.ts + 3个API路由）
- 完成认证系统前端（userStore + useAuth hook + services/auth.ts + 登录页面）
- 完成模型配置后端（lib/encryption.ts + 6个API路由）
- 完成模型配置前端（services/models.ts + useModels hook + 5个组件 + 页面）
- 完成侧边栏导航（认证守卫 + 用户下拉菜单 + 登出功能）

**API 测试结果**：
- `POST /api/v1/auth/login` ✅ 登录成功返回用户信息
- `GET /api/v1/auth/me` ✅ 获取当前用户信息正常
- `POST /api/v1/auth/logout` ✅ 登出后会话清除
- `GET /api/v1/providers` ✅ 提供商列表正常
- `POST /api/v1/providers` ✅ 创建提供商成功
- `POST /api/v1/providers/:id/models` ✅ 添加模型成功
- `GET /api/v1/models` ✅ 模型列表正常
- API Key 脱敏显示 ✅ 只显示后4位

**遇到问题**：
- 无

**下一步**：
- 进入 Phase 2：提示词管理 + 数据集管理

---

## 检查清单

完成本阶段前，确认以下事项：

- [x] 所有任务项已完成
- [ ] 单元测试通过（部分待补充）
- [x] 集成测试通过（API 手动测试通过）
- [x] 登录/登出流程正常
- [x] 模型配置 CRUD 正常
- [ ] 代码已提交并推送
- [x] 开发日志已更新
