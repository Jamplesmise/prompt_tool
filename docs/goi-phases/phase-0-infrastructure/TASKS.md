# Phase 0: 基础设施层 - 任务清单

## 阶段概览

| 属性 | 值 |
|------|-----|
| 预估周期 | 2 周 |
| 前置依赖 | 无 |
| 交付物 | 事件系统 + 快照机制 |
| 里程碑 | M1: 基础设施就绪 |

---

## Week 1: 事件系统

### Task 0.1.1: 事件类型定义

**目标**：定义所有事件的 TypeScript 类型

**任务清单**：
- [ ] 创建 `packages/shared/types/goi/events.ts`
- [ ] 定义操作事件类型（RESOURCE_ACCESSED, CREATED, UPDATED, DELETED, TASK_EXECUTED）
- [ ] 定义流程事件类型（TODO_PLANNED, TODO_ITEM_STARTED/COMPLETED/FAILED, TODO_REPLANNED）
- [ ] 定义协作事件类型（CHECKPOINT_*, CONTROL_TRANSFERRED）
- [ ] 定义上下文事件类型（CONTEXT_COMPACTED, CONTEXT_RESTORED, SESSION_*)
- [ ] 定义基础 Event 接口和 payload 类型

**文件清单**：
```
packages/shared/types/goi/events.ts (新增)
packages/shared/types/goi/index.ts (新增)
packages/shared/types/index.ts (修改，导出)
```

**验收标准**：
- [ ] 类型定义完整，覆盖所有事件场景
- [ ] TypeScript 编译通过
- [ ] 导出到 shared 包

---

### Task 0.1.2: Event Bus 实现

**目标**：基于 Redis Pub/Sub 实现事件总线

**任务清单**：
- [ ] 创建 `apps/web/src/lib/events/eventBus.ts`
- [ ] 实现 `publish(event)` 方法 - 发布事件到 Redis Channel
- [ ] 实现 `subscribe(sessionId, callback)` 方法 - 订阅特定会话的事件
- [ ] 实现 `unsubscribe(sessionId)` 方法 - 取消订阅
- [ ] 实现连接池和错误处理
- [ ] 添加事件序列化/反序列化

**文件清单**：
```
apps/web/src/lib/events/eventBus.ts (新增)
apps/web/src/lib/events/types.ts (新增)
apps/web/src/lib/events/index.ts (新增)
```

**技术要点**：
```typescript
// Redis Channel 命名规范
const channel = `goi:events:${sessionId}`;

// 事件结构
interface GoiEvent {
  id: string;
  sessionId: string;
  type: EventType;
  category: EventCategory;
  source: 'user' | 'ai' | 'system';
  payload: unknown;
  timestamp: Date;
}
```

**验收标准**：
- [ ] 事件可以在不同进程间传递
- [ ] 订阅者可以收到实时事件
- [ ] 连接断开后自动重连

---

### Task 0.1.3: Event Store 实现

**目标**：实现事件的持久化存储

**任务清单**：
- [ ] 在 `prisma/schema.prisma` 添加 GoiEvent 模型
- [ ] 执行数据库迁移
- [ ] 创建 `apps/web/src/lib/events/eventStore.ts`
- [ ] 实现 `save(event)` 方法 - 保存单个事件
- [ ] 实现 `saveBatch(events)` 方法 - 批量保存
- [ ] 实现 `query(filters)` 方法 - 查询事件
- [ ] 实现 `getBySessionId(sessionId, options)` 方法

**Prisma Schema**：
```prisma
model GoiEvent {
  id        String   @id @default(cuid())
  sessionId String
  type      String
  category  String
  source    String
  payload   Json
  createdAt DateTime @default(now())

  @@index([sessionId])
  @@index([type])
  @@index([createdAt])
  @@map("goi_events")
}
```

**验收标准**：
- [ ] 事件可以持久化到 PostgreSQL
- [ ] 可以按会话 ID 查询事件
- [ ] 可以按时间范围查询事件
- [ ] 批量写入性能 > 100 events/s

---

### Task 0.1.4: 事件 API 路由

**目标**：提供事件查询和订阅的 HTTP/WebSocket 接口

**任务清单**：
- [ ] 创建 `apps/web/src/app/api/goi/events/route.ts` - REST API
- [ ] 实现 GET 方法 - 查询事件列表
- [ ] 实现 POST 方法 - 手动发布事件（调试用）
- [ ] 创建 `apps/web/src/app/api/goi/events/subscribe/route.ts` - WebSocket
- [ ] 实现 WebSocket 连接和消息推送

**API 规格**：
```typescript
// GET /api/goi/events
// Query params: sessionId, from, to, type, limit, offset

// POST /api/goi/events
// Body: { sessionId, type, payload }

// WS /api/goi/events/subscribe?sessionId={id}
// Message format: GoiEvent
```

**验收标准**：
- [ ] REST API 可正常查询事件
- [ ] WebSocket 可实时接收事件
- [ ] 认证和权限检查正常

---

### Task 0.1.5: Service 层事件集成

**目标**：在现有 Service 层添加事件发布逻辑

**任务清单**：
- [ ] 创建事件发布工具函数 `publishResourceEvent()`
- [ ] 修改 `prompt.service.ts` - 在 CRUD 操作后发布事件
- [ ] 修改 `dataset.service.ts` - 在 CRUD 操作后发布事件
- [ ] 修改 `model.service.ts` - 在 CRUD 操作后发布事件
- [ ] 修改 `evaluator.service.ts` - 在 CRUD 操作后发布事件
- [ ] 修改 `task.service.ts` - 在任务操作后发布事件
- [ ] 添加功能开关控制事件发布

**实现模式**：
```typescript
// 在 service 方法末尾添加
async createPrompt(data: CreatePromptData) {
  const prompt = await prisma.prompt.create({ data });

  // 发布事件（异步，不阻塞）
  if (isGoiEnabled()) {
    publishResourceEvent({
      sessionId: getCurrentSessionId(),
      type: 'RESOURCE_CREATED',
      resourceType: 'prompt',
      resourceId: prompt.id,
      data: prompt,
    }).catch(console.error);
  }

  return prompt;
}
```

**验收标准**：
- [ ] 所有 CRUD 操作都能触发事件
- [ ] 事件发布不影响主流程性能
- [ ] 功能开关可以关闭事件发布

---

## Week 2: 状态快照机制

### Task 0.2.1: 快照类型定义

**目标**：定义快照相关的 TypeScript 类型

**任务清单**：
- [ ] 创建 `packages/shared/types/goi/snapshot.ts`
- [ ] 定义 SnapshotTrigger 枚举（todo_start, checkpoint, compact, manual）
- [ ] 定义 SessionState 类型（页面、弹窗、表单状态）
- [ ] 定义 TodoState 类型（TODO List 状态）
- [ ] 定义 ResourceState 类型（资源变更记录）
- [ ] 定义 ContextState 类型（上下文状态）
- [ ] 定义完整的 Snapshot 类型

**文件清单**：
```
packages/shared/types/goi/snapshot.ts (新增)
packages/shared/types/goi/index.ts (修改)
```

**验收标准**：
- [ ] 类型定义完整，覆盖所有快照场景
- [ ] TypeScript 编译通过

---

### Task 0.2.2: 快照存储实现

**目标**：实现快照的数据库存储

**任务清单**：
- [ ] 在 `prisma/schema.prisma` 添加 GoiSnapshot 模型
- [ ] 执行数据库迁移
- [ ] 创建 `apps/web/src/lib/snapshot/snapshotStore.ts`
- [ ] 实现 `save(snapshot)` 方法
- [ ] 实现 `getById(id)` 方法
- [ ] 实现 `getBySessionId(sessionId)` 方法
- [ ] 实现 `cleanup(olderThan)` 方法 - 清理过期快照

**Prisma Schema**：
```prisma
model GoiSnapshot {
  id            String   @id @default(cuid())
  sessionId     String
  todoItemId    String?
  trigger       String
  sessionState  Json
  todoState     Json?
  resourceState Json?
  contextState  Json?
  createdAt     DateTime @default(now())

  @@index([sessionId])
  @@index([createdAt])
  @@map("goi_snapshots")
}
```

**验收标准**：
- [ ] 快照可以保存到数据库
- [ ] 可以按 ID 和会话 ID 查询快照
- [ ] 清理功能正常工作

---

### Task 0.2.3: 快照管理器实现

**目标**：实现快照的创建和恢复逻辑

**任务清单**：
- [ ] 创建 `apps/web/src/lib/snapshot/snapshotManager.ts`
- [ ] 实现 `createSnapshot(sessionId, trigger, todoItemId?)` 方法
- [ ] 实现状态收集逻辑 - 收集会话状态
- [ ] 实现状态收集逻辑 - 收集 TODO 状态
- [ ] 实现状态收集逻辑 - 收集资源变更
- [ ] 实现 `restoreSnapshot(snapshotId)` 方法
- [ ] 实现资源回滚逻辑（撤销创建、恢复修改、恢复删除）

**核心逻辑**：
```typescript
// 创建快照
async createSnapshot(sessionId: string, trigger: SnapshotTrigger) {
  const snapshot = {
    sessionId,
    trigger,
    sessionState: await this.collectSessionState(sessionId),
    todoState: await this.collectTodoState(sessionId),
    resourceState: await this.collectResourceState(sessionId),
    contextState: await this.collectContextState(sessionId),
  };
  return snapshotStore.save(snapshot);
}

// 恢复快照
async restoreSnapshot(snapshotId: string) {
  const snapshot = await snapshotStore.getById(snapshotId);

  // 按顺序恢复
  await this.rollbackResources(snapshot.resourceState);
  await this.restoreSessionState(snapshot.sessionState);
  await this.restoreTodoState(snapshot.todoState);
}
```

**验收标准**：
- [ ] 快照可以正确捕获当前状态
- [ ] 恢复快照后状态与快照时一致
- [ ] 资源回滚可以正确撤销变更

---

### Task 0.2.4: 快照 API 路由

**目标**：提供快照操作的 HTTP 接口

**任务清单**：
- [ ] 创建 `apps/web/src/app/api/goi/snapshots/route.ts`
- [ ] 实现 POST 方法 - 创建快照
- [ ] 实现 GET 方法 - 查询快照列表
- [ ] 创建 `apps/web/src/app/api/goi/snapshots/[id]/route.ts`
- [ ] 实现 GET 方法 - 获取单个快照
- [ ] 创建 `apps/web/src/app/api/goi/snapshots/[id]/restore/route.ts`
- [ ] 实现 POST 方法 - 恢复到快照
- [ ] 创建 `apps/web/src/app/api/goi/snapshots/cleanup/route.ts`
- [ ] 实现 DELETE 方法 - 清理过期快照

**API 规格**：
```typescript
// POST /api/goi/snapshots
// Body: { sessionId, trigger, todoItemId? }

// GET /api/goi/snapshots?sessionId={id}

// GET /api/goi/snapshots/{id}

// POST /api/goi/snapshots/{id}/restore

// DELETE /api/goi/snapshots/cleanup?olderThan={timestamp}
```

**验收标准**：
- [ ] 所有 API 接口可正常工作
- [ ] 认证和权限检查正常
- [ ] 错误处理完善

---

### Task 0.2.5: 自动快照触发

**目标**：在关键时机自动创建快照

**任务清单**：
- [ ] 在事件订阅中添加自动快照触发逻辑
- [ ] TODO 项开始执行时自动创建快照
- [ ] 检查点通过后自动创建快照
- [ ] 上下文压缩后自动创建快照
- [ ] 添加快照数量限制（每会话最多保留 N 个）

**触发规则**：
```typescript
// 监听事件，触发快照
eventBus.subscribe('*', async (event) => {
  if (event.type === 'TODO_ITEM_STARTED') {
    await snapshotManager.createSnapshot(
      event.sessionId,
      'todo_start',
      event.payload.todoItemId
    );
  }

  if (event.type === 'CHECKPOINT_APPROVED') {
    await snapshotManager.createSnapshot(
      event.sessionId,
      'checkpoint'
    );
  }
});
```

**验收标准**：
- [ ] 关键时机自动创建快照
- [ ] 快照数量在限制范围内
- [ ] 自动清理过期快照

---

## 阶段验收

### M1 里程碑验收标准

**功能验收**：
- [ ] 事件总线可以发布和订阅事件
- [ ] 事件可以持久化到数据库
- [ ] 可以按会话 ID 和时间范围查询事件
- [ ] 快照可以创建和恢复
- [ ] 现有 Service 层操作会自动发布事件

**性能验收**：
- [ ] 事件发布延迟 < 50ms
- [ ] 事件查询响应 < 200ms
- [ ] 快照创建延迟 < 500ms
- [ ] 快照恢复延迟 < 1s

**兼容性验收**：
- [ ] 现有所有功能正常运行（跑一遍 E2E 测试）
- [ ] 关闭事件系统后系统可正常工作

---

## 开发日志

<!-- 在此记录每日开发进度 -->

### 2025-12-11
- 完成任务：
  - [x] Task 0.1.1: 事件类型定义 - 创建 `packages/shared/src/types/goi/events.ts`
  - [x] Task 0.1.2: Event Bus 实现 - 创建 `apps/web/src/lib/events/eventBus.ts`
  - [x] Task 0.1.3: Event Store 实现 - 创建 `apps/web/src/lib/events/eventStore.ts`，更新 Prisma schema
  - [x] Task 0.1.4: 事件 API 路由 - 创建 REST API (`/api/goi/events`) 和 SSE 订阅端点 (`/api/goi/events/subscribe`)
  - [x] Task 0.1.5: Service 层事件集成 - 创建 `publisher.ts` 辅助函数，支持功能开关
  - [x] Task 0.2.1: 快照类型定义 - 创建 `packages/shared/src/types/goi/snapshot.ts`
  - [x] Task 0.2.2: 快照存储实现 - 创建 `apps/web/src/lib/snapshot/snapshotStore.ts`
  - [x] Task 0.2.3: 快照管理器实现 - 创建 `apps/web/src/lib/snapshot/snapshotManager.ts`
  - [x] Task 0.2.4: 快照 API 路由 - 创建 REST API (`/api/goi/snapshots`, `[id]`, `restore`, `cleanup`)
  - [x] Task 0.2.5: 自动快照触发 - 创建 `apps/web/src/lib/snapshot/autoSnapshot.ts`

- 新增文件清单：
  ```
  packages/shared/src/types/goi/
  ├── events.ts          # 事件类型定义
  ├── snapshot.ts        # 快照类型定义
  └── index.ts           # 导出

  apps/web/src/lib/events/
  ├── eventBus.ts        # 事件总线（Redis Pub/Sub）
  ├── eventStore.ts      # 事件持久化（PostgreSQL）
  ├── publisher.ts       # 事件发布辅助函数
  ├── types.ts           # 内部类型
  └── index.ts           # 导出

  apps/web/src/lib/snapshot/
  ├── snapshotStore.ts   # 快照存储
  ├── snapshotManager.ts # 快照管理器
  ├── autoSnapshot.ts    # 自动快照触发
  └── index.ts           # 导出

  apps/web/src/app/api/goi/
  ├── events/
  │   ├── route.ts           # GET/POST 事件
  │   └── subscribe/route.ts # SSE 订阅
  └── snapshots/
      ├── route.ts           # GET/POST 快照
      ├── [id]/route.ts      # GET/DELETE 单个快照
      ├── [id]/restore/route.ts  # POST 恢复快照
      └── cleanup/route.ts   # DELETE 清理快照
  ```

- 遇到问题：
  - Prisma Client 需要重新生成才能识别新增的 GoiEvent 和 GoiSnapshot 模型

- 解决方案：
  - 用户需要手动运行 `pnpm db:push` 或 `pnpm db:generate` 来同步数据库和生成 Prisma Client

- 下一步计划：
  - 进入 Phase 1 开发

- 测试覆盖：
  - [x] `goiEvents.test.ts` - 9 个测试，验证事件类型定义和分类函数
  - [x] `goiSnapshot.test.ts` - 8 个测试，验证快照类型定义
  - 运行 `pnpm test` 在 packages/shared 目录下，所有 17 个测试通过

- 后续扩展（用户补充）：
  - [x] Prisma schema 新增 `GoiTodoList` 模型 - 支持 TODO 列表持久化
  - [x] events.ts 新增 Agent Loop 事件类型：
    - `AGENT_STARTED` / `AGENT_PAUSED` / `AGENT_RESUMED`
    - `AGENT_COMPLETED` / `AGENT_FAILED` / `AGENT_WAITING`
    - `AGENT_STEP_COMPLETED`
  - [x] snapshot.ts 新增 `state_change` 触发类型
  - [x] 新增 `operations.ts` 导出（GOI 操作类型）
  - [x] 新增 `todoItem.ts`（CheckpointType 等类型定义）
