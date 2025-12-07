# CLAUDE.md - AI 开发指引

> 本文件为 AI 助手快速了解项目的入口文档

## 项目概述

AI 模型测试平台 - 面向 AI 开发团队的提示词测试与模型评估工具

**核心功能**：提示词版本管理、批量测试执行、灵活评估器、结果分析导出、A/B 测试、定时监控、多团队协作

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 + React 18 + TypeScript + Ant Design 5.x + ProComponents |
| 后端 | Next.js API Routes + Prisma + BullMQ |
| 数据库 | PostgreSQL 15 + Redis 7 |
| 状态管理 | Zustand + React Query |
| 进程通信 | Redis Pub/Sub（跨进程事件推送） |

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
```

## AI 助手操作规范

- **长时间命令处理**：当命令执行超过 30 秒未完成时，应中止操作并将命令交给用户在命令行手动执行
- **网络依赖命令**：`pnpm install`、`npm install` 等网络依赖命令，直接提供给用户执行，不在 AI 会话中运行

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

## 分阶段开发文档

> 按开发顺序排列，每个阶段包含上下文（CONTEXT.md）和任务清单（TASKS.md）

### MVP 阶段（Phase 0-5）✅ 已完成

| 阶段 | 文件夹 | 内容 | 状态 |
|------|--------|------|------|
| Phase 0 | `.claude/phases/phase-0-initialization/` | 项目初始化：脚手架、数据库、基础配置 | ✅ |
| Phase 1 | `.claude/phases/phase-1-infrastructure/` | 基础设施：用户认证 + 模型配置 | ✅ |
| Phase 2 | `.claude/phases/phase-2-core-data/` | 核心数据：提示词管理 + 数据集管理 | ✅ |
| Phase 3 | `.claude/phases/phase-3-evaluators/` | 评估器：预置评估器 + 代码评估器 | ✅ |
| Phase 4 | `.claude/phases/phase-4-task-engine/` | 任务引擎：创建、执行、监控、结果 | ✅ |
| Phase 5 | `.claude/phases/phase-5-results-dashboard/` | 结果分析：工作台统计 + 筛选导出 | ✅ |

### V2 阶段（Phase 6-9）✅ 已完成

| 阶段 | 文件夹 | 内容 | 状态 |
|------|--------|------|------|
| Phase 6 | `.claude/phases/phase-6-advanced-evaluators/` | 高级评估器：LLM 评估器 + 组合评估器 | ✅ |
| Phase 7 | `.claude/phases/phase-7-ab-testing/` | A/B 测试 + 断点续跑 + 成本计算 | ✅ |
| Phase 8 | `.claude/phases/phase-8-monitoring/` | 定时监控：定时任务 + 监控中心 + 告警规则 + 通知渠道 | ✅ |
| Phase 9 | `.claude/phases/phase-9-project-management/` | 项目管理：多团队隔离 + 成员管理 + 权限控制 + 系统设置 | ✅ |

### V3 阶段（Phase 10）✅ 已完成

| 阶段 | 文件夹 | 内容 | 状态 |
|------|--------|------|------|
| Phase 10 | `.claude/phases/phase-10-version-management/` | 版本管理增强：提示词分支管理 + 数据集版本管理 | ✅ |

### 部署与状态文档

| 文档 | 内容 |
|------|------|
| `.claude/phases/DEPLOYMENT.md` | 部署与测试：环境配置、Docker、测试策略 |
| `.claude/phases/IMPLEMENTATION-STATUS.md` | 功能实现状态报告：详细对比规划与实现 |

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

## 快速开始新功能

1. 查阅 `docs/01-product-scope.md` 确认功能在范围内
2. 查阅 `docs/03-api-spec.md` 了解 API 设计
3. 查阅 `docs/04-database-schema.md` 了解数据模型
4. 在 `packages/shared/types/` 添加类型
5. 实现 API → Service → Hook → Page
