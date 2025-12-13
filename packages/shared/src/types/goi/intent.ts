/**
 * GOI 意图理解类型定义
 *
 * 提供 L1 级别的意图识别能力：
 * - 意图分类：识别用户想做什么
 * - 实体识别：识别涉及的资源
 * - 置信度评估：判断理解的可靠性
 * - 澄清机制：不确定时请求更多信息
 */

import type { ResourceType } from './events'

// ============================================
// 意图分类
// ============================================

/**
 * 意图分类
 */
export type IntentCategory =
  | 'navigation'     // 导航："打开xxx"、"去xxx页面"
  | 'creation'       // 创建："新建xxx"、"创建一个xxx"
  | 'modification'   // 修改："编辑xxx"、"更新xxx"
  | 'deletion'       // 删除："删除xxx"、"移除xxx"
  | 'query'          // 查询："查看xxx"、"xxx有哪些"
  | 'execution'      // 执行："运行xxx"、"测试xxx"
  | 'comparison'     // 对比："对比xxx和xxx"
  | 'export'         // 导出："导出xxx"
  | 'clarification'  // 澄清：需要更多信息
  | 'unknown'        // 未知：无法理解

/**
 * 意图分类标签映射（用于显示）
 */
export const INTENT_CATEGORY_LABELS: Record<IntentCategory, string> = {
  navigation: '导航',
  creation: '创建',
  modification: '修改',
  deletion: '删除',
  query: '查询',
  execution: '执行',
  comparison: '对比',
  export: '导出',
  clarification: '澄清',
  unknown: '未知',
}

// ============================================
// 解析后的意图
// ============================================

/**
 * 需要澄清的信息
 */
export type ClarificationInfo = {
  /** 需要澄清的字段 */
  field: string
  /** 澄清问题 */
  question: string
  /** 可选项 */
  options?: Array<{
    value: string
    label: string
    description?: string
  }>
  /** 是否允许自由输入 */
  allowFreeInput?: boolean
}

/**
 * 解析后的意图
 */
export type ParsedIntent = {
  /** 意图分类 */
  category: IntentCategory
  /** 置信度 (0-1) */
  confidence: number
  /** 资源类型 */
  resourceType?: ResourceType
  /** 资源 ID（如果能识别） */
  resourceId?: string
  /** 资源名称（用户提到的名称，可能模糊） */
  resourceName?: string
  /** 具体动作 */
  action?: string
  /** 参数 */
  parameters?: Record<string, unknown>
  /** 其他可能的解释 */
  alternatives?: ParsedIntent[]
  /** 需要澄清的信息 */
  clarificationNeeded?: ClarificationInfo
}

// ============================================
// 实体识别
// ============================================

/**
 * 实体类型
 */
export type EntityType =
  | 'resource_type'   // 资源类型（如 prompt、dataset）
  | 'resource_name'   // 资源名称（如 "情感分析提示词"）
  | 'action'          // 动作（如 create、edit）
  | 'parameter'       // 参数（如数量、条件）

/**
 * 实体匹配候选项
 */
export type EntityCandidate = {
  /** 候选 ID */
  id: string
  /** 候选名称 */
  name: string
  /** 匹配得分 (0-1) */
  score: number
  /** 额外信息 */
  metadata?: Record<string, unknown>
}

/**
 * 实体匹配结果
 */
export type EntityMatch = {
  /** 实体类型 */
  type: EntityType
  /** 识别出的值 */
  value: string
  /** 原始文本 */
  originalText: string
  /** 置信度 (0-1) */
  confidence: number
  /** 候选项（模糊匹配时） */
  candidates?: EntityCandidate[]
  /** 在原文中的位置 */
  position?: {
    start: number
    end: number
  }
}

// ============================================
// 意图解析结果
// ============================================

/**
 * 意图解析结果
 */
export type IntentParseResult = {
  /** 是否成功解析 */
  success: boolean
  /** 解析出的意图 */
  intent?: ParsedIntent
  /** 识别出的实体 */
  entities: EntityMatch[]
  /** 原始输入 */
  rawInput: string
  /** 处理耗时（毫秒） */
  processingTime: number
  /** 解析方法 */
  method?: 'rule' | 'llm' | 'hybrid'
  /** 错误信息 */
  error?: string
}

// ============================================
// 置信度相关
// ============================================

/**
 * 置信度阈值
 */
export const CONFIDENCE_THRESHOLDS = {
  /** 自动执行，不需确认 */
  AUTO_EXECUTE: 0.9,
  /** 确认一次后执行 */
  CONFIRM_ONCE: 0.7,
  /** 需要澄清 */
  CLARIFY: 0.5,
  /** 无法理解，请求重新输入 */
  REJECT: 0.3,
} as const

/**
 * 置信度动作
 */
export type ConfidenceAction = 'auto_execute' | 'confirm' | 'clarify' | 'reject'

/**
 * 根据置信度决定动作
 */
export function decideActionByConfidence(confidence: number): ConfidenceAction {
  if (confidence >= CONFIDENCE_THRESHOLDS.AUTO_EXECUTE) return 'auto_execute'
  if (confidence >= CONFIDENCE_THRESHOLDS.CONFIRM_ONCE) return 'confirm'
  if (confidence >= CONFIDENCE_THRESHOLDS.CLARIFY) return 'clarify'
  return 'reject'
}

// ============================================
// 澄清对话
// ============================================

/**
 * 澄清类型
 */
export type ClarificationType =
  | 'select_resource'    // 选择具体资源
  | 'confirm_action'     // 确认操作
  | 'provide_parameter'  // 提供参数
  | 'disambiguate'       // 消除歧义

/**
 * 澄清请求
 */
export type ClarificationRequest = {
  /** 澄清类型 */
  type: ClarificationType
  /** 问题 */
  question: string
  /** 选项 */
  options?: Array<{
    value: string
    label: string
    description?: string
  }>
  /** 是否允许自由输入 */
  allowFreeInput?: boolean
  /** 关联的意图 */
  relatedIntent?: ParsedIntent
  /** 关联的实体 */
  relatedEntities?: EntityMatch[]
}

/**
 * 澄清响应
 */
export type ClarificationResponse = {
  /** 请求 ID */
  requestId: string
  /** 选择的值 */
  selectedValue?: string
  /** 自由输入的值 */
  freeInputValue?: string
  /** 是否取消 */
  cancelled?: boolean
}

// ============================================
// 意图处理结果
// ============================================

/**
 * 意图处理结果
 */
export type IntentProcessResult = {
  /** 决定的动作 */
  action: ConfidenceAction
  /** 解析出的意图 */
  intent?: ParsedIntent
  /** 澄清请求（如果需要） */
  clarification?: ClarificationRequest
  /** 生成的 GOI 操作（如果可以执行） */
  operations?: Array<{
    type: 'access' | 'state' | 'observation'
    [key: string]: unknown
  }>
  /** 错误信息 */
  error?: string
}

// ============================================
// 资源类型别名
// ============================================

/**
 * 资源类型别名映射
 * 用于将用户输入的各种表达映射到标准资源类型
 */
export const RESOURCE_TYPE_ALIASES: Record<string, ResourceType> = {
  // 提示词
  'prompt': 'prompt',
  '提示词': 'prompt',
  '提示': 'prompt',
  'prompts': 'prompt',
  '模板': 'prompt',
  '模版': 'prompt',

  // 数据集
  'dataset': 'dataset',
  '数据集': 'dataset',
  '数据': 'dataset',
  'datasets': 'dataset',
  '测试数据': 'dataset',

  // 模型
  'model': 'model',
  '模型': 'model',
  'models': 'model',
  'ai模型': 'model',
  'AI模型': 'model',

  // 供应商
  'provider': 'provider',
  '供应商': 'provider',
  '提供商': 'provider',
  'providers': 'provider',
  '模型供应商': 'provider',

  // 评估器
  'evaluator': 'evaluator',
  '评估器': 'evaluator',
  '评估': 'evaluator',
  'evaluators': 'evaluator',
  '评估方法': 'evaluator',

  // 任务
  'task': 'task',
  '任务': 'task',
  'tasks': 'task',
  '测试任务': 'task',
  '测试': 'task',

  // 定时任务
  'scheduled_task': 'scheduled_task',
  '定时任务': 'scheduled_task',
  '定时': 'scheduled_task',
  '调度任务': 'scheduled_task',
  'cron': 'scheduled_task',

  // 告警规则
  'alert_rule': 'alert_rule',
  '告警规则': 'alert_rule',
  '告警': 'alert_rule',
  '报警': 'alert_rule',
  'alert': 'alert_rule',

  // 通知渠道
  'notify_channel': 'notify_channel',
  '通知渠道': 'notify_channel',
  '通知': 'notify_channel',
  '渠道': 'notify_channel',
  'notification': 'notify_channel',

  // Schema
  'schema': 'schema',
  '结构': 'schema',
  '结构化': 'schema',
  'input_schema': 'input_schema',
  '输入结构': 'input_schema',
  'output_schema': 'output_schema',
  '输出结构': 'output_schema',

  // 系统页面
  'dashboard': 'dashboard',
  '仪表盘': 'dashboard',
  '工作台': 'dashboard',
  '首页': 'dashboard',

  'settings': 'settings',
  '设置': 'settings',
  '系统设置': 'settings',
  '配置': 'settings',

  'monitor': 'monitor',
  '监控': 'monitor',
  '监控中心': 'monitor',
}

/**
 * 获取资源类型的显示名称
 */
export function getResourceTypeLabel(type?: ResourceType): string {
  if (!type) return '资源'

  const labels: Partial<Record<ResourceType, string>> = {
    prompt: '提示词',
    prompt_version: '提示词版本',
    prompt_branch: '提示词分支',
    dataset: '数据集',
    dataset_version: '数据集版本',
    model: '模型',
    provider: '模型供应商',
    evaluator: '评估器',
    task: '测试任务',
    task_result: '任务结果',
    scheduled_task: '定时任务',
    alert_rule: '告警规则',
    notify_channel: '通知渠道',
    input_schema: '输入结构',
    output_schema: '输出结构',
    evaluation_schema: '评估结构',
    settings: '设置',
    dashboard: '工作台',
    monitor: '监控',
    schema: '结构',
    comparison: '对比分析',
  }

  return labels[type] || type
}

// ============================================
// 动作别名
// ============================================

/**
 * 动作别名映射
 */
export const ACTION_ALIASES: Record<string, string> = {
  // 导航
  '打开': 'navigate',
  '去': 'navigate',
  '进入': 'navigate',
  '跳转': 'navigate',
  '访问': 'navigate',
  'open': 'navigate',
  'go': 'navigate',
  'goto': 'navigate',

  // 查看
  '查看': 'view',
  '看': 'view',
  '显示': 'view',
  '查询': 'view',
  'view': 'view',
  'show': 'view',
  'get': 'view',
  'list': 'view',

  // 创建
  '创建': 'create',
  '新建': 'create',
  '添加': 'create',
  '新增': 'create',
  'create': 'create',
  'add': 'create',
  'new': 'create',

  // 编辑
  '编辑': 'edit',
  '修改': 'edit',
  '更新': 'edit',
  '改': 'edit',
  'edit': 'edit',
  'update': 'edit',
  'modify': 'edit',

  // 删除
  '删除': 'delete',
  '移除': 'delete',
  '删掉': 'delete',
  '去掉': 'delete',
  'delete': 'delete',
  'remove': 'delete',
  'del': 'delete',

  // 执行
  '运行': 'execute',
  '执行': 'execute',
  '跑': 'execute',
  '启动': 'execute',
  'run': 'execute',
  'execute': 'execute',
  'start': 'execute',

  // 测试
  '测试': 'test',
  '试试': 'test',
  '试一下': 'test',
  'test': 'test',
  'try': 'test',

  // 导出
  '导出': 'export',
  '下载': 'export',
  '保存': 'export',
  'export': 'export',
  'download': 'export',

  // 对比
  '对比': 'compare',
  '比较': 'compare',
  '比对': 'compare',
  'compare': 'compare',
  'diff': 'compare',
}

/**
 * 获取标准化动作
 */
export function normalizeAction(action: string): string {
  const lower = action.toLowerCase().trim()
  return ACTION_ALIASES[lower] || ACTION_ALIASES[action] || action
}
