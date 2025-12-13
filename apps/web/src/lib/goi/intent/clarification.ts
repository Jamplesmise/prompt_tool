/**
 * GOI 澄清对话
 *
 * 当意图不明确时，生成澄清问题让用户确认：
 * - 选择具体资源
 * - 确认操作
 * - 提供参数
 * - 消除歧义
 */

import type {
  ParsedIntent,
  EntityMatch,
  ClarificationType,
  ClarificationRequest,
  ClarificationResponse,
  ResourceType,
  IntentCategory,
} from '@platform/shared'
import { getResourceTypeLabel, INTENT_CATEGORY_LABELS } from '@platform/shared'

// ============================================
// 类型定义
// ============================================

/**
 * 澄清对话上下文
 */
export type ClarificationContext = {
  /** 会话 ID */
  sessionId: string
  /** 对话历史 */
  history?: Array<{
    request: ClarificationRequest
    response: ClarificationResponse
  }>
  /** 最大对话轮数 */
  maxRounds?: number
}

/**
 * 澄清对话状态
 */
export type ClarificationState = {
  /** 是否正在进行澄清 */
  inProgress: boolean
  /** 当前问题 */
  currentRequest?: ClarificationRequest
  /** 已收集的信息 */
  collectedInfo: Record<string, unknown>
  /** 对话轮数 */
  rounds: number
}

// ============================================
// 澄清问题生成
// ============================================

/**
 * 根据意图和实体生成澄清问题
 */
export function generateClarification(
  intent: ParsedIntent,
  entities: EntityMatch[]
): ClarificationRequest | null {
  // 1. 有多个候选资源
  const resourceNameEntity = entities.find((e) => e.type === 'resource_name')
  if (resourceNameEntity?.candidates && resourceNameEntity.candidates.length > 1) {
    return generateResourceSelectionClarification(intent, resourceNameEntity)
  }

  // 2. 缺少资源类型
  if (!intent.resourceType && needsResourceType(intent.category)) {
    return generateResourceTypeClarification(intent)
  }

  // 3. 缺少资源名称（非创建操作）
  if (
    !intent.resourceName &&
    !intent.resourceId &&
    needsResourceIdentifier(intent.category)
  ) {
    return generateResourceNameClarification(intent)
  }

  // 4. 删除操作需要确认
  if (intent.category === 'deletion') {
    return generateDeleteConfirmation(intent)
  }

  // 5. 未知意图
  if (intent.category === 'unknown' || intent.category === 'clarification') {
    return generateGeneralClarification()
  }

  return null
}

/**
 * 判断意图是否需要资源类型
 */
function needsResourceType(category: IntentCategory): boolean {
  const needsType: IntentCategory[] = [
    'creation',
    'modification',
    'deletion',
    'query',
    'execution',
    'export',
  ]
  return needsType.includes(category)
}

/**
 * 判断意图是否需要资源标识
 */
function needsResourceIdentifier(category: IntentCategory): boolean {
  const needsId: IntentCategory[] = ['modification', 'deletion', 'execution']
  return needsId.includes(category)
}

// ============================================
// 具体澄清问题生成器
// ============================================

/**
 * 生成资源选择澄清
 */
function generateResourceSelectionClarification(
  intent: ParsedIntent,
  entity: EntityMatch
): ClarificationRequest {
  const candidates = entity.candidates || []
  const resourceLabel = getResourceTypeLabel(intent.resourceType)

  return {
    type: 'select_resource',
    question: `检测到多个匹配的${resourceLabel}，请选择：`,
    options: candidates.slice(0, 5).map((c) => ({
      value: c.id,
      label: c.name,
      description: `匹配度: ${Math.round(c.score * 100)}%`,
    })),
    allowFreeInput: true,
    relatedIntent: intent,
    relatedEntities: [entity],
  }
}

/**
 * 生成资源类型澄清
 */
function generateResourceTypeClarification(
  intent: ParsedIntent
): ClarificationRequest {
  const actionLabel = INTENT_CATEGORY_LABELS[intent.category] || '操作'

  const commonResources: Array<{
    value: ResourceType
    label: string
    description: string
  }> = [
    { value: 'prompt', label: '提示词', description: '管理和编辑提示词模板' },
    { value: 'dataset', label: '数据集', description: '管理测试数据' },
    { value: 'task', label: '测试任务', description: '创建或查看测试任务' },
    { value: 'model', label: '模型', description: '配置 AI 模型' },
  ]

  return {
    type: 'disambiguate',
    question: `请问您想${actionLabel}什么类型的资源？`,
    options: commonResources,
    allowFreeInput: true,
    relatedIntent: intent,
  }
}

/**
 * 生成资源名称澄清
 */
function generateResourceNameClarification(
  intent: ParsedIntent
): ClarificationRequest {
  const resourceLabel = getResourceTypeLabel(intent.resourceType)
  const actionLabel = INTENT_CATEGORY_LABELS[intent.category] || '操作'

  return {
    type: 'provide_parameter',
    question: `请问您想${actionLabel}哪个${resourceLabel}？请提供名称或选择：`,
    options: [], // 可以动态填充最近使用的资源
    allowFreeInput: true,
    relatedIntent: intent,
  }
}

/**
 * 生成删除确认
 */
function generateDeleteConfirmation(intent: ParsedIntent): ClarificationRequest {
  const resourceLabel = getResourceTypeLabel(intent.resourceType)
  const resourceName = intent.resourceName || '该资源'

  return {
    type: 'confirm_action',
    question: `确定要删除${resourceLabel}「${resourceName}」吗？此操作不可撤销。`,
    options: [
      { value: 'confirm', label: '确认删除', description: '将永久删除该资源' },
      { value: 'cancel', label: '取消', description: '不执行删除操作' },
    ],
    allowFreeInput: false,
    relatedIntent: intent,
  }
}

/**
 * 生成通用澄清
 */
function generateGeneralClarification(): ClarificationRequest {
  return {
    type: 'disambiguate',
    question: '抱歉，我没有理解您的意思。您可以尝试：',
    options: [
      { value: 'help', label: '查看帮助', description: '了解我能做什么' },
      { value: 'examples', label: '查看示例', description: '看一些常用命令示例' },
      { value: 'retry', label: '重新输入', description: '用其他方式描述' },
    ],
    allowFreeInput: true,
  }
}

// ============================================
// 澄清响应处理
// ============================================

/**
 * 处理澄清响应，更新意图
 */
export function processResponse(
  request: ClarificationRequest,
  response: ClarificationResponse,
  intent: ParsedIntent
): ParsedIntent {
  // 取消则返回原意图
  if (response.cancelled) {
    return intent
  }

  const value = response.selectedValue || response.freeInputValue

  switch (request.type) {
    case 'select_resource':
      // 用户选择了具体资源
      return {
        ...intent,
        resourceId: value,
        confidence: Math.min(1, intent.confidence + 0.2),
      }

    case 'disambiguate':
      // 用户指定了资源类型
      if (isResourceType(value)) {
        return {
          ...intent,
          resourceType: value,
          confidence: Math.min(1, intent.confidence + 0.15),
        }
      }
      // 其他消歧选项
      return intent

    case 'provide_parameter':
      // 用户提供了资源名称
      return {
        ...intent,
        resourceName: value,
        confidence: Math.min(1, intent.confidence + 0.1),
      }

    case 'confirm_action':
      // 用户确认操作
      if (value === 'confirm') {
        return {
          ...intent,
          confidence: 1.0, // 用户明确确认
        }
      }
      // 取消
      return {
        ...intent,
        category: 'unknown',
        confidence: 0,
      }

    default:
      return intent
  }
}

/**
 * 检查是否是有效的资源类型
 */
function isResourceType(value?: string): value is ResourceType {
  if (!value) return false
  const validTypes: ResourceType[] = [
    'prompt',
    'dataset',
    'model',
    'provider',
    'evaluator',
    'task',
    'scheduled_task',
    'alert_rule',
    'notify_channel',
  ]
  return validTypes.includes(value as ResourceType)
}

// ============================================
// 澄清对话管理
// ============================================

/**
 * 创建澄清对话状态
 */
export function createClarificationState(): ClarificationState {
  return {
    inProgress: false,
    collectedInfo: {},
    rounds: 0,
  }
}

/**
 * 开始澄清对话
 */
export function startClarification(
  state: ClarificationState,
  request: ClarificationRequest
): ClarificationState {
  return {
    ...state,
    inProgress: true,
    currentRequest: request,
    rounds: state.rounds + 1,
  }
}

/**
 * 完成澄清对话
 */
export function completeClarification(
  state: ClarificationState,
  response: ClarificationResponse
): ClarificationState {
  const value = response.selectedValue || response.freeInputValue

  return {
    ...state,
    inProgress: !response.cancelled,
    currentRequest: undefined,
    collectedInfo: {
      ...state.collectedInfo,
      [state.currentRequest?.type || 'unknown']: value,
    },
  }
}

/**
 * 检查是否达到最大对话轮数
 */
export function hasReachedMaxRounds(
  state: ClarificationState,
  maxRounds: number = 3
): boolean {
  return state.rounds >= maxRounds
}

// ============================================
// 辅助提示生成
// ============================================

/**
 * 生成操作示例
 */
export function generateExamples(category?: IntentCategory): string[] {
  const examples: Record<IntentCategory, string[]> = {
    navigation: [
      '打开提示词管理',
      '去模型配置页面',
      '进入数据集',
    ],
    creation: [
      '创建一个情感分析的提示词',
      '新建测试任务',
      '添加模型 GPT-4',
    ],
    modification: [
      '编辑提示词「客服问答」',
      '修改模型配置',
      '更新数据集',
    ],
    deletion: [
      '删除提示词「旧版本」',
      '移除测试任务',
    ],
    query: [
      '查看所有提示词',
      '显示最近的任务',
      '任务有哪些',
    ],
    execution: [
      '运行测试任务「回归测试」',
      '测试模型 GPT-4',
      '执行定时任务',
    ],
    comparison: [
      '对比提示词 A 和 B',
      '比较两个版本的结果',
    ],
    export: [
      '导出任务结果',
      '下载数据集',
    ],
    clarification: [],
    unknown: [],
  }

  if (category) {
    return examples[category] || []
  }

  // 返回综合示例
  return [
    ...examples.navigation.slice(0, 2),
    ...examples.creation.slice(0, 2),
    ...examples.query.slice(0, 2),
  ]
}

/**
 * 生成帮助信息
 */
export function generateHelpMessage(): string {
  return `我可以帮您完成以下操作：

📍 **导航** - 打开页面、查看资源
   例如：打开提示词管理、去模型配置

➕ **创建** - 新建各种资源
   例如：创建提示词、新建测试任务

✏️ **编辑** - 修改已有资源
   例如：编辑提示词、更新模型配置

🔍 **查询** - 查看和搜索资源
   例如：查看所有任务、显示最近的提示词

▶️ **执行** - 运行测试和任务
   例如：运行测试任务、测试模型

📊 **对比** - 比较不同版本
   例如：对比两个提示词

📥 **导出** - 导出数据和结果
   例如：导出任务结果`
}

// ============================================
// 完整处理流程
// ============================================

/**
 * 处理用户输入（集成意图解析和澄清）
 */
export async function processUserInput(
  input: string,
  parseIntent: (input: string) => Promise<{
    success: boolean
    intent?: ParsedIntent
    entities: EntityMatch[]
  }>,
  context?: ClarificationContext
): Promise<{
  action: 'execute' | 'clarify' | 'reject'
  intent?: ParsedIntent
  clarification?: ClarificationRequest
  message?: string
}> {
  // 1. 解析意图
  const parseResult = await parseIntent(input)

  if (!parseResult.success || !parseResult.intent) {
    return {
      action: 'clarify',
      clarification: generateGeneralClarification(),
      message: '无法理解您的意图',
    }
  }

  const { intent, entities } = parseResult

  // 2. 检查是否需要澄清
  const clarification = generateClarification(intent, entities)

  if (clarification) {
    // 检查对话轮数
    if (context && hasReachedMaxRounds({ inProgress: true, collectedInfo: {}, rounds: context.history?.length || 0 }, context.maxRounds)) {
      return {
        action: 'reject',
        intent,
        message: '多次尝试后仍无法理解，请尝试更明确的描述',
      }
    }

    return {
      action: 'clarify',
      intent,
      clarification,
    }
  }

  // 3. 可以执行
  return {
    action: 'execute',
    intent,
  }
}
