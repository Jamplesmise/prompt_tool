/**
 * 检查点规则引擎
 *
 * 负责：
 * - 管理检查点规则集
 * - 匹配规则并判断是否需要确认
 * - 支持智能判断逻辑
 */

import type {
  CheckpointRule,
  CheckpointRuleAction,
  CheckpointRuleCondition,
  CheckpointCheckResult,
  SmartCheckContext,
  RiskLevel,
  CheckpointOption,
  createDefaultCheckpointRule,
  getDefaultRiskLevel,
} from '@platform/shared'
import type { TodoItem } from '@platform/shared'
import type { StateAction } from '@platform/shared'

// ============================================
// 默认规则集
// ============================================

/**
 * 默认检查点规则集
 */
export const DEFAULT_CHECKPOINT_RULES: CheckpointRule[] = [
  // 规则 1: 删除操作必须确认
  {
    id: 'delete-must-confirm',
    name: '删除操作必须确认',
    description: '删除操作不可逆，必须经过用户确认',
    trigger: 'operation_type',
    condition: { stateAction: 'delete' },
    action: 'require',
    priority: 100,
    enabled: true,
  },
  // 规则 2: 执行任务需要确认
  {
    id: 'task-execute-confirm',
    name: '执行任务需要确认',
    description: '执行测试任务会消耗资源，需要确认',
    trigger: 'resource_type',
    condition: { resourceType: 'task', stateAction: 'create' },
    action: 'require',
    priority: 90,
    enabled: true,
  },
  // 规则 3: 创建评估器需要确认
  {
    id: 'evaluator-create-confirm',
    name: '创建评估器需要确认',
    description: '评估器配置复杂，需要确认',
    trigger: 'resource_type',
    condition: { resourceType: 'evaluator', stateAction: 'create' },
    action: 'require',
    priority: 80,
    enabled: true,
  },
  // 规则 4: 观察类操作自动通过
  {
    id: 'observation-auto-pass',
    name: '观察类操作自动通过',
    description: '查询操作无副作用，自动通过',
    trigger: 'operation_type',
    condition: { operationType: 'observation' },
    action: 'skip',
    priority: 50,
    enabled: true,
  },
  // 规则 5: 访问类操作自动通过
  {
    id: 'access-auto-pass',
    name: '访问类操作自动通过',
    description: '导航操作无副作用，自动通过',
    trigger: 'operation_type',
    condition: { operationType: 'access' },
    action: 'skip',
    priority: 50,
    enabled: true,
  },
  // 规则 6: 验证类操作自动通过
  {
    id: 'verify-auto-pass',
    name: '验证类操作自动通过',
    description: '验证操作无副作用，自动通过',
    trigger: 'operation_type',
    condition: { operationType: 'verify' },
    action: 'skip',
    priority: 50,
    enabled: true,
  },
  // 规则 7: 更新操作智能判断
  {
    id: 'update-smart',
    name: '更新操作智能判断',
    description: '根据上下文智能判断是否需要确认',
    trigger: 'operation_type',
    condition: { stateAction: 'update' },
    action: 'smart',
    priority: 40,
    enabled: true,
  },
  // 规则 8: 创建操作智能判断
  {
    id: 'create-smart',
    name: '创建操作智能判断',
    description: '根据资源类型智能判断是否需要确认',
    trigger: 'operation_type',
    condition: { stateAction: 'create' },
    action: 'smart',
    priority: 30,
    enabled: true,
  },
]

/**
 * 逐步模式规则（所有操作都需要确认）
 */
export const STEP_MODE_RULES: CheckpointRule[] = [
  {
    id: 'step-mode-all-confirm',
    name: '逐步模式-全部确认',
    description: '逐步模式下所有操作都需要确认',
    trigger: 'operation_type',
    condition: {},
    action: 'require',
    priority: 200,
    enabled: true,
  },
]

/**
 * 自动模式规则（除删除外都自动通过）
 */
export const AUTO_MODE_RULES: CheckpointRule[] = [
  // 删除仍然需要确认
  {
    id: 'auto-mode-delete-confirm',
    name: '自动模式-删除确认',
    description: '自动模式下删除操作仍需确认',
    trigger: 'operation_type',
    condition: { stateAction: 'delete' },
    action: 'require',
    priority: 200,
    enabled: true,
  },
  // 其他都自动通过
  {
    id: 'auto-mode-auto-pass',
    name: '自动模式-自动通过',
    description: '自动模式下其他操作自动通过',
    trigger: 'operation_type',
    condition: {},
    action: 'skip',
    priority: 100,
    enabled: true,
  },
]

// ============================================
// 规则引擎类
// ============================================

export class CheckpointRuleEngine {
  private rules: CheckpointRule[]
  private userRules: CheckpointRule[] = []

  constructor(baseRules: CheckpointRule[] = DEFAULT_CHECKPOINT_RULES) {
    this.rules = [...baseRules]
    this.sortRules()
  }

  /**
   * 按优先级排序规则（优先级高的在前）
   */
  private sortRules(): void {
    this.rules.sort((a, b) => b.priority - a.priority)
  }

  /**
   * 添加用户自定义规则
   */
  addUserRules(rules: CheckpointRule[]): void {
    this.userRules = rules.filter((r) => r.enabled)
    this.rules = [...this.userRules, ...DEFAULT_CHECKPOINT_RULES]
    this.sortRules()
  }

  /**
   * 切换模式规则集
   */
  switchModeRules(mode: 'step' | 'smart' | 'auto'): void {
    switch (mode) {
      case 'step':
        this.rules = [...this.userRules, ...STEP_MODE_RULES]
        break
      case 'auto':
        this.rules = [...this.userRules, ...AUTO_MODE_RULES]
        break
      case 'smart':
      default:
        this.rules = [...this.userRules, ...DEFAULT_CHECKPOINT_RULES]
        break
    }
    this.sortRules()
  }

  /**
   * 匹配规则
   */
  matchRule(todoItem: TodoItem): CheckpointRule | null {
    for (const rule of this.rules) {
      if (!rule.enabled) continue
      if (this.matchCondition(todoItem, rule.condition)) {
        return rule
      }
    }
    return null
  }

  /**
   * 匹配规则条件
   */
  private matchCondition(
    todoItem: TodoItem,
    condition: CheckpointRuleCondition
  ): boolean {
    // 空条件匹配所有
    if (Object.keys(condition).length === 0) {
      return true
    }

    // 匹配操作类型
    if (condition.operationType && todoItem.category !== condition.operationType) {
      return false
    }

    // 匹配状态动作
    if (condition.stateAction) {
      const op = todoItem.goiOperation
      if (op.type !== 'state' || op.action !== condition.stateAction) {
        return false
      }
    }

    // 匹配资源类型
    if (condition.resourceType) {
      const op = todoItem.goiOperation
      if (op.type === 'access' || op.type === 'state') {
        if (op.target.resourceType !== condition.resourceType) {
          return false
        }
      } else if (op.type === 'observation') {
        // 观察操作可能查询多个资源
        const hasMatch = op.queries.some(
          (q) => q.resourceType === condition.resourceType
        )
        if (!hasMatch) return false
      }
    }

    // 匹配风险等级
    if (condition.riskLevel) {
      const stateAction = todoItem.goiOperation.type === 'state'
        ? (todoItem.goiOperation as { action: StateAction }).action
        : undefined
      const itemRisk = this.calculateRiskLevel(todoItem.category, stateAction)
      if (itemRisk !== condition.riskLevel) {
        return false
      }
    }

    // 匹配资源 ID 模式
    if (condition.resourceIdPattern) {
      const op = todoItem.goiOperation
      let resourceId: string | undefined
      if (op.type === 'access' || op.type === 'state') {
        resourceId = op.target.resourceId
      }
      if (resourceId) {
        const pattern = new RegExp(condition.resourceIdPattern)
        if (!pattern.test(resourceId)) {
          return false
        }
      }
    }

    return true
  }

  /**
   * 计算风险等级
   */
  private calculateRiskLevel(
    category: TodoItem['category'],
    stateAction?: StateAction
  ): RiskLevel {
    if (category === 'observation' || category === 'access' || category === 'verify') {
      return 'low'
    }
    if (category === 'state') {
      if (stateAction === 'delete') return 'high'
      if (stateAction === 'create') return 'medium'
      if (stateAction === 'update') return 'medium'
    }
    if (category === 'compound') return 'medium'
    return 'medium'
  }

  /**
   * 判断是否需要检查点确认
   */
  shouldRequireCheckpoint(todoItem: TodoItem): CheckpointCheckResult {
    // 1. 先检查 todoItem 自带的 checkpoint 配置
    if (todoItem.checkpoint?.required === false) {
      return { required: false }
    }

    // 2. 匹配规则
    const rule = this.matchRule(todoItem)
    if (!rule) {
      // 没有匹配规则，默认不需要确认
      return { required: false }
    }

    // 3. 根据规则动作判断
    switch (rule.action) {
      case 'require':
        return {
          required: true,
          reason: rule.name,
          matchedRule: rule,
          riskLevel: this.calculateRiskLevel(
            todoItem.category,
            todoItem.goiOperation.type === 'state'
              ? (todoItem.goiOperation as { action: StateAction }).action
              : undefined
          ),
        }

      case 'skip':
        return { required: false, matchedRule: rule }

      case 'smart':
        // 智能判断需要额外上下文，这里返回需要确认的标记
        return {
          required: true,
          reason: `${rule.name}（智能判断中）`,
          matchedRule: rule,
          riskLevel: 'medium',
        }
    }
  }

  /**
   * 智能判断（需要上下文信息）
   */
  evaluateSmart(
    todoItem: TodoItem,
    context: SmartCheckContext
  ): CheckpointCheckResult {
    const rule = this.matchRule(todoItem)
    if (!rule || rule.action !== 'smart') {
      return this.shouldRequireCheckpoint(todoItem)
    }

    // 智能判断逻辑
    const factors: { skip: number; require: number } = { skip: 0, require: 0 }

    // 因素 1: 用户历史操作
    if (context.userHistory) {
      // 如果用户之前成功执行过多次类似操作，倾向于跳过
      if (context.userHistory.operationCount > 10) {
        factors.skip += 2
      }
      // 如果最近有失败，倾向于需要确认
      if (context.userHistory.recentFailures > 0) {
        factors.require += 3
      }
    }

    // 因素 2: 资源重要性
    if (context.resourceInfo) {
      if (context.resourceInfo.importance === 'high') {
        factors.require += 3
      }
      if (context.resourceInfo.isNew) {
        factors.skip += 1 // 新资源通常影响较小
      }
      if (context.resourceInfo.impactScope && context.resourceInfo.impactScope > 10) {
        factors.require += 2
      }
    }

    // 因素 3: 操作类型
    const stateAction = todoItem.goiOperation.type === 'state'
      ? (todoItem.goiOperation as { action: StateAction }).action
      : undefined
    if (stateAction === 'update') {
      // 更新操作通常比较安全
      factors.skip += 1
    }
    if (stateAction === 'create') {
      // 创建操作影响较小
      factors.skip += 1
    }

    // 计算最终结果
    const shouldSkip = factors.skip > factors.require
    const riskLevel = this.calculateRiskLevel(todoItem.category, stateAction)

    return {
      required: !shouldSkip,
      reason: shouldSkip
        ? undefined
        : `${rule.name}（智能判断：建议确认）`,
      matchedRule: rule,
      riskLevel,
    }
  }

  /**
   * 生成检查点选项
   */
  generateOptions(todoItem: TodoItem): CheckpointOption[] {
    const options: CheckpointOption[] = [
      {
        id: 'approve',
        label: '确认继续',
        description: '按当前计划执行',
        isDefault: true,
      },
      {
        id: 'modify',
        label: '换一个',
        description: '选择其他选项',
      },
      {
        id: 'takeover',
        label: '我来操作',
        description: '暂停 AI，手动完成此步骤',
      },
      {
        id: 'reject',
        label: '取消',
        description: '停止当前任务',
      },
    ]

    return options
  }

  /**
   * 获取当前规则列表
   */
  getRules(): CheckpointRule[] {
    return [...this.rules]
  }

  /**
   * 重置为默认规则
   */
  reset(): void {
    this.userRules = []
    this.rules = [...DEFAULT_CHECKPOINT_RULES]
    this.sortRules()
  }
}

// ============================================
// 导出单例
// ============================================

let ruleEngineInstance: CheckpointRuleEngine | null = null

export function getCheckpointRuleEngine(): CheckpointRuleEngine {
  if (!ruleEngineInstance) {
    ruleEngineInstance = new CheckpointRuleEngine()
  }
  return ruleEngineInstance
}

export function resetCheckpointRuleEngine(): void {
  ruleEngineInstance = null
}
