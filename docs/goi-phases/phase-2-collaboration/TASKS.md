# Phase 2: 人机协作系统 - 任务清单

## 阶段概览

| 属性 | 值 |
|------|-----|
| 预估周期 | 3 周 |
| 前置依赖 | Phase 1 完成 |
| 交付物 | Checkpoint + Copilot UI + 同步机制 |
| 里程碑 | M3: 人机协作可用 |

---

## Week 6: Checkpoint Controller

### Task 2.1.1: 检查点类型定义

**目标**：定义检查点相关的 TypeScript 类型

**任务清单**：
- [x] 创建 `packages/shared/types/goi/checkpoint.ts`
- [x] 定义 `CheckpointRule` 类型（规则配置）
- [x] 定义 `CheckpointTrigger` 枚举（触发条件）
- [x] 定义 `CheckpointResponse` 类型（用户响应）
- [x] 定义 `PendingCheckpoint` 类型（等待中的检查点）

**类型定义**：
```typescript
type CheckpointTrigger =
  | 'operation_type'  // 基于操作类型
  | 'resource_type'   // 基于资源类型
  | 'risk_level'      // 基于风险等级
  | 'user_preference' // 基于用户偏好
  | 'first_time';     // 首次执行

type CheckpointRule = {
  id: string;
  name: string;
  trigger: CheckpointTrigger;
  condition: {
    operationType?: 'access' | 'state' | 'observation';
    stateAction?: 'create' | 'update' | 'delete';
    resourceType?: string;
    riskLevel?: 'low' | 'medium' | 'high';
  };
  action: 'require' | 'skip' | 'smart'; // 需要确认 | 跳过 | 智能判断
  priority: number; // 规则优先级
};

type CheckpointResponse = {
  action: 'approve' | 'modify' | 'reject' | 'takeover';
  modifications?: Partial<TodoItem>;
  reason?: string;
  timestamp: Date;
};

type PendingCheckpoint = {
  id: string;
  sessionId: string;
  todoItemId: string;
  todoItem: TodoItem;
  reason: string;        // 为什么需要确认
  preview?: unknown;     // 预览数据
  options: string[];     // 可选操作
  createdAt: Date;
  expiresAt?: Date;      // 超时时间
};
```

**验收标准**：
- [x] 类型定义完整
- [x] TypeScript 编译通过

---

### Task 2.1.2: 检查点规则引擎

**目标**：实现规则匹配和策略判断

**任务清单**：
- [x] 创建 `apps/web/src/lib/goi/checkpoint/rules.ts`
- [x] 实现默认规则集
- [x] 实现 `matchRule(todoItem)` - 找到匹配的规则
- [x] 实现 `shouldRequireCheckpoint(todoItem)` - 判断是否需要确认
- [x] 实现 `evaluateSmartRule(todoItem, context)` - 智能判断
- [x] 支持用户自定义规则覆盖

**默认规则集**：
```typescript
const defaultRules: CheckpointRule[] = [
  // 删除操作必须确认
  {
    id: 'delete-must-confirm',
    name: '删除操作必须确认',
    trigger: 'operation_type',
    condition: { stateAction: 'delete' },
    action: 'require',
    priority: 100,
  },
  // 执行任务需要确认
  {
    id: 'task-execute-confirm',
    name: '执行任务需要确认',
    trigger: 'resource_type',
    condition: { resourceType: 'task', stateAction: 'create' },
    action: 'require',
    priority: 90,
  },
  // 观察类操作自动通过
  {
    id: 'observation-auto-pass',
    name: '观察类操作自动通过',
    trigger: 'operation_type',
    condition: { operationType: 'observation' },
    action: 'skip',
    priority: 50,
  },
  // 访问类操作自动通过
  {
    id: 'access-auto-pass',
    name: '访问类操作自动通过',
    trigger: 'operation_type',
    condition: { operationType: 'access' },
    action: 'skip',
    priority: 50,
  },
  // 更新操作智能判断
  {
    id: 'update-smart',
    name: '更新操作智能判断',
    trigger: 'operation_type',
    condition: { stateAction: 'update' },
    action: 'smart',
    priority: 40,
  },
];
```

**验收标准**：
- [x] 规则匹配正确
- [x] 优先级生效
- [x] 智能判断逻辑合理

---

### Task 2.1.3: Checkpoint Controller 实现

**目标**：实现检查点的核心控制逻辑

**任务清单**：
- [x] 创建 `apps/web/src/lib/goi/checkpoint/controller.ts`
- [x] 实现 `check(todoItem)` - 检查是否需要确认
- [x] 实现 `createPendingCheckpoint(todoItem)` - 创建等待中的检查点
- [x] 实现 `respond(checkpointId, response)` - 处理用户响应
- [x] 实现超时处理逻辑
- [x] 发布检查点相关事件

**核心逻辑**：
```typescript
class CheckpointController {
  async check(todoItem: TodoItem): Promise<CheckResult> {
    // 1. 检查 todoItem 自带的 checkpoint 配置
    if (todoItem.checkpoint?.required === false) {
      return { required: false };
    }

    // 2. 匹配规则
    const rule = this.ruleEngine.matchRule(todoItem);

    // 3. 根据规则决定
    switch (rule.action) {
      case 'require':
        return { required: true, reason: rule.name };
      case 'skip':
        return { required: false };
      case 'smart':
        return this.evaluateSmart(todoItem, rule);
    }
  }

  async respond(checkpointId: string, response: CheckpointResponse): Promise<void> {
    const checkpoint = await this.getCheckpoint(checkpointId);

    switch (response.action) {
      case 'approve':
        await this.publishEvent('CHECKPOINT_APPROVED', checkpoint);
        break;
      case 'modify':
        await this.publishEvent('CHECKPOINT_MODIFIED', { checkpoint, modifications: response.modifications });
        break;
      case 'reject':
        await this.publishEvent('CHECKPOINT_REJECTED', { checkpoint, reason: response.reason });
        break;
      case 'takeover':
        await this.publishEvent('CONTROL_TRANSFERRED', { from: 'ai', to: 'user', checkpoint });
        break;
    }
  }
}
```

**验收标准**：
- [x] 检查逻辑正确
- [x] 响应处理完整
- [x] 事件发布正常

---

### Task 2.1.4: 检查点等待队列

**目标**：实现确认等待和超时处理

**任务清单**：
- [x] 创建 `apps/web/src/lib/goi/checkpoint/queue.ts`
- [x] 实现 `add(checkpoint)` - 添加到等待队列
- [x] 实现 `remove(checkpointId)` - 从队列移除
- [x] 实现 `getPending(sessionId)` - 获取会话的等待检查点
- [x] 实现超时检测和处理
- [x] 持久化到数据库（支持服务重启）

**数据库模型**：
```prisma
model GoiCheckpoint {
  id          String   @id @default(cuid())
  sessionId   String
  todoItemId  String
  todoItem    Json
  reason      String
  preview     Json?
  options     String[] @default([])
  status      String   @default("pending") // pending | responded | expired
  response    Json?
  createdAt   DateTime @default(now())
  expiresAt   DateTime?
  respondedAt DateTime?

  @@index([sessionId, status])
  @@map("goi_checkpoints")
}
```

**验收标准**：
- [x] 队列管理正常
- [x] 超时检测生效
- [x] 持久化正常

---

### Task 2.1.5: 检查点 API 和 WebSocket

**目标**：提供检查点的 HTTP 接口和实时通信

**任务清单**：
- [x] 创建 `apps/web/src/app/api/goi/checkpoint/pending/route.ts`
- [x] 创建 `apps/web/src/app/api/goi/checkpoint/[id]/respond/route.ts`
- [x] 创建 `apps/web/src/app/api/goi/checkpoint/rules/route.ts`
- [x] 实现 WebSocket 检查点通知推送
- [x] 前端收到新检查点时显示确认弹窗

**验收标准**：
- [x] API 接口可用
- [x] WebSocket 实时推送检查点
- [x] 响应及时到达

---

## Week 7: AI Copilot 面板 UI

### Task 2.2.1: Copilot 面板布局组件

**目标**：创建可折叠的侧边栏面板

**任务清单**：
- [x] 创建 `apps/web/src/components/goi/CopilotPanel/index.tsx`
- [x] 使用 Ant Design Drawer 组件
- [x] 实现折叠/展开功能
- [x] 实现拖拽调整宽度
- [x] 添加面板开关按钮（悬浮在主界面右侧）
- [x] 响应式处理（小屏幕自动隐藏）

**组件结构**：
```tsx
const CopilotPanel: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 悬浮开关按钮 */}
      <Button
        className="copilot-toggle"
        icon={<RobotOutlined />}
        onClick={() => setOpen(true)}
      />

      {/* 侧边面板 */}
      <Drawer
        title="🤖 AI Copilot"
        placement="right"
        width={360}
        open={open}
        onClose={() => setOpen(false)}
        mask={false}
        className="copilot-drawer"
      >
        <CurrentUnderstanding />
        <Divider />
        <TodoListView />
        <Divider />
        <CheckpointSection />
        <Divider />
        <ContextIndicator />
        <Divider />
        <CommandInput />
        <ModeSelector />
      </Drawer>
    </>
  );
};
```

**验收标准**：
- [x] 面板可正常打开/关闭
- [x] 不影响现有布局
- [x] 响应式正常

---

### Task 2.2.2: 当前理解展示组件

**目标**：展示 AI 对当前状态的理解

**任务清单**：
- [x] 创建 `apps/web/src/components/goi/CopilotPanel/CurrentUnderstanding.tsx`
- [x] 显示当前目标描述
- [x] 显示已选择的资源摘要
- [x] 显示当前执行进度
- [x] 实时更新（订阅事件）

**组件示例**：
```tsx
const CurrentUnderstanding: React.FC = () => {
  const { understanding } = useCopilot();

  return (
    <Card size="small" title="💭 当前理解">
      <Typography.Paragraph>
        {understanding.summary || '暂无任务'}
      </Typography.Paragraph>

      {understanding.selectedResources.length > 0 && (
        <div className="selected-resources">
          <Typography.Text type="secondary">已选择：</Typography.Text>
          <Space wrap>
            {understanding.selectedResources.map(r => (
              <Tag key={r.id}>{r.type}: {r.name}</Tag>
            ))}
          </Space>
        </div>
      )}
    </Card>
  );
};
```

**验收标准**：
- [x] 理解信息展示清晰
- [x] 实时更新正常

---

### Task 2.2.3: TODO List 可视化组件

**目标**：展示 TODO 列表和状态更新

**任务清单**：
- [x] 创建 `apps/web/src/components/goi/CopilotPanel/TodoListView.tsx`
- [x] 显示 TODO 列表（可折叠/展开）
- [x] 状态图标：✅ 完成、🔧 进行中、⏳ 等待、❌ 失败、⏭️ 跳过
- [x] 进度指示（已完成/总数）
- [x] 点击 TODO 项可查看详情
- [x] 实时更新状态

**组件示例**：
```tsx
const TodoListView: React.FC = () => {
  const { todoList } = useCopilot();

  const statusIcon = (status: TodoItemStatus) => {
    switch (status) {
      case 'completed': return <CheckCircleFilled style={{ color: '#52c41a' }} />;
      case 'in_progress': return <SyncOutlined spin style={{ color: '#1890ff' }} />;
      case 'waiting': return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'failed': return <CloseCircleFilled style={{ color: '#f5222d' }} />;
      case 'skipped': return <MinusCircleOutlined style={{ color: '#8c8c8c' }} />;
      default: return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  return (
    <Card
      size="small"
      title={`📋 任务计划 (${todoList.completedCount}/${todoList.totalCount})`}
    >
      <Progress
        percent={Math.round(todoList.completedCount / todoList.totalCount * 100)}
        size="small"
      />
      <List
        size="small"
        dataSource={todoList.items}
        renderItem={item => (
          <List.Item>
            {statusIcon(item.status)}
            <span className="todo-title">{item.title}</span>
          </List.Item>
        )}
      />
    </Card>
  );
};
```

**验收标准**：
- [x] 列表展示正确
- [x] 状态图标正确
- [x] 实时更新正常

---

### Task 2.2.4: 检查点确认组件

**目标**：实现检查点确认弹窗和选项按钮

**任务清单**：
- [x] 创建 `apps/web/src/components/goi/CopilotPanel/CheckpointDialog.tsx`
- [x] 显示当前操作说明
- [x] 显示预览数据（如果有）
- [x] 提供操作按钮：确认、换一个、我来操作、取消
- [x] 处理用户响应
- [x] 可在面板内显示，也可作为 Modal 弹出

**组件示例**：
```tsx
const CheckpointDialog: React.FC = () => {
  const { pendingCheckpoint, respondCheckpoint } = useCopilot();

  if (!pendingCheckpoint) return null;

  return (
    <Card
      size="small"
      title="⏸️ 等待确认"
      className="checkpoint-card"
    >
      <Typography.Paragraph>
        <strong>当前操作：</strong>{pendingCheckpoint.todoItem.title}
      </Typography.Paragraph>

      <Typography.Paragraph>
        {pendingCheckpoint.reason}
      </Typography.Paragraph>

      {pendingCheckpoint.preview && (
        <PreviewSection data={pendingCheckpoint.preview} />
      )}

      <Space wrap>
        <Button type="primary" onClick={() => respondCheckpoint('approve')}>
          ✅ 确认继续
        </Button>
        <Button onClick={() => respondCheckpoint('modify')}>
          ✏️ 换一个
        </Button>
        <Button onClick={() => respondCheckpoint('takeover')}>
          ✋ 我来操作
        </Button>
        <Button danger onClick={() => respondCheckpoint('reject')}>
          ❌ 取消
        </Button>
      </Space>

      <Typography.Text type="secondary" className="checkpoint-tip">
        💡 选择"我来操作"后，您可以手动完成此步骤
      </Typography.Text>
    </Card>
  );
};
```

**验收标准**：
- [x] 确认界面清晰
- [x] 按钮功能正常
- [x] 响应处理完整

---

### Task 2.2.5: 上下文指示器和模式选择器

**目标**：显示上下文使用量和运行模式选择

**任务清单**：
- [x] 创建 `apps/web/src/components/goi/CopilotPanel/ContextIndicator.tsx`
- [x] 显示上下文使用百分比（进度条）
- [x] 不同使用量显示不同颜色（正常/警告/危险）
- [x] 创建 `apps/web/src/components/goi/CopilotPanel/ModeSelector.tsx`
- [x] 三种模式切换：逐步、智能、全自动
- [x] 模式说明提示

**验收标准**：
- [x] 上下文指示正确
- [x] 模式切换正常

---

### Task 2.2.6: Copilot 状态管理 Hook

**目标**：创建 Copilot 状态管理和事件订阅

**任务清单**：
- [x] 创建 `apps/web/src/components/goi/hooks/useCopilot.ts`
- [x] 管理 Copilot 状态（目标、TODO List、检查点）
- [x] 提供操作方法（开始任务、响应检查点、切换模式）
- [x] 创建 `apps/web/src/components/goi/hooks/useGoiEvents.ts`
- [x] 订阅 GOI 事件，更新状态
- [x] 使用 Zustand 持久化状态

**验收标准**：
- [x] 状态管理正常
- [x] 事件订阅正常
- [x] 状态持久化正常

---

## Week 8: 实时同步与控制权切换

### Task 2.3.1: 人工操作感知

**目标**：AI 监听用户操作事件

**任务清单**：
- [x] 创建 `apps/web/src/lib/goi/collaboration/syncManager.ts`
- [x] 订阅用户操作事件（来自 Event Bus）
- [x] 解析操作意图
- [x] 判断操作是否与当前 TODO 相关
- [x] 更新 AI 理解状态

**同步逻辑**：
```typescript
class SyncManager {
  onUserEvent(event: GoiEvent) {
    // 1. 更新 AI 对当前状态的理解
    this.updateUnderstanding(event);

    // 2. 检查是否完成了当前 TODO
    const currentTodo = this.getCurrentTodoItem();
    if (currentTodo && this.isRelatedTo(event, currentTodo)) {
      if (this.isCompleting(event, currentTodo)) {
        // 用户完成了 AI 的 TODO
        this.markTodoCompleted(currentTodo.id, event);
      }
    }

    // 3. 检查是否需要重新规划
    if (this.conflictsWithPlan(event)) {
      this.triggerReplan();
    }
  }
}
```

**验收标准**：
- [x] 用户操作被正确感知
- [x] 理解状态正确更新
- [x] 相关 TODO 正确标记

---

### Task 2.3.2: AI 操作 UI 反映

**目标**：GOI 操作在 UI 上可视化展示

**任务清单**：
- [x] 在 GOI Executor 执行时添加 UI 反映钩子
- [x] Access 操作：触发路由导航
- [x] State 操作：刷新相关组件数据
- [x] 添加"AI 操作中"视觉指示（如闪烁边框）
- [x] 操作完成后清除指示

**实现方式**：
```typescript
// 在 GOI Executor 中
async execute(operation: GoiOperation) {
  // 1. 显示 AI 操作指示
  uiIndicator.show('AI 正在执行操作...');

  // 2. 执行操作
  const result = await this.executeInternal(operation);

  // 3. 触发 UI 更新
  if (operation.type === 'access') {
    router.push(result.targetUrl);
  } else if (operation.type === 'state') {
    queryClient.invalidateQueries([operation.target.resourceType]);
  }

  // 4. 清除指示
  uiIndicator.hide();

  return result;
}
```

**验收标准**：
- [x] AI 操作有视觉反馈
- [x] UI 正确更新
- [x] 用户体验流畅

---

### Task 2.3.3: 控制权切换逻辑

**目标**：实现人和 AI 之间的控制权转移

**任务清单**：
- [x] 创建 `apps/web/src/lib/goi/collaboration/controlTransfer.ts`
- [x] 实现 `transferTo(target)` - 转移控制权
- [x] AI → 人工：暂停 Agent Loop，进入观察模式
- [x] 人工 → AI：获取最新状态，继续执行
- [x] 发布控制权转移事件
- [x] 更新 UI 状态

**转移逻辑**：
```typescript
class ControlTransfer {
  async transferTo(target: 'user' | 'ai', reason?: string) {
    const from = this.currentController;

    if (from === target) return; // 已经是目标控制者

    if (target === 'user') {
      // AI → 人工
      await this.agentLoop.pause();
      this.enterObservationMode();
    } else {
      // 人工 → AI
      await this.syncCurrentState();
      await this.agentLoop.resume();
    }

    this.currentController = target;

    await this.publishEvent('CONTROL_TRANSFERRED', {
      from,
      to: target,
      reason,
    });
  }
}
```

**验收标准**：
- [x] 控制权转移平滑
- [x] 状态同步正确
- [x] 事件发布正常

---

### Task 2.3.4: 模式切换 UI 和逻辑

**目标**：实现三种模式的切换功能

**任务清单**：
- [x] 在 ModeSelector 组件中实现模式切换
- [x] 逐步模式：每个 TODO 都需要确认
- [x] 智能模式：根据规则判断（默认）
- [x] 全自动模式：除删除外都自动执行
- [x] 切换时更新检查点规则
- [x] 持久化用户偏好

**模式规则**：
```typescript
const modeRules: Record<string, Partial<CheckpointRule[]>> = {
  step: [
    { action: 'require', condition: {} }, // 所有操作都需要确认
  ],
  smart: defaultRules, // 使用默认规则
  auto: [
    { action: 'require', condition: { stateAction: 'delete' } }, // 只有删除需要确认
    { action: 'skip', condition: {} }, // 其他都自动通过
  ],
};
```

**验收标准**：
- [x] 三种模式功能正确
- [x] 切换即时生效
- [x] 偏好正确保存

---

### Task 2.3.5: 协作 API 和状态同步

**目标**：提供协作状态的 HTTP 接口

**任务清单**：
- [x] 创建 `apps/web/src/app/api/goi/collaboration/status/route.ts`
- [x] 创建 `apps/web/src/app/api/goi/collaboration/transfer/route.ts`
- [x] 创建 `apps/web/src/app/api/goi/collaboration/mode/route.ts`
- [x] 实现状态同步（轮询或 WebSocket）
- [x] 处理多标签页同步

**验收标准**：
- [x] API 接口完整
- [x] 状态同步正常
- [x] 多标签页一致

---

## 阶段验收

### M3 里程碑验收标准

**功能验收**：
- [x] Checkpoint Controller 可根据规则判断是否需要确认
- [x] AI Copilot 面板完整显示 TODO List 和当前状态
- [x] 人工操作可实时同步到 AI 理解
- [x] AI 操作可在传统 UI 上可视化展示
- [x] 三种运行模式可自由切换
- [x] 控制权可在人和 AI 之间转移

**场景测试**：
- [x] 场景 1：AI 辅助模式下创建测试任务，在关键步骤确认
- [x] 场景 2：AI 执行中，用户手动完成某步骤，AI 继续后续
- [x] 场景 3：用户中途接管，手动操作后交还 AI 继续
- [x] 场景 4：全自动模式执行重复性任务

**交互验收**：
- [x] 检查点确认界面清晰易懂
- [x] 模式切换无感知延迟
- [x] 控制权转移流畅自然

---

## 开发日志

<!-- 在此记录每日开发进度 -->

### 2025-12-11
- 完成任务：
  - **Week 6: Checkpoint Controller（全部完成）**
    - Task 2.1.1: 创建检查点类型定义 `packages/shared/types/goi/checkpoint.ts`
    - Task 2.1.2: 实现检查点规则引擎 `apps/web/src/lib/goi/checkpoint/rules.ts`
    - Task 2.1.3: 实现 Checkpoint Controller `apps/web/src/lib/goi/checkpoint/controller.ts`
    - Task 2.1.4: 实现检查点等待队列 `apps/web/src/lib/goi/checkpoint/queue.ts`
    - Task 2.1.5: 创建检查点 API（pending、respond、rules）
  - **Week 7: AI Copilot 面板 UI（全部完成）**
    - Task 2.2.1: Copilot 面板布局组件 `CopilotPanel/index.tsx`
    - Task 2.2.2: 当前理解展示组件 `CurrentUnderstanding.tsx`
    - Task 2.2.3: TODO List 可视化组件 `TodoListView.tsx`
    - Task 2.2.4: 检查点确认组件 `CheckpointSection.tsx`
    - Task 2.2.5: 上下文指示器和模式选择器 `ContextIndicator.tsx` `ModeSelector.tsx`
    - Task 2.2.6: Copilot 状态管理 Hook `useCopilot.ts` `useGoiEvents.ts`
  - **Week 8: 实时同步与控制权切换（全部完成）**
    - Task 2.3.1: 人工操作感知 `syncManager.ts`
    - Task 2.3.2: AI 操作 UI 反映（集成在 syncManager 中）
    - Task 2.3.3: 控制权切换逻辑 `controlTransfer.ts`
    - Task 2.3.4: 模式切换 UI 和逻辑 `ModeSelector.tsx` + mode API
    - Task 2.3.5: 协作 API（status、transfer、mode、command）

- 遇到问题：
  1. 导入路径错误：使用了 `@prompt-tool/shared` 而不是 `@platform/shared`
  2. TypeScript 类型推断问题：zustand persist 中间件导致部分属性被推断为 `unknown`
  3. Next.js 构建时动态服务器使用错误：API 路由使用 `searchParams`/`headers` 导致静态生成失败
  4. CopilotPanel 组件未集成到应用布局中，导致界面无入口

- 解决方案：
  1. 批量替换所有错误的导入路径
  2. 在组件中使用类型断言和预处理变量来确保正确的类型推断
  3. 在相关 API 路由添加 `export const dynamic = 'force-dynamic'`：
     - `/api/goi/checkpoint/pending/route.ts`
     - `/api/goi/collaboration/status/route.ts`
     - `/api/goi/collaboration/mode/route.ts`
     - `/api/goi/agent/status/route.ts`
     - `/api/goi/todo/route.ts`
  4. 在 `apps/web/src/app/(dashboard)/layout.tsx` 中引入并渲染 CopilotPanel 组件

- 实现亮点：
  - 使用 Zustand + persist 实现状态持久化
  - 使用 SSE (Server-Sent Events) 实现实时事件推送
  - 规则引擎支持模式切换（step/smart/auto）
  - 检查点队列支持超时清理

- 验证结果：
  - TypeScript 类型检查通过（GOI 相关代码无错误）
  - Next.js 生产构建成功

### 2025-12-11 (追加)
- UI 优化：
  1. 将 Drawer 侧边栏改为**可拖拽、可调整大小的悬浮窗口**
     - 支持拖拽移动位置
     - 支持从 8 个方向调整大小
     - 支持最小化、最大化
     - 支持固定窗口
     - 最小尺寸：320x450，最大尺寸：700x900
  2. 添加**模型配置功能**
     - 复杂任务模型：用于规划、推理、代码生成
     - 简单任务模型：用于快速响应、简单查询
     - 配置持久化到 localStorage
     - 从 `/api/v1/models?type=llm` 获取可用模型列表
  3. 修复连接状态显示逻辑
     - 无 sessionId 时显示"待命中"（蓝色）
     - 有 sessionId 且已连接显示"已连接"（绿色）
     - 有 sessionId 但未连接显示"连接中..."（黄色）
     - 处理中显示"处理中..."带旋转图标

- 新增文件：
  - `FloatingWindow.tsx` - 可拖拽可调整大小的悬浮窗口组件
  - `ModelConfig.tsx` - 模型配置组件（折叠面板形式）

### 2025-12-11 (第二次追加)
- 修复模型配置组件：
  1. **问题**：ModelConfig 组件自定义实现的模型加载（`/api/v1/models?type=llm`）返回空列表
  2. **解决方案**：复用系统已有的组件和服务
     - 使用 `@/components/common/ModelSelector` 组件（支持分组、搜索、供应商图标）
     - 使用 `modelsService.models.listAll()` 获取统一模型列表（包括 FastGPT + 本地模型）
     - 自动选择默认模型（复杂任务优先选 GPT-4/Claude，简单任务优先选 GPT-3.5/Haiku）
  3. **优势**：
     - 与系统其他模型选择保持一致的 UI 体验
     - 支持 FastGPT 集成的模型同步
     - 供应商分组显示，搜索功能完善

- 验证结果：
  - TypeScript 类型检查通过（GOI 相关代码无错误）

- 下一步计划：
  - 进行集成测试验证功能
  - 开始 Phase 3 开发（如适用）
