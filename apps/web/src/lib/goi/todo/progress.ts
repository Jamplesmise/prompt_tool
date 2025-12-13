/**
 * GOI TODO 进度计算
 *
 * 计算进度百分比和剩余时间
 */

import type { TodoGroup, DisplayTodoItem, TodoDisplayData } from './displayTypes'

// ============================================
// 进度计算
// ============================================

/**
 * 计算进度数据
 */
export function calculateProgress(groups: TodoGroup[]): {
  totalSteps: number
  completedSteps: number
  progress: number
  estimatedTotalSeconds: number
  estimatedRemainingSeconds: number
} {
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

  return {
    totalSteps,
    completedSteps,
    progress,
    estimatedTotalSeconds,
    estimatedRemainingSeconds,
  }
}

/**
 * 更新展示数据中的进度
 */
export function updateProgressInDisplayData(data: TodoDisplayData): TodoDisplayData {
  const progressData = calculateProgress(data.groups)
  return {
    ...data,
    ...progressData,
  }
}

// ============================================
// 时间格式化
// ============================================

/**
 * 格式化时间（秒转为可读字符串）
 */
export function formatTime(seconds: number): string {
  if (seconds < 0) return '0秒'

  if (seconds < 60) {
    return `${Math.round(seconds)}秒`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (remainingSeconds === 0) {
    return `${minutes}分钟`
  }

  return `${minutes}分${remainingSeconds}秒`
}

/**
 * 格式化时间（简短版）
 */
export function formatTimeShort(seconds: number): string {
  if (seconds < 0) return '0s'

  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes}m`
    }
    return `${minutes}m ${remainingSeconds}s`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

// ============================================
// 进度条渲染
// ============================================

/**
 * 生成文本进度条
 */
export function generateProgressBar(progress: number, width: number = 20): string {
  const filled = Math.round((progress / 100) * width)
  const empty = width - filled
  return '█'.repeat(filled) + '░'.repeat(empty)
}

/**
 * 生成带百分比的进度文本
 */
export function generateProgressText(
  progress: number,
  remainingSeconds: number
): string {
  const bar = generateProgressBar(progress, 16)
  const timeText = formatTime(remainingSeconds)
  return `[${bar}] ${progress}% | 预计剩余: ${timeText}`
}

// ============================================
// 分组进度计算
// ============================================

/**
 * 计算单个分组的进度
 */
export function calculateGroupProgress(group: TodoGroup): {
  completed: number
  total: number
  progress: number
} {
  const total = group.items.length
  const completed = group.items.filter(
    (item) => item.status === 'completed' || item.status === 'skipped'
  ).length

  return {
    completed,
    total,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

/**
 * 判断分组是否全部完成
 */
export function isGroupCompleted(group: TodoGroup): boolean {
  return group.items.every(
    (item) => item.status === 'completed' || item.status === 'skipped'
  )
}

/**
 * 判断分组是否有进行中的项
 */
export function hasGroupInProgress(group: TodoGroup): boolean {
  return group.items.some((item) => item.status === 'in_progress')
}

/**
 * 获取当前进行中的分组
 */
export function getCurrentGroup(groups: TodoGroup[]): TodoGroup | null {
  // 找到第一个有进行中项的分组
  for (const group of groups) {
    if (hasGroupInProgress(group)) {
      return group
    }
  }

  // 找到第一个未完成的分组
  for (const group of groups) {
    if (!isGroupCompleted(group)) {
      return group
    }
  }

  return null
}

// ============================================
// 状态统计
// ============================================

/**
 * 统计各状态的数量
 */
export function countByStatus(groups: TodoGroup[]): Record<string, number> {
  const counts: Record<string, number> = {
    pending: 0,
    in_progress: 0,
    waiting: 0,
    completed: 0,
    failed: 0,
    skipped: 0,
    replanned: 0,
  }

  for (const group of groups) {
    for (const item of group.items) {
      counts[item.status] = (counts[item.status] || 0) + 1
    }
  }

  return counts
}

/**
 * 判断是否有失败项
 */
export function hasFailedItems(groups: TodoGroup[]): boolean {
  return groups.some((group) => group.items.some((item) => item.status === 'failed'))
}

/**
 * 获取失败项列表
 */
export function getFailedItems(groups: TodoGroup[]): DisplayTodoItem[] {
  const failed: DisplayTodoItem[] = []
  for (const group of groups) {
    for (const item of group.items) {
      if (item.status === 'failed') {
        failed.push(item)
      }
    }
  }
  return failed
}
