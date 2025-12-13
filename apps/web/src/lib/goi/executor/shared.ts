/**
 * GOI Executor 共享工具
 *
 * 所有 Handler（Access、State、Observation）共用的工具函数和配置
 */

import type { ResourceType } from '@platform/shared'

// ============================================
// 资源类型别名映射
// ============================================

/**
 * 资源类型别名映射（LLM 可能生成的变体 -> 标准类型）
 *
 * 当 LLM 生成不标准的资源类型名称时，使用此映射规范化
 * 添加新别名时，请同时更新 docs/goi-phases/GOI-CONFIG-CHECKLIST.md
 *
 * 别名规则：
 * - 中文名称（"提示词" → prompt）
 * - 英文单数（"model" → model）
 * - 英文复数（"models" → model）
 * - 简写（"ds" → dataset）
 * - 同义词（"模版" → prompt）
 */
export const resourceTypeAliases: Record<string, ResourceType> = {
  // ============ 提示词 ============
  '提示词': 'prompt',
  'prompt': 'prompt',
  'prompts': 'prompt',
  '模板': 'prompt',
  '模版': 'prompt',
  'template': 'prompt',
  'templates': 'prompt',

  // 提示词版本
  '版本': 'prompt_version',
  'version': 'prompt_version',
  'prompt_version': 'prompt_version',
  'prompt版本': 'prompt_version',
  '提示词版本': 'prompt_version',

  // 提示词分支
  '分支': 'prompt_branch',
  'branch': 'prompt_branch',
  'prompt_branch': 'prompt_branch',
  '实验分支': 'prompt_branch',

  // ============ 数据集 ============
  '数据集': 'dataset',
  'dataset': 'dataset',
  'datasets': 'dataset',
  'ds': 'dataset',
  '数据': 'dataset',

  // 数据集版本
  '数据集版本': 'dataset_version',
  'dataset_version': 'dataset_version',
  'dataset版本': 'dataset_version',

  // ============ 模型 ============
  '模型': 'model',
  'model': 'model',
  'models': 'model',
  'llm': 'model',

  // 供应商
  '供应商': 'provider',
  'provider': 'provider',
  'providers': 'provider',
  '服务商': 'provider',
  '厂商': 'provider',
  'model_provider': 'provider',
  'api_provider': 'provider',

  // ============ 评估器 ============
  '评估器': 'evaluator',
  'evaluator': 'evaluator',
  'evaluators': 'evaluator',
  '评估': 'evaluator',

  // ============ 任务 ============
  '任务': 'task',
  'task': 'task',
  'tasks': 'task',
  '测试': 'task',
  '测试任务': 'task',
  'test_task': 'task',

  // 任务结果
  '结果': 'task_result',
  'result': 'task_result',
  'results': 'task_result',
  'task_result': 'task_result',
  '任务结果': 'task_result',

  // ============ 定时任务 ============
  '定时任务': 'scheduled_task',
  '定时': 'scheduled_task',
  'scheduled_task': 'scheduled_task',
  'scheduled': 'scheduled_task',
  'schedule': 'scheduled_task',
  'task_schedule': 'scheduled_task',
  'cron': 'scheduled_task',
  'cron_task': 'scheduled_task',

  // ============ 监控告警 ============
  '告警': 'alert_rule',
  '告警规则': 'alert_rule',
  'alert': 'alert_rule',
  'alert_rule': 'alert_rule',
  'alarm': 'alert_rule',
  'alarm_rule': 'alert_rule',

  '通知': 'notify_channel',
  '通知渠道': 'notify_channel',
  'notification': 'notify_channel',
  'notification_channel': 'notify_channel',
  'notify_channel': 'notify_channel',
  'channel': 'notify_channel',

  // ============ Schema ============
  'schema': 'schema',
  'schemas': 'schema',
  '结构': 'schema',

  '输入schema': 'input_schema',
  '输入结构': 'input_schema',
  'input': 'input_schema',
  'input_schema': 'input_schema',

  '输出schema': 'output_schema',
  '输出结构': 'output_schema',
  'output': 'output_schema',
  'output_schema': 'output_schema',

  // ============ 页面 ============
  '设置': 'settings',
  'settings': 'settings',
  'system': 'settings',
  'system_settings': 'settings',
  'config': 'settings',
  'preference': 'settings',
  'preferences': 'settings',

  '仪表盘': 'dashboard',
  '首页': 'dashboard',
  'home': 'dashboard',
  'dashboard': 'dashboard',
  'overview': 'dashboard',
  'main': 'dashboard',

  '监控': 'monitor',
  'monitor': 'monitor',
  'monitoring': 'monitor',
  'alerts': 'monitor',

  '对比': 'comparison',
  '对比分析': 'comparison',
  'compare': 'comparison',
  'comparison': 'comparison',
  'diff': 'comparison',
}

/**
 * 规范化资源类型（处理别名）
 *
 * @param type - LLM 生成的资源类型字符串
 * @returns 规范化后的 ResourceType
 */
export function normalizeResourceType(type: string): ResourceType {
  return (resourceTypeAliases[type] || type) as ResourceType
}

// ============================================
// 系统页面配置
// ============================================

/**
 * 系统页面资源类型（不需要 resourceId）
 */
export const systemPageTypes: ResourceType[] = ['settings', 'dashboard', 'monitor', 'schema', 'comparison']

/**
 * 检查是否为系统页面类型
 */
export function isSystemPageType(type: ResourceType): boolean {
  return systemPageTypes.includes(type)
}
