# Phase 1: GOI 核心能力 - 上下文文档

## 阶段目标

实现 GOI 的核心执行能力，包括三种声明式接口、TODO List 系统和 Agent Loop。

**核心理念**：策略与机制分离 - LLM 只负责声明"想要什么"，系统负责"如何实现"。

## 前置依赖

- Phase 0: 事件系统 + 快照机制

## 技术背景

### 1. GOI 三原语

#### Access（访问声明）

声明要访问哪个资源，系统负责导航到该资源。

```typescript
// 声明式
{
  type: 'access',
  target: { resourceType: 'prompt', resourceId: 'xxx' },
  action: 'view'  // view | edit | select
}

// 系统自动处理
// 1. 当前在哪个页面？
// 2. 需要跳转吗？
// 3. 需要打开弹窗吗？
// 4. 执行导航操作
```

**适用场景**：打开详情页、进入管理模块、查看执行结果

#### State（状态声明）

声明资源的期望状态，系统负责将资源变更到该状态。

```typescript
// 声明式
{
  type: 'state',
  target: { resourceType: 'prompt', resourceId: 'xxx' },
  expectedState: {
    name: '情感分析 v2',
    content: '...'
  }
}

// 系统自动处理
// 1. 获取当前状态
// 2. 计算差异
// 3. 应用变更
// 4. 验证结果
```

**适用场景**：创建/更新/删除资源、设置任务状态

#### Observation（观察声明）

声明要获取哪些信息，系统负责收集并返回。

```typescript
// 声明式
{
  type: 'observation',
  queries: [
    { resourceType: 'task', resourceId: 'xxx', fields: ['status', 'progress'] },
    { resourceType: 'dataset', resourceId: 'yyy', fields: ['rowCount', 'columns'] }
  ]
}

// 系统返回结构化数据
{
  results: [
    { status: 'running', progress: 45 },
    { rowCount: 100, columns: ['text', 'label'] }
  ]
}
```

**适用场景**：查询执行进度、获取统计信息、检查配置有效性

### 2. TODO List 系统

#### TODO Item 结构

```
TODO Item
├── 标识信息
│   ├── id: 唯一标识
│   ├── title: 简短标题（用户可见）
│   └── description: 详细描述（AI理解用）
├── 执行信息
│   ├── category: access | state | observation | verify
│   ├── goiOperation: GOI 操作定义
│   ├── dependsOn: 前置依赖项 ID 列表
│   └── condition: 条件执行表达式
├── 状态信息
│   ├── status: pending | in_progress | waiting | completed | failed | skipped
│   ├── startedAt / completedAt
│   └── result: 执行结果
├── 检查点配置
│   ├── checkpoint.required: 是否需要人工确认
│   ├── checkpoint.autoApproveRule: 自动通过规则
│   └── checkpoint.timeout: 超时时间
└── 回滚信息
    ├── rollback.enabled: 是否支持回滚
    └── rollback.snapshotId: 状态快照
```

#### TODO 状态机

```
pending → in_progress → waiting (需确认) → completed
                     ↘ completed (自动通过) ↗
                     → failed → pending (重试)
                              → skipped (跳过)
```

### 3. Agent Loop

```
接收用户目标
    │
    ▼
┌─────────────────────────────────────┐
│ PLAN: 生成 TODO List                │
│ - 分析目标，拆分为原子操作           │
│ - 确定依赖关系，设置检查点           │
└──────────────────┬──────────────────┘
                   │
        ┌──────────┴──────────┐
        │ 还有待执行的 TODO？   │
        └──────────┬──────────┘
                   │
       ┌───────────┴───────────┐
       │ 是                    │ 否
       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ GATHER: 收集    │    │ 完成，生成报告   │
│ 当前系统状态    │    └─────────────────┘
│ 已执行结果      │
│ 相关资源信息    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ACT: 执行 GOI   │
│ 通过 Executor   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ VERIFY: 验证    │
│ 结果是否符合预期 │
└────────┬────────┘
         │
    成功 │ 失败
         ├────→ 回滚 + 重规划
         ▼
    继续下一项
```

## 涉及的文件/模块

### 新增文件

```
packages/shared/types/goi/
├── operations.ts       # GOI 操作类型定义
├── todoItem.ts         # TODO Item 类型定义
└── agentLoop.ts        # Agent Loop 相关类型

apps/web/src/lib/goi/
├── executor/
│   ├── index.ts        # GOI 执行器入口
│   ├── accessHandler.ts    # Access 声明处理
│   ├── stateHandler.ts     # State 声明处理
│   └── observationHandler.ts # Observation 声明处理
├── todo/
│   ├── todoList.ts     # TODO List 管理
│   ├── todoStore.ts    # TODO 持久化
│   └── stateMachine.ts # 状态机实现
├── agent/
│   ├── agentLoop.ts    # Agent Loop 主循环
│   ├── planner.ts      # 计划生成器
│   ├── gatherer.ts     # 上下文收集器
│   └── verifier.ts     # 结果验证器
└── prompts/
    ├── planPrompt.ts   # 计划生成 Prompt
    └── verifyPrompt.ts # 验证 Prompt

apps/web/src/app/api/goi/
├── execute/route.ts    # GOI 执行 API
├── todo/route.ts       # TODO List API
└── agent/route.ts      # Agent Loop API
```

### 数据库模型

```prisma
model GoiTodoList {
  id          String   @id @default(cuid())
  sessionId   String
  goal        String   // 用户目标描述
  status      String   // planning | running | paused | completed | failed
  items       Json     // TODO Item 数组
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([sessionId])
  @@map("goi_todo_lists")
}
```

## API 设计

### GOI 执行 API

```typescript
// 执行 GOI 操作
POST /api/goi/execute
{
  sessionId: string;
  operation: GoiOperation; // Access | State | Observation
}

// 返回
{
  success: boolean;
  result?: unknown;
  error?: string;
  events: GoiEvent[]; // 产生的事件
}
```

### TODO List API

```typescript
// 创建 TODO List（根据目标自动生成）
POST /api/goi/todo
{
  sessionId: string;
  goal: string; // 用户目标描述
}

// 获取 TODO List
GET /api/goi/todo/{id}

// 更新 TODO Item 状态
PATCH /api/goi/todo/{listId}/items/{itemId}
{
  status: 'completed' | 'failed' | 'skipped';
  result?: unknown;
}
```

### Agent Loop API

```typescript
// 启动 Agent Loop
POST /api/goi/agent/start
{
  sessionId: string;
  goal: string;
  mode: 'step' | 'smart' | 'auto'; // 运行模式
}

// 继续执行下一步
POST /api/goi/agent/next
{
  sessionId: string;
  approval?: 'approve' | 'modify' | 'reject';
  modifications?: Partial<TodoItem>;
}

// 暂停执行
POST /api/goi/agent/pause
{
  sessionId: string;
}

// 获取当前状态
GET /api/goi/agent/status?sessionId={id}
```

## 模型调用策略

| 任务 | 模型 | Prompt 要点 |
|------|------|-------------|
| Plan（计划生成） | Claude Sonnet 4 | 提供系统能力说明、资源列表、示例 TODO List |
| Verify（结果验证） | Claude Haiku | 提供期望状态、实际结果、判断是否成功 |

## 验收标准

### 功能验收

- [ ] Access 操作可以正确导航到目标资源
- [ ] State 操作可以正确变更资源状态
- [ ] Observation 操作可以正确返回查询结果
- [ ] TODO List 可以创建、管理、持久化
- [ ] Agent Loop 可以执行简单任务（无人工干预）

### 性能验收

- [ ] 单个 GOI 操作执行延迟 < 2s（不含模型调用）
- [ ] TODO List 生成延迟 < 5s
- [ ] Agent Loop 单步执行延迟 < 3s

## 注意事项

1. **原子性**：State 操作要么全成功，要么全回滚
2. **幂等性**：重复执行同一操作不会产生副作用
3. **超时处理**：长时间操作需要设置超时和取消机制
4. **错误恢复**：失败时自动触发快照回滚

## 参考资源

- GOI 操作示例：见 `goi-transformation-plan.md` 第四章
- Claude Prompt 最佳实践：见项目 `.claude/` 目录
