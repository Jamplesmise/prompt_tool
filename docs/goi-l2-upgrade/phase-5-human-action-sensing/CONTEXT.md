# Phase 5: 人工操作感知

## 阶段目标

让 AI 能够感知用户在接管期间的手动操作，从断点智能继续执行。

## 当前问题

### 1. 用户操作不可见

用户接管控制后：
- AI 不知道用户做了什么
- 无法追踪用户的点击、输入
- 状态变化没有记录

### 2. 断点续跑困难

用户操作后想让 AI 继续：
- AI 不知道当前状态
- 不知道哪些步骤已被人工完成
- 可能重复执行或遗漏

### 3. 无法协作

人机无法真正协作：
- 用户改了 AI 不知道
- AI 改了用户不知道
- 状态经常不同步

## 相关文件

| 文件 | 用途 |
|------|------|
| `apps/web/src/lib/goi/collaboration/actionTracker.ts` | 操作追踪器 |
| `apps/web/src/lib/goi/collaboration/stateSync.ts` | 状态同步 |
| `apps/web/src/lib/goi/agent/planReconciler.ts` | 计划协调器 |

## 设计方案

### 1. 操作追踪架构

```
用户操作 → DOM 事件监听 → 操作识别 → 语义化记录 → 同步到 AI
```

### 2. 可追踪的操作类型

```typescript
export type TrackableAction =
  | 'navigate'           // 页面导航
  | 'click'              // 点击元素
  | 'input'              // 输入内容
  | 'select'             // 选择选项
  | 'submit'             // 提交表单
  | 'toggle'             // 切换开关
  | 'upload'             // 上传文件
  | 'delete'             // 删除操作
  | 'drag'               // 拖拽操作
  | 'scroll'             // 滚动（特定场景）

export type TrackedAction = {
  id: string
  type: TrackableAction
  timestamp: Date
  // 操作目标
  target: {
    element: string        // 元素选择器
    resourceType?: ResourceType
    resourceId?: string
    label?: string         // 人类可读标签
  }
  // 操作数据
  data?: {
    value?: unknown
    previousValue?: unknown
    metadata?: Record<string, unknown>
  }
  // 上下文
  context: {
    url: string
    pageTitle: string
    sessionId: string
  }
}
```

### 3. 操作追踪器

```typescript
class ActionTracker {
  private actions: TrackedAction[] = []
  private isTracking = false
  private listeners: Map<string, (e: Event) => void> = new Map()

  // 开始追踪
  startTracking(sessionId: string): void {
    if (this.isTracking) return
    this.isTracking = true
    this.setupListeners()
  }

  // 停止追踪
  stopTracking(): TrackedAction[] {
    this.isTracking = false
    this.removeListeners()
    return this.getActions()
  }

  // 设置事件监听
  private setupListeners(): void {
    // 点击事件
    const clickListener = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      this.recordAction('click', target, e)
    }
    document.addEventListener('click', clickListener, true)
    this.listeners.set('click', clickListener)

    // 输入事件
    const inputListener = (e: InputEvent) => {
      const target = e.target as HTMLInputElement
      this.recordAction('input', target, e)
    }
    document.addEventListener('input', inputListener, true)
    this.listeners.set('input', inputListener)

    // 提交事件
    const submitListener = (e: SubmitEvent) => {
      const target = e.target as HTMLFormElement
      this.recordAction('submit', target, e)
    }
    document.addEventListener('submit', submitListener, true)
    this.listeners.set('submit', submitListener)

    // 导航事件
    window.addEventListener('popstate', () => {
      this.recordNavigation()
    })
  }

  // 记录操作
  private recordAction(
    type: TrackableAction,
    target: HTMLElement,
    event: Event
  ): void {
    const action: TrackedAction = {
      id: generateId(),
      type,
      timestamp: new Date(),
      target: this.identifyTarget(target),
      data: this.extractData(target, event),
      context: {
        url: window.location.href,
        pageTitle: document.title,
        sessionId: this.sessionId,
      },
    }

    this.actions.push(action)
    this.emit('action', action)
  }

  // 识别操作目标
  private identifyTarget(element: HTMLElement): TrackedAction['target'] {
    // 尝试识别资源类型
    const resourceType = this.detectResourceType(element)
    const resourceId = this.detectResourceId(element)

    return {
      element: this.getSelector(element),
      resourceType,
      resourceId,
      label: this.getLabel(element),
    }
  }

  // 检测资源类型
  private detectResourceType(element: HTMLElement): ResourceType | undefined {
    // 从 data-* 属性检测
    const dataType = element.dataset.resourceType
    if (dataType) return dataType as ResourceType

    // 从父元素检测
    const parent = element.closest('[data-resource-type]')
    if (parent) return parent.dataset.resourceType as ResourceType

    // 从 URL 推断
    const url = window.location.pathname
    if (url.includes('/prompts/')) return 'prompt'
    if (url.includes('/datasets/')) return 'dataset'
    if (url.includes('/tasks/')) return 'task'
    // ... 更多推断逻辑

    return undefined
  }
}
```

### 4. 状态同步机制

```typescript
type StateDiff = {
  path: string[]
  type: 'add' | 'remove' | 'change'
  oldValue?: unknown
  newValue?: unknown
}

class StateSync {
  private previousState: Record<string, unknown> = {}

  // 检测状态变化
  detectChanges(currentState: Record<string, unknown>): StateDiff[] {
    const diffs: StateDiff[] = []
    this.compareObjects(this.previousState, currentState, [], diffs)
    this.previousState = structuredClone(currentState)
    return diffs
  }

  // 生成状态摘要
  summarizeChanges(diffs: StateDiff[]): string {
    const summary: string[] = []

    for (const diff of diffs) {
      const path = diff.path.join('.')
      switch (diff.type) {
        case 'add':
          summary.push(`添加了 ${path}: ${JSON.stringify(diff.newValue)}`)
          break
        case 'remove':
          summary.push(`删除了 ${path}`)
          break
        case 'change':
          summary.push(`修改了 ${path}: ${diff.oldValue} → ${diff.newValue}`)
          break
      }
    }

    return summary.join('\n')
  }
}
```

### 5. 计划协调器

```typescript
class PlanReconciler {
  // 根据用户操作更新计划
  reconcilePlan(
    plan: ExecutionPlan,
    userActions: TrackedAction[]
  ): ExecutionPlan {
    const updatedPlan = { ...plan }

    for (const step of updatedPlan.steps) {
      // 检查是否被用户完成
      const matchingAction = this.findMatchingAction(step, userActions)
      if (matchingAction) {
        step.status = 'completed'
        step.completedBy = 'user'
        step.completedAt = matchingAction.timestamp
        step.userAction = matchingAction
      }
    }

    // 重新计算进度
    updatedPlan.progress = this.calculateProgress(updatedPlan)

    return updatedPlan
  }

  // 查找匹配的用户操作
  private findMatchingAction(
    step: PlanStep,
    actions: TrackedAction[]
  ): TrackedAction | undefined {
    return actions.find(action => {
      // 根据步骤类型匹配
      if (step.action === 'navigate' && action.type === 'navigate') {
        return this.matchNavigation(step, action)
      }
      if (step.action === 'select' && action.type === 'click') {
        return this.matchSelection(step, action)
      }
      if (step.action === 'input' && action.type === 'input') {
        return this.matchInput(step, action)
      }
      return false
    })
  }

  // 生成续跑建议
  generateContinuationSuggestion(
    plan: ExecutionPlan,
    userActions: TrackedAction[]
  ): ContinuationSuggestion {
    const reconciledPlan = this.reconcilePlan(plan, userActions)

    // 找到下一个待执行步骤
    const nextStep = reconciledPlan.steps.find(s => s.status === 'pending')

    // 检测用户是否偏离了计划
    const deviation = this.detectDeviation(plan, userActions)

    return {
      canContinue: !deviation.isBlocking,
      nextStep,
      completedByUser: reconciledPlan.steps.filter(s => s.completedBy === 'user'),
      deviation,
      suggestion: this.generateSuggestionText(reconciledPlan, deviation),
    }
  }
}
```

### 6. 续跑对话框设计

```
┌─────────────────────────────────────────────────────────────┐
│ 🔄 准备继续                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 我检测到您在接管期间完成了以下操作：                          │
│                                                             │
│ ✓ 用户操作：选择了 Prompt「sentiment-v3」                    │
│ ✓ 用户操作：上传了数据集文件 test-data.csv                   │
│ ✓ 用户操作：配置了字段映射                                   │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ 计划中剩余步骤：                                             │
│ ○ 选择评估模型（下一步）                                     │
│ ○ 设置评估指标                                              │
│ ○ 启动任务                                                  │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ 💡 建议：您的操作与原计划一致，我可以从「选择评估模型」       │
│    继续执行                                                  │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ [✓ 从这里继续] [📝 调整计划] [✕ 重新开始]               ││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 7. 偏离检测

```typescript
type Deviation = {
  isBlocking: boolean
  type: 'none' | 'minor' | 'major' | 'incompatible'
  details: string[]
  suggestions: string[]
}

class DeviationDetector {
  detect(plan: ExecutionPlan, userActions: TrackedAction[]): Deviation {
    const issues: string[] = []
    const suggestions: string[] = []

    // 检查是否选择了不同的资源
    const resourceMismatch = this.checkResourceMismatch(plan, userActions)
    if (resourceMismatch) {
      issues.push(resourceMismatch.message)
      suggestions.push(resourceMismatch.suggestion)
    }

    // 检查是否跳过了关键步骤
    const skippedSteps = this.checkSkippedSteps(plan, userActions)
    if (skippedSteps.length > 0) {
      issues.push(`跳过了 ${skippedSteps.length} 个步骤`)
      suggestions.push('可以补充执行或标记为不需要')
    }

    // 检查是否进行了计划外操作
    const unexpectedActions = this.checkUnexpectedActions(plan, userActions)
    if (unexpectedActions.length > 0) {
      issues.push(`检测到 ${unexpectedActions.length} 个计划外操作`)
    }

    // 判断偏离程度
    const type = this.categorizeDeviation(issues)

    return {
      isBlocking: type === 'incompatible',
      type,
      details: issues,
      suggestions,
    }
  }
}
```

## 验收标准

1. [ ] 用户接管后的操作被完整记录
2. [ ] 能识别用户完成了计划中的哪些步骤
3. [ ] 交还控制权时显示操作摘要
4. [ ] 可以从断点继续执行
5. [ ] 检测到偏离时给出合理建议
6. [ ] 不干扰用户正常操作

## 依赖

- Phase 4 完成（暂停与接管）

## 下一阶段

完成本阶段后，进入 Phase 6：验证与集成
