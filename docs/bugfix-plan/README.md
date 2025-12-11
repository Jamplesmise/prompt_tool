# 技术债务修复计划

> 基于测试工程师审查报告，系统性修复项目中的技术债务

## 概述

本计划针对 2025-12-09 审查报告中发现的问题，按优先级分阶段修复。

## 问题分类统计

| 严重性 | 数量 | 状态 |
|--------|------|------|
| P0 严重 | 3 | ✅ 已修复 |
| P1 高 | 4 | ✅ 已修复 |
| P2 中 | 4 | ✅ 已修复 |
| P3 低 | 4 | ✅ 已修复 |

## 阶段概览

| 阶段 | 名称 | 优先级 | 任务数 | 状态 |
|------|------|--------|--------|------|
| Phase 1 | [P0 严重问题修复](./phase-1-p0-critical/) | P0 | 3 | ✅ 已完成 |
| Phase 2 | [P1 高优先级修复](./phase-2-p1-high/) | P1 | 4 | ✅ 已完成 |
| Phase 3 | [P2 中优先级修复](./phase-3-p2-medium/) | P2 | 4 | ✅ 已完成 |
| Phase 4 | [P3 低优先级修复](./phase-4-p3-low/) | P3 | 4 | ✅ 已完成 |

## 已完成修复 (Phase 1)

### P0-1: 空 catch 块吞掉错误 ✅
**文件**: `apps/web/src/app/(dashboard)/settings/page.tsx`

**修复内容**:
- 5 处空 `catch { }` 改为显示错误消息
- 使用 `message.error()` 向用户反馈错误

### P0-2: API 速率限制 ✅
**新增文件**:
- `apps/web/src/lib/rateLimit.ts` - 速率限制核心模块
- `apps/web/src/middleware.ts` - 全局安全中间件

**已保护接口**:
| 接口 | 限制 |
|------|------|
| `POST /api/v1/auth/login` | 5 次/分钟 |
| `POST /api/v1/tokens` | 10 次/分钟 |
| `GET /api/v1/tokens` | 60 次/分钟 |

### P0-3: 关键路径测试 ✅
**新增文件**:
- `apps/web/src/__tests__/unit/rateLimit.test.ts`
- `apps/web/src/__tests__/integration/authFlow.test.ts`

## 已完成修复 (Phase 2)

### P1-1: 超大组件拆分 ✅
**文件**: `apps/web/src/app/(dashboard)/settings/page.tsx`

**修复内容**:
- 从 819 行拆分为 181 行主文件 + 9 个独立组件
- 新建 `settings/components/` 目录，包含：
  - ProfilePanel.tsx (130行)
  - AppearancePanel.tsx (35行)
  - SecurityPanel.tsx (83行)
  - TokenPanel.tsx (225行)
  - NotificationPanel.tsx (145行)
  - TeamPanel.tsx (332行)
  - GeneralSettingsPanel.tsx (106行)
  - UserManagementPanel.tsx (242行)
  - AuditLogPanel.tsx (176行)

### P1-2: 输入验证增强 ✅
**新增文件**: `apps/web/src/lib/validation.ts`

**已覆盖接口**:
- 登录接口邮箱/密码验证
- Token 创建参数验证
- 与速率限制中间件集成

### P1-3: 加密密钥环境变量化 ✅
**文件**: `apps/web/src/lib/encryption.ts`

**修复内容**:
- 移除硬编码密钥，改用 `process.env.ENCRYPTION_KEY`
- 添加启动时密钥长度验证
- 更新 `.env.example` 添加配置说明

### P1-4: 会话安全增强 ✅
**文件**: `apps/web/src/lib/auth.ts`

**修复内容**:
- Cookie `sameSite` 从 `'lax'` 改为 `'strict'`
- 添加会话数据 AES-256-GCM 加密
- 服务端会话过期验证

## 已完成修复 (Phase 3)

### P2-1: TODO 项清理 ✅
**修复内容**:
- 实现提示词复制功能 (`/api/v1/prompts/[id]/copy`)
- 添加 `useCopyPrompt` Hook
- 实现密码修改 API (`/api/v1/users/me/password`)
- 连接告警通知分发器
- 清理占位 TODO 注释

### P2-2: 日志统一管理 ✅
**新增文件**: `apps/web/src/lib/logger.ts`

**功能**:
- 统一 logger 工具（debug/info/warn/error）
- 环境感知日志级别（生产环境仅 warn+）
- 支持 LOG_LEVEL 环境变量配置

### P2-3: 并发控制验证 ✅
**已有实现**: `apps/web/src/lib/concurrency.ts`

**确认内容**:
- ConcurrencyLimiter 类已正确实现
- 任务执行器已应用并发限制
- 包含重试和超时控制

### P2-4: 国际化基础设施 ✅
**新增文件**:
- `apps/web/src/lib/i18n/index.ts` - 核心模块
- `apps/web/src/lib/i18n/locales/zh-CN.ts` - 中文语言包
- `apps/web/src/lib/i18n/locales/en-US.ts` - 英文语言包

**功能**:
- t() 翻译函数支持参数插值
- tPlural() 复数形式支持
- localStorage 语言偏好持久化
- ~100 个常用 key 覆盖

## 已完成修复 (Phase 4)

### P3-1: 文档与代码同步 ✅
**文件**: `docs/08-project-structure.md`

**修复内容**:
- 更新 `lib/` 目录结构文档
- 新增 i18n、queue、scheduler、alerting 等模块说明
- 补充新增工具文件（logger、validation、rateLimit 等）

### P3-2: 清理 require/import 混用 ✅
**文件**:
- `apps/web/src/app/(dashboard)/settings/components/TeamPanel.tsx`
- `apps/web/src/app/(dashboard)/settings/components/TokenPanel.tsx`

**修复内容**:
- 将 `require('antd')` 改为 ES6 `import` 语法
- 统一使用 ESM 模块规范

### P3-3: 修复 ReDoS 风险 ✅
**文件**: `apps/web/src/lib/recommendation/promptFeatureExtractor.ts`

**修复内容**:
- 移除包含 `.*` 的正则模式（`根据.*回答`）
- 删除未使用的 `matchesAny` 函数（动态创建正则）
- 改用安全的字符串匹配

### P3-4: 添加死信队列 ✅
**文件**:
- `apps/web/src/lib/queue/taskQueue.ts`
- `apps/web/src/lib/queue/taskWorker.ts`
- `apps/web/src/lib/queue/index.ts`

**新增功能**:
- `DEAD_LETTER_QUEUE_NAME` - 死信队列名称
- `getDeadLetterQueue()` - 获取死信队列实例
- `moveToDeadLetterQueue()` - 将失败任务移至 DLQ
- `getDeadLetterJobs()` - 获取 DLQ 任务列表
- `retryFromDeadLetterQueue()` - 从 DLQ 重试任务
- `clearDeadLetterQueue()` - 清空 DLQ
- `getDeadLetterStats()` - 获取 DLQ 统计信息
- Worker 失败事件自动触发 DLQ 入队

## 文件结构

```
docs/bugfix-plan/
├── README.md                    # 本文件
├── phase-1-p0-critical/
│   ├── CONTEXT.md              # 已完成
│   └── TASKS.md
├── phase-2-p1-high/
│   ├── CONTEXT.md
│   └── TASKS.md
├── phase-3-p2-medium/
│   ├── CONTEXT.md
│   └── TASKS.md
└── phase-4-p3-low/
    ├── CONTEXT.md
    └── TASKS.md
```

## 开发原则

### MVU 原则
- 单次改动 < 5 个文件
- 单次代码 < 200 行
- 每个修复可独立验证

### 验收标准
- [ ] 问题已修复
- [ ] 单元测试通过
- [ ] 无新增 lint 错误
- [ ] 代码审查通过

## 相关文档

- [测试工程师审查报告](../phases/IMPLEMENTATION-STATUS.md)
- [安全规范](../../.claude/CLAUDE.md#安全规范重要)
- [代码规范](../07-ui-convention.md)
