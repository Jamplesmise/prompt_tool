# 项目结构说明

## 一、目录总览

```
ai-eval-platform/
├── .claude/                    # AI 开发配置
│   ├── CLAUDE.md               # AI 开发指引入口
│   ├── 开发理念.md              # 熵控制驱动开发理念
│   ├── agents/                 # Agent 工作流配置
│   └── skills/                 # AI 技能模板
│
├── packages/                   # 共享包
│   ├── shared/                 # @platform/shared
│   └── evaluators/             # @platform/evaluators
│
├── apps/                       # 应用
│   ├── web/                    # 主应用
│   └── sandbox/                # 代码沙箱
│
├── docs/                       # 文档
│   ├── 01-product-scope.md     # 功能边界、术语定义
│   ├── 02-page-spec.md         # 页面布局、组件规格
│   ├── 03-api-spec.md          # API 接口定义
│   ├── 04-database-schema.md   # 数据库 Schema
│   ├── 05-evaluator-spec.md    # 评估器规范
│   ├── 06-task-flow.md         # 任务执行流程
│   ├── 07-ui-convention.md     # UI 组件规范
│   ├── 08-project-structure.md # 项目结构说明
│   ├── 09-deployment.md        # 部署配置
│   ├── 10-troubleshooting.md   # 问题排查
│   ├── 11-design-system.md     # 设计系统规范
│   ├── phases/                 # 核心开发阶段 (Phase 0-11)
│   ├── design-system/          # UI 设计系统 (5 阶段)
│   ├── design-ui-plan/         # UI 功能开发 (9 模块)
│   ├── integration-plan/       # 系统集成计划 (6 阶段)
│   └── product-deep-optimization/  # 产品深度优化 (5 阶段)
│
├── docker/                     # Docker 配置
│
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

---

## 二、packages/shared

共享类型、常量和纯工具函数。

**规则**：
- ✅ 类型定义
- ✅ 常量枚举
- ✅ 纯函数（无副作用）
- ❌ 数据库操作
- ❌ HTTP 请求
- ❌ Node.js 特定 API

```
packages/shared/
├── src/
│   ├── types/                  # 类型定义
│   │   ├── prompt.ts           # 提示词相关类型
│   │   ├── dataset.ts          # 数据集相关类型
│   │   ├── evaluator.ts        # 评估器相关类型
│   │   ├── task.ts             # 任务相关类型
│   │   ├── model.ts            # 模型配置类型
│   │   ├── api.ts              # API 请求/响应类型
│   │   └── index.ts            # 统一导出
│   │
│   ├── constants/              # 常量定义
│   │   ├── evaluator.ts        # 评估器类型枚举
│   │   ├── task.ts             # 任务状态枚举
│   │   ├── error-codes.ts      # 错误码定义
│   │   └── index.ts
│   │
│   ├── utils/                  # 纯工具函数
│   │   ├── template.ts         # 提示词模板解析
│   │   ├── validator.ts        # 校验函数
│   │   ├── formatter.ts        # 格式化函数
│   │   └── index.ts
│   │
│   └── index.ts                # 包入口
│
├── package.json
└── tsconfig.json
```

**类型定义示例**：

```typescript
// types/task.ts
export type TaskStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED';

export type TaskConfig = {
  execution: {
    concurrency: number;
    timeoutSeconds: number;
    retryCount: number;
  };
};

export type TaskProgress = {
  total: number;
  completed: number;
  failed: number;
};

export type Task = {
  id: string;
  name: string;
  status: TaskStatus;
  config: TaskConfig;
  progress: TaskProgress;
  // ...
};
```

---

## 三、packages/evaluators

评估器核心逻辑，可在前后端复用。

**规则**：
- ✅ 评估算法实现
- ✅ 预置评估器
- ❌ 数据库操作
- ❌ 文件系统操作

```
packages/evaluators/
├── src/
│   ├── presets/                # 预置评估器
│   │   ├── exact-match.ts
│   │   ├── contains.ts
│   │   ├── regex.ts
│   │   ├── json-schema.ts
│   │   ├── similarity.ts
│   │   └── index.ts
│   │
│   ├── runner.ts               # 评估器执行引擎
│   ├── types.ts                # 评估器类型
│   └── index.ts
│
├── package.json
└── tsconfig.json
```

**评估器实现示例**：

```typescript
// presets/exact-match.ts
import type { EvaluatorInput, EvaluatorOutput } from '../types';

export function exactMatch(input: EvaluatorInput): EvaluatorOutput {
  const { output, expected } = input;
  const passed = output === expected;
  
  return {
    passed,
    score: passed ? 1 : 0,
    reason: passed ? '完全匹配' : '不匹配',
  };
}
```

---

## 四、apps/web

主 Next.js 应用，包含前端页面和 API 路由。

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 认证相关页面组
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/        # 主应用页面组
│   │   │   ├── page.tsx              # 工作台 /
│   │   │   ├── prompts/
│   │   │   │   ├── page.tsx          # 列表 /prompts
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx      # 新建 /prompts/new
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # 详情 /prompts/:id
│   │   │   ├── datasets/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── models/
│   │   │   │   └── page.tsx
│   │   │   ├── evaluators/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   └── layout.tsx            # 带侧边栏的布局
│   │   │
│   │   ├── api/                # API 路由
│   │   │   └── v1/
│   │   │       ├── auth/
│   │   │       │   ├── login/route.ts
│   │   │       │   ├── logout/route.ts
│   │   │       │   └── me/route.ts
│   │   │       ├── prompts/
│   │   │       │   ├── route.ts              # GET, POST
│   │   │       │   └── [id]/
│   │   │       │       ├── route.ts          # GET, PUT, DELETE
│   │   │       │       ├── versions/
│   │   │       │       │   ├── route.ts      # GET, POST
│   │   │       │       │   ├── diff/route.ts
│   │   │       │       │   └── [vid]/
│   │   │       │       │       ├── route.ts
│   │   │       │       │       └── rollback/route.ts
│   │   │       │       └── test/route.ts
│   │   │       ├── datasets/
│   │   │       │   ├── route.ts
│   │   │       │   ├── templates/
│   │   │       │   │   └── [type]/route.ts
│   │   │       │   └── [id]/
│   │   │       │       ├── route.ts
│   │   │       │       ├── upload/route.ts
│   │   │       │       ├── rows/
│   │   │       │       │   ├── route.ts
│   │   │       │       │   └── [rowId]/route.ts
│   │   │       │       └── download/route.ts
│   │   │       ├── providers/
│   │   │       │   ├── route.ts
│   │   │       │   ├── [id]/
│   │   │       │   │   ├── route.ts
│   │   │       │   │   └── models/route.ts
│   │   │       ├── models/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       ├── route.ts
│   │   │       │       └── test/route.ts
│   │   │       ├── evaluators/
│   │   │       │   ├── route.ts
│   │   │       │   ├── presets/route.ts
│   │   │       │   └── [id]/
│   │   │       │       ├── route.ts
│   │   │       │       └── test/route.ts
│   │   │       ├── tasks/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       ├── route.ts
│   │   │       │       ├── run/route.ts
│   │   │       │       ├── stop/route.ts
│   │   │       │       ├── progress/route.ts   # SSE
│   │   │       │       └── results/
│   │   │       │           ├── route.ts
│   │   │       │           ├── export/route.ts
│   │   │       │           └── [rid]/route.ts
│   │   │       └── stats/
│   │   │           └── overview/route.ts
│   │   │
│   │   ├── layout.tsx          # 根布局
│   │   └── globals.css
│   │
│   ├── components/             # UI 组件
│   │   ├── common/             # 通用组件
│   │   │   ├── DeleteButton.tsx
│   │   │   ├── StatusTag.tsx
│   │   │   ├── CodeEditor.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── index.ts
│   │   ├── prompt/             # 提示词相关组件
│   │   │   ├── PromptEditor.tsx
│   │   │   ├── VersionList.tsx
│   │   │   ├── VersionDiff.tsx
│   │   │   └── QuickTest.tsx
│   │   ├── dataset/            # 数据集相关组件
│   │   │   ├── UploadModal.tsx
│   │   │   ├── DataPreview.tsx
│   │   │   └── FieldMapping.tsx
│   │   ├── evaluator/          # 评估器相关组件
│   │   │   ├── EvaluatorForm.tsx
│   │   │   └── CodeEvaluatorEditor.tsx
│   │   ├── task/               # 任务相关组件
│   │   │   ├── TaskProgress.tsx
│   │   │   ├── ResultTable.tsx
│   │   │   └── ResultDetail.tsx
│   │   └── layout/             # 布局组件
│   │       ├── Sidebar.tsx
│   │       └── Header.tsx
│   │
│   ├── hooks/                  # React Hooks
│   │   ├── usePrompts.ts
│   │   ├── useDatasets.ts
│   │   ├── useModels.ts
│   │   ├── useEvaluators.ts
│   │   ├── useTasks.ts
│   │   └── useTaskProgress.ts
│   │
│   ├── stores/                 # Zustand Stores
│   │   ├── userStore.ts
│   │   └── index.ts
│   │
│   ├── services/               # API 调用封装
│   │   ├── api.ts              # 统一 API 客户端
│   │   ├── prompts.ts
│   │   ├── datasets.ts
│   │   ├── models.ts
│   │   ├── evaluators.ts
│   │   └── tasks.ts
│   │
│   ├── lib/                    # 工具函数与核心模块
│   │   ├── prisma.ts           # Prisma 客户端
│   │   ├── auth.ts             # 认证工具
│   │   ├── api.ts              # API 响应封装
│   │   ├── redis.ts            # Redis 客户端
│   │   ├── encryption.ts       # 加密工具
│   │   ├── validation.ts       # 输入验证
│   │   ├── rateLimit.ts        # 速率限制
│   │   ├── logger.ts           # 统一日志
│   │   ├── modelInvoker.ts     # LLM 调用封装
│   │   ├── taskExecutor.ts     # 任务执行器
│   │   ├── concurrencyLimiter.ts # 并发控制
│   │   │
│   │   ├── i18n/               # 国际化
│   │   │   ├── index.ts
│   │   │   └── locales/
│   │   │
│   │   ├── queue/              # BullMQ 队列
│   │   │   ├── taskQueue.ts
│   │   │   └── taskWorker.ts
│   │   │
│   │   ├── scheduler/          # 定时调度
│   │   │   └── schedulerWorker.ts
│   │   │
│   │   ├── alerting/           # 告警系统
│   │   │   └── detector.ts
│   │   │
│   │   ├── notify/             # 通知渠道
│   │   │   ├── email.ts
│   │   │   └── webhook.ts
│   │   │
│   │   ├── analysis/           # 结果分析
│   │   │   └── anomalyDetector.ts
│   │   │
│   │   ├── comparison/         # 对比分析
│   │   │   └── metricsCalculator.ts
│   │   │
│   │   ├── branch/             # 分支管理
│   │   │   └── branchService.ts
│   │   │
│   │   ├── dataset/            # 数据集版本
│   │   │   └── versionService.ts
│   │   │
│   │   ├── permission/         # 权限系统
│   │   │   └── permissions.ts
│   │   │
│   │   ├── mongodb/            # MongoDB 集成
│   │   │   └── connection.ts
│   │   │
│   │   └── audit/              # 审计日志
│   │       └── logger.ts
│   │
│   └── middleware.ts           # 全局中间件
│
├── prisma/
│   ├── schema.prisma           # 数据库模型
│   ├── seed.ts                 # 初始数据
│   └── migrations/             # 迁移文件
│
├── public/                     # 静态资源
│
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 五、apps/sandbox

代码沙箱服务，独立部署。

```
apps/sandbox/
├── src/
│   ├── executors/              # 代码执行器
│   │   ├── nodejs.ts           # Node.js 执行器
│   │   └── python.ts           # Python 执行器 (V2)
│   │
│   ├── security/               # 安全限制
│   │   ├── resource-limit.ts   # 资源限制
│   │   └── whitelist.ts        # 模块白名单
│   │
│   ├── routes/                 # API 路由
│   │   └── execute.ts
│   │
│   └── server.ts               # HTTP 服务入口
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

**沙箱 API**：

```
POST /execute
Content-Type: application/json
Authorization: Bearer <SANDBOX_SECRET>

{
  "language": "nodejs",
  "code": "module.exports = async function(input, output, expected) { ... }",
  "input": {
    "input": "...",
    "output": "...",
    "expected": "...",
    "metadata": {}
  },
  "timeout": 5000
}

Response:
{
  "success": true,
  "result": {
    "passed": true,
    "score": 1.0,
    "reason": "..."
  },
  "executionTime": 123
}
```

---

## 六、文件命名规范

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 页面组件 | page.tsx | `app/prompts/page.tsx` |
| 布局组件 | layout.tsx | `app/(dashboard)/layout.tsx` |
| API 路由 | route.ts | `app/api/v1/prompts/route.ts` |
| React 组件 | PascalCase | `PromptEditor.tsx` |
| 工具函数 | camelCase | `formatDate.ts` |
| 类型定义 | camelCase | `prompt.ts` |
| 常量文件 | camelCase | `errorCodes.ts` |
| Hook | use 前缀 | `usePrompts.ts` |
| Store | xxxStore | `userStore.ts` |

---

## 七、导入规范

### 7.1 路径别名

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@platform/shared": ["../../packages/shared/src"],
      "@platform/evaluators": ["../../packages/evaluators/src"]
    }
  }
}
```

### 7.2 导入顺序

```typescript
// 1. 外部库
import { useState, useEffect } from 'react';
import { Button, Table } from 'antd';

// 2. 内部包
import type { Task } from '@platform/shared';

// 3. 项目内部
import { api } from '@/services/api';
import { useTasks } from '@/hooks/useTasks';

// 4. 相对路径
import { StatusTag } from './StatusTag';
```

---

## 八、环境配置

### 8.1 环境变量文件

```
apps/web/
├── .env                    # 默认配置（提交到 Git）
├── .env.local              # 本地覆盖（不提交）
├── .env.development        # 开发环境
└── .env.production         # 生产环境
```

### 8.2 环境变量使用

```typescript
// 服务端使用
const dbUrl = process.env.DATABASE_URL;

// 客户端使用（需要 NEXT_PUBLIC_ 前缀）
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

## 九、开发流程

### 9.1 新增功能流程

1. 在 `packages/shared/types/` 添加类型定义
2. 在 `prisma/schema.prisma` 添加数据模型
3. 运行 `pnpm db:push` 同步数据库
4. 在 `app/api/v1/` 添加 API 路由
5. 在 `services/` 添加 API 调用封装
6. 在 `hooks/` 添加 React Query Hook
7. 在 `app/(dashboard)/` 添加页面
8. 在 `components/` 添加组件

### 9.2 修改数据库流程

1. 修改 `prisma/schema.prisma`
2. 开发环境：`pnpm db:push`
3. 生产环境：`pnpm db:migrate`
