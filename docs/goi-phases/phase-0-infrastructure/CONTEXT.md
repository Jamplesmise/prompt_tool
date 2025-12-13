# Phase 0: 基础设施层 - 上下文文档

## 阶段目标

构建 GOI 系统的底层基础设施，包括事件系统和状态快照机制，为后续阶段提供支撑。

**核心原则**：所有改造都是在现有系统之上的**装饰层**，不改变底层 API。

## 前置依赖

- 无（本阶段是所有后续阶段的基础）

## 技术背景

### 1. 事件系统设计

#### 为什么需要事件系统？

1. **统一记录**：无论操作来自用户还是 AI，都通过事件记录
2. **实时同步**：AI 可以感知用户操作，用户可以看到 AI 操作
3. **状态重建**：支持回滚和断点续作
4. **审计追踪**：所有操作可追溯

#### 事件类型分类

| 类型 | 说明 | 示例 |
|------|------|------|
| 操作事件 | 资源的 CRUD 操作 | `RESOURCE_CREATED`, `RESOURCE_UPDATED` |
| 流程事件 | TODO List 执行进度 | `TODO_ITEM_STARTED`, `TODO_ITEM_COMPLETED` |
| 协作事件 | 人机交互记录 | `CHECKPOINT_REACHED`, `CONTROL_TRANSFERRED` |
| 上下文事件 | 记忆管理 | `CONTEXT_COMPACTED`, `SESSION_STARTED` |

#### 复用现有基础设施

- **Redis Pub/Sub**：已用于任务执行的实时进度推送，复用做事件总线
- **PostgreSQL**：新增事件表存储持久化事件

### 2. 状态快照机制

#### 快照用途

1. **精确回滚**：失败时恢复到安全状态
2. **断点续作**：用户接管后可从任意步骤继续
3. **上下文恢复**：会话中断后可重建上下文

#### 快照内容

```
快照 (Snapshot)
├── 元信息
│   ├── snapshotId: 唯一标识
│   ├── timestamp: 创建时间
│   ├── trigger: 触发原因
│   └── todoItemId: 关联的 TODO 项
├── 会话状态
│   ├── currentPage: 当前页面
│   ├── openDialogs: 打开的弹窗
│   ├── formStates: 表单状态
│   └── selectedItems: 选中的资源
├── TODO 状态
│   ├── todoListId
│   ├── completedItems
│   └── currentItemIndex
├── 资源状态（差异记录）
│   ├── createdResources
│   ├── modifiedResources
│   └── deletedResources
└── 上下文状态
    ├── contextSummary
    └── tokenUsage
```

## 涉及的文件/模块

### 新增文件

```
packages/shared/types/
├── goi/
│   ├── events.ts           # 事件类型定义
│   └── snapshot.ts         # 快照类型定义

apps/web/src/
├── lib/
│   ├── events/
│   │   ├── eventBus.ts     # 事件总线实现
│   │   ├── eventStore.ts   # 事件存储
│   │   └── types.ts        # 内部类型
│   └── snapshot/
│       ├── snapshotManager.ts  # 快照管理
│       └── snapshotStore.ts    # 快照存储

prisma/
└── schema.prisma           # 新增事件和快照表
```

### 需要修改的文件

```
apps/web/src/services/
├── prompt.service.ts       # 添加事件发布
├── dataset.service.ts      # 添加事件发布
├── model.service.ts        # 添加事件发布
├── evaluator.service.ts    # 添加事件发布
└── task.service.ts         # 添加事件发布
```

## 数据库设计

### 事件表 (goi_events)

```sql
CREATE TABLE goi_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL,           -- 会话ID
  type        VARCHAR(50) NOT NULL,    -- 事件类型
  category    VARCHAR(20) NOT NULL,    -- 分类：operation/flow/collaboration/context
  source      VARCHAR(10) NOT NULL,    -- 来源：user/ai/system
  payload     JSONB NOT NULL,          -- 事件数据
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  -- 索引
  INDEX idx_session_id (session_id),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
);
```

### 快照表 (goi_snapshots)

```sql
CREATE TABLE goi_snapshots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL,
  todo_item_id    UUID,                  -- 关联的 TODO 项
  trigger         VARCHAR(30) NOT NULL,  -- 触发原因
  session_state   JSONB NOT NULL,        -- 会话状态
  todo_state      JSONB,                 -- TODO 状态
  resource_state  JSONB,                 -- 资源状态
  context_state   JSONB,                 -- 上下文状态
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at)
);
```

## API 设计

### 事件 API

```typescript
// 发布事件
POST /api/goi/events
{
  sessionId: string;
  type: EventType;
  payload: Record<string, unknown>;
}

// 查询事件
GET /api/goi/events?sessionId={id}&from={timestamp}&to={timestamp}

// 订阅事件（WebSocket）
WS /api/goi/events/subscribe?sessionId={id}
```

### 快照 API

```typescript
// 创建快照
POST /api/goi/snapshots
{
  sessionId: string;
  trigger: SnapshotTrigger;
  todoItemId?: string;
}

// 获取快照
GET /api/goi/snapshots/{id}

// 恢复到快照
POST /api/goi/snapshots/{id}/restore

// 清理过期快照
DELETE /api/goi/snapshots/cleanup?olderThan={timestamp}
```

## 验收标准

### 功能验收

- [ ] 事件总线可以发布和订阅事件
- [ ] 事件可以持久化到数据库
- [ ] 可以按会话 ID 和时间范围查询事件
- [ ] 快照可以创建和恢复
- [ ] 现有 Service 层操作会自动发布事件

### 性能验收

- [ ] 事件发布延迟 < 50ms
- [ ] 事件查询响应 < 200ms
- [ ] 快照创建延迟 < 500ms
- [ ] 快照恢复延迟 < 1s

### 兼容性验收

- [ ] 现有所有功能正常运行
- [ ] 关闭事件系统后系统可正常工作

## 注意事项

1. **异步发布**：事件发布不能阻塞主流程
2. **批量写入**：高频事件使用批量写入优化
3. **数据清理**：设置事件和快照的自动清理策略
4. **向后兼容**：通过功能开关控制事件发布

## 参考资源

- 现有 Redis 配置：`apps/web/src/lib/redis.ts`
- 现有事件模式：`apps/web/src/lib/taskEvents.ts`（任务执行进度推送）
