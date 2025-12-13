# Phase 1: 多步任务规划

## 阶段目标

让 AI 能够将用户的复杂目标自动拆解为可执行的步骤序列。

## 当前问题

### 1. 规划能力有限

当前 planner.ts 只能生成简单的线性步骤，无法处理：
- 条件分支（如果A则B，否则C）
- 并行步骤（同时做A和B）
- 动态调整（根据中间结果修改后续步骤）

### 2. 缺少任务模板

每次都让 LLM 从头规划，导致：
- 响应时间长
- 输出不稳定
- 缺少最佳实践

### 3. 无依赖关系管理

步骤之间的依赖关系没有显式表达：
- 不知道哪些步骤可以跳过
- 不知道失败后影响范围
- 无法智能重排

## 相关文件

| 文件 | 用途 |
|------|------|
| `apps/web/src/lib/goi/agent/planner.ts` | 任务规划器 |
| `apps/web/src/lib/goi/prompts/planPrompt.ts` | 规划提示词 |
| `apps/web/src/lib/goi/todo/todoList.ts` | TODO 数据结构 |

## 设计方案

### 1. 任务计划数据结构

```typescript
/**
 * 任务计划
 */
export type TaskPlan = {
  id: string
  goal: string                    // 用户原始目标
  summary: string                 // 计划摘要
  steps: PlanStep[]               // 步骤列表
  estimatedDuration: number       // 预计总耗时（秒）
  requiredResources: ResourceRequirement[]  // 需要的资源
  checkpoints: string[]           // 检查点步骤 ID
  createdAt: Date
}

/**
 * 计划步骤
 */
export type PlanStep = {
  id: string
  order: number                   // 执行顺序
  operation: GoiOperation         // 具体操作
  userLabel: string               // 用户可读描述
  technicalLabel: string          // 技术描述
  // 依赖关系
  dependencies: string[]          // 依赖的步骤 ID
  blockedBy?: string              // 被哪个步骤阻塞
  // 检查点
  isCheckpoint: boolean
  checkpointType?: CheckpointType
  checkpointReason?: string
  // 状态
  status: StepStatus
  result?: StepResult
  // 元数据
  estimatedSeconds: number
  isOptional: boolean             // 是否可跳过
  skipCondition?: string          // 跳过条件
}

/**
 * 资源需求
 */
export type ResourceRequirement = {
  type: ResourceType
  name?: string                   // 用户指定的名称
  resolved?: {                    // 解析后的资源
    id: string
    name: string
  }
  isRequired: boolean
}
```

### 2. 任务模板系统

预定义常见任务的模板：

```typescript
/**
 * 任务模板
 */
export type TaskTemplate = {
  id: string
  name: string
  description: string
  triggerPatterns: RegExp[]       // 触发模式
  requiredInputs: TemplateInput[] // 需要的输入
  steps: TemplateStep[]           // 步骤模板
}

/**
 * 预置模板
 */
export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'create-test-task',
    name: '创建测试任务',
    description: '创建一个新的测试任务',
    triggerPatterns: [
      /创建.*测试.*任务/,
      /新建.*任务/,
      /测试.*一下/,
      /create.*test.*task/i,
    ],
    requiredInputs: [
      { name: 'prompt', type: 'prompt', required: true },
      { name: 'dataset', type: 'dataset', required: true },
      { name: 'model', type: 'model', required: false, default: 'default' },
    ],
    steps: [
      { template: 'navigate', params: { target: '/tasks/new' } },
      { template: 'select', params: { resource: 'prompt' }, isCheckpoint: true },
      { template: 'select', params: { resource: 'dataset' }, isCheckpoint: true },
      { template: 'select', params: { resource: 'model' }, isCheckpoint: true },
      { template: 'configure', params: { section: 'field-mapping' } },
      { template: 'submit', params: { action: 'create-and-run' } },
      { template: 'wait', params: { for: 'task-complete' } },
    ],
  },
  // ... 更多模板
]
```

### 3. 智能规划流程

```
用户输入
    │
    ▼
┌───────────────┐
│ 1. 意图解析    │ ← 复用 L1 的意图解析器
└───────┬───────┘
        │
        ▼
┌───────────────┐     匹配成功
│ 2. 模板匹配    │─────────────→ 使用模板生成计划
└───────┬───────┘
        │ 无匹配模板
        ▼
┌───────────────┐
│ 3. LLM 规划    │ ← 使用 planPrompt 生成
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ 4. 计划优化    │ ← 添加检查点、优化顺序
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ 5. 资源解析    │ ← 模糊匹配用户提到的资源
└───────┬───────┘
        │
        ▼
    输出 TaskPlan
```

### 4. 依赖关系图

```typescript
/**
 * 构建步骤依赖图
 */
export function buildDependencyGraph(steps: PlanStep[]): DependencyGraph {
  const graph = new Map<string, Set<string>>()

  for (const step of steps) {
    graph.set(step.id, new Set(step.dependencies))
  }

  return {
    graph,
    // 获取可执行的步骤（所有依赖已完成）
    getExecutableSteps: (completedIds: Set<string>) => {
      return steps.filter(step =>
        step.status === 'pending' &&
        step.dependencies.every(dep => completedIds.has(dep))
      )
    },
    // 获取受影响的步骤（某步骤失败后）
    getAffectedSteps: (failedId: string) => {
      const affected = new Set<string>()
      const queue = [failedId]

      while (queue.length > 0) {
        const current = queue.shift()!
        for (const step of steps) {
          if (step.dependencies.includes(current) && !affected.has(step.id)) {
            affected.add(step.id)
            queue.push(step.id)
          }
        }
      }

      return affected
    },
  }
}
```

## 验收标准

1. [ ] "创建测试任务"生成 5+ 步骤的完整计划
2. [ ] 步骤之间有正确的依赖关系
3. [ ] 关键步骤自动标记为检查点
4. [ ] 模板匹配响应时间 < 500ms
5. [ ] LLM 规划响应时间 < 3s

## 依赖

- L1 升级完成（意图理解、资源覆盖）

## 下一阶段

完成本阶段后，进入 Phase 2：操作可视化
