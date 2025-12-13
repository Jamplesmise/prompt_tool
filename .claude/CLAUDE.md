# CLAUDE.md - AI 开发指引

> 本文件为 AI 助手快速了解项目的入口文档

## 项目概述

AI 模型测试平台 - 面向 AI 开发团队的提示词测试与模型评估工具

**核心功能**：提示词版本管理、批量测试执行、灵活评估器、结构化评估、结果分析导出、A/B 测试、定时监控、多团队协作

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 15 + React 19 + TypeScript + Ant Design 5.x + ProComponents |
| 后端 | Next.js API Routes + Prisma 6 + BullMQ |
| 数据库 | PostgreSQL 15 + Redis 7 |
| 状态管理 | Zustand + React Query |
| 测试 | Vitest + Playwright（E2E） |
| 国际化 | 自研 i18n（中英文切换） |
| 进程通信 | Redis Pub/Sub（跨进程事件推送） |

### Next.js 15 / React 19 注意事项

1. **动态路由参数异步化**：`params` 和 `searchParams` 现在是 Promise
   - API 路由：`const { id } = await params`
   - 客户端组件：`const { id } = use(params)` (需导入 `use` from 'react')

2. **useRef 需要初始值**：
   ```typescript
   // React 19 要求
   const ref = useRef<NodeJS.Timeout | undefined>(undefined)
   // 而不是
   const ref = useRef<NodeJS.Timeout>()
   ```

3. **Prisma 6 JSON 类型变更**：
   - 写入数据库使用 `Prisma.InputJsonValue`
   - 读取数据库返回 `Prisma.JsonValue`
   - null 值使用 `Prisma.JsonNull`

## 项目结构

```
packages/
  shared/           # 共享类型、常量、纯函数
  evaluators/       # 评估器核心逻辑
apps/
  web/              # Next.js 主应用
  sandbox/          # 代码沙箱服务
docs/               # 详细设计文档
```

## 常用命令

```bash
pnpm dev            # 启动开发
pnpm build          # 构建
pnpm db:push        # 同步数据库
pnpm db:seed        # 初始化数据
pnpm lint           # 代码检查
pnpm test           # 运行单元测试（Vitest）
pnpm test:e2e       # 运行 E2E 测试（Playwright，需先启动服务）
```

### 测试框架

- **单元测试**：使用 [Vitest](https://vitest.dev/)，测试文件放在 `__tests__/` 目录或使用 `.test.ts` 后缀
- **E2E 测试**：使用 [Playwright](https://playwright.dev/)，测试文件在 `e2e/` 目录

## AI 助手操作规范

- **长时间命令处理**：当命令执行超过 30 秒未完成时，应中止操作并将命令交给用户在命令行手动执行
- **网络依赖命令**：`pnpm install`、`npm install` 等网络依赖命令，直接提供给用户执行，不在 AI 会话中运行

## ⚠️ 安全规范（重要）

> **教训记录**：2025-12-07 发生敏感信息泄露事件，需使用 `git-filter-repo` 清理 Git 历史

### 禁止提交的敏感信息

以下内容 **绝对禁止** 出现在代码、文档、测试文件中：

| 类型 | 示例 | 正确做法 |
|------|------|----------|
| 数据库密码 | `postgres:password123@` | 使用环境变量 `${DATABASE_URL}` |
| API 密钥 | `sk-xxxx`, `token-xxxx` | 使用环境变量 `${API_KEY}` |
| 服务器地址 | `xxx.sealosbja.site` | 使用占位符 `localhost` 或 `example.com` |
| 端口号（生产） | `:31402`, `:47460` | 使用默认端口 `:5432`, `:27017` |
| 加密密钥 | 32位真实密钥 | 使用示例值 `your-secret-key-here` |

### 安全检查清单

创建或修改文件时，必须检查：

1. **`.env.example`** - 只包含占位符，不含真实凭据
2. **`.env.test`** - 使用 `localhost` 和示例密码
3. **测试文件** - 不含真实服务地址或凭据
4. **文档/TASKS.md** - 不含生产环境 URL
5. **临时调试文件** - 用完立即删除，不要提交

### 提交前检查命令

```bash
# 检查是否有敏感信息
git diff --cached | grep -E "(password|secret|token|api.?key|:.*@.*\.site)"

# 如果发现泄露，使用 git-filter-repo 清理历史
pip install git-filter-repo
git filter-repo --replace-text /tmp/replacements.txt --force
```

### 泄露后处理流程

1. **立即轮换** 所有已泄露的密码和密钥
2. **清理历史** 使用 `git-filter-repo` 重写提交历史
3. **强制推送** `git push --force --all`
4. **通知团队** 确保所有人重新 clone 仓库

## 开发规范

### 命名

- 文件：`camelCase.ts`
- 组件：`PascalCase.tsx`
- 类型：`PascalCaseType`
- 枚举：`PascalCaseEnum`
- 常量：`UPPER_SNAKE_CASE`

### TypeScript

- 使用 `type` 而非 `interface`
- 使用 `import type` 导入类型
- 禁止 `any`，使用 `unknown`

### API 响应格式

```typescript
{ code: 200, message: "success", data: T }
{ code: 4xxxxx, message: "错误描述", data: null }
```

### Git 提交

```
feat: 新功能
fix: 修复
docs: 文档
refactor: 重构
chore: 杂项
```

## 关键文档索引

| 文档 | 内容 |
|------|------|
| `docs/01-product-scope.md` | 功能边界、术语定义、用户故事 |
| `docs/02-page-spec.md` | 页面布局、组件规格 |
| `docs/03-api-spec.md` | API 接口定义 |
| `docs/04-database-schema.md` | Prisma Schema、JSONB 结构 |
| `docs/05-evaluator-spec.md` | 评估器类型、执行逻辑 |
| `docs/06-task-flow.md` | 任务状态机、执行流程 |
| `docs/07-ui-convention.md` | UI 组件选择、代码示例 |
| `docs/08-project-structure.md` | 目录结构、文件规范 |
| `docs/09-deployment.md` | 环境配置、Docker 部署 |
| `docs/10-troubleshooting.md` | 问题排查与修复记录 |
| `docs/11-design-system.md` | 设计系统规范、组件库、样式指南 |
| `docs/12-structured-evaluation-upgrade-plan-v2.md` | 结构化评估能力升级详细方案 |
| `docs/goi-intelligence-roadmap.md` | GOI 智能等级路线图（L0-L5） |
| `docs/goi-best-practices.md` | GOI 开发与集成最佳实践 |
| `docs/goi-transformation-plan.md` | GOI 总体转型方案 |

## 分阶段开发文档

> 所有开发阶段文档统一存放在 `docs/` 目录下，每个阶段包含上下文（CONTEXT.md）和任务清单（TASKS.md）

### 核心开发阶段 (docs/phases/)

#### MVP 阶段（Phase 0-5）✅ 已完成

| 阶段 | 文件夹 | 内容 | 状态 |
|------|--------|------|------|
| Phase 0 | `docs/phases/phase-0-initialization/` | 项目初始化：脚手架、数据库、基础配置 | ✅ |
| Phase 1 | `docs/phases/phase-1-infrastructure/` | 基础设施：用户认证 + 模型配置 | ✅ |
| Phase 2 | `docs/phases/phase-2-core-data/` | 核心数据：提示词管理 + 数据集管理 | ✅ |
| Phase 3 | `docs/phases/phase-3-evaluators/` | 评估器：预置评估器 + 代码评估器 | ✅ |
| Phase 4 | `docs/phases/phase-4-task-engine/` | 任务引擎：创建、执行、监控、结果 | ✅ |
| Phase 5 | `docs/phases/phase-5-results-dashboard/` | 结果分析：工作台统计 + 筛选导出 | ✅ |

#### V2 阶段（Phase 6-9）✅ 已完成

| 阶段 | 文件夹 | 内容 | 状态 |
|------|--------|------|------|
| Phase 6 | `docs/phases/phase-6-advanced-evaluators/` | 高级评估器：LLM 评估器 + 组合评估器 | ✅ |
| Phase 7 | `docs/phases/phase-7-ab-testing/` | A/B 测试 + 断点续跑 + 成本计算 | ✅ |
| Phase 8 | `docs/phases/phase-8-monitoring/` | 定时监控：定时任务 + 监控中心 + 告警规则 + 通知渠道 | ✅ |
| Phase 9 | `docs/phases/phase-9-project-management/` | 项目管理：多团队隔离 + 成员管理 + 权限控制 + 系统设置 | ✅ |

#### V3 阶段（Phase 10）✅ 已完成

| 阶段 | 文件夹 | 内容 | 状态 |
|------|--------|------|------|
| Phase 10 | `docs/phases/phase-10-version-management/` | 版本管理增强：提示词分支管理 + 数据集版本管理 | ✅ |

#### V4 阶段（Phase 11）🚧 进行中

| 阶段 | 文件夹 | 内容 | 状态 |
|------|--------|------|------|
| Phase 11 | `docs/phases/phase-11-model-integration/` | FastGPT 模型集成 + 前端优化 | 🚧 |

#### 部署与状态文档

| 文档 | 内容 |
|------|------|
| `docs/phases/DEPLOYMENT.md` | 部署与测试：环境配置、Docker、测试策略 |
| `docs/phases/IMPLEMENTATION-STATUS.md` | 功能实现状态报告：详细对比规划与实现 |

### 专项开发计划

| 计划 | 目录 | 内容 | 状态 |
|------|------|------|------|
| 结构化评估升级 | `docs/structured-evaluation-plan/` | 基础结构化能力、AI配置助手、体验优化（3阶段） | ✅ 代码完成 |
| GOI L2 升级 | `docs/goi-l2-upgrade/` | 多步骤规划、检查点确认、暂停续跑、接管交还、操作感知（6阶段） | ✅ 已完成 |
| UI 设计系统 | `docs/design-system/` | 基础主题、核心组件、页面重构、交互增强、打磨优化（5阶段） | |
| UI 功能开发 | `docs/design-ui-plan/` | 仪表盘、任务列表、提示词管理、数据集上传、模型配置、评估器、监控、全局搜索、设置（9模块） | |
| 系统集成 | `docs/integration-plan/` | 基础设施、成员分组、组织管理、权限系统、FastGPT API、测试验证（6阶段） | |
| 产品深度优化 | `docs/product-deep-optimization/` | 用户体验、智能化增强、对比分析、效率优化、专业深度（5阶段） | |
| 技术债务修复 | `docs/bugfix-plan/` | P0 严重、P1 高、P2 中、P3 低（4阶段） | ✅ 全部完成 |

**使用方式**：
1. 按阶段顺序开发，每个阶段有明确的前置依赖
2. 开发前阅读该阶段的 `CONTEXT.md` 了解上下文
3. 按照 `TASKS.md` 中的任务清单逐项完成
4. 在 `TASKS.md` 底部的开发日志中记录进度

## MVU 原则

开发时遵循 **Minimum Viable Unit**：

- 单次改动 < 5 个文件
- 单次代码 < 200 行
- 每个单元可独立运行验证

## 开发优先级

**MVP（Phase 0-5）**：✅ 已完成
- 用户认证
- 提示词 CRUD + 版本
- 数据集上传预览
- 模型配置
- 基础测试执行
- 预置评估器 + Node.js 代码评估器
- 结果查看导出
- 工作台统计

**V2（Phase 6-7）**：✅ 已完成
- LLM 评估器
- 组合评估器
- A/B 测试
- 断点续跑（任务暂停/恢复）
- 成本计算

**V3（Phase 8-9）**：✅ 已完成
- 定时任务（Cron 表达式）
- 监控中心（趋势图表）
- 告警规则（阈值触发）
- 通知渠道（邮件/Webhook）
- 多团队隔离
- 成员管理（RBAC 权限）
- API Token
- 操作日志（审计）
- 系统设置页面

**V3（Phase 10）**：✅ 已完成
- 提示词分支管理（实验分支）
- 数据集版本管理（快照、回滚、Diff）

**V4（Phase 11）**：🚧 进行中
- FastGPT 模型配置集成（MongoDB 直连）
- 模型管理前端优化（参考 FastGPT UI）
- 多模型类型支持（LLM/Embedding/TTS/STT/Rerank）
- JSON 批量配置导入导出
- 默认模型设置

**结构化评估升级**：✅ 代码完成
- InputSchema/OutputSchema 结构化定义
- 字段级评估引擎 + 多种聚合策略
- AI 配置助手（对话式 Schema 生成）
- Schema 模板库 + 从输出推断
- 字段级统计分析 + 回归检测
- 结果导出增强（多 Sheet Excel）

**GOI L2 智能操作**：✅ 已完成
- GOI Copilot 面板（三种协作模式：手动/辅助/自动）
- 多步骤任务规划（自然语言 → TODO List）
- 操作可视化（TODO List 实时状态）
- 检查点机制（资源选择/参数确认/操作确认）
- 暂停续跑（模式切换保持状态）
- 接管交还（用户随时接管控制权）
- 操作感知（追踪用户操作，协调计划状态）

## 快速开始新功能

1. 查阅 `docs/01-product-scope.md` 确认功能在范围内
2. 查阅 `docs/03-api-spec.md` 了解 API 设计
3. 查阅 `docs/04-database-schema.md` 了解数据模型
4. 在 `packages/shared/types/` 添加类型
5. 实现 API → Service → Hook → Page
