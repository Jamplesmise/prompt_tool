/**
 * GOI TODO 分组生成器
 *
 * 将 TODO 列表按逻辑分组，提升用户理解
 */

import type {
  GoiOperation,
  AccessOperation,
  StateOperation,
  TodoItem,
  TodoList,
} from '@platform/shared'
import type {
  TodoGroup,
  DisplayTodoItem,
  TodoDisplayData,
  GroupDefinition,
  TodoPhase,
  PHASE_CONFIG,
  STATUS_ICONS,
} from './displayTypes'
import {
  convertToUserLabel,
  isKeyStep,
  requiresConfirmation,
  estimateOperationTime,
} from './labelConverter'

// ============================================
// 分组定义
// ============================================

/**
 * 分组匹配规则
 */
const GROUP_DEFINITIONS: GroupDefinition[] = [
  {
    id: 'prepare',
    name: '准备工作',
    emoji: '📝',
    phase: 'prepare',
    matchOperations: (op: GoiOperation) => {
      if (op.type !== 'access') return false
      const accessOp = op as AccessOperation
      return ['navigate', 'view'].includes(accessOp.action)
    },
  },
  {
    id: 'select',
    name: '选择资源',
    emoji: '🔍',
    phase: 'select',
    matchOperations: (op: GoiOperation) => {
      if (op.type !== 'access') return false
      const accessOp = op as AccessOperation
      return accessOp.action === 'select'
    },
  },
  {
    id: 'config',
    name: '配置数据',
    emoji: '⚙️',
    phase: 'config',
    matchOperations: (op: GoiOperation) => {
      if (op.type !== 'state') return false
      const stateOp = op as StateOperation
      // update 操作且不是 task 类型
      return stateOp.action === 'update' ||
        (stateOp.action === 'create' && stateOp.target.resourceType !== 'task')
    },
  },
  {
    id: 'execute',
    name: '执行操作',
    emoji: '▶️',
    phase: 'execute',
    matchOperations: (op: GoiOperation) => {
      if (op.type !== 'state') return false
      const stateOp = op as StateOperation
      // task 的创建是执行操作
      return stateOp.action === 'create' && stateOp.target.resourceType === 'task'
    },
  },
  {
    id: 'verify',
    name: '验证结果',
    emoji: '✅',
    phase: 'verify',
    matchOperations: (op: GoiOperation) => op.type === 'observation',
  },
  {
    id: 'delete',
    name: '删除操作',
    emoji: '🗑️',
    phase: 'execute',
    matchOperations: (op: GoiOperation) => {
      if (op.type !== 'state') return false
      const stateOp = op as StateOperation
      return stateOp.action === 'delete'
    },
  },
]

/**
 * 阶段排序顺序
 */
const PHASE_ORDER: TodoPhase[] = ['prepare', 'select', 'config', 'execute', 'verify']

// ============================================
// 分组生成
// ============================================

/**
 * 将单个 TodoItem 转换为 DisplayTodoItem
 */
function convertTodoItem(item: TodoItem, index: number): DisplayTodoItem {
  const labels = convertToUserLabel(item.goiOperation)

  const statusIcons: Record<string, string> = {
    pending: '☐',
    in_progress: '◉',
    waiting: '⏳',
    completed: '✓',
    failed: '✗',
    skipped: '⏭',
    replanned: '↻',
  }

  return {
    id: item.id,
    userLabel: labels.userLabel,
    valueLabel: labels.valueLabel,
    hint: labels.hint,
    status: item.status,
    statusIcon: statusIcons[item.status] || '☐',
    isKeyStep: isKeyStep(item.goiOperation),
    requiresConfirm: requiresConfirmation(item.goiOperation),
    estimatedSeconds: item.estimatedDuration
      ? Math.ceil(item.estimatedDuration / 1000)
      : estimateOperationTime(item.goiOperation),
    _raw: {
      operation: item.goiOperation,
      technicalLabel: labels.technicalLabel,
    },
  }
}

/**
 * 将 TodoItem 列表分组
 */
export function groupTodoItems(items: TodoItem[]): TodoGroup[] {
  const groups: Map<string, TodoGroup> = new Map()

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const displayItem = convertTodoItem(item, i)

    // 找到匹配的分组
    let matched = false
    for (const def of GROUP_DEFINITIONS) {
      if (def.matchOperations(item.goiOperation)) {
        if (!groups.has(def.id)) {
          groups.set(def.id, {
            id: def.id,
            name: def.name,
            emoji: def.emoji,
            phase: def.phase,
            items: [],
            collapsed: false,
          })
        }
        groups.get(def.id)!.items.push(displayItem)
        matched = true
        break
      }
    }

    // 未匹配的放入"其他"分组
    if (!matched) {
      if (!groups.has('other')) {
        groups.set('other', {
          id: 'other',
          name: '其他操作',
          emoji: '📌',
          phase: 'execute',
          items: [],
          collapsed: false,
        })
      }
      groups.get('other')!.items.push(displayItem)
    }
  }

  // 按阶段排序
  return Array.from(groups.values()).sort((a, b) => {
    const orderA = PHASE_ORDER.indexOf(a.phase)
    const orderB = PHASE_ORDER.indexOf(b.phase)
    return orderA - orderB
  })
}

// ============================================
// 完整展示数据生成
// ============================================

/**
 * 从 TodoList 生成完整的展示数据
 */
export function generateDisplayData(todoList: TodoList): TodoDisplayData {
  const groups = groupTodoItems(todoList.items)

  // 计算统计数据
  let totalSteps = 0
  let completedSteps = 0
  let estimatedTotalSeconds = 0
  let completedSeconds = 0

  for (const group of groups) {
    for (const item of group.items) {
      totalSteps++
      estimatedTotalSeconds += item.estimatedSeconds

      if (item.status === 'completed' || item.status === 'skipped') {
        completedSteps++
        completedSeconds += item.estimatedSeconds
      } else if (item.status === 'in_progress') {
        // 进行中的算一半
        completedSeconds += Math.floor(item.estimatedSeconds * 0.5)
      }
    }
  }

  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const estimatedRemainingSeconds = Math.max(0, estimatedTotalSeconds - completedSeconds)

  // 生成标题
  const title = generateTitle(todoList.goal)

  return {
    title,
    totalSteps,
    completedSteps,
    progress,
    estimatedTotalSeconds,
    estimatedRemainingSeconds,
    groups,
  }
}

/**
 * 从目标生成简洁标题
 */
function generateTitle(goal: string): string {
  // 如果目标很短，直接使用
  if (goal.length <= 20) {
    return goal
  }

  // 尝试提取动词+名词
  const actionPatterns = [
    /创建(.+?)(?:任务|测试|数据|配置)?$/,
    /(.+?)(?:任务|测试)$/,
    /运行(.+?)$/,
    /执行(.+?)$/,
    /配置(.+?)$/,
    /编辑(.+?)$/,
    /删除(.+?)$/,
  ]

  for (const pattern of actionPatterns) {
    const match = goal.match(pattern)
    if (match) {
      return goal.substring(0, 20) + '...'
    }
  }

  // 截断
  return goal.substring(0, 20) + '...'
}

// ============================================
// 折叠状态管理
// ============================================

/**
 * 自动折叠已完成的分组
 */
export function autoCollapseGroups(groups: TodoGroup[]): TodoGroup[] {
  return groups.map((group) => {
    const allCompleted = group.items.every(
      (item) => item.status === 'completed' || item.status === 'skipped'
    )
    return {
      ...group,
      collapsed: allCompleted,
    }
  })
}

/**
 * 切换分组折叠状态
 */
export function toggleGroupCollapse(groups: TodoGroup[], groupId: string): TodoGroup[] {
  return groups.map((group) =>
    group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
  )
}
