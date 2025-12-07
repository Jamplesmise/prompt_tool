// Cron 表达式解析工具

import { CronExpressionParser } from 'cron-parser'

export type CronParseResult = {
  isValid: boolean
  error?: string
  nextRun?: Date
  nextRuns?: Date[]
  description?: string
}

/**
 * 解析 Cron 表达式并获取下次执行时间
 */
export function parseCronExpression(
  cronExpression: string,
  options?: {
    timezone?: string
    currentDate?: Date
    count?: number
  }
): CronParseResult {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      tz: options?.timezone ?? 'Asia/Shanghai',
      currentDate: options?.currentDate ?? new Date(),
    })

    const nextRun = interval.next().toDate()

    // 获取多个未来执行时间
    const count = options?.count ?? 5
    const nextRuns: Date[] = [nextRun]

    for (let i = 1; i < count; i++) {
      nextRuns.push(interval.next().toDate())
    }

    return {
      isValid: true,
      nextRun,
      nextRuns,
      description: describeCronExpression(cronExpression),
    }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid cron expression',
    }
  }
}

/**
 * 验证 Cron 表达式
 */
export function validateCronExpression(cronExpression: string): {
  isValid: boolean
  error?: string
} {
  try {
    CronExpressionParser.parse(cronExpression)
    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid cron expression',
    }
  }
}

/**
 * 获取下次执行时间
 */
export function getNextRunTime(
  cronExpression: string,
  options?: {
    timezone?: string
    currentDate?: Date
  }
): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      tz: options?.timezone ?? 'Asia/Shanghai',
      currentDate: options?.currentDate ?? new Date(),
    })
    return interval.next().toDate()
  } catch {
    return null
  }
}

/**
 * 计算从当前时间到下次执行的延迟毫秒数
 */
export function getDelayUntilNextRun(
  cronExpression: string,
  options?: {
    timezone?: string
    currentDate?: Date
  }
): number | null {
  const nextRun = getNextRunTime(cronExpression, options)
  if (!nextRun) return null

  const now = options?.currentDate ?? new Date()
  return Math.max(0, nextRun.getTime() - now.getTime())
}

/**
 * 简单描述 Cron 表达式（中文）
 */
export function describeCronExpression(cronExpression: string): string {
  const parts = cronExpression.trim().split(/\s+/)

  if (parts.length !== 5) {
    return '自定义调度'
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts

  // 常见模式匹配
  if (cronExpression === '* * * * *') {
    return '每分钟'
  }

  if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return '每小时整点'
  }

  if (minute === '0' && hour.includes('/')) {
    const interval = hour.split('/')[1]
    return `每 ${interval} 小时`
  }

  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return '每天 00:00'
  }

  if (minute === '0' && /^\d+$/.test(hour) && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `每天 ${hour.padStart(2, '0')}:00`
  }

  if (minute === '0' && /^\d+$/.test(hour) && dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
    return `工作日 ${hour.padStart(2, '0')}:00`
  }

  if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && /^\d$/.test(dayOfWeek)) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return `每${days[parseInt(dayOfWeek)]} 00:00`
  }

  if (minute === '0' && hour === '0' && /^\d+$/.test(dayOfMonth) && month === '*' && dayOfWeek === '*') {
    return `每月 ${dayOfMonth} 号 00:00`
  }

  return '自定义调度'
}

/**
 * 常用 Cron 预设
 */
export const CRON_PRESETS = [
  { label: '每分钟', value: '* * * * *', description: '每分钟执行' },
  { label: '每小时', value: '0 * * * *', description: '每小时整点执行' },
  { label: '每6小时', value: '0 */6 * * *', description: '每6小时执行一次' },
  { label: '每天 00:00', value: '0 0 * * *', description: '每天凌晨执行' },
  { label: '每天 09:00', value: '0 9 * * *', description: '每天早上9点执行' },
  { label: '工作日 09:00', value: '0 9 * * 1-5', description: '周一至周五早上9点执行' },
  { label: '每周一 00:00', value: '0 0 * * 1', description: '每周一凌晨执行' },
  { label: '每月1号 00:00', value: '0 0 1 * *', description: '每月1号凌晨执行' },
] as const
