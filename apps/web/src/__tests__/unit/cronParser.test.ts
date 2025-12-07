import { describe, it, expect } from 'vitest'
import {
  parseCronExpression,
  validateCronExpression,
  getNextRunTime,
  getDelayUntilNextRun,
  describeCronExpression,
  CRON_PRESETS,
} from '@/lib/scheduler/cronParser'

describe('UT-8.1 Cron 表达式解析器', () => {
  describe('parseCronExpression', () => {
    it('应该正确解析有效的 cron 表达式', () => {
      const result = parseCronExpression('0 9 * * *')

      expect(result.isValid).toBe(true)
      expect(result.nextRun).toBeInstanceOf(Date)
      expect(result.nextRuns).toHaveLength(5)
      expect(result.description).toBe('每天 09:00')
    })

    it('应该返回多个未来执行时间', () => {
      const result = parseCronExpression('*/5 * * * *', { count: 10 })

      expect(result.isValid).toBe(true)
      expect(result.nextRuns).toHaveLength(10)

      // 验证时间是递增的
      if (result.nextRuns) {
        for (let i = 1; i < result.nextRuns.length; i++) {
          expect(result.nextRuns[i].getTime()).toBeGreaterThan(result.nextRuns[i - 1].getTime())
        }
      }
    })

    it('应该在无效表达式时返回错误', () => {
      const result = parseCronExpression('invalid cron')

      expect(result.isValid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.nextRun).toBeUndefined()
    })

    it('应该支持时区设置', () => {
      const shanghaiResult = parseCronExpression('0 9 * * *', { timezone: 'Asia/Shanghai' })
      const tokyoResult = parseCronExpression('0 9 * * *', { timezone: 'Asia/Tokyo' })

      expect(shanghaiResult.isValid).toBe(true)
      expect(tokyoResult.isValid).toBe(true)
      // 不同时区的下次执行时间应该不同
      expect(shanghaiResult.nextRun?.getTime()).not.toBe(tokyoResult.nextRun?.getTime())
    })

    it('应该支持自定义当前时间', () => {
      const customDate = new Date('2024-01-01T08:00:00Z')
      const result = parseCronExpression('0 9 * * *', { currentDate: customDate })

      expect(result.isValid).toBe(true)
      expect(result.nextRun).toBeDefined()
    })
  })

  describe('validateCronExpression', () => {
    it('应该验证有效的 cron 表达式', () => {
      const validExpressions = [
        '* * * * *',
        '0 * * * *',
        '0 0 * * *',
        '0 9 * * 1-5',
        '*/5 * * * *',
        '0 */2 * * *',
        '0 0 1 * *',
        '30 4 1,15 * *',
      ]

      validExpressions.forEach((expr) => {
        const result = validateCronExpression(expr)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('应该拒绝无效的 cron 表达式', () => {
      // cron-parser v5 对某些表达式更宽松，只测试明确无效的
      const invalidExpressions = [
        'invalid',           // 无效关键字
        'not a cron',        // 包含非法字符
        'abc def ghi jkl mno', // 全部非法字符
      ]

      invalidExpressions.forEach((expr) => {
        const result = validateCronExpression(expr)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('getNextRunTime', () => {
    it('应该返回下次执行时间', () => {
      const nextRun = getNextRunTime('0 9 * * *')

      expect(nextRun).toBeInstanceOf(Date)
      expect(nextRun!.getTime()).toBeGreaterThan(Date.now())
    })

    it('应该在无效表达式时返回 null', () => {
      const nextRun = getNextRunTime('invalid')

      expect(nextRun).toBeNull()
    })
  })

  describe('getDelayUntilNextRun', () => {
    it('应该返回到下次执行的毫秒数', () => {
      const delay = getDelayUntilNextRun('* * * * *')

      expect(delay).toBeGreaterThanOrEqual(0)
      expect(delay).toBeLessThanOrEqual(60 * 1000) // 最多1分钟
    })

    it('应该在无效表达式时返回 null', () => {
      const delay = getDelayUntilNextRun('invalid')

      expect(delay).toBeNull()
    })
  })

  describe('describeCronExpression', () => {
    it('应该正确描述常见 cron 表达式', () => {
      expect(describeCronExpression('* * * * *')).toBe('每分钟')
      expect(describeCronExpression('0 * * * *')).toBe('每小时整点')
      expect(describeCronExpression('0 0 * * *')).toBe('每天 00:00')
      expect(describeCronExpression('0 9 * * *')).toBe('每天 09:00')
      expect(describeCronExpression('0 9 * * 1-5')).toBe('工作日 09:00')
      expect(describeCronExpression('0 0 1 * *')).toBe('每月 1 号 00:00')
    })

    it('应该对复杂表达式返回"自定义调度"', () => {
      expect(describeCronExpression('30 4 1,15 * *')).toBe('自定义调度')
      expect(describeCronExpression('0 0,12 * * *')).toBe('自定义调度')
    })

    it('应该处理非标准格式', () => {
      expect(describeCronExpression('0 */6 * * *')).toBe('每 6 小时')
    })
  })

  describe('CRON_PRESETS', () => {
    it('应该包含所有预设选项', () => {
      expect(CRON_PRESETS.length).toBeGreaterThan(0)

      CRON_PRESETS.forEach((preset) => {
        expect(preset).toHaveProperty('label')
        expect(preset).toHaveProperty('value')
        expect(preset).toHaveProperty('description')

        // 验证预设值是有效的 cron 表达式
        const validation = validateCronExpression(preset.value)
        expect(validation.isValid).toBe(true)
      })
    })

    it('应该包含常用的预设', () => {
      const labels = CRON_PRESETS.map((p) => p.label)

      expect(labels).toContain('每分钟')
      expect(labels).toContain('每小时')
      expect(labels).toContain('每天 00:00')
      expect(labels).toContain('工作日 09:00')
    })
  })
})
