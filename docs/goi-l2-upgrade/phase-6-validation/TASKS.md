# Phase 6 任务清单：验证与集成

## 前置检查

- [ ] Phase 1-5 全部完成
- [ ] 所有功能可独立运行

---

## Task 6.1: 单元测试补充

### 目标
为核心模块补充单元测试

### 文件
- `apps/web/src/lib/goi/__tests__/`

### 步骤

1. 计划生成器测试：
```typescript
// __tests__/planner.test.ts
import { TaskPlanner } from '../agent/taskPlanner'

describe('TaskPlanner', () => {
  const planner = new TaskPlanner()

  describe('createPlan', () => {
    it('should create plan for "create task" intent', () => {
      const plan = planner.createPlan({
        action: 'create',
        resourceType: 'task',
        params: {
          prompt: 'sentiment-v2',
          dataset: 'test-data',
        },
      })

      expect(plan.steps.length).toBeGreaterThan(0)
      expect(plan.steps[0].action).toBe('navigate')
    })

    it('should include checkpoint for resource selection', () => {
      const plan = planner.createPlan({
        action: 'create',
        resourceType: 'task',
      })

      const hasCheckpoint = plan.steps.some(
        s => s.checkpoint?.type === 'resource_selection'
      )
      expect(hasCheckpoint).toBe(true)
    })

    it('should handle missing params gracefully', () => {
      const plan = planner.createPlan({
        action: 'create',
        resourceType: 'task',
        params: {},
      })

      expect(plan).toBeDefined()
      expect(plan.steps.length).toBeGreaterThan(0)
    })
  })
})
```

2. 操作追踪器测试：
```typescript
// __tests__/actionTracker.test.ts
import { ActionTracker } from '../collaboration/actionTracker'

describe('ActionTracker', () => {
  let tracker: ActionTracker

  beforeEach(() => {
    tracker = new ActionTracker()
  })

  afterEach(() => {
    tracker.stopTracking()
  })

  it('should start and stop tracking', () => {
    tracker.startTracking('test-session')
    const actions = tracker.stopTracking()
    expect(actions).toEqual([])
  })

  it('should record click events', () => {
    tracker.startTracking('test-session')

    // 模拟点击
    const button = document.createElement('button')
    button.innerText = 'Test Button'
    document.body.appendChild(button)

    button.click()

    const actions = tracker.stopTracking()
    expect(actions.length).toBe(1)
    expect(actions[0].type).toBe('click')
    expect(actions[0].target.label).toBe('Test Button')

    document.body.removeChild(button)
  })

  it('should not track GOI panel clicks', () => {
    tracker.startTracking('test-session')

    const panel = document.createElement('div')
    panel.dataset.goiPanel = 'true'
    const button = document.createElement('button')
    panel.appendChild(button)
    document.body.appendChild(panel)

    button.click()

    const actions = tracker.stopTracking()
    expect(actions.length).toBe(0)

    document.body.removeChild(panel)
  })
})
```

3. 计划协调器测试：
```typescript
// __tests__/planReconciler.test.ts
import { PlanReconciler } from '../agent/planReconciler'

describe('PlanReconciler', () => {
  const reconciler = new PlanReconciler()

  it('should mark step as completed by user', () => {
    const plan = {
      id: 'test-plan',
      steps: [
        {
          id: 'step-1',
          action: 'select',
          params: { resourceType: 'prompt' },
          status: 'pending',
        },
      ],
    }

    const userActions = [
      {
        id: 'action-1',
        type: 'click',
        target: { resourceType: 'prompt', resourceId: 'p1' },
        timestamp: new Date(),
      },
    ]

    const result = reconciler.reconcile(plan, userActions)

    expect(result.steps[0].status).toBe('completed')
    expect(result.steps[0].completedBy).toBe('user')
  })

  it('should identify next pending step', () => {
    const plan = {
      id: 'test-plan',
      steps: [
        { id: 'step-1', status: 'completed' },
        { id: 'step-2', status: 'pending' },
        { id: 'step-3', status: 'pending' },
      ],
    }

    const nextStep = reconciler.getNextPendingStep(plan)
    expect(nextStep.id).toBe('step-2')
  })
})
```

4. 偏离检测器测试：
```typescript
// __tests__/deviationDetector.test.ts
import { DeviationDetector } from '../collaboration/deviationDetector'

describe('DeviationDetector', () => {
  const detector = new DeviationDetector()

  it('should detect no deviation for matching actions', () => {
    const plan = {
      steps: [
        {
          id: 'step-1',
          action: 'select',
          params: { resourceType: 'prompt', resourceId: 'p1' },
        },
      ],
    }

    const actions = [
      {
        type: 'click',
        target: { resourceType: 'prompt', resourceId: 'p1' },
      },
    ]

    const result = detector.detect(plan, actions)
    expect(result.type).toBe('none')
    expect(result.isBlocking).toBe(false)
  })

  it('should detect resource mismatch', () => {
    const plan = {
      steps: [
        {
          id: 'step-1',
          action: 'select',
          params: { resourceType: 'prompt', resourceId: 'p1' },
        },
      ],
    }

    const actions = [
      {
        type: 'click',
        target: { resourceType: 'prompt', resourceId: 'p2' },  // 不同资源
      },
    ]

    const result = detector.detect(plan, actions)
    expect(result.type).not.toBe('none')
    expect(result.issues.length).toBeGreaterThan(0)
  })
})
```

### 验收
- [ ] 计划生成器测试通过
- [ ] 操作追踪器测试通过
- [ ] 计划协调器测试通过
- [ ] 偏离检测器测试通过
- [ ] 测试覆盖率 > 80%

---

## Task 6.2: E2E 测试用例

### 目标
编写端到端自动化测试

### 文件
- `apps/web/e2e/goi/`

### 步骤

1. 完整任务执行测试：
```typescript
// e2e/goi/complete-task.spec.ts
import { test, expect } from '@playwright/test'

test.describe('GOI Complete Task Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    // 打开 Copilot 面板
    await page.click('[data-testid="copilot-toggle"]')
  })

  test('should complete task creation via natural language', async ({ page }) => {
    // 输入指令
    await page.fill('[data-testid="copilot-input"]', '帮我创建一个情感分析任务')
    await page.press('[data-testid="copilot-input"]', 'Enter')

    // 等待计划显示
    await expect(page.locator('[data-testid="plan-panel"]')).toBeVisible()
    await expect(page.locator('[data-testid="plan-step"]')).toHaveCount({ min: 3 })

    // 开始执行
    await page.click('[data-testid="execute-button"]')

    // 等待检查点
    await expect(page.locator('[data-testid="checkpoint-dialog"]')).toBeVisible({ timeout: 30000 })

    // 确认选择
    await page.click('[data-testid="checkpoint-confirm"]')

    // 等待任务完成
    await expect(page.locator('[data-testid="task-complete"]')).toBeVisible({ timeout: 60000 })
  })
})
```

2. 暂停续跑测试：
```typescript
// e2e/goi/pause-resume.spec.ts
import { test, expect } from '@playwright/test'

test.describe('GOI Pause and Resume', () => {
  test('should pause and resume execution', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="copilot-toggle"]')

    // 开始执行
    await page.fill('[data-testid="copilot-input"]', '创建一个任务')
    await page.press('[data-testid="copilot-input"]', 'Enter')
    await page.click('[data-testid="execute-button"]')

    // 等待执行开始
    await expect(page.locator('[data-testid="executing"]')).toBeVisible()

    // 暂停
    const pauseStart = Date.now()
    await page.click('[data-testid="pause-button"]')
    await expect(page.locator('[data-testid="paused"]')).toBeVisible()
    const pauseTime = Date.now() - pauseStart

    // 验证暂停响应时间
    expect(pauseTime).toBeLessThan(500)

    // 验证暂停状态显示
    await expect(page.locator('[data-testid="completed-steps"]')).toBeVisible()
    await expect(page.locator('[data-testid="current-step"]')).toBeVisible()
    await expect(page.locator('[data-testid="pending-steps"]')).toBeVisible()

    // 继续执行
    await page.click('[data-testid="resume-button"]')
    await expect(page.locator('[data-testid="executing"]')).toBeVisible()
  })
})
```

3. 接管续跑测试：
```typescript
// e2e/goi/takeover-handback.spec.ts
import { test, expect } from '@playwright/test'

test.describe('GOI Takeover and Handback', () => {
  test('should track user actions and continue', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="copilot-toggle"]')

    // 开始并暂停
    await page.fill('[data-testid="copilot-input"]', '创建一个任务')
    await page.press('[data-testid="copilot-input"]', 'Enter')
    await page.click('[data-testid="execute-button"]')
    await page.click('[data-testid="pause-button"]')

    // 接管
    await page.click('[data-testid="takeover-button"]')
    await expect(page.locator('[data-testid="manual-mode"]')).toBeVisible()

    // 用户手动操作
    await page.click('[data-testid="prompt-item"]')

    // 交还
    await page.click('[data-testid="handback-button"]')

    // 验证操作摘要
    await expect(page.locator('[data-testid="handback-dialog"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-completed-step"]')).toBeVisible()

    // 继续执行
    await page.click('[data-testid="continue-from-here"]')
    await expect(page.locator('[data-testid="executing"]')).toBeVisible()
  })
})
```

4. 检查点确认测试：
```typescript
// e2e/goi/checkpoint.spec.ts
import { test, expect } from '@playwright/test'

test.describe('GOI Checkpoint Confirmation', () => {
  test('should show checkpoint for resource selection', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="copilot-toggle"]')

    await page.fill('[data-testid="copilot-input"]', '创建一个任务')
    await page.press('[data-testid="copilot-input"]', 'Enter')
    await page.click('[data-testid="execute-button"]')

    // 等待检查点
    const dialog = page.locator('[data-testid="checkpoint-dialog"]')
    await expect(dialog).toBeVisible({ timeout: 30000 })

    // 验证内容
    await expect(dialog.locator('[data-testid="ai-choice"]')).toBeVisible()
    await expect(dialog.locator('[data-testid="ai-reason"]')).toBeVisible()
    await expect(dialog.locator('[data-testid="alternatives"]')).toBeVisible()
  })

  test('should allow changing selection at checkpoint', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="copilot-toggle"]')

    await page.fill('[data-testid="copilot-input"]', '创建一个任务')
    await page.press('[data-testid="copilot-input"]', 'Enter')
    await page.click('[data-testid="execute-button"]')

    // 等待检查点
    await expect(page.locator('[data-testid="checkpoint-dialog"]')).toBeVisible({ timeout: 30000 })

    // 选择其他选项
    await page.click('[data-testid="alternative-option"]:first-child')

    // 确认
    await page.click('[data-testid="checkpoint-confirm"]')

    // 验证继续执行
    await expect(page.locator('[data-testid="executing"]')).toBeVisible()
  })
})
```

### 验收
- [ ] 完整任务执行测试通过
- [ ] 暂停续跑测试通过
- [ ] 接管续跑测试通过
- [ ] 检查点确认测试通过

---

## Task 6.3: 性能测试

### 目标
验证关键性能指标

### 步骤

1. 暂停响应时间测试：
```typescript
// e2e/goi/performance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('GOI Performance', () => {
  test('pause response time should be under 500ms', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="copilot-toggle"]')

    // 开始执行
    await page.fill('[data-testid="copilot-input"]', '创建一个任务')
    await page.press('[data-testid="copilot-input"]', 'Enter')
    await page.click('[data-testid="execute-button"]')
    await expect(page.locator('[data-testid="executing"]')).toBeVisible()

    // 测量暂停时间
    const times: number[] = []
    for (let i = 0; i < 5; i++) {
      const start = Date.now()
      await page.click('[data-testid="pause-button"]')
      await expect(page.locator('[data-testid="paused"]')).toBeVisible()
      times.push(Date.now() - start)

      // 继续
      await page.click('[data-testid="resume-button"]')
      await expect(page.locator('[data-testid="executing"]')).toBeVisible()
    }

    const avgTime = times.reduce((a, b) => a + b) / times.length
    expect(avgTime).toBeLessThan(500)
  })

  test('plan generation should be under 2s', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="copilot-toggle"]')

    const start = Date.now()
    await page.fill('[data-testid="copilot-input"]', '创建一个复杂的评估任务，使用情感分析提示词和测试数据集')
    await page.press('[data-testid="copilot-input"]', 'Enter')

    await expect(page.locator('[data-testid="plan-panel"]')).toBeVisible()
    const planTime = Date.now() - start

    expect(planTime).toBeLessThan(2000)
  })
})
```

2. 内存泄漏检查：
```typescript
// e2e/goi/memory.spec.ts
import { test, expect } from '@playwright/test'

test.describe('GOI Memory', () => {
  test('should not leak memory on repeated operations', async ({ page }) => {
    await page.goto('/dashboard')

    // 获取初始内存
    const initialMetrics = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    // 重复操作
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="copilot-toggle"]')
      await page.fill('[data-testid="copilot-input"]', '创建任务')
      await page.press('[data-testid="copilot-input"]', 'Enter')
      await page.click('[data-testid="execute-button"]')
      await page.click('[data-testid="pause-button"]')
      await page.click('[data-testid="cancel-button"]')
    }

    // 强制 GC
    await page.evaluate(() => {
      if ((window as any).gc) (window as any).gc()
    })

    // 获取最终内存
    const finalMetrics = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0
    })

    // 内存增长不应超过 50MB
    const growth = (finalMetrics - initialMetrics) / (1024 * 1024)
    expect(growth).toBeLessThan(50)
  })
})
```

### 验收
- [ ] 暂停响应 < 500ms
- [ ] 计划生成 < 2s
- [ ] 内存增长 < 50MB

---

## Task 6.4: 稳定性测试

### 目标
验证长时间运行稳定性

### 步骤

1. 连续任务执行：
```typescript
test('should handle 10 consecutive tasks', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('[data-testid="copilot-toggle"]')

  for (let i = 0; i < 10; i++) {
    await page.fill('[data-testid="copilot-input"]', `创建任务 ${i + 1}`)
    await page.press('[data-testid="copilot-input"]', 'Enter')

    // 等待计划
    await expect(page.locator('[data-testid="plan-panel"]')).toBeVisible()

    // 取消（快速测试）
    await page.click('[data-testid="cancel-button"]')

    // 验证恢复正常状态
    await expect(page.locator('[data-testid="copilot-input"]')).toBeEnabled()
  }
})
```

2. 快速暂停继续：
```typescript
test('should handle rapid pause/resume cycles', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('[data-testid="copilot-toggle"]')

  await page.fill('[data-testid="copilot-input"]', '创建一个任务')
  await page.press('[data-testid="copilot-input"]', 'Enter')
  await page.click('[data-testid="execute-button"]')

  for (let i = 0; i < 10; i++) {
    await page.click('[data-testid="pause-button"]')
    await expect(page.locator('[data-testid="paused"]')).toBeVisible()

    await page.click('[data-testid="resume-button"]')
    await expect(page.locator('[data-testid="executing"]')).toBeVisible()
  }

  // 验证状态正常
  await page.click('[data-testid="pause-button"]')
  await expect(page.locator('[data-testid="paused"]')).toBeVisible()
})
```

3. 接管交还循环：
```typescript
test('should handle takeover/handback cycles', async ({ page }) => {
  await page.goto('/dashboard')
  await page.click('[data-testid="copilot-toggle"]')

  await page.fill('[data-testid="copilot-input"]', '创建一个任务')
  await page.press('[data-testid="copilot-input"]', 'Enter')
  await page.click('[data-testid="execute-button"]')
  await page.click('[data-testid="pause-button"]')

  for (let i = 0; i < 5; i++) {
    // 接管
    await page.click('[data-testid="takeover-button"]')
    await expect(page.locator('[data-testid="manual-mode"]')).toBeVisible()

    // 交还
    await page.click('[data-testid="handback-button"]')
    await expect(page.locator('[data-testid="handback-dialog"]')).toBeVisible()

    // 继续
    await page.click('[data-testid="continue-from-here"]')
    await page.click('[data-testid="pause-button"]')
  }
})
```

### 验收
- [ ] 10 个连续任务无崩溃
- [ ] 10 次快速暂停/继续无异常
- [ ] 5 次接管/交还无状态丢失

---

## Task 6.5: 问题修复

### 目标
修复测试中发现的问题

### 步骤

1. 问题记录模板：
```markdown
## 问题 #1: [标题]

### 描述
[问题详细描述]

### 复现步骤
1.
2.
3.

### 期望行为
[应该发生什么]

### 实际行为
[实际发生什么]

### 相关文件
-

### 修复方案
[如何修复]

### 状态
- [ ] 已修复
- [ ] 已测试
```

2. 修复优先级：

| 优先级 | 定义 | 处理时间 |
|--------|------|----------|
| P0 | 阻塞核心功能 | 立即 |
| P1 | 影响用户体验 | 1 天内 |
| P2 | 小问题 | Phase 结束前 |

3. 回归测试：
- 修复后重新运行相关测试
- 确保不引入新问题

### 验收
- [ ] 所有 P0 问题已修复
- [ ] 所有 P1 问题已修复
- [ ] 回归测试通过

---

## Task 6.6: 文档更新

### 目标
更新相关文档

### 步骤

1. 更新智能等级文档：
```markdown
// docs/goi-intelligence-roadmap.md

## 当前状态

✅ L2 级别已完成

### L2 能力清单
- [x] 多步骤计划生成
- [x] 操作可视化
- [x] 检查点确认
- [x] 暂停与接管
- [x] 人工操作感知
- [x] 断点续跑
```

2. 整理最佳实践：
```markdown
// docs/goi-best-practices.md

# GOI 最佳实践

## 添加 GOI 支持的资源属性

为页面元素添加数据属性以支持 GOI：

\`\`\`tsx
<div
  data-resource-type="prompt"
  data-resource-id={prompt.id}
  data-testid="prompt-item"
>
  {prompt.name}
</div>
\`\`\`

## 配置检查点

在 checkpointRules 中添加自定义规则...

## 处理暂停点

在操作逻辑中添加暂停检查...
```

3. 更新 CLAUDE.md：
- 添加 GOI L2 完成状态
- 更新相关文档索引

### 验收
- [ ] goi-intelligence-roadmap.md 已更新
- [ ] goi-best-practices.md 已创建
- [ ] CLAUDE.md 已更新

---

## Task 6.7: 发布准备

### 目标
准备 L2 功能发布

### 步骤

1. 功能开关配置：
```typescript
// 确保功能可以通过配置开关
export const GOI_CONFIG = {
  enabled: true,
  level: 'L2',
  features: {
    multiStepPlanning: true,
    operationVisualization: true,
    checkpointConfirmation: true,
    pauseAndTakeover: true,
    humanActionSensing: true,
  },
}
```

2. 变更日志：
```markdown
## v2.7.0 - GOI L2 智能升级

### 新功能
- 多步骤任务计划：AI 可以生成并执行多步骤计划
- 操作可视化：实时显示 AI 操作过程
- 检查点确认：关键决策点用户可确认
- 暂停与接管：随时暂停、接管、继续
- 人工操作感知：AI 可识别用户手动操作并续跑

### 改进
- 提升 GOI 稳定性和响应速度
- 优化 Copilot 面板交互体验

### 修复
- [列出修复的问题]
```

3. 发布检查清单：
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] 功能开关已配置
- [ ] 变更日志已编写

### 验收
- [ ] 可以通过配置禁用 L2 功能
- [ ] 变更日志完整
- [ ] 准备就绪可发布

---

## 开发日志

| 日期 | 进度 | 备注 |
|------|------|------|
| | | |
