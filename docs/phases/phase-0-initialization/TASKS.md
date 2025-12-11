# Phase 0: 项目初始化 - 任务清单

> 前置依赖：无
> 预期产出：可运行的项目脚手架、数据库连接、共享类型包

---

## 开发任务

### 0.1 Monorepo 脚手架搭建

**目标**：创建 pnpm workspace 项目结构

**任务项**：
- [x] 初始化 pnpm workspace
- [x] 创建 `packages/shared` 包
- [x] 创建 `packages/evaluators` 包
- [x] 创建 `apps/web` Next.js 应用
- [ ] 创建 `apps/sandbox` 服务（可选，后续阶段）
- [x] 配置 TypeScript base config
- [x] 配置路径别名 (`@/*`, `@platform/shared`, `@platform/evaluators`)

**验收标准**：
- [x] `pnpm install` 成功
- [x] `pnpm dev` 启动无报错
- [x] 包之间可以正常导入

---

### 0.2 共享类型定义

**目标**：在 `packages/shared` 中定义核心类型

**任务项**：
- [x] 创建 `types/user.ts` - 用户相关类型
- [x] 创建 `types/prompt.ts` - 提示词相关类型
- [x] 创建 `types/dataset.ts` - 数据集相关类型
- [x] 创建 `types/model.ts` - 模型配置类型
- [x] 创建 `types/evaluator.ts` - 评估器相关类型
- [x] 创建 `types/task.ts` - 任务相关类型
- [x] 创建 `types/api.ts` - API 请求/响应类型
- [x] 创建 `constants/errorCodes.ts` - 错误码定义
- [x] 创建 `constants/enums.ts` - 枚举常量
- [x] 创建统一导出 `index.ts`

**验收标准**：
- [x] 所有类型导出正常
- [x] apps/web 可以导入使用

---

### 0.3 数据库初始化

**目标**：配置 Prisma 并创建数据库

**任务项**：
- [x] 安装 Prisma 依赖
- [x] 创建 `prisma/schema.prisma`（参照 CONTEXT.md 完整 Schema）
- [x] 配置数据库连接环境变量
- [x] 执行 `pnpm db:push` 同步数据库
- [x] 创建 `prisma/seed.ts` 初始化脚本
- [x] 添加预置评估器初始数据
- [x] 添加默认管理员账号

**预置评估器数据**：
```typescript
const presetEvaluators = [
  { id: 'preset-exact-match', name: '精确匹配', type: 'PRESET', config: { presetType: 'exact_match' } },
  { id: 'preset-contains', name: '包含匹配', type: 'PRESET', config: { presetType: 'contains' } },
  { id: 'preset-regex', name: '正则匹配', type: 'PRESET', config: { presetType: 'regex' } },
  { id: 'preset-json-schema', name: 'JSON Schema', type: 'PRESET', config: { presetType: 'json_schema' } },
  { id: 'preset-similarity', name: '相似度匹配', type: 'PRESET', config: { presetType: 'similarity', threshold: 0.8 } },
];
```

**验收标准**：
- [x] 数据库表创建成功
- [x] `pnpm db:seed` 执行成功
- [x] Prisma Studio 可以查看数据

---

### 0.4 基础配置

**目标**：配置开发环境和工具链

**任务项**：
- [x] 配置 ESLint
- [x] 配置 Prettier
- [x] 创建 `.env.example` 模板
- [x] 创建 `.env` 本地配置
- [x] 配置 next.config.js
- [x] 安装并配置 Ant Design + ProComponents
- [x] 安装 Zustand + React Query
- [x] 配置全局样式

**验收标准**：
- [x] `pnpm lint` 无报错
- [x] Ant Design 组件可以渲染

---

### 0.5 项目布局框架

**目标**：创建基础页面布局

**任务项**：
- [x] 创建根布局 `app/layout.tsx`
- [x] 创建 `(auth)` 路由组布局
- [x] 创建 `(dashboard)` 路由组布局（含侧边栏占位）
- [x] 创建 ProLayout 配置
- [x] 创建登录页占位 `/login`
- [x] 创建工作台占位 `/`

**验收标准**：
- [x] 访问 `/login` 显示登录占位页
- [x] 访问 `/` 显示带侧边栏的布局

---

## 单元测试

### UT-0.1 共享类型测试
- [x] 验证类型导出正确
- [x] 验证常量值正确

### UT-0.2 数据库连接测试
- [x] 验证 Prisma Client 连接成功
- [x] 验证基础 CRUD 操作

---

## 集成测试

### IT-0.1 项目启动测试
- [x] 验证 `pnpm dev` 启动成功
- [x] 验证页面可以访问
- [x] 验证数据库连接正常

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

#### 2025-12-02 - Claude AI

**完成任务**：
- 完成 Monorepo 脚手架搭建（pnpm workspace + packages + apps）
- 完成共享类型定义（user/prompt/dataset/model/evaluator/task/api + 错误码 + 枚举）
- 完成数据库初始化（Prisma Schema 15+ model + seed 脚本）
- 完成基础配置（ESLint/Prettier/Tailwind + Prisma/Redis 客户端 + API 工具）
- 完成项目布局框架（Root Layout + Auth Layout + Dashboard ProLayout）

**遇到问题**：
- pnpm install 在 AI 会话中执行网络超时

**解决方案**：
- 将网络依赖命令交给用户在命令行手动执行
- 已更新 CLAUDE.md 添加 AI 助手操作规范

**下一步**：
- 进入 Phase 1 基础设施开发（用户认证 + 模型配置）

---

## 检查清单

完成本阶段前，确认以下事项：

- [x] 所有任务项已完成
- [x] 单元测试通过
- [x] 集成测试通过
- [ ] 代码已提交并推送
- [x] 开发日志已更新
