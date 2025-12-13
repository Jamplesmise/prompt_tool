/**
 * GOI TODO 标签转换器
 *
 * 将技术操作转换为用户可读的标签
 */

import type {
  GoiOperation,
  AccessOperation,
  StateOperation,
  ObservationOperation,
  ResourceType,
} from '@platform/shared'
import type { LabelConversionResult } from './displayTypes'

// ============================================
// 资源类型中文名映射
// ============================================

/**
 * 资源类型中文名
 */
const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
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
  settings: '系统设置',
  dashboard: '工作台',
  monitor: '监控中心',
  schema: '结构定义',
  comparison: '对比分析',
}

/**
 * 获取资源类型标签
 */
function getResourceLabel(resourceType: ResourceType): string {
  return RESOURCE_TYPE_LABELS[resourceType] || resourceType
}

// ============================================
// Access 操作转换
// ============================================

/**
 * 转换 Access 操作
 */
function convertAccessOperation(op: AccessOperation): Omit<LabelConversionResult, 'technicalLabel'> {
  const resourceLabel = getResourceLabel(op.target.resourceType)

  switch (op.action) {
    case 'navigate':
      return {
        userLabel: `打开${resourceLabel}页面`,
      }

    case 'view':
      return {
        userLabel: `查看${resourceLabel}详情`,
        valueLabel: op.target.resourceId ? `→ ${op.target.resourceId}` : undefined,
      }

    case 'create':
      return {
        userLabel: `打开${resourceLabel}创建表单`,
      }

    case 'edit':
      return {
        userLabel: `编辑${resourceLabel}`,
        valueLabel: op.target.resourceId ? `→ ${op.target.resourceId}` : undefined,
      }

    case 'select':
      return {
        userLabel: `选择${resourceLabel}`,
        valueLabel: op.target.resourceId ? `→ ${op.target.resourceId}` : '→ (待选择)',
        hint: op.target.resourceId ? undefined : '💡 需要你从列表中选择',
      }

    case 'test':
      return {
        userLabel: `测试${resourceLabel}`,
        valueLabel: op.target.resourceId ? `→ ${op.target.resourceId}` : undefined,
      }

    default:
      return {
        userLabel: `访问${resourceLabel}`,
      }
  }
}

// ============================================
// State 操作转换
// ============================================

/**
 * 转换 State 操作
 */
function convertStateOperation(op: StateOperation): Omit<LabelConversionResult, 'technicalLabel'> {
  const resourceLabel = getResourceLabel(op.target.resourceType)

  switch (op.action) {
    case 'create': {
      const name = op.expectedState?.name as string | undefined
      return {
        userLabel: `创建${resourceLabel}`,
        valueLabel: name ? `→ ${name}` : undefined,
        hint: name ? undefined : '💡 需要填写必要信息',
      }
    }

    case 'update': {
      const changedFields = Object.keys(op.expectedState).filter((k) => k !== 'id')
      const fieldsDesc =
        changedFields.length > 0 ? changedFields.slice(0, 3).join(', ') : '配置'
      return {
        userLabel: `更新${resourceLabel}`,
        valueLabel: `→ 修改 ${fieldsDesc}`,
      }
    }

    case 'delete':
      return {
        userLabel: `删除${resourceLabel}`,
        hint: '⚠️ 此操作不可撤销',
      }

    default:
      return {
        userLabel: `${op.action} ${resourceLabel}`,
      }
  }
}

// ============================================
// Observation 操作转换
// ============================================

/**
 * 转换 Observation 操作
 */
function convertObservationOperation(
  op: ObservationOperation
): Omit<LabelConversionResult, 'technicalLabel'> {
  if (op.queries.length === 0) {
    return { userLabel: '查询数据' }
  }

  const firstQuery = op.queries[0]
  const resourceLabel = getResourceLabel(firstQuery.resourceType)

  if (op.queries.length === 1) {
    if (firstQuery.resourceId) {
      return {
        userLabel: `查询${resourceLabel}信息`,
        valueLabel: `→ ${firstQuery.resourceId}`,
      }
    }
    return {
      userLabel: `查询${resourceLabel}列表`,
    }
  }

  return {
    userLabel: `批量查询数据`,
    valueLabel: `→ ${op.queries.length} 项`,
  }
}

// ============================================
// 主转换函数
// ============================================

/**
 * 将 GOI 操作转换为用户可读标签
 */
export function convertToUserLabel(operation: GoiOperation): LabelConversionResult {
  let result: Omit<LabelConversionResult, 'technicalLabel'>

  switch (operation.type) {
    case 'access':
      result = convertAccessOperation(operation as AccessOperation)
      break
    case 'state':
      result = convertStateOperation(operation as StateOperation)
      break
    case 'observation':
      result = convertObservationOperation(operation as ObservationOperation)
      break
    default:
      result = { userLabel: '执行操作' }
  }

  return {
    ...result,
    technicalLabel: JSON.stringify(operation),
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 判断是否为关键步骤
 */
export function isKeyStep(operation: GoiOperation): boolean {
  // State 操作中的创建和删除是关键步骤
  if (operation.type === 'state') {
    const stateOp = operation as StateOperation
    return stateOp.action === 'create' || stateOp.action === 'delete'
  }

  // 任务相关的操作是关键步骤
  if (operation.type === 'access') {
    const accessOp = operation as AccessOperation
    return accessOp.target.resourceType === 'task'
  }

  return false
}

/**
 * 判断是否需要确认
 */
export function requiresConfirmation(operation: GoiOperation): boolean {
  // 删除操作需要确认
  if (operation.type === 'state') {
    const stateOp = operation as StateOperation
    return stateOp.action === 'delete'
  }

  return false
}

/**
 * 估算操作耗时（秒）
 */
export function estimateOperationTime(operation: GoiOperation): number {
  switch (operation.type) {
    case 'access': {
      const accessOp = operation as AccessOperation
      if (accessOp.action === 'navigate') return 2
      if (accessOp.action === 'create') return 3
      if (accessOp.action === 'select') return 5
      return 3
    }

    case 'state': {
      const stateOp = operation as StateOperation
      if (stateOp.action === 'create') return 10
      if (stateOp.action === 'update') return 5
      if (stateOp.action === 'delete') return 3
      return 5
    }

    case 'observation':
      return 3

    default:
      return 5
  }
}
