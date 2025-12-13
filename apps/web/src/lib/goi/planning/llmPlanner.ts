/**
 * GOI LLM 规划器
 *
 * 当没有匹配模板时，使用 LLM 生成执行计划
 */

import { nanoid } from 'nanoid'
import type {
  ResourceType,
  GoiOperation,
  TaskPlan,
  PlanStep,
  PlanGroup,
  PlanCheckpointType,
  ResourceRequirement,
} from '@platform/shared'
import { prisma } from '../../prisma'
import { invokeModel, type ModelConfig } from '../../modelInvoker'

// ============================================
// 类型定义
// ============================================

/**
 * 规划上下文
 */
export type PlanningContext = {
  /** 当前页面路径 */
  currentPage?: string
  /** 最近访问的资源 */
  recentResources?: Array<{
    type: ResourceType
    id: string
    name: string
  }>
  /** 用户偏好 */
  preferences?: {
    autoConfirmCheckpoints?: boolean
    skipOptionalSteps?: boolean
  }
  /** 可用资源统计 */
  availableResources?: {
    prompts: number
    datasets: number
    models: number
    evaluators: number
  }
}

/**
 * LLM 规划器配置
 */
export type LLMPlannerConfig = {
  /** 模型 ID */
  modelId: string
  /** 温度 */
  temperature?: number
  /** 最大 token */
  maxTokens?: number
}

/**
 * LLM 规划响应
 */
type LLMPlanResponse = {
  summary: string
  steps: Array<{
    order: number
    type: 'navigate' | 'select' | 'create' | 'edit' | 'delete' | 'execute' | 'wait'
    resource: string
    resourceName?: string
    userLabel: string
    hint?: string
    isCheckpoint?: boolean
    checkpointReason?: string
    dependencies?: number[]
    isOptional?: boolean
    group?: string
  }>
  requiredResources: Array<{
    type: string
    name?: string
    isRequired: boolean
  }>
}

// ============================================
// 规划提示词
// ============================================

const PLANNING_PROMPT = `你是一个任务规划助手，负责将用户的目标拆解为可执行的步骤。

## 平台能力

该平台是一个 AI 模型测试平台，支持以下操作：

### 资源类型
- prompt: 提示词
- dataset: 数据集
- model: AI 模型
- evaluator: 评估器
- task: 测试任务
- scheduled_task: 定时任务
- alert_rule: 告警规则
- notify_channel: 通知渠道

### 操作类型
1. **navigate** - 导航到页面
2. **select** - 选择已有资源
3. **create** - 创建新资源
4. **edit** - 编辑资源
5. **delete** - 删除资源
6. **execute** - 执行任务
7. **wait** - 等待结果

### 页面路径
- /prompts - 提示词列表
- /prompts/new - 创建提示词
- /datasets - 数据集列表
- /models - 模型配置
- /evaluators - 评估器列表
- /tasks - 任务列表
- /tasks/new - 创建任务
- /scheduled - 定时任务
- /monitor - 监控中心
- /settings - 系统设置

## 输出格式

请以 JSON 格式输出计划：

\`\`\`json
{
  "summary": "简要描述要做什么（一句话）",
  "steps": [
    {
      "order": 1,
      "type": "navigate|select|create|edit|delete|execute|wait",
      "resource": "资源类型",
      "resourceName": "用户提到的资源名（如有）",
      "userLabel": "用户可读的描述（中文）",
      "hint": "操作提示（可选）",
      "isCheckpoint": true或false,
      "checkpointReason": "需要确认的原因（如果是检查点）",
      "dependencies": [依赖的步骤order数组],
      "isOptional": true或false,
      "group": "prepare|config|execute|verify"
    }
  ],
  "requiredResources": [
    {
      "type": "资源类型",
      "name": "用户提到的名称",
      "isRequired": true或false
    }
  ]
}
\`\`\`

## 规划原则

1. **原子化** - 每个步骤应该是单一、明确的操作
2. **有序性** - 步骤顺序应该合理，依赖关系清晰
3. **检查点** - 以下情况设为检查点（isCheckpoint: true）：
   - 选择关键资源（prompt, dataset, model）
   - 不可逆操作（删除、提交）
   - 涉及费用的操作（调用 LLM API）
   - 首次执行某类操作
4. **分组** - 将步骤分配到合适的分组：
   - prepare: 准备阶段（导航、打开弹窗）
   - config: 配置阶段（选择资源、填写表单）
   - execute: 执行阶段（提交、运行）
   - verify: 验证阶段（检查结果）
5. **容错性** - 标记可选步骤，提供跳过条件

## 用户目标

{goal}

## 上下文信息

{context}

请生成执行计划（只输出 JSON，不要其他内容）：`

// ============================================
// 模型配置获取
// ============================================

async function getModelConfig(modelId: string): Promise<ModelConfig | null> {
  const syncedModel = await prisma.syncedModel.findUnique({
    where: { id: modelId },
  })

  if (syncedModel) {
    return {
      id: syncedModel.id,
      modelId: syncedModel.modelId,
      provider: {
        type: 'openai',
        baseUrl: '',
        apiKey: '',
        headers: {},
      },
      config: {},
      pricing: {
        inputPerMillion: syncedModel.inputPrice ? syncedModel.inputPrice * 1000 : undefined,
        outputPerMillion: syncedModel.outputPrice ? syncedModel.outputPrice * 1000 : undefined,
        currency: 'CNY',
      },
      source: 'fastgpt',
    }
  }

  const localModel = await prisma.model.findUnique({
    where: { id: modelId },
    include: { provider: true },
  })

  if (localModel) {
    return {
      id: localModel.id,
      modelId: localModel.modelId,
      provider: {
        type: localModel.provider.type,
        baseUrl: localModel.provider.baseUrl,
        apiKey: localModel.provider.apiKey,
        headers: (localModel.provider.headers as Record<string, string>) || {},
      },
      config: (localModel.config as Record<string, unknown>) || {},
      pricing: localModel.pricing as ModelConfig['pricing'],
      source: 'local',
    }
  }

  return null
}

// ============================================
// LLM 调用
// ============================================

async function callLLM(
  prompt: string,
  config: LLMPlannerConfig
): Promise<string> {
  const modelConfig = await getModelConfig(config.modelId)
  if (!modelConfig) {
    throw new Error(`Model not found: ${config.modelId}`)
  }

  const result = await invokeModel(modelConfig, {
    messages: [
      { role: 'user', content: prompt },
    ],
    temperature: config.temperature ?? 0.3,
    maxTokens: config.maxTokens ?? 4000,
  })

  return result.output
}

// ============================================
// 响应解析
// ============================================

/**
 * 解析 LLM 响应
 */
function parseLLMResponse(response: string): LLMPlanResponse {
  // 提取 JSON 内容
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                    response.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    throw new Error('Failed to extract JSON from response')
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0]

  try {
    return JSON.parse(jsonStr)
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error}`)
  }
}

/**
 * 推断检查点类型
 */
function inferCheckpointType(step: LLMPlanResponse['steps'][0]): PlanCheckpointType | undefined {
  if (!step.isCheckpoint) return undefined

  if (step.type === 'select' && ['prompt', 'dataset', 'model'].includes(step.resource)) {
    return 'resource_selection'
  }
  if (step.type === 'delete') {
    return 'irreversible_action'
  }
  if (step.type === 'execute') {
    return 'cost_incurring'
  }

  return 'user_defined'
}

/**
 * 估算步骤耗时
 */
function estimateStepTime(step: LLMPlanResponse['steps'][0]): number {
  switch (step.type) {
    case 'navigate':
      return 2
    case 'select':
      return 5
    case 'create':
      return 15
    case 'edit':
      return 10
    case 'delete':
      return 3
    case 'execute':
      return 30
    case 'wait':
      return 60
    default:
      return 10
  }
}

/**
 * 将步骤类型转换为 GOI 操作
 */
function convertToOperation(step: LLMPlanResponse['steps'][0]): GoiOperation {
  const resourceType = step.resource as ResourceType

  switch (step.type) {
    case 'navigate':
      return {
        type: 'access',
        target: { resourceType },
        action: 'navigate',
      }

    case 'select':
      return {
        type: 'access',
        target: { resourceType },
        action: 'select',
      }

    case 'create':
      return {
        type: 'state',
        target: { resourceType },
        action: 'create',
        expectedState: {},
      }

    case 'edit':
      return {
        type: 'state',
        target: { resourceType },
        action: 'update',
        expectedState: {},
      }

    case 'delete':
      return {
        type: 'state',
        target: { resourceType },
        action: 'delete',
        expectedState: {},
      }

    case 'execute':
    case 'wait':
      return {
        type: 'observation',
        queries: [{
          resourceType,
          fields: ['status', 'progress', 'result'],
        }],
      }

    default:
      return {
        type: 'observation',
        queries: [],
      }
  }
}

// ============================================
// 计划生成
// ============================================

/**
 * 分组配置
 */
const GROUP_CONFIG: Record<string, { name: string; emoji: string }> = {
  prepare: { name: '准备', emoji: '📋' },
  config: { name: '配置', emoji: '⚙️' },
  execute: { name: '执行', emoji: '🚀' },
  verify: { name: '验证', emoji: '✅' },
}

/**
 * 生成分组
 */
function generateGroups(steps: PlanStep[]): PlanGroup[] {
  const groupMap = new Map<string, string[]>()

  for (const step of steps) {
    const groupId = step.group || 'execute'
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, [])
    }
    groupMap.get(groupId)!.push(step.id)
  }

  return Array.from(groupMap.entries()).map(([groupId, stepIds]) => {
    const config = GROUP_CONFIG[groupId] || { name: groupId, emoji: '📌' }
    return {
      id: groupId,
      name: config.name,
      emoji: config.emoji,
      stepIds,
      collapsed: false,
    }
  })
}

/**
 * 将 LLM 响应转换为 TaskPlan
 */
function convertLLMResponseToPlan(data: LLMPlanResponse, goal: string): TaskPlan {
  const planId = nanoid()

  const steps: PlanStep[] = data.steps.map((step, index) => ({
    id: `step-${step.order}`,
    order: step.order,
    operation: convertToOperation(step),
    userLabel: step.userLabel,
    technicalLabel: `${step.type}:${step.resource}`,
    hint: step.hint,
    dependencies: step.dependencies?.map(d => `step-${d}`) || (index > 0 ? [`step-${index}`] : []),
    isCheckpoint: step.isCheckpoint || false,
    checkpointType: inferCheckpointType(step),
    checkpointReason: step.checkpointReason,
    status: 'pending',
    estimatedSeconds: estimateStepTime(step),
    isOptional: step.isOptional || false,
    group: step.group || 'execute',
  }))

  const groups = generateGroups(steps)

  const requiredResources: ResourceRequirement[] = data.requiredResources.map(r => ({
    type: r.type as ResourceType,
    name: r.name,
    isRequired: r.isRequired,
  }))

  return {
    id: planId,
    goal,
    summary: data.summary,
    steps,
    groups,
    requiredResources,
    checkpointStepIds: steps.filter(s => s.isCheckpoint).map(s => s.id),
    estimatedTotalSeconds: steps.reduce((sum, s) => sum + s.estimatedSeconds, 0),
    planSource: 'llm',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================
// 导出函数
// ============================================

/**
 * 使用 LLM 生成计划
 */
export async function generatePlanWithLLM(
  goal: string,
  context: PlanningContext,
  config: LLMPlannerConfig
): Promise<TaskPlan> {
  const prompt = PLANNING_PROMPT
    .replace('{goal}', goal)
    .replace('{context}', JSON.stringify(context, null, 2))

  const response = await callLLM(prompt, config)
  const planData = parseLLMResponse(response)

  return convertLLMResponseToPlan(planData, goal)
}

/**
 * 验证 LLM 生成的计划
 */
export function validateLLMPlan(plan: TaskPlan): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // 检查是否有步骤
  if (plan.steps.length === 0) {
    errors.push('计划没有任何步骤')
  }

  // 检查依赖关系
  const stepIds = new Set(plan.steps.map(s => s.id))
  for (const step of plan.steps) {
    for (const dep of step.dependencies) {
      if (!stepIds.has(dep)) {
        errors.push(`步骤 ${step.id} 依赖不存在的步骤 ${dep}`)
      }
    }
  }

  // 检查循环依赖
  const visited = new Set<string>()
  const visiting = new Set<string>()

  const hasCycle = (stepId: string): boolean => {
    if (visiting.has(stepId)) return true
    if (visited.has(stepId)) return false

    visiting.add(stepId)
    const step = plan.steps.find(s => s.id === stepId)
    if (step) {
      for (const dep of step.dependencies) {
        if (hasCycle(dep)) return true
      }
    }
    visiting.delete(stepId)
    visited.add(stepId)
    return false
  }

  for (const step of plan.steps) {
    if (hasCycle(step.id)) {
      errors.push('计划存在循环依赖')
      break
    }
  }

  // 检查检查点
  if (plan.checkpointStepIds.length === 0) {
    warnings.push('计划没有设置任何检查点')
  }

  // 检查资源需求
  const requiredResources = plan.requiredResources.filter(r => r.isRequired)
  const unresolvedResources = requiredResources.filter(r => !r.resolved)
  if (unresolvedResources.length > 0) {
    warnings.push(`有 ${unresolvedResources.length} 个必需资源未解析`)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
