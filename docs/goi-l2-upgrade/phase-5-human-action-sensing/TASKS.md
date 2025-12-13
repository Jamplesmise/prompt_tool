# Phase 5 任务清单：人工操作感知

## 前置检查

- [ ] Phase 4 已完成
- [ ] 暂停与接管功能正常工作

---

## Task 5.1: 操作追踪器基础

### 目标
实现 DOM 事件监听和操作记录

### 文件
- `apps/web/src/lib/goi/collaboration/actionTracker.ts`
- `apps/web/src/lib/goi/collaboration/types.ts`

### 步骤

1. 定义可追踪操作类型：
```typescript
// collaboration/types.ts
export type TrackableAction =
  | 'navigate'
  | 'click'
  | 'input'
  | 'select'
  | 'submit'
  | 'toggle'
  | 'upload'
  | 'delete'

export type TrackedAction = {
  id: string
  type: TrackableAction
  timestamp: Date
  target: {
    element: string
    resourceType?: ResourceType
    resourceId?: string
    label?: string
  }
  data?: {
    value?: unknown
    previousValue?: unknown
  }
  context: {
    url: string
    sessionId: string
  }
}
```

2. 实现 ActionTracker 类：
```typescript
// actionTracker.ts
export class ActionTracker {
  private actions: TrackedAction[] = []
  private isTracking = false
  private sessionId: string = ''
  private abortController: AbortController | null = null

  startTracking(sessionId: string): void {
    if (this.isTracking) return
    this.isTracking = true
    this.sessionId = sessionId
    this.actions = []
    this.setupListeners()
  }

  stopTracking(): TrackedAction[] {
    this.isTracking = false
    this.abortController?.abort()
    this.abortController = null
    return [...this.actions]
  }

  getActions(): TrackedAction[] {
    return [...this.actions]
  }

  private setupListeners(): void {
    this.abortController = new AbortController()
    const { signal } = this.abortController

    document.addEventListener('click', this.handleClick, { signal, capture: true })
    document.addEventListener('input', this.handleInput, { signal, capture: true })
    document.addEventListener('submit', this.handleSubmit, { signal, capture: true })
    document.addEventListener('change', this.handleChange, { signal, capture: true })
  }

  private handleClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement
    if (!this.shouldTrack(target)) return

    this.recordAction('click', target)
  }

  private handleInput = (e: Event): void => {
    const target = e.target as HTMLInputElement
    this.recordAction('input', target, {
      value: target.value,
    })
  }

  private handleSubmit = (e: SubmitEvent): void => {
    const form = e.target as HTMLFormElement
    this.recordAction('submit', form)
  }

  private handleChange = (e: Event): void => {
    const target = e.target as HTMLSelectElement
    if (target.tagName === 'SELECT') {
      this.recordAction('select', target, {
        value: target.value,
      })
    }
  }

  private shouldTrack(element: HTMLElement): boolean {
    // 忽略 GOI 面板内的操作
    if (element.closest('[data-goi-panel]')) return false
    // 只追踪可交互元素
    const interactable = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']
    return interactable.includes(element.tagName) ||
           element.onclick !== null ||
           element.closest('button, a, [role="button"]') !== null
  }

  private recordAction(
    type: TrackableAction,
    element: HTMLElement,
    data?: Record<string, unknown>
  ): void {
    const action: TrackedAction = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date(),
      target: this.identifyTarget(element),
      data,
      context: {
        url: window.location.href,
        sessionId: this.sessionId,
      },
    }
    this.actions.push(action)
    this.emit('action', action)
  }

  private identifyTarget(element: HTMLElement) {
    return {
      element: this.getSelector(element),
      resourceType: this.detectResourceType(element),
      resourceId: element.dataset.resourceId,
      label: this.getLabel(element),
    }
  }

  private getSelector(element: HTMLElement): string {
    // 优先使用 data-testid
    if (element.dataset.testid) {
      return `[data-testid="${element.dataset.testid}"]`
    }
    // 使用 id
    if (element.id) {
      return `#${element.id}`
    }
    // 生成路径选择器
    return this.generatePathSelector(element)
  }

  private getLabel(element: HTMLElement): string {
    return element.innerText?.slice(0, 50) ||
           element.getAttribute('aria-label') ||
           element.getAttribute('title') ||
           ''
  }

  private detectResourceType(element: HTMLElement): ResourceType | undefined {
    const type = element.dataset.resourceType ||
                 element.closest('[data-resource-type]')?.dataset.resourceType
    return type as ResourceType | undefined
  }

  // 事件发射
  private listeners = new Map<string, Set<Function>>()
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }
  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback)
  }
  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(cb => cb(data))
  }
}

export const actionTracker = new ActionTracker()
```

### 验收
- [ ] 点击按钮被记录
- [ ] 表单输入被记录
- [ ] 选择操作被记录
- [ ] GOI 面板操作不被记录
- [ ] 可以获取操作历史

---

## Task 5.2: 资源识别增强

### 目标
准确识别用户操作涉及的资源类型和 ID

### 文件
- `apps/web/src/lib/goi/collaboration/resourceDetector.ts`

### 步骤

1. 实现资源检测器：
```typescript
// resourceDetector.ts
export class ResourceDetector {
  // 从元素检测资源
  detectFromElement(element: HTMLElement): DetectedResource | null {
    // 1. 直接属性
    if (element.dataset.resourceType && element.dataset.resourceId) {
      return {
        type: element.dataset.resourceType as ResourceType,
        id: element.dataset.resourceId,
        confidence: 1,
      }
    }

    // 2. 父元素属性
    const parent = element.closest('[data-resource-type][data-resource-id]')
    if (parent) {
      return {
        type: (parent as HTMLElement).dataset.resourceType as ResourceType,
        id: (parent as HTMLElement).dataset.resourceId!,
        confidence: 0.9,
      }
    }

    // 3. URL 推断
    return this.detectFromUrl(window.location.pathname)
  }

  // 从 URL 检测资源
  detectFromUrl(url: string): DetectedResource | null {
    const patterns: Array<{ regex: RegExp; type: ResourceType }> = [
      { regex: /\/prompts\/([^/]+)/, type: 'prompt' },
      { regex: /\/datasets\/([^/]+)/, type: 'dataset' },
      { regex: /\/tasks\/([^/]+)/, type: 'task' },
      { regex: /\/models\/([^/]+)/, type: 'model' },
      { regex: /\/evaluators\/([^/]+)/, type: 'evaluator' },
    ]

    for (const { regex, type } of patterns) {
      const match = url.match(regex)
      if (match) {
        return {
          type,
          id: match[1],
          confidence: 0.8,
        }
      }
    }

    return null
  }

  // 从页面上下文检测
  detectFromContext(): DetectedResource[] {
    const resources: DetectedResource[] = []

    // 检查页面标题
    const title = document.title
    // 检查面包屑
    const breadcrumb = document.querySelector('[data-breadcrumb]')
    // 检查当前选中项
    const selected = document.querySelector('[aria-selected="true"][data-resource-type]')

    if (selected) {
      resources.push({
        type: (selected as HTMLElement).dataset.resourceType as ResourceType,
        id: (selected as HTMLElement).dataset.resourceId!,
        confidence: 0.95,
      })
    }

    return resources
  }
}

type DetectedResource = {
  type: ResourceType
  id: string
  confidence: number
}

export const resourceDetector = new ResourceDetector()
```

2. 为关键组件添加数据属性：
```tsx
// 在列表项组件中添加
<div
  data-resource-type="prompt"
  data-resource-id={prompt.id}
  onClick={...}
>
  {prompt.name}
</div>

// 在卡片组件中添加
<Card data-resource-type="dataset" data-resource-id={dataset.id}>
  ...
</Card>
```

### 验收
- [ ] 点击 Prompt 列表项能识别资源
- [ ] 点击 Dataset 卡片能识别资源
- [ ] 从 URL 能正确推断资源类型
- [ ] 置信度计算合理

---

## Task 5.3: 状态同步器

### 目标
检测和同步页面状态变化

### 文件
- `apps/web/src/lib/goi/collaboration/stateSync.ts`

### 步骤

1. 实现状态同步器：
```typescript
// stateSync.ts
export type StateDiff = {
  path: string[]
  type: 'add' | 'remove' | 'change'
  oldValue?: unknown
  newValue?: unknown
}

export class StateSync {
  private previousSnapshot: Record<string, unknown> = {}

  // 采集当前状态快照
  captureSnapshot(): Record<string, unknown> {
    const snapshot: Record<string, unknown> = {}

    // 当前 URL
    snapshot['url'] = window.location.pathname + window.location.search

    // 表单状态
    const forms = document.querySelectorAll('form')
    forms.forEach((form, index) => {
      const formData = new FormData(form)
      const data: Record<string, unknown> = {}
      formData.forEach((value, key) => {
        data[key] = value
      })
      snapshot[`form_${index}`] = data
    })

    // 选中状态
    const selectedItems = document.querySelectorAll('[aria-selected="true"]')
    snapshot['selectedItems'] = Array.from(selectedItems).map(el => ({
      type: (el as HTMLElement).dataset.resourceType,
      id: (el as HTMLElement).dataset.resourceId,
    }))

    // 输入框值
    const inputs = document.querySelectorAll('input, textarea, select')
    const inputValues: Record<string, unknown> = {}
    inputs.forEach(input => {
      const el = input as HTMLInputElement
      if (el.name || el.id) {
        inputValues[el.name || el.id] = el.value
      }
    })
    snapshot['inputs'] = inputValues

    return snapshot
  }

  // 检测变化
  detectChanges(): StateDiff[] {
    const currentSnapshot = this.captureSnapshot()
    const diffs = this.compareSnapshots(this.previousSnapshot, currentSnapshot)
    this.previousSnapshot = currentSnapshot
    return diffs
  }

  // 比较快照
  private compareSnapshots(
    previous: Record<string, unknown>,
    current: Record<string, unknown>,
    path: string[] = []
  ): StateDiff[] {
    const diffs: StateDiff[] = []

    // 检查新增和变化
    for (const key of Object.keys(current)) {
      const currentPath = [...path, key]
      const prevValue = previous[key]
      const currValue = current[key]

      if (prevValue === undefined) {
        diffs.push({ path: currentPath, type: 'add', newValue: currValue })
      } else if (typeof currValue === 'object' && typeof prevValue === 'object') {
        diffs.push(...this.compareSnapshots(
          prevValue as Record<string, unknown>,
          currValue as Record<string, unknown>,
          currentPath
        ))
      } else if (prevValue !== currValue) {
        diffs.push({
          path: currentPath,
          type: 'change',
          oldValue: prevValue,
          newValue: currValue,
        })
      }
    }

    // 检查删除
    for (const key of Object.keys(previous)) {
      if (current[key] === undefined) {
        diffs.push({
          path: [...path, key],
          type: 'remove',
          oldValue: previous[key],
        })
      }
    }

    return diffs
  }

  // 生成变化摘要
  summarize(diffs: StateDiff[]): string[] {
    return diffs.map(diff => {
      const pathStr = diff.path.join('.')
      switch (diff.type) {
        case 'add':
          return `新增 ${pathStr}`
        case 'remove':
          return `删除 ${pathStr}`
        case 'change':
          return `修改 ${pathStr}: ${diff.oldValue} → ${diff.newValue}`
      }
    })
  }

  // 初始化
  initialize(): void {
    this.previousSnapshot = this.captureSnapshot()
  }
}

export const stateSync = new StateSync()
```

### 验收
- [ ] 能捕获表单状态
- [ ] 能检测选中项变化
- [ ] 能检测输入值变化
- [ ] 变化摘要可读

---

## Task 5.4: 计划协调器

### 目标
根据用户操作更新执行计划

### 文件
- `apps/web/src/lib/goi/agent/planReconciler.ts`

### 步骤

1. 实现计划协调器：
```typescript
// planReconciler.ts
export class PlanReconciler {
  // 协调计划与用户操作
  reconcile(
    plan: ExecutionPlan,
    userActions: TrackedAction[]
  ): ReconciledPlan {
    const updatedSteps = plan.steps.map(step => {
      const matchingAction = this.findMatchingAction(step, userActions)

      if (matchingAction) {
        return {
          ...step,
          status: 'completed' as const,
          completedBy: 'user' as const,
          completedAt: matchingAction.timestamp,
          matchedAction: matchingAction,
        }
      }

      return step
    })

    return {
      ...plan,
      steps: updatedSteps,
      userCompletedCount: updatedSteps.filter(s => s.completedBy === 'user').length,
      aiCompletedCount: updatedSteps.filter(s => s.completedBy === 'ai').length,
      pendingCount: updatedSteps.filter(s => s.status === 'pending').length,
    }
  }

  // 查找匹配的用户操作
  private findMatchingAction(
    step: PlanStep,
    actions: TrackedAction[]
  ): TrackedAction | undefined {
    return actions.find(action => {
      // 导航匹配
      if (step.action === 'navigate' && action.type === 'navigate') {
        return this.matchNavigation(step, action)
      }

      // 选择匹配
      if (step.action === 'select' && (action.type === 'click' || action.type === 'select')) {
        return this.matchSelection(step, action)
      }

      // 输入匹配
      if (step.action === 'input' && action.type === 'input') {
        return this.matchInput(step, action)
      }

      // 提交匹配
      if (step.action === 'submit' && action.type === 'submit') {
        return true
      }

      return false
    })
  }

  // 导航匹配
  private matchNavigation(step: PlanStep, action: TrackedAction): boolean {
    const targetUrl = step.params?.url as string
    return action.context.url.includes(targetUrl)
  }

  // 选择匹配
  private matchSelection(step: PlanStep, action: TrackedAction): boolean {
    // 检查资源类型和 ID
    if (step.params?.resourceType !== action.target.resourceType) {
      return false
    }

    // 如果指定了具体 ID，检查是否匹配
    if (step.params?.resourceId) {
      return step.params.resourceId === action.target.resourceId
    }

    // 只指定了类型，任何该类型的选择都算匹配
    return true
  }

  // 输入匹配
  private matchInput(step: PlanStep, action: TrackedAction): boolean {
    const targetField = step.params?.field as string
    return action.target.element.includes(targetField) ||
           action.target.label?.includes(targetField) ||
           false
  }

  // 获取下一个待执行步骤
  getNextPendingStep(plan: ReconciledPlan): PlanStep | undefined {
    return plan.steps.find(step => step.status === 'pending')
  }

  // 生成续跑建议
  generateSuggestion(plan: ReconciledPlan): ContinuationSuggestion {
    const nextStep = this.getNextPendingStep(plan)
    const userCompleted = plan.steps.filter(s => s.completedBy === 'user')

    if (!nextStep) {
      return {
        canContinue: false,
        message: '所有步骤已完成',
        userCompletedSteps: userCompleted,
      }
    }

    return {
      canContinue: true,
      nextStep,
      message: `您完成了 ${userCompleted.length} 个步骤，可以从「${nextStep.description}」继续`,
      userCompletedSteps: userCompleted,
    }
  }
}

type ReconciledPlan = ExecutionPlan & {
  userCompletedCount: number
  aiCompletedCount: number
  pendingCount: number
}

type ContinuationSuggestion = {
  canContinue: boolean
  nextStep?: PlanStep
  message: string
  userCompletedSteps: PlanStep[]
}

export const planReconciler = new PlanReconciler()
```

### 验收
- [ ] 能识别用户完成的步骤
- [ ] 正确更新步骤状态
- [ ] 能生成续跑建议
- [ ] 匹配逻辑准确

---

## Task 5.5: 偏离检测器

### 目标
检测用户操作是否偏离原计划

### 文件
- `apps/web/src/lib/goi/collaboration/deviationDetector.ts`

### 步骤

1. 实现偏离检测器：
```typescript
// deviationDetector.ts
export type Deviation = {
  type: 'none' | 'minor' | 'major' | 'incompatible'
  isBlocking: boolean
  issues: DeviationIssue[]
  suggestions: string[]
}

type DeviationIssue = {
  severity: 'info' | 'warning' | 'error'
  message: string
  step?: PlanStep
  action?: TrackedAction
}

export class DeviationDetector {
  detect(plan: ExecutionPlan, userActions: TrackedAction[]): Deviation {
    const issues: DeviationIssue[] = []

    // 1. 检查资源不匹配
    issues.push(...this.checkResourceMismatch(plan, userActions))

    // 2. 检查跳过的步骤
    issues.push(...this.checkSkippedSteps(plan, userActions))

    // 3. 检查计划外操作
    issues.push(...this.checkUnexpectedActions(plan, userActions))

    // 4. 检查顺序偏离
    issues.push(...this.checkOrderDeviation(plan, userActions))

    // 分类偏离程度
    const type = this.categorize(issues)

    return {
      type,
      isBlocking: type === 'incompatible',
      issues,
      suggestions: this.generateSuggestions(issues),
    }
  }

  // 检查资源不匹配
  private checkResourceMismatch(
    plan: ExecutionPlan,
    actions: TrackedAction[]
  ): DeviationIssue[] {
    const issues: DeviationIssue[] = []

    for (const step of plan.steps) {
      if (step.params?.resourceId) {
        const matchingAction = actions.find(a =>
          a.target.resourceType === step.params?.resourceType &&
          a.target.resourceId !== step.params?.resourceId
        )

        if (matchingAction) {
          issues.push({
            severity: 'warning',
            message: `选择了不同的${step.params.resourceType}：` +
                    `计划选择 ${step.params.resourceId}，实际选择 ${matchingAction.target.resourceId}`,
            step,
            action: matchingAction,
          })
        }
      }
    }

    return issues
  }

  // 检查跳过的步骤
  private checkSkippedSteps(
    plan: ExecutionPlan,
    actions: TrackedAction[]
  ): DeviationIssue[] {
    const issues: DeviationIssue[] = []

    // 找到第一个用户操作对应的步骤
    let firstUserStepIndex = -1
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i]
      const hasAction = actions.some(a => this.stepMatchesAction(step, a))
      if (hasAction) {
        firstUserStepIndex = i
        break
      }
    }

    // 检查之前的步骤是否被跳过
    if (firstUserStepIndex > 0) {
      for (let i = 0; i < firstUserStepIndex; i++) {
        const step = plan.steps[i]
        if (step.status !== 'completed') {
          issues.push({
            severity: step.required ? 'error' : 'info',
            message: `跳过了步骤：${step.description}`,
            step,
          })
        }
      }
    }

    return issues
  }

  // 检查计划外操作
  private checkUnexpectedActions(
    plan: ExecutionPlan,
    actions: TrackedAction[]
  ): DeviationIssue[] {
    const issues: DeviationIssue[] = []

    for (const action of actions) {
      const matchesAnyStep = plan.steps.some(step =>
        this.stepMatchesAction(step, action)
      )

      if (!matchesAnyStep && action.target.resourceType) {
        issues.push({
          severity: 'info',
          message: `计划外操作：${action.type} ${action.target.label || action.target.resourceType}`,
          action,
        })
      }
    }

    return issues
  }

  // 检查顺序偏离
  private checkOrderDeviation(
    plan: ExecutionPlan,
    actions: TrackedAction[]
  ): DeviationIssue[] {
    // 如果用户按不同顺序执行，但结果正确，给出提示
    // 实现略
    return []
  }

  // 分类偏离程度
  private categorize(issues: DeviationIssue[]): Deviation['type'] {
    const hasError = issues.some(i => i.severity === 'error')
    const warningCount = issues.filter(i => i.severity === 'warning').length

    if (hasError) return 'incompatible'
    if (warningCount >= 3) return 'major'
    if (warningCount >= 1) return 'minor'
    return 'none'
  }

  // 生成建议
  private generateSuggestions(issues: DeviationIssue[]): string[] {
    const suggestions: string[] = []

    for (const issue of issues) {
      if (issue.severity === 'error') {
        suggestions.push(`请先完成：${issue.step?.description}`)
      } else if (issue.severity === 'warning') {
        suggestions.push(`注意：${issue.message}，是否继续？`)
      }
    }

    return suggestions
  }

  private stepMatchesAction(step: PlanStep, action: TrackedAction): boolean {
    // 复用 PlanReconciler 的匹配逻辑
    return false // 简化实现
  }
}

export const deviationDetector = new DeviationDetector()
```

### 验收
- [ ] 能检测资源选择不匹配
- [ ] 能检测跳过的步骤
- [ ] 能检测计划外操作
- [ ] 偏离程度分类合理

---

## Task 5.6: 续跑对话框组件

### 目标
实现交还控制权时的续跑对话框

### 文件
- `apps/web/src/components/goi/CopilotPanel/HandbackDialog.tsx`

### 步骤

1. 实现续跑对话框：
```tsx
// HandbackDialog.tsx
import { Modal, List, Button, Alert, Space, Typography, Tag } from 'antd'
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'

type Props = {
  visible: boolean
  onClose: () => void
  plan: ReconciledPlan
  userActions: TrackedAction[]
  deviation: Deviation
  onContinue: () => void
  onAdjustPlan: () => void
  onRestart: () => void
}

export function HandbackDialog({
  visible,
  onClose,
  plan,
  userActions,
  deviation,
  onContinue,
  onAdjustPlan,
  onRestart,
}: Props) {
  const userCompletedSteps = plan.steps.filter(s => s.completedBy === 'user')
  const pendingSteps = plan.steps.filter(s => s.status === 'pending')
  const nextStep = pendingSteps[0]

  return (
    <Modal
      title="🔄 准备继续"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {/* 用户操作摘要 */}
      <div style={{ marginBottom: 16 }}>
        <Typography.Text strong>
          我检测到您在接管期间完成了以下操作：
        </Typography.Text>
        <List
          size="small"
          dataSource={userCompletedSteps}
          renderItem={step => (
            <List.Item>
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>用户操作：{step.description}</span>
                {step.matchedAction && (
                  <Tag color="blue">
                    {step.matchedAction.target.label}
                  </Tag>
                )}
              </Space>
            </List.Item>
          )}
          locale={{ emptyText: '未检测到与计划匹配的操作' }}
        />
      </div>

      {/* 偏离警告 */}
      {deviation.type !== 'none' && (
        <Alert
          type={deviation.isBlocking ? 'error' : 'warning'}
          message={deviation.isBlocking ? '检测到不兼容的操作' : '检测到部分偏离'}
          description={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {deviation.issues.map((issue, i) => (
                <li key={i}>{issue.message}</li>
              ))}
            </ul>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 剩余步骤 */}
      <div style={{ marginBottom: 16 }}>
        <Typography.Text strong>计划中剩余步骤：</Typography.Text>
        <List
          size="small"
          dataSource={pendingSteps.slice(0, 5)}
          renderItem={(step, index) => (
            <List.Item>
              <Space>
                {index === 0 ? (
                  <Tag color="blue">下一步</Tag>
                ) : (
                  <span style={{ color: '#999' }}>○</span>
                )}
                <span>{step.description}</span>
              </Space>
            </List.Item>
          )}
        />
        {pendingSteps.length > 5 && (
          <Typography.Text type="secondary">
            还有 {pendingSteps.length - 5} 个步骤...
          </Typography.Text>
        )}
      </div>

      {/* 建议 */}
      {nextStep && !deviation.isBlocking && (
        <Alert
          type="info"
          message={
            <span>
              💡 建议：您的操作与原计划一致，我可以从「{nextStep.description}」继续执行
            </span>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 操作按钮 */}
      <Space style={{ width: '100%', justifyContent: 'center' }}>
        <Button
          type="primary"
          onClick={onContinue}
          disabled={deviation.isBlocking}
        >
          ✓ 从这里继续
        </Button>
        <Button onClick={onAdjustPlan}>
          📝 调整计划
        </Button>
        <Button danger onClick={onRestart}>
          ✕ 重新开始
        </Button>
      </Space>
    </Modal>
  )
}
```

### 验收
- [ ] 显示用户完成的步骤
- [ ] 显示偏离警告
- [ ] 显示剩余步骤
- [ ] 按钮功能正常

---

## Task 5.7: 集成与测试

### 目标
将操作感知集成到控制权转移流程

### 步骤

1. 在接管时启动追踪：
```typescript
// 在 ControlTransfer 中
async takeover() {
  // 启动操作追踪
  actionTracker.startTracking(this.sessionId)
  stateSync.initialize()

  this.updateState({ mode: 'human', holder: 'user' })
}
```

2. 在交还时收集信息：
```typescript
// 在 ControlTransfer 中
async handback() {
  // 停止追踪，获取操作
  const userActions = actionTracker.stopTracking()
  const stateChanges = stateSync.detectChanges()

  // 协调计划
  const reconciledPlan = planReconciler.reconcile(
    this.currentPlan,
    userActions
  )

  // 检测偏离
  const deviation = deviationDetector.detect(
    this.currentPlan,
    userActions
  )

  // 显示续跑对话框
  this.showHandbackDialog({
    plan: reconciledPlan,
    userActions,
    deviation,
  })
}
```

3. 测试场景：

| 场景 | 操作 | 预期 |
|------|------|------|
| 正常续跑 | 用户完成 2 步后交还 | 显示完成的步骤，可继续 |
| 选择不同资源 | 用户选了不同的 Prompt | 显示警告，询问是否继续 |
| 跳过步骤 | 用户跳过了必要步骤 | 显示错误，建议补充 |
| 计划外操作 | 用户做了计划外的事 | 显示提示，不阻止继续 |

### 验收
- [ ] 接管时自动开始追踪
- [ ] 交还时显示操作摘要
- [ ] 偏离检测准确
- [ ] 可以顺利续跑

---

## 开发日志

| 日期 | 进度 | 备注 |
|------|------|------|
| 2025-12-13 | Task 5.1 完成 | 实现 types.ts 和 actionTracker.ts，定义操作类型和追踪器 |
| 2025-12-13 | Task 5.2 完成 | 实现 resourceDetector.ts，支持从 DOM、URL、上下文检测资源 |
| 2025-12-13 | Task 5.3 完成 | 实现 stateSync.ts，支持状态快照和变化检测 |
| 2025-12-13 | Task 5.4 完成 | 实现 planReconciler.ts，支持协调计划与用户操作 |
| 2025-12-13 | Task 5.5 完成 | 实现 deviationDetector.ts，支持偏离检测和建议生成 |
| 2025-12-13 | Task 5.6 完成 | 实现 HandbackDialog.tsx，续跑对话框 UI 组件 |
| 2025-12-13 | Task 5.7 完成 | 集成到 ControlTransferManager，完成操作感知流程 |
