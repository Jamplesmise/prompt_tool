# Phase 1: 多步任务规划 - 任务清单

## 任务概览

| 任务 | 优先级 | 预估 | 状态 |
|------|-------|------|------|
| 1.1 定义计划数据结构 | P0 | 1h | 待开始 |
| 1.2 实现任务模板系统 | P0 | 3h | 待开始 |
| 1.3 增强 LLM 规划器 | P0 | 3h | 待开始 |
| 1.4 实现依赖关系管理 | P1 | 2h | 待开始 |
| 1.5 实现资源预解析 | P1 | 2h | 待开始 |
| 1.6 单元测试 | P1 | 2h | 待开始 |

---

## 1.1 定义计划数据结构

**文件**: `packages/shared/src/types/goi/plan.ts`（新建）

### 任务描述

定义任务计划、步骤、依赖关系等核心数据结构。

### 具体步骤

- [ ] 创建 `plan.ts` 文件
- [ ] 定义核心类型：

```typescript
// packages/shared/src/types/goi/plan.ts

import type { GoiOperation, ResourceType } from './index'

/**
 * 步骤状态
 */
export type StepStatus =
  | 'pending'      // 待执行
  | 'ready'        // 可执行（依赖已满足）
  | 'executing'    // 执行中
  | 'checkpoint'   // 等待确认
  | 'completed'    // 已完成
  | 'skipped'      // 已跳过
  | 'failed'       // 失败
  | 'blocked'      // 被阻塞

/**
 * 检查点类型
 */
export type CheckpointType =
  | 'resource_selection'  // 选择关键资源
  | 'irreversible_action' // 不可逆操作
  | 'cost_incurring'      // 涉及费用
  | 'first_time'          // 首次执行
  | 'user_defined'        // 用户自定义

/**
 * 计划步骤
 */
export type PlanStep = {
  id: string
  order: number
  // 操作
  operation: GoiOperation
  userLabel: string
  hint?: string
  // 依赖
  dependencies: string[]
  // 检查点
  isCheckpoint: boolean
  checkpointType?: CheckpointType
  checkpointReason?: string
  // 状态
  status: StepStatus
  startedAt?: Date
  completedAt?: Date
  error?: string
  // 元数据
  estimatedSeconds: number
  isOptional: boolean
  group?: string              // 所属分组
}

/**
 * 资源需求
 */
export type ResourceRequirement = {
  type: ResourceType
  name?: string               // 用户指定的名称（可能模糊）
  resolved?: {
    id: string
    name: string
    confidence: number
  }
  isRequired: boolean
  defaultValue?: string       // 默认值
}

/**
 * 任务计划
 */
export type TaskPlan = {
  id: string
  // 目标
  goal: string                // 用户原始输入
  summary: string             // AI 理解的摘要
  // 步骤
  steps: PlanStep[]
  groups: PlanGroup[]         // 步骤分组
  // 资源
  requiredResources: ResourceRequirement[]
  // 检查点
  checkpointStepIds: string[]
  // 预估
  estimatedTotalSeconds: number
  // 时间戳
  createdAt: Date
  updatedAt: Date
}

/**
 * 计划分组
 */
export type PlanGroup = {
  id: string
  name: string
  emoji: string
  stepIds: string[]
  collapsed: boolean
}

/**
 * 步骤执行结果
 */
export type StepResult = {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  duration: number
}
```

- [ ] 在 `packages/shared/src/types/goi/index.ts` 中导出
- [ ] 运行类型检查

---

## 1.2 实现任务模板系统

**文件**: `apps/web/src/lib/goi/planning/templates.ts`（新建）

### 任务描述

预定义常见任务的执行模板，提高规划速度和稳定性。

### 具体步骤

- [ ] 创建 `apps/web/src/lib/goi/planning/` 目录
- [ ] 创建 `templates.ts` 文件
- [ ] 定义模板结构：

```typescript
/**
 * 模板输入定义
 */
export type TemplateInput = {
  name: string
  type: ResourceType
  required: boolean
  default?: string
  description?: string
}

/**
 * 模板步骤定义
 */
export type TemplateStep = {
  type: 'navigate' | 'select' | 'input' | 'submit' | 'wait' | 'verify'
  params: Record<string, string>
  userLabel: string
  isCheckpoint?: boolean
  checkpointType?: CheckpointType
  optional?: boolean
  group?: string
}

/**
 * 任务模板
 */
export type TaskTemplate = {
  id: string
  name: string
  description: string
  triggerPatterns: RegExp[]
  requiredInputs: TemplateInput[]
  steps: TemplateStep[]
  estimatedSeconds: number
}
```

- [ ] 实现核心模板：

```typescript
export const TASK_TEMPLATES: TaskTemplate[] = [
  // 1. 创建测试任务
  {
    id: 'create-test-task',
    name: '创建测试任务',
    description: '创建一个新的 AI 模型测试任务',
    triggerPatterns: [
      /创建.*测试.*任务/,
      /新建.*任务/,
      /测试.*一下/,
      /用.*测试/,
      /create.*test.*task/i,
      /run.*test/i,
    ],
    requiredInputs: [
      { name: 'prompt', type: 'prompt', required: true, description: '要测试的提示词' },
      { name: 'dataset', type: 'dataset', required: true, description: '测试数据集' },
      { name: 'model', type: 'model', required: false, default: 'default', description: '使用的模型' },
    ],
    steps: [
      { type: 'navigate', params: { path: '/tasks/new' }, userLabel: '打开任务创建页面', group: 'prepare' },
      { type: 'select', params: { resource: 'prompt' }, userLabel: '选择 Prompt', isCheckpoint: true, checkpointType: 'resource_selection', group: 'config' },
      { type: 'select', params: { resource: 'dataset' }, userLabel: '选择 Dataset', isCheckpoint: true, checkpointType: 'resource_selection', group: 'config' },
      { type: 'select', params: { resource: 'model' }, userLabel: '选择 Model', isCheckpoint: true, checkpointType: 'resource_selection', group: 'config' },
      { type: 'input', params: { section: 'field-mapping' }, userLabel: '配置字段映射', group: 'config' },
      { type: 'submit', params: { action: 'create-and-run' }, userLabel: '创建并启动任务', group: 'execute' },
      { type: 'wait', params: { for: 'task-started' }, userLabel: '等待任务启动', group: 'execute' },
    ],
    estimatedSeconds: 120,
  },

  // 2. 创建提示词
  {
    id: 'create-prompt',
    name: '创建提示词',
    description: '创建一个新的提示词',
    triggerPatterns: [
      /创建.*提示词/,
      /新建.*prompt/i,
      /写.*一个.*提示词/,
    ],
    requiredInputs: [
      { name: 'name', type: 'prompt', required: false, description: '提示词名称' },
    ],
    steps: [
      { type: 'navigate', params: { path: '/prompts/new' }, userLabel: '打开提示词创建页面', group: 'prepare' },
      { type: 'input', params: { field: 'name' }, userLabel: '填写名称', group: 'config' },
      { type: 'input', params: { field: 'content' }, userLabel: '编写提示词内容', group: 'config' },
      { type: 'submit', params: { action: 'save' }, userLabel: '保存提示词', isCheckpoint: true, group: 'execute' },
    ],
    estimatedSeconds: 60,
  },

  // 3. 添加模型
  {
    id: 'add-model',
    name: '添加模型',
    description: '添加一个新的 AI 模型配置',
    triggerPatterns: [
      /添加.*模型/,
      /新增.*model/i,
      /配置.*模型/,
    ],
    requiredInputs: [
      { name: 'provider', type: 'provider', required: false, description: '模型供应商' },
      { name: 'name', type: 'model', required: false, description: '模型名称' },
    ],
    steps: [
      { type: 'navigate', params: { path: '/models' }, userLabel: '打开模型配置页面', group: 'prepare' },
      { type: 'select', params: { action: 'open-add-modal' }, userLabel: '打开添加弹窗', group: 'prepare' },
      { type: 'select', params: { resource: 'provider' }, userLabel: '选择供应商', group: 'config' },
      { type: 'input', params: { field: 'name' }, userLabel: '填写模型名称', group: 'config' },
      { type: 'input', params: { field: 'config' }, userLabel: '配置模型参数', group: 'config' },
      { type: 'submit', params: { action: 'save' }, userLabel: '保存模型', isCheckpoint: true, group: 'execute' },
    ],
    estimatedSeconds: 90,
  },

  // 4. 查看任务结果
  {
    id: 'view-task-results',
    name: '查看任务结果',
    description: '查看测试任务的执行结果',
    triggerPatterns: [
      /查看.*结果/,
      /看.*任务/,
      /结果.*怎么样/,
    ],
    requiredInputs: [
      { name: 'task', type: 'task', required: true, description: '任务' },
    ],
    steps: [
      { type: 'navigate', params: { path: '/tasks/{task}/results' }, userLabel: '打开任务结果页面', group: 'navigate' },
    ],
    estimatedSeconds: 5,
  },
]
```

- [ ] 实现模板匹配函数：

```typescript
/**
 * 匹配任务模板
 */
export function matchTemplate(input: string): TaskTemplate | null {
  for (const template of TASK_TEMPLATES) {
    for (const pattern of template.triggerPatterns) {
      if (pattern.test(input)) {
        return template
      }
    }
  }
  return null
}

/**
 * 从模板生成计划
 */
export function generatePlanFromTemplate(
  template: TaskTemplate,
  inputs: Record<string, string>,
  resolvedResources: Map<string, { id: string; name: string }>
): TaskPlan {
  const steps: PlanStep[] = template.steps.map((step, index) => ({
    id: `step-${index + 1}`,
    order: index + 1,
    operation: convertTemplateStepToOperation(step, inputs, resolvedResources),
    userLabel: interpolateLabel(step.userLabel, inputs, resolvedResources),
    dependencies: index > 0 ? [`step-${index}`] : [],
    isCheckpoint: step.isCheckpoint || false,
    checkpointType: step.checkpointType,
    status: 'pending',
    estimatedSeconds: 15,
    isOptional: step.optional || false,
    group: step.group,
  }))

  return {
    id: generateId(),
    goal: template.name,
    summary: template.description,
    steps,
    groups: generateGroups(steps),
    requiredResources: template.requiredInputs.map(input => ({
      type: input.type,
      name: inputs[input.name],
      resolved: resolvedResources.get(input.name)
        ? { ...resolvedResources.get(input.name)!, confidence: 1 }
        : undefined,
      isRequired: input.required,
      defaultValue: input.default,
    })),
    checkpointStepIds: steps.filter(s => s.isCheckpoint).map(s => s.id),
    estimatedTotalSeconds: template.estimatedSeconds,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
```

---

## 1.3 增强 LLM 规划器

**文件**: `apps/web/src/lib/goi/planning/llmPlanner.ts`（新建）

### 任务描述

当没有匹配模板时，使用 LLM 生成执行计划。

### 具体步骤

- [ ] 创建 `llmPlanner.ts` 文件
- [ ] 设计规划提示词：

```typescript
/**
 * 规划提示词模板
 */
export const PLANNING_PROMPT = `你是一个任务规划助手，负责将用户的目标拆解为可执行的步骤。

## 平台能力

该平台支持以下操作：
1. **导航** - 打开页面（prompts, datasets, models, tasks, evaluators, scheduled, monitor, settings）
2. **创建** - 创建资源（prompt, dataset, model, task, evaluator, scheduled_task）
3. **选择** - 选择已有资源
4. **编辑** - 修改资源
5. **删除** - 删除资源
6. **执行** - 运行任务

## 输出格式

请以 JSON 格式输出计划：

{
  "summary": "简要描述要做什么",
  "steps": [
    {
      "order": 1,
      "type": "navigate|select|create|edit|delete|execute|wait",
      "resource": "资源类型",
      "resourceName": "用户提到的资源名（如有）",
      "userLabel": "用户可读的描述",
      "hint": "操作提示（可选）",
      "isCheckpoint": true/false,
      "checkpointReason": "需要确认的原因（如果是检查点）",
      "dependencies": ["依赖的步骤 order"],
      "isOptional": true/false
    }
  ],
  "requiredResources": [
    {
      "type": "资源类型",
      "name": "用户提到的名称",
      "isRequired": true/false
    }
  ]
}

## 规划原则

1. **原子化** - 每个步骤应该是单一、明确的操作
2. **有序性** - 步骤顺序应该合理，依赖关系清晰
3. **检查点** - 以下情况设为检查点：
   - 选择关键资源（prompt, dataset, model）
   - 不可逆操作（删除、提交）
   - 涉及费用的操作
4. **容错性** - 标记可选步骤，提供跳过条件

## 用户目标

{goal}

## 上下文信息

{context}

请生成执行计划：`

/**
 * 使用 LLM 生成计划
 */
export async function generatePlanWithLLM(
  goal: string,
  context: PlanningContext
): Promise<TaskPlan> {
  const prompt = PLANNING_PROMPT
    .replace('{goal}', goal)
    .replace('{context}', JSON.stringify(context, null, 2))

  const response = await callLLM(prompt)
  const planData = JSON.parse(response)

  return convertLLMResponseToPlan(planData, goal)
}
```

- [ ] 实现计划转换：

```typescript
/**
 * 将 LLM 响应转换为 TaskPlan
 */
function convertLLMResponseToPlan(data: LLMPlanResponse, goal: string): TaskPlan {
  const steps: PlanStep[] = data.steps.map((step, index) => ({
    id: `step-${step.order}`,
    order: step.order,
    operation: convertToOperation(step),
    userLabel: step.userLabel,
    hint: step.hint,
    dependencies: step.dependencies?.map(d => `step-${d}`) || (index > 0 ? [`step-${index}`] : []),
    isCheckpoint: step.isCheckpoint || false,
    checkpointType: inferCheckpointType(step),
    checkpointReason: step.checkpointReason,
    status: 'pending',
    estimatedSeconds: estimateStepTime(step),
    isOptional: step.isOptional || false,
    group: inferGroup(step),
  }))

  return {
    id: generateId(),
    goal,
    summary: data.summary,
    steps,
    groups: generateGroups(steps),
    requiredResources: data.requiredResources.map(r => ({
      type: r.type as ResourceType,
      name: r.name,
      isRequired: r.isRequired,
    })),
    checkpointStepIds: steps.filter(s => s.isCheckpoint).map(s => s.id),
    estimatedTotalSeconds: steps.reduce((sum, s) => sum + s.estimatedSeconds, 0),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
```

---

## 1.4 实现依赖关系管理

**文件**: `apps/web/src/lib/goi/planning/dependencyGraph.ts`（新建）

### 任务描述

管理步骤之间的依赖关系，支持智能调度。

### 具体步骤

- [ ] 创建 `dependencyGraph.ts` 文件：

```typescript
/**
 * 依赖关系图
 */
export class DependencyGraph {
  private steps: Map<string, PlanStep>
  private dependencies: Map<string, Set<string>>  // stepId -> 依赖的 stepIds
  private dependents: Map<string, Set<string>>    // stepId -> 被哪些 step 依赖

  constructor(steps: PlanStep[]) {
    this.steps = new Map(steps.map(s => [s.id, s]))
    this.dependencies = new Map()
    this.dependents = new Map()

    for (const step of steps) {
      this.dependencies.set(step.id, new Set(step.dependencies))
      for (const dep of step.dependencies) {
        if (!this.dependents.has(dep)) {
          this.dependents.set(dep, new Set())
        }
        this.dependents.get(dep)!.add(step.id)
      }
    }
  }

  /**
   * 获取可执行的步骤
   */
  getExecutableSteps(completedIds: Set<string>): PlanStep[] {
    const executable: PlanStep[] = []

    for (const [stepId, step] of this.steps) {
      if (step.status !== 'pending') continue

      const deps = this.dependencies.get(stepId) || new Set()
      const allDepsCompleted = [...deps].every(dep => completedIds.has(dep))

      if (allDepsCompleted) {
        executable.push(step)
      }
    }

    return executable
  }

  /**
   * 获取下一个要执行的步骤
   */
  getNextStep(completedIds: Set<string>): PlanStep | null {
    const executable = this.getExecutableSteps(completedIds)
    if (executable.length === 0) return null

    // 按 order 排序，返回第一个
    return executable.sort((a, b) => a.order - b.order)[0]
  }

  /**
   * 获取受某步骤失败影响的步骤
   */
  getAffectedSteps(failedStepId: string): Set<string> {
    const affected = new Set<string>()
    const queue = [failedStepId]

    while (queue.length > 0) {
      const current = queue.shift()!
      const dependents = this.dependents.get(current) || new Set()

      for (const dep of dependents) {
        if (!affected.has(dep)) {
          affected.add(dep)
          queue.push(dep)
        }
      }
    }

    return affected
  }

  /**
   * 检查是否可以跳过某步骤
   */
  canSkipStep(stepId: string): boolean {
    const step = this.steps.get(stepId)
    if (!step) return false

    // 检查是否有依赖此步骤的必要步骤
    const dependents = this.dependents.get(stepId) || new Set()
    for (const depId of dependents) {
      const dep = this.steps.get(depId)
      if (dep && !dep.isOptional) {
        return false  // 有必要步骤依赖它，不能跳过
      }
    }

    return step.isOptional
  }

  /**
   * 标记步骤为失败，并阻塞依赖步骤
   */
  markFailed(stepId: string): void {
    const step = this.steps.get(stepId)
    if (step) {
      step.status = 'failed'
    }

    const affected = this.getAffectedSteps(stepId)
    for (const affectedId of affected) {
      const affectedStep = this.steps.get(affectedId)
      if (affectedStep && affectedStep.status === 'pending') {
        affectedStep.status = 'blocked'
      }
    }
  }

  /**
   * 拓扑排序（用于优化执行顺序）
   */
  topologicalSort(): PlanStep[] {
    const sorted: PlanStep[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return
      if (visiting.has(stepId)) throw new Error('Circular dependency detected')

      visiting.add(stepId)
      const deps = this.dependencies.get(stepId) || new Set()
      for (const dep of deps) {
        visit(dep)
      }
      visiting.delete(stepId)
      visited.add(stepId)
      sorted.push(this.steps.get(stepId)!)
    }

    for (const stepId of this.steps.keys()) {
      visit(stepId)
    }

    return sorted
  }
}
```

---

## 1.5 实现资源预解析

**文件**: `apps/web/src/lib/goi/planning/resourceResolver.ts`（新建）

### 任务描述

在规划阶段预先解析用户提到的资源，提供候选项。

### 具体步骤

- [ ] 创建 `resourceResolver.ts` 文件：

```typescript
import { fuzzySearchResources } from '../intent/fuzzyMatcher'

/**
 * 资源解析结果
 */
export type ResolvedResource = {
  type: ResourceType
  inputName: string           // 用户输入的名称
  candidates: Array<{
    id: string
    name: string
    score: number
  }>
  bestMatch?: {
    id: string
    name: string
    confidence: number
  }
  needsClarification: boolean
}

/**
 * 解析计划中需要的资源
 */
export async function resolveResources(
  requirements: ResourceRequirement[]
): Promise<Map<string, ResolvedResource>> {
  const results = new Map<string, ResolvedResource>()

  for (const req of requirements) {
    if (!req.name) {
      // 没有指定名称，需要用户选择
      results.set(req.type, {
        type: req.type,
        inputName: '',
        candidates: [],
        needsClarification: true,
      })
      continue
    }

    // 模糊搜索匹配的资源
    const candidates = await fuzzySearchResources(req.type, req.name, 5)

    const result: ResolvedResource = {
      type: req.type,
      inputName: req.name,
      candidates,
      needsClarification: candidates.length !== 1 || candidates[0]?.score < 0.8,
    }

    // 如果有高置信度的匹配
    if (candidates.length > 0 && candidates[0].score >= 0.8) {
      result.bestMatch = {
        id: candidates[0].id,
        name: candidates[0].name,
        confidence: candidates[0].score,
      }
    }

    results.set(req.type, result)
  }

  return results
}

/**
 * 更新计划中的资源引用
 */
export function updatePlanWithResolvedResources(
  plan: TaskPlan,
  resolved: Map<string, ResolvedResource>
): TaskPlan {
  const updatedSteps = plan.steps.map(step => {
    // 检查操作中是否引用了资源
    if (step.operation.type === 'access' && step.operation.action === 'select') {
      const resourceType = step.operation.target.resourceType
      const resolvedResource = resolved.get(resourceType)

      if (resolvedResource?.bestMatch) {
        return {
          ...step,
          operation: {
            ...step.operation,
            target: {
              ...step.operation.target,
              resourceId: resolvedResource.bestMatch.id,
            },
          },
          userLabel: `${step.userLabel} → ${resolvedResource.bestMatch.name}`,
        }
      }
    }
    return step
  })

  const updatedRequirements = plan.requiredResources.map(req => {
    const resolvedResource = resolved.get(req.type)
    if (resolvedResource?.bestMatch) {
      return {
        ...req,
        resolved: resolvedResource.bestMatch,
      }
    }
    return req
  })

  return {
    ...plan,
    steps: updatedSteps,
    requiredResources: updatedRequirements,
    updatedAt: new Date(),
  }
}
```

---

## 1.6 单元测试

**文件**: `apps/web/src/lib/goi/__tests__/planning.test.ts`

### 任务描述

为规划系统编写单元测试。

### 具体步骤

- [ ] 创建测试文件：

```typescript
import { matchTemplate, generatePlanFromTemplate, TASK_TEMPLATES } from '../planning/templates'
import { generatePlanWithLLM } from '../planning/llmPlanner'
import { DependencyGraph } from '../planning/dependencyGraph'
import { resolveResources } from '../planning/resourceResolver'

describe('Task Templates', () => {
  describe('matchTemplate', () => {
    it('should match "创建测试任务"', () => {
      const template = matchTemplate('创建测试任务')
      expect(template?.id).toBe('create-test-task')
    })

    it('should match "用 GPT-4 测试一下"', () => {
      const template = matchTemplate('用 GPT-4 测试一下')
      expect(template?.id).toBe('create-test-task')
    })

    it('should match "创建提示词"', () => {
      const template = matchTemplate('创建一个新的提示词')
      expect(template?.id).toBe('create-prompt')
    })

    it('should return null for unknown task', () => {
      const template = matchTemplate('做一些随机的事情')
      expect(template).toBeNull()
    })
  })

  describe('generatePlanFromTemplate', () => {
    it('should generate plan with correct steps', () => {
      const template = TASK_TEMPLATES.find(t => t.id === 'create-test-task')!
      const plan = generatePlanFromTemplate(template, {}, new Map())

      expect(plan.steps.length).toBeGreaterThan(5)
      expect(plan.checkpointStepIds.length).toBeGreaterThan(0)
    })
  })
})

describe('DependencyGraph', () => {
  const mockSteps: PlanStep[] = [
    { id: 'step-1', order: 1, dependencies: [], status: 'pending' } as PlanStep,
    { id: 'step-2', order: 2, dependencies: ['step-1'], status: 'pending' } as PlanStep,
    { id: 'step-3', order: 3, dependencies: ['step-1'], status: 'pending' } as PlanStep,
    { id: 'step-4', order: 4, dependencies: ['step-2', 'step-3'], status: 'pending' } as PlanStep,
  ]

  it('should get executable steps correctly', () => {
    const graph = new DependencyGraph(mockSteps)

    // 初始状态只有 step-1 可执行
    let executable = graph.getExecutableSteps(new Set())
    expect(executable.map(s => s.id)).toEqual(['step-1'])

    // step-1 完成后，step-2 和 step-3 可执行
    executable = graph.getExecutableSteps(new Set(['step-1']))
    expect(executable.map(s => s.id).sort()).toEqual(['step-2', 'step-3'])

    // step-2 和 step-3 都完成后，step-4 可执行
    executable = graph.getExecutableSteps(new Set(['step-1', 'step-2', 'step-3']))
    expect(executable.map(s => s.id)).toEqual(['step-4'])
  })

  it('should get affected steps on failure', () => {
    const graph = new DependencyGraph(mockSteps)
    const affected = graph.getAffectedSteps('step-1')

    expect(affected).toContain('step-2')
    expect(affected).toContain('step-3')
    expect(affected).toContain('step-4')
  })
})
```

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-13 | 1.1 定义计划数据结构 | ✅ 完成 | 创建 `packages/shared/src/types/goi/plan.ts`，定义 TaskPlan、PlanStep、PlanGroup、ResourceRequirement 等类型，添加辅助函数 |
| 2025-12-13 | 1.2 实现任务模板系统 | ✅ 完成 | 创建 `apps/web/src/lib/goi/planning/templates.ts`，实现 7 个预置模板（创建测试任务、创建提示词、添加模型等），支持模板匹配和计划生成 |
| 2025-12-13 | 1.3 增强 LLM 规划器 | ✅ 完成 | 创建 `apps/web/src/lib/goi/planning/llmPlanner.ts`，支持当无匹配模板时使用 LLM 生成执行计划 |
| 2025-12-13 | 1.4 实现依赖关系管理 | ✅ 完成 | 创建 `apps/web/src/lib/goi/planning/dependencyGraph.ts`，实现依赖图、拓扑排序、关键路径分析、并行执行组等功能 |
| 2025-12-13 | 1.5 实现资源预解析 | ✅ 完成 | 创建 `apps/web/src/lib/goi/planning/resourceResolver.ts`，支持模糊匹配资源、解析候选项、更新计划中的资源引用 |
| 2025-12-13 | 导出与验证 | ✅ 完成 | 创建 `planning/index.ts` 导出模块，类型检查通过 |
