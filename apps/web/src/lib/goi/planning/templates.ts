/**
 * GOI 任务模板系统
 *
 * 预定义常见任务的执行模板，提高规划速度和稳定性
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

// ============================================
// 模板类型定义
// ============================================

/**
 * 模板输入定义
 */
export type TemplateInput = {
  /** 输入名称 */
  name: string
  /** 资源类型 */
  type: ResourceType
  /** 是否必需 */
  required: boolean
  /** 默认值 */
  default?: string
  /** 描述 */
  description?: string
}

/**
 * 模板步骤类型
 */
export type TemplateStepType =
  | 'navigate'  // 导航到页面
  | 'select'    // 选择资源
  | 'input'     // 填写输入
  | 'submit'    // 提交操作
  | 'wait'      // 等待结果
  | 'verify'    // 验证结果

/**
 * 模板步骤定义
 */
export type TemplateStep = {
  /** 步骤类型 */
  type: TemplateStepType
  /** 步骤参数 */
  params: Record<string, string>
  /** 用户可读描述 */
  userLabel: string
  /** 是否为检查点 */
  isCheckpoint?: boolean
  /** 检查点类型 */
  checkpointType?: PlanCheckpointType
  /** 是否可选 */
  optional?: boolean
  /** 所属分组 */
  group?: string
  /** 预估耗时（秒） */
  estimatedSeconds?: number
}

/**
 * 任务模板
 */
export type TaskTemplate = {
  /** 模板 ID */
  id: string
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 触发模式（正则表达式） */
  triggerPatterns: RegExp[]
  /** 需要的输入 */
  requiredInputs: TemplateInput[]
  /** 步骤列表 */
  steps: TemplateStep[]
  /** 预估总耗时（秒） */
  estimatedSeconds: number
}

// ============================================
// 预置模板
// ============================================

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
      /跑.*测试/,
      /运行.*测试/,
      /create.*test.*task/i,
      /run.*test/i,
      /execute.*test/i,
    ],
    requiredInputs: [
      { name: 'prompt', type: 'prompt', required: true, description: '要测试的提示词' },
      { name: 'dataset', type: 'dataset', required: true, description: '测试数据集' },
      { name: 'model', type: 'model', required: false, default: 'default', description: '使用的模型' },
    ],
    steps: [
      {
        type: 'navigate',
        params: { path: '/tasks/new' },
        userLabel: '打开任务创建页面',
        group: 'prepare',
        estimatedSeconds: 2,
      },
      {
        type: 'select',
        params: { resource: 'prompt' },
        userLabel: '选择 Prompt',
        isCheckpoint: true,
        checkpointType: 'resource_selection',
        group: 'config',
        estimatedSeconds: 5,
      },
      {
        type: 'select',
        params: { resource: 'dataset' },
        userLabel: '选择 Dataset',
        isCheckpoint: true,
        checkpointType: 'resource_selection',
        group: 'config',
        estimatedSeconds: 5,
      },
      {
        type: 'select',
        params: { resource: 'model' },
        userLabel: '选择 Model',
        isCheckpoint: true,
        checkpointType: 'resource_selection',
        group: 'config',
        estimatedSeconds: 5,
      },
      {
        type: 'input',
        params: { section: 'field-mapping' },
        userLabel: '配置字段映射',
        group: 'config',
        estimatedSeconds: 10,
      },
      {
        type: 'submit',
        params: { action: 'create-and-run' },
        userLabel: '创建并启动任务',
        isCheckpoint: true,
        checkpointType: 'cost_incurring',
        group: 'execute',
        estimatedSeconds: 3,
      },
      {
        type: 'wait',
        params: { for: 'task-started' },
        userLabel: '等待任务启动',
        group: 'execute',
        estimatedSeconds: 5,
      },
    ],
    estimatedSeconds: 35,
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
      /添加.*提示词/,
      /create.*prompt/i,
      /new.*prompt/i,
    ],
    requiredInputs: [
      { name: 'name', type: 'prompt', required: false, description: '提示词名称' },
    ],
    steps: [
      {
        type: 'navigate',
        params: { path: '/prompts/new' },
        userLabel: '打开提示词创建页面',
        group: 'prepare',
        estimatedSeconds: 2,
      },
      {
        type: 'input',
        params: { field: 'name' },
        userLabel: '填写名称',
        group: 'config',
        estimatedSeconds: 5,
      },
      {
        type: 'input',
        params: { field: 'content' },
        userLabel: '编写提示词内容',
        group: 'config',
        estimatedSeconds: 30,
      },
      {
        type: 'submit',
        params: { action: 'save' },
        userLabel: '保存提示词',
        isCheckpoint: true,
        checkpointType: 'irreversible_action',
        group: 'execute',
        estimatedSeconds: 3,
      },
    ],
    estimatedSeconds: 40,
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
      /add.*model/i,
      /new.*model/i,
    ],
    requiredInputs: [
      { name: 'provider', type: 'provider', required: false, description: '模型供应商' },
      { name: 'name', type: 'model', required: false, description: '模型名称' },
    ],
    steps: [
      {
        type: 'navigate',
        params: { path: '/models' },
        userLabel: '打开模型配置页面',
        group: 'prepare',
        estimatedSeconds: 2,
      },
      {
        type: 'select',
        params: { action: 'open-add-modal' },
        userLabel: '打开添加弹窗',
        group: 'prepare',
        estimatedSeconds: 2,
      },
      {
        type: 'select',
        params: { resource: 'provider' },
        userLabel: '选择供应商',
        group: 'config',
        estimatedSeconds: 5,
      },
      {
        type: 'input',
        params: { field: 'name' },
        userLabel: '填写模型名称',
        group: 'config',
        estimatedSeconds: 5,
      },
      {
        type: 'input',
        params: { field: 'config' },
        userLabel: '配置模型参数',
        group: 'config',
        estimatedSeconds: 10,
      },
      {
        type: 'submit',
        params: { action: 'save' },
        userLabel: '保存模型',
        isCheckpoint: true,
        checkpointType: 'irreversible_action',
        group: 'execute',
        estimatedSeconds: 3,
      },
    ],
    estimatedSeconds: 27,
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
      /任务.*状态/,
      /view.*result/i,
      /show.*result/i,
    ],
    requiredInputs: [
      { name: 'task', type: 'task', required: true, description: '任务' },
    ],
    steps: [
      {
        type: 'navigate',
        params: { path: '/tasks/{task}/results' },
        userLabel: '打开任务结果页面',
        group: 'navigate',
        estimatedSeconds: 3,
      },
    ],
    estimatedSeconds: 3,
  },

  // 5. 上传数据集
  {
    id: 'upload-dataset',
    name: '上传数据集',
    description: '上传一个新的数据集',
    triggerPatterns: [
      /上传.*数据集/,
      /导入.*数据/,
      /新建.*dataset/i,
      /upload.*dataset/i,
      /import.*data/i,
    ],
    requiredInputs: [
      { name: 'name', type: 'dataset', required: false, description: '数据集名称' },
    ],
    steps: [
      {
        type: 'navigate',
        params: { path: '/datasets' },
        userLabel: '打开数据集页面',
        group: 'prepare',
        estimatedSeconds: 2,
      },
      {
        type: 'select',
        params: { action: 'open-upload-modal' },
        userLabel: '打开上传弹窗',
        group: 'prepare',
        estimatedSeconds: 2,
      },
      {
        type: 'input',
        params: { field: 'file' },
        userLabel: '选择文件',
        isCheckpoint: true,
        checkpointType: 'resource_selection',
        group: 'config',
        estimatedSeconds: 10,
      },
      {
        type: 'input',
        params: { field: 'name' },
        userLabel: '填写数据集名称',
        group: 'config',
        estimatedSeconds: 5,
      },
      {
        type: 'submit',
        params: { action: 'upload' },
        userLabel: '上传数据集',
        isCheckpoint: true,
        checkpointType: 'irreversible_action',
        group: 'execute',
        estimatedSeconds: 10,
      },
    ],
    estimatedSeconds: 29,
  },

  // 6. 创建评估器
  {
    id: 'create-evaluator',
    name: '创建评估器',
    description: '创建一个新的评估器',
    triggerPatterns: [
      /创建.*评估器/,
      /新建.*evaluator/i,
      /添加.*评估/,
      /create.*evaluator/i,
    ],
    requiredInputs: [
      { name: 'name', type: 'evaluator', required: false, description: '评估器名称' },
      { name: 'type', type: 'evaluator', required: false, description: '评估器类型' },
    ],
    steps: [
      {
        type: 'navigate',
        params: { path: '/evaluators' },
        userLabel: '打开评估器页面',
        group: 'prepare',
        estimatedSeconds: 2,
      },
      {
        type: 'select',
        params: { action: 'open-create-modal' },
        userLabel: '打开创建弹窗',
        group: 'prepare',
        estimatedSeconds: 2,
      },
      {
        type: 'select',
        params: { field: 'type' },
        userLabel: '选择评估器类型',
        group: 'config',
        estimatedSeconds: 5,
      },
      {
        type: 'input',
        params: { field: 'name' },
        userLabel: '填写评估器名称',
        group: 'config',
        estimatedSeconds: 5,
      },
      {
        type: 'input',
        params: { field: 'config' },
        userLabel: '配置评估器参数',
        group: 'config',
        estimatedSeconds: 15,
      },
      {
        type: 'submit',
        params: { action: 'save' },
        userLabel: '保存评估器',
        isCheckpoint: true,
        checkpointType: 'irreversible_action',
        group: 'execute',
        estimatedSeconds: 3,
      },
    ],
    estimatedSeconds: 32,
  },

  // 7. 创建定时任务
  {
    id: 'create-scheduled-task',
    name: '创建定时任务',
    description: '创建一个定时执行的测试任务',
    triggerPatterns: [
      /创建.*定时/,
      /新建.*scheduled/i,
      /设置.*自动.*测试/,
      /create.*scheduled/i,
      /schedule.*task/i,
    ],
    requiredInputs: [
      { name: 'task', type: 'task', required: true, description: '基础任务' },
      { name: 'cron', type: 'scheduled_task', required: false, description: 'Cron 表达式' },
    ],
    steps: [
      {
        type: 'navigate',
        params: { path: '/scheduled' },
        userLabel: '打开定时任务页面',
        group: 'prepare',
        estimatedSeconds: 2,
      },
      {
        type: 'select',
        params: { action: 'open-create-modal' },
        userLabel: '打开创建弹窗',
        group: 'prepare',
        estimatedSeconds: 2,
      },
      {
        type: 'select',
        params: { resource: 'task' },
        userLabel: '选择基础任务',
        isCheckpoint: true,
        checkpointType: 'resource_selection',
        group: 'config',
        estimatedSeconds: 5,
      },
      {
        type: 'input',
        params: { field: 'cron' },
        userLabel: '配置执行频率',
        group: 'config',
        estimatedSeconds: 10,
      },
      {
        type: 'submit',
        params: { action: 'save' },
        userLabel: '保存定时任务',
        isCheckpoint: true,
        checkpointType: 'irreversible_action',
        group: 'execute',
        estimatedSeconds: 3,
      },
    ],
    estimatedSeconds: 22,
  },
]

// ============================================
// 模板匹配
// ============================================

/**
 * 匹配任务模板
 */
export function matchTemplate(input: string): TaskTemplate | null {
  const normalizedInput = input.toLowerCase().trim()

  for (const template of TASK_TEMPLATES) {
    for (const pattern of template.triggerPatterns) {
      if (pattern.test(normalizedInput) || pattern.test(input)) {
        return template
      }
    }
  }

  return null
}

/**
 * 获取所有模板
 */
export function getAllTemplates(): TaskTemplate[] {
  return [...TASK_TEMPLATES]
}

/**
 * 根据 ID 获取模板
 */
export function getTemplateById(id: string): TaskTemplate | null {
  return TASK_TEMPLATES.find(t => t.id === id) || null
}

// ============================================
// 从模板生成计划
// ============================================

/**
 * 分组配置
 */
const GROUP_CONFIG: Record<string, { name: string; emoji: string }> = {
  prepare: { name: '准备', emoji: '📋' },
  config: { name: '配置', emoji: '⚙️' },
  execute: { name: '执行', emoji: '🚀' },
  navigate: { name: '导航', emoji: '🧭' },
  verify: { name: '验证', emoji: '✅' },
}

/**
 * 将模板步骤转换为 GOI 操作
 */
function convertTemplateStepToOperation(
  step: TemplateStep,
  inputs: Record<string, string>,
  resolvedResources: Map<string, { id: string; name: string }>
): GoiOperation {
  switch (step.type) {
    case 'navigate': {
      // 解析路径中的变量
      let path = step.params.path
      for (const [key, value] of Object.entries(inputs)) {
        path = path.replace(`{${key}}`, value)
      }
      for (const [key, resolved] of resolvedResources) {
        path = path.replace(`{${key}}`, resolved.id)
      }

      // 从路径推断资源类型
      const resourceType = inferResourceTypeFromPath(path)

      return {
        type: 'access',
        target: { resourceType },
        action: 'navigate',
        context: { page: path },
      }
    }

    case 'select': {
      const resourceType = step.params.resource as ResourceType
      const resolved = resolvedResources.get(step.params.resource)

      return {
        type: 'access',
        target: {
          resourceType,
          resourceId: resolved?.id,
        },
        action: 'select',
      }
    }

    case 'input': {
      return {
        type: 'state',
        target: { resourceType: 'prompt' },
        action: 'update',
        expectedState: {
          [step.params.field]: inputs[step.params.field] || '',
        },
      }
    }

    case 'submit': {
      return {
        type: 'state',
        target: { resourceType: 'task' },
        action: 'create',
        expectedState: {
          action: step.params.action,
        },
      }
    }

    case 'wait': {
      return {
        type: 'observation',
        queries: [{
          resourceType: 'task',
          fields: ['status', 'progress'],
        }],
      }
    }

    case 'verify': {
      return {
        type: 'observation',
        queries: [{
          resourceType: step.params.resource as ResourceType,
          fields: ['status', 'result'],
        }],
      }
    }

    default:
      return {
        type: 'observation',
        queries: [],
      }
  }
}

/**
 * 从路径推断资源类型
 */
function inferResourceTypeFromPath(path: string): ResourceType {
  if (path.includes('/tasks')) return 'task'
  if (path.includes('/prompts')) return 'prompt'
  if (path.includes('/datasets')) return 'dataset'
  if (path.includes('/models')) return 'model'
  if (path.includes('/evaluators')) return 'evaluator'
  if (path.includes('/scheduled')) return 'scheduled_task'
  if (path.includes('/monitor')) return 'monitor'
  if (path.includes('/settings')) return 'settings'
  return 'dashboard'
}

/**
 * 插值替换标签中的变量
 */
function interpolateLabel(
  label: string,
  inputs: Record<string, string>,
  resolvedResources: Map<string, { id: string; name: string }>
): string {
  let result = label

  for (const [key, value] of Object.entries(inputs)) {
    result = result.replace(`{${key}}`, value)
  }

  for (const [key, resolved] of resolvedResources) {
    result = result.replace(`{${key}}`, resolved.name)
  }

  return result
}

/**
 * 生成分组
 */
function generateGroups(steps: PlanStep[]): PlanGroup[] {
  const groupMap = new Map<string, string[]>()

  for (const step of steps) {
    const groupId = step.group || 'default'
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
 * 从模板生成计划
 */
export function generatePlanFromTemplate(
  template: TaskTemplate,
  inputs: Record<string, string>,
  resolvedResources: Map<string, { id: string; name: string }>
): TaskPlan {
  const planId = nanoid()

  const steps: PlanStep[] = template.steps.map((step, index) => {
    const stepId = `step-${index + 1}`

    return {
      id: stepId,
      order: index + 1,
      operation: convertTemplateStepToOperation(step, inputs, resolvedResources),
      userLabel: interpolateLabel(step.userLabel, inputs, resolvedResources),
      dependencies: index > 0 ? [`step-${index}`] : [],
      isCheckpoint: step.isCheckpoint || false,
      checkpointType: step.checkpointType,
      status: 'pending',
      estimatedSeconds: step.estimatedSeconds || 10,
      isOptional: step.optional || false,
      group: step.group,
    }
  })

  const groups = generateGroups(steps)

  const requiredResources: ResourceRequirement[] = template.requiredInputs.map(input => ({
    type: input.type,
    name: inputs[input.name],
    resolved: resolvedResources.get(input.name)
      ? { ...resolvedResources.get(input.name)!, confidence: 1 }
      : undefined,
    isRequired: input.required,
    defaultValue: input.default,
  }))

  return {
    id: planId,
    goal: template.name,
    summary: template.description,
    steps,
    groups,
    requiredResources,
    checkpointStepIds: steps.filter(s => s.isCheckpoint).map(s => s.id),
    estimatedTotalSeconds: template.estimatedSeconds,
    templateId: template.id,
    planSource: 'template',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ============================================
// 从用户输入提取资源名称
// ============================================

/**
 * 资源名称提取结果
 */
export type ExtractedResource = {
  type: ResourceType
  name: string
  confidence: number
}

/**
 * 从用户输入中提取资源名称
 */
export function extractResourceNames(
  input: string,
  template: TaskTemplate
): Map<string, string> {
  const result = new Map<string, string>()

  // 简单的模式匹配提取
  for (const templateInput of template.requiredInputs) {
    const patterns = getResourcePatterns(templateInput.type)
    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match && match[1]) {
        result.set(templateInput.name, match[1].trim())
        break
      }
    }
  }

  return result
}

/**
 * 获取资源类型的匹配模式
 */
function getResourcePatterns(type: ResourceType): RegExp[] {
  switch (type) {
    case 'prompt':
      return [
        /(?:提示词|prompt)\s*[""「]([^""」]+)[""」]/i,
        /(?:用|使用)\s*[""「]([^""」]+)[""」]\s*(?:提示词|prompt)/i,
        /[""「]([^""」]+)[""」]\s*(?:这个)?(?:提示词|prompt)/i,
      ]
    case 'dataset':
      return [
        /(?:数据集|dataset)\s*[""「]([^""」]+)[""」]/i,
        /(?:用|使用)\s*[""「]([^""」]+)[""」]\s*(?:数据集|dataset)/i,
        /[""「]([^""」]+)[""」]\s*(?:这个)?(?:数据集|dataset)/i,
      ]
    case 'model':
      return [
        /(?:模型|model)\s*[""「]([^""」]+)[""」]/i,
        /(?:用|使用)\s*[""「]([^""」]+)[""」]\s*(?:模型|model)?/i,
        /(?:用|使用)\s+(gpt-[\w.-]+|claude-[\w.-]+|[\w-]+-\d+[\w-]*)/i,
      ]
    case 'task':
      return [
        /(?:任务|task)\s*[""「]([^""」]+)[""」]/i,
        /[""「]([^""」]+)[""」]\s*(?:这个)?(?:任务|task)/i,
      ]
    default:
      return []
  }
}
