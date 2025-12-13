# Phase 7: 单元测试与集成测试

## 阶段概述

本阶段专注于 GOI 系统的单元测试和集成测试，分为两大部分：
1. **7.A API 集成测试** - 后端 API 端点测试
2. **7.B 前端组件测试** - React 组件、Hooks、Store 测试

**为什么前端测试很重要**：前端组件经常出问题，需要在 E2E 测试之前通过单元测试发现问题，降低调试成本。

## 技术栈

### API 测试
- **框架**: Next.js 15 + Prisma 6
- **测试工具**: Vitest
- **HTTP 客户端**: fetch / supertest
- **数据库**: PostgreSQL 15 + Redis 7

### 前端测试
- **框架**: React 19 + TypeScript
- **测试工具**: Vitest + @testing-library/react
- **Hooks 测试**: @testing-library/react (renderHook)
- **Mock**: vitest mock / msw (Mock Service Worker)

## 前置条件

- Phase 1-6 全部完成
- GOI L1/L2 功能代码已实现
- 开发服务已启动 (`pnpm dev`)
- 数据库已初始化 (`pnpm db:seed`)

---

## 7.A API 集成测试

### API 端点清单（28 个）

| 模块 | 端点数 | 优先级 |
|------|--------|--------|
| Agent API | 7 | P0 |
| Checkpoint API | 3 | P0 |
| Collaboration API | 4 | P0 |
| Snapshot API | 4 | P1 |
| TODO API | 4 | P1 |
| Events API | 2 | P1 |
| Failure API | 2 | P1 |
| Context API | 1 | P2 |
| Execute API | 1 | P2 |

### API 测试目录结构

```
apps/web/src/__tests__/api/goi/
├── agent/
│   ├── start.test.ts
│   ├── step.test.ts
│   ├── pause.test.ts
│   ├── resume.test.ts
│   ├── status.test.ts
│   └── checkpoint.test.ts
├── checkpoint/
│   ├── pending.test.ts
│   ├── respond.test.ts
│   └── rules.test.ts
├── collaboration/
│   ├── mode.test.ts
│   ├── status.test.ts
│   ├── command.test.ts
│   └── transfer.test.ts
├── snapshot/
│   ├── create.test.ts
│   ├── get.test.ts
│   ├── restore.test.ts
│   └── cleanup.test.ts
├── todo/
│   ├── create.test.ts
│   ├── get.test.ts
│   └── update.test.ts
├── events/
│   ├── subscribe.test.ts
│   └── publish.test.ts
├── failure/
│   ├── report.test.ts
│   └── recover.test.ts
└── helpers/
    ├── setup.ts
    ├── fixtures.ts
    └── utils.ts
```

---

## 7.B 前端组件测试

### 组件测试范围

#### P0 核心组件（必须测试）

| 组件 | 文件 | 测试重点 |
|------|------|---------|
| `CopilotPanel` | `CopilotPanel/index.tsx` | 面板开关、状态管理、事件处理 |
| `CommandInput` | `CopilotPanel/CommandInput.tsx` | 输入验证、提交、禁用状态 |
| `TodoListView` | `CopilotPanel/TodoListView.tsx` | 列表渲染、状态更新、分组展示 |
| `ModeSelector` | `CopilotPanel/ModeSelector.tsx` | 模式切换、状态同步 |
| `CheckpointSection` | `CopilotPanel/CheckpointSection.tsx` | 检查点显示、确认/拒绝/跳过 |

#### P1 执行过程组件

| 组件 | 文件 | 测试重点 |
|------|------|---------|
| `ExecutionOverlay` | `ExecutionOverlay.tsx` | 遮罩显示/隐藏、状态同步 |
| `OperationHighlight` | `OperationHighlight.tsx` | 高亮效果、目标元素定位 |
| `ActionBubble` | `ActionBubble.tsx` | 气泡位置、内容渲染 |
| `ExecutionControls` | `ExecutionControls.tsx` | 暂停/继续/停止按钮 |
| `PauseStatusPanel` | `PauseStatusPanel.tsx` | 暂停状态展示、进度显示 |

#### P2 辅助组件

| 组件 | 文件 | 测试重点 |
|------|------|---------|
| `ContextIndicator` | `CopilotPanel/ContextIndicator.tsx` | Token 显示、警告状态 |
| `ModelConfig` | `CopilotPanel/ModelConfig.tsx` | 模型选择、配置更新 |
| `HandbackDialog` | `CopilotPanel/HandbackDialog.tsx` | 对话框显示、确认操作 |
| `FailureRecovery` | `FailureRecovery.tsx` | 错误展示、恢复选项 |
| `ContextWarning` | `ContextWarning.tsx` | 警告显示、压缩触发 |

### Hooks 测试范围

| Hook | 文件 | 测试重点 |
|------|------|---------|
| `useGoiEvents` | `hooks/useGoiEvents.ts` | 事件订阅/取消、事件处理 |
| `useCopilot` | `hooks/useCopilot.ts` | 状态管理、操作方法 |
| `useGoiDialogListener` | `hooks/useGoiDialogListener.ts` | 对话框监听、回调触发 |

### Store 测试范围

| Store | 测试重点 |
|-------|---------|
| Copilot Store | 模式切换、会话状态、TODO 管理 |
| Checkpoint Store | 检查点队列、响应处理 |
| Execution Store | 执行状态、进度追踪 |

### 前端测试目录结构

```
apps/web/src/components/goi/__tests__/
├── CopilotPanel/
│   ├── index.test.tsx
│   ├── CommandInput.test.tsx
│   ├── TodoListView.test.tsx
│   ├── ModeSelector.test.tsx
│   └── CheckpointSection.test.tsx
├── ExecutionOverlay.test.tsx
├── OperationHighlight.test.tsx
├── ActionBubble.test.tsx
├── ExecutionControls.test.tsx
├── PauseStatusPanel.test.tsx
├── ContextIndicator.test.tsx
├── FailureRecovery.test.tsx
└── helpers/
    ├── renderWithProviders.tsx
    ├── mockGoiContext.ts
    └── mockEvents.ts

apps/web/src/hooks/__tests__/
├── useGoiEvents.test.ts
├── useCopilot.test.ts
└── useGoiDialogListener.test.ts

apps/web/src/stores/__tests__/
├── copilotStore.test.ts
├── checkpointStore.test.ts
└── executionStore.test.ts
```

### 测试辅助函数

```typescript
// helpers/renderWithProviders.tsx
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}
```

```typescript
// helpers/mockGoiContext.ts
export const mockGoiState = {
  mode: 'assisted' as const,
  sessionId: 'test-session',
  todoList: {
    id: 'todo-1',
    items: [
      { id: 'item-1', label: '测试步骤 1', status: 'completed' },
      { id: 'item-2', label: '测试步骤 2', status: 'in_progress' },
      { id: 'item-3', label: '测试步骤 3', status: 'pending' },
    ]
  },
  checkpoint: null,
  status: 'executing',
}

export const mockGoiActions = {
  switchMode: vi.fn(),
  startWithGoal: vi.fn(),
  approveCheckpoint: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
}
```

```typescript
// helpers/mockEvents.ts
export function createMockEventSource() {
  const listeners: Record<string, Function[]> = {}

  return {
    addEventListener: (event: string, callback: Function) => {
      listeners[event] = listeners[event] || []
      listeners[event].push(callback)
    },
    removeEventListener: (event: string, callback: Function) => {
      listeners[event] = listeners[event]?.filter(cb => cb !== callback)
    },
    close: vi.fn(),
    // 模拟发送事件
    emit: (event: string, data: any) => {
      listeners[event]?.forEach(cb => cb({ data: JSON.stringify(data) }))
    },
  }
}
```

---

## 验收标准

### API 测试验收

| 标准 | 要求 |
|------|------|
| 测试通过率 | 100% |
| 代码覆盖率 | > 80% |
| 所有 P0 API | 全覆盖 |
| 所有 P1 API | 全覆盖 |

### 前端测试验收

| 标准 | 要求 |
|------|------|
| P0 组件测试通过率 | 100% |
| P1 组件测试通过率 | 95% |
| Hooks 测试覆盖 | 100% |
| Store 测试覆盖 | 100% |
| 组件渲染无报错 | 100% |

---

## 依赖关系

```
Phase 7 (单元测试与集成测试)
    ├── 7.A API 集成测试
    │   └── 被依赖: 7.B 前端测试（Mock API）
    ├── 7.B 前端组件测试
    │   └── 可与 7.A 并行进行
    ├── 依赖: Phase 1-6 (功能实现)
    └── 被依赖: Phase 8 (E2E 测试)
```

---

## 预计工作量

| 任务 | 预计 |
|------|------|
| **7.A API 集成测试** | |
| Agent API 测试 | 1 天 |
| Checkpoint/Collaboration API 测试 | 1 天 |
| 其他 API 测试 | 1 天 |
| **7.B 前端组件测试** | |
| P0 核心组件测试 | 1.5 天 |
| P1 执行过程组件测试 | 1 天 |
| Hooks 和 Store 测试 | 1 天 |
| 辅助函数和 Mock | 0.5 天 |
| **总计** | **7 天** |
