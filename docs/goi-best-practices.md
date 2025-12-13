# GOI 最佳实践

> GOI (Guided Operation Intelligence) 开发与集成最佳实践指南

## 目录

- [添加 GOI 支持的资源属性](#添加-goi-支持的资源属性)
- [检查点设计原则](#检查点设计原则)
- [操作追踪集成](#操作追踪集成)
- [计划协调最佳实践](#计划协调最佳实践)
- [模式切换处理](#模式切换处理)
- [性能优化](#性能优化)
- [测试策略](#测试策略)

---

## 添加 GOI 支持的资源属性

### 基本原则

为页面元素添加 GOI 支持时，需要添加 `data-goi-*` 属性以便操作追踪器识别。

### 必需属性

```tsx
// 资源项目（如提示词卡片、任务行）
<div
  data-goi-resource="prompt"           // 资源类型
  data-goi-resource-id="prompt-123"    // 资源 ID
  data-goi-label="情感分析提示词"        // 可读标签（用于 AI 理解）
>
  {/* 内容 */}
</div>

// 操作按钮
<Button
  data-goi-action="create"             // 操作类型
  data-goi-resource="task"             // 目标资源类型
  data-testid="create-task-btn"        // 测试 ID（E2E 测试使用）
>
  新建任务
</Button>
```

### 支持的资源类型

| 资源类型 | 说明 | 示例路由 |
|---------|------|---------|
| `prompt` | 提示词 | `/prompts`, `/prompts/:id` |
| `dataset` | 数据集 | `/datasets`, `/datasets/:id` |
| `task` | 任务 | `/tasks`, `/tasks/:id` |
| `model` | 模型 | `/models` |
| `evaluator` | 评估器 | `/evaluators` |
| `scheduled` | 定时任务 | `/scheduled` |
| `monitor` | 监控告警 | `/monitor/alerts` |

### 支持的操作类型

| 操作类型 | 说明 | 典型按钮文本 |
|---------|------|-------------|
| `navigate` | 导航到列表/详情 | 菜单项、面包屑 |
| `select` | 选择资源 | 卡片点击、表格行选择 |
| `create` | 创建资源 | 新建、创建 |
| `edit` | 编辑资源 | 编辑、修改 |
| `delete` | 删除资源 | 删除、移除 |
| `submit` | 提交表单 | 确定、保存、提交 |
| `cancel` | 取消操作 | 取消、关闭 |

### 完整示例

```tsx
// 提示词列表页
export function PromptList() {
  return (
    <div data-goi-page="prompts" data-goi-resource="prompt">
      {/* 创建按钮 */}
      <Button
        data-goi-action="create"
        data-goi-resource="prompt"
        data-testid="create-prompt-btn"
        onClick={handleCreate}
      >
        新建提示词
      </Button>

      {/* 提示词列表 */}
      {prompts.map(prompt => (
        <Card
          key={prompt.id}
          data-goi-resource="prompt"
          data-goi-resource-id={prompt.id}
          data-goi-label={prompt.name}
          onClick={() => handleSelect(prompt.id)}
        >
          <Card.Meta
            title={prompt.name}
            description={prompt.description}
          />
          <Button
            data-goi-action="edit"
            data-goi-resource="prompt"
            data-goi-resource-id={prompt.id}
            onClick={(e) => {
              e.stopPropagation()
              handleEdit(prompt.id)
            }}
          >
            编辑
          </Button>
        </Card>
      ))}
    </div>
  )
}
```

---

## 检查点设计原则

### 何时需要检查点

检查点用于在关键操作前获取用户确认，以下场景必须设置检查点：

1. **资源选择** - 用户需要确认 AI 选择的资源
2. **参数确认** - 批量操作或重要配置变更
3. **不可逆操作** - 删除、提交等无法撤销的操作
4. **高风险操作** - 涉及成本、时间消耗的操作

### 检查点类型

```typescript
type CheckpointType =
  | 'resource_selection'  // 资源选择确认
  | 'params_confirm'      // 参数确认
  | 'action_confirm'      // 操作确认
  | 'info'               // 信息展示（无需确认）
```

### 检查点配置示例

```typescript
// 计划步骤中的检查点配置
const step: PlanStep = {
  id: 'step-2',
  order: 1,
  userLabel: '选择要测试的提示词',
  operation: {
    type: 'access',
    target: { resourceType: 'prompt' },
    action: 'select',
  },
  status: 'pending',
  checkpoint: {
    required: true,
    type: 'resource_selection',
    message: '请确认要使用的提示词，这将用于后续的测试任务',
    options: {
      allowModify: true,     // 允许用户修改选择
      showPreview: true,     // 显示资源预览
      timeout: 30000,        // 超时时间（毫秒）
    },
  },
}
```

### 检查点响应处理

```typescript
// 用户响应处理
function handleCheckpointResponse(
  response: CheckpointResponse,
  step: PlanStep
) {
  switch (response.action) {
    case 'approve':
      // 继续执行
      executeStep(step)
      break
    case 'modify':
      // 用户要修改，暂停等待
      pauseExecution()
      showModifyDialog(step)
      break
    case 'reject':
      // 用户拒绝，重新规划
      replanFromStep(step.id)
      break
    case 'takeover':
      // 用户接管，切换到手动模式
      switchToManualMode()
      break
  }
}
```

---

## 操作追踪集成

### 初始化追踪器

```typescript
import { ActionTracker } from '@/lib/goi/collaboration/actionTracker'

// 在应用入口初始化
const tracker = new ActionTracker({
  sessionId: session.id,
  onAction: (action) => {
    // 发送到 GOI 服务
    goiService.trackAction(action)
  },
  filter: {
    // 排除 GOI 面板内的操作
    excludeSelectors: ['[data-goi-panel]', '.goi-copilot'],
  },
})

// 开始追踪
tracker.start()

// 停止追踪（组件卸载时）
tracker.stop()
```

### 自定义操作上报

```typescript
// 对于复杂交互，手动上报操作
tracker.trackCustomAction({
  type: 'custom',
  target: {
    element: '[data-testid="batch-select"]',
    resourceType: 'prompt',
    resourceIds: ['p1', 'p2', 'p3'],
  },
  data: {
    action: 'batch_select',
    count: 3,
  },
})
```

### 避免追踪的元素

以下元素默认不被追踪：

- GOI Copilot 面板内的所有元素
- 带有 `data-goi-ignore` 属性的元素
- 系统 UI（如通知、加载指示器）

```tsx
// 手动排除追踪
<div data-goi-ignore>
  {/* 这里的操作不会被追踪 */}
</div>
```

---

## 计划协调最佳实践

### 协调流程

```
用户操作 → ActionTracker → PlanReconciler → 更新计划状态
                                ↓
                        检测已完成步骤
                                ↓
                        生成续跑建议
```

### 操作匹配规则

PlanReconciler 使用以下规则匹配用户操作与计划步骤：

1. **导航操作匹配**
   - URL 路径包含资源类型即视为导航完成
   - 例：访问 `/prompts/` 匹配 `navigate to prompt list`

2. **选择操作匹配**
   - 点击带有匹配 `resourceType` 和 `resourceId` 的元素
   - 如果计划未指定 resourceId，任意同类型资源的选择都匹配

3. **创建/编辑操作匹配**
   - 点击包含"新建"、"创建"、"编辑"等关键词的按钮

4. **提交操作匹配**
   - 表单提交事件
   - 点击"确定"、"保存"、"提交"按钮

### 处理用户偏离

```typescript
import { DeviationDetector } from '@/lib/goi/collaboration/deviationDetector'

const detector = new DeviationDetector()

// 检测偏离
const deviation = detector.detectDeviation(currentPlan, userActions)

if (deviation.hasDeviation) {
  switch (deviation.type) {
    case 'skipped_step':
      // 用户跳过了步骤，询问是否标记为已完成
      promptSkipConfirmation(deviation.skippedSteps)
      break
    case 'different_resource':
      // 用户选择了不同的资源，更新计划
      updatePlanWithNewResource(deviation.selectedResource)
      break
    case 'unexpected_action':
      // 用户执行了计划外操作，重新规划
      triggerReplan(deviation.unexpectedActions)
      break
  }
}
```

---

## 模式切换处理

### 三种协作模式

| 模式 | 说明 | AI 行为 | 用户期望 |
|------|------|---------|---------|
| `manual` | 手动模式 | 仅观察，不干预 | 完全自主操作 |
| `assisted` | 辅助模式 | 提供建议，需确认 | 审批后执行 |
| `auto` | 自动模式 | 自主执行，异常时暂停 | 监督为主 |

### 模式切换处理

```typescript
function handleModeSwitch(
  fromMode: CollaborationMode,
  toMode: CollaborationMode
) {
  // 保存当前状态
  saveCurrentState()

  // 处理模式切换
  if (toMode === 'manual') {
    // 暂停所有 AI 操作
    pauseExecution()
    hideCheckpoints()
  } else if (toMode === 'assisted') {
    // 恢复检查点机制
    resumeWithCheckpoints()
  } else if (toMode === 'auto') {
    // 开始自动执行
    startAutoExecution()
  }

  // 通知用户
  notifyModeChange(fromMode, toMode)
}
```

### 模式切换时的状态保持

```typescript
// 切换模式时保存的状态
interface SavedState {
  plan: TaskPlan
  currentStepIndex: number
  completedSteps: string[]
  userActions: TrackedAction[]
  checkpointsPending: Checkpoint[]
}

// 恢复状态
function restoreState(state: SavedState) {
  setPlan(state.plan)
  setCurrentStep(state.currentStepIndex)
  // 不恢复 checkpoints，让系统重新评估
}
```

---

## 性能优化

### 计划生成优化

```typescript
// 使用缓存避免重复规划
const planCache = new Map<string, TaskPlan>()

async function generatePlan(goal: string): Promise<TaskPlan> {
  const cacheKey = hashGoal(goal)

  if (planCache.has(cacheKey)) {
    return planCache.get(cacheKey)!
  }

  const plan = await planner.generatePlan(goal)
  planCache.set(cacheKey, plan)

  // 5 分钟后过期
  setTimeout(() => planCache.delete(cacheKey), 5 * 60 * 1000)

  return plan
}
```

### 操作追踪优化

```typescript
// 使用防抖减少高频事件
const tracker = new ActionTracker({
  debounce: {
    input: 300,     // 输入事件 300ms 防抖
    scroll: 100,    // 滚动事件 100ms 防抖
  },
  throttle: {
    mousemove: 50,  // 鼠标移动 50ms 节流
  },
})
```

### 协调计算优化

```typescript
// 增量协调，只处理新操作
class IncrementalReconciler {
  private lastProcessedIndex = 0

  reconcile(plan: TaskPlan, actions: TrackedAction[]) {
    // 只处理新增的操作
    const newActions = actions.slice(this.lastProcessedIndex)
    this.lastProcessedIndex = actions.length

    return this.processNewActions(plan, newActions)
  }
}
```

---

## 测试策略

### 单元测试

```typescript
// 测试计划生成
describe('Planner', () => {
  it('should generate valid plan for goal', async () => {
    const planner = createPlanner('session', { modelId: 'test' })
    const result = await planner.generatePlan('创建测试任务')

    expect(result.success).toBe(true)
    expect(result.todoList?.items.length).toBeGreaterThan(0)
  })
})

// 测试操作匹配
describe('PlanReconciler', () => {
  it('should match navigate action', () => {
    const plan = createTestPlan([
      { operation: { type: 'access', action: 'navigate', target: { resourceType: 'prompt' } } }
    ])
    const actions = [{ type: 'navigate', context: { url: '/prompts/' } }]

    const result = reconciler.reconcile(plan, actions)
    expect(result.steps[0].status).toBe('completed')
  })
})
```

### E2E 测试

```typescript
// 测试完整流程
test('complete task via GOI', async ({ page, goiPage }) => {
  await goiPage.openCopilot()
  await goiPage.switchMode('assisted')
  await goiPage.startWithGoal('创建测试任务')

  await goiPage.waitForTodoList()
  await goiPage.waitForCheckpoint()
  await goiPage.approveCheckpoint()

  await goiPage.approveAllCheckpoints()

  const completedCount = await goiPage.getCompletedTodoCount()
  expect(completedCount).toBeGreaterThan(0)
})
```

### 性能测试

```typescript
test('plan generation under 5s', async ({ page, goiPage }) => {
  const start = Date.now()
  await goiPage.startWithGoal('复杂任务')
  await goiPage.waitForTodoList()

  expect(Date.now() - start).toBeLessThan(5000)
})

test('mode switch responsive', async ({ page, goiPage }) => {
  const times: number[] = []

  for (const mode of ['manual', 'assisted', 'auto']) {
    const start = Date.now()
    await goiPage.switchMode(mode)
    times.push(Date.now() - start)
  }

  const avg = times.reduce((a, b) => a + b) / times.length
  expect(avg).toBeLessThan(500)
})
```

---

## 常见问题

### Q: 操作追踪不工作？

检查以下几点：
1. ActionTracker 是否已调用 `start()`
2. 元素是否在 GOI 面板内（会被过滤）
3. 元素是否有 `data-goi-ignore` 属性

### Q: 计划步骤未被匹配？

检查以下几点：
1. URL 路径是否包含正确的资源类型
2. 资源 ID 是否匹配（如果计划中指定了）
3. 操作类型是否正确（click vs submit）

### Q: 检查点未显示？

检查以下几点：
1. 当前模式是否为 `assisted` 或 `auto`
2. 步骤的 `checkpoint.required` 是否为 `true`
3. 是否已有未处理的检查点

---

## 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| L2 | 2024-12 | 初始版本，支持多步骤规划、检查点、暂停续跑 |
