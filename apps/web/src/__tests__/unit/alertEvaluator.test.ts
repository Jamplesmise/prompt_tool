import { describe, it, expect } from 'vitest'
import { evaluateCondition } from '@/lib/alerting/evaluator'
import type { AlertCondition } from '@platform/shared'

describe('UT-8.2 告警条件评估器', () => {
  describe('evaluateCondition', () => {
    describe('LT (小于) 条件', () => {
      const condition: AlertCondition = 'LT'

      it('当值小于阈值时应返回 true', () => {
        expect(evaluateCondition(50, condition, 60)).toBe(true)
        expect(evaluateCondition(0, condition, 1)).toBe(true)
        expect(evaluateCondition(-10, condition, 0)).toBe(true)
        expect(evaluateCondition(0.5, condition, 0.6)).toBe(true)
      })

      it('当值等于阈值时应返回 false', () => {
        expect(evaluateCondition(60, condition, 60)).toBe(false)
        expect(evaluateCondition(0, condition, 0)).toBe(false)
      })

      it('当值大于阈值时应返回 false', () => {
        expect(evaluateCondition(70, condition, 60)).toBe(false)
        expect(evaluateCondition(1, condition, 0)).toBe(false)
      })
    })

    describe('GT (大于) 条件', () => {
      const condition: AlertCondition = 'GT'

      it('当值大于阈值时应返回 true', () => {
        expect(evaluateCondition(70, condition, 60)).toBe(true)
        expect(evaluateCondition(1, condition, 0)).toBe(true)
        expect(evaluateCondition(0.7, condition, 0.6)).toBe(true)
      })

      it('当值等于阈值时应返回 false', () => {
        expect(evaluateCondition(60, condition, 60)).toBe(false)
      })

      it('当值小于阈值时应返回 false', () => {
        expect(evaluateCondition(50, condition, 60)).toBe(false)
      })
    })

    describe('EQ (等于) 条件', () => {
      const condition: AlertCondition = 'EQ'

      it('当值等于阈值时应返回 true', () => {
        expect(evaluateCondition(60, condition, 60)).toBe(true)
        expect(evaluateCondition(0, condition, 0)).toBe(true)
        expect(evaluateCondition(-1, condition, -1)).toBe(true)
      })

      it('当值不等于阈值时应返回 false', () => {
        expect(evaluateCondition(59.9, condition, 60)).toBe(false)
        expect(evaluateCondition(60.1, condition, 60)).toBe(false)
      })
    })

    describe('LTE (小于等于) 条件', () => {
      const condition: AlertCondition = 'LTE'

      it('当值小于阈值时应返回 true', () => {
        expect(evaluateCondition(50, condition, 60)).toBe(true)
      })

      it('当值等于阈值时应返回 true', () => {
        expect(evaluateCondition(60, condition, 60)).toBe(true)
      })

      it('当值大于阈值时应返回 false', () => {
        expect(evaluateCondition(70, condition, 60)).toBe(false)
      })
    })

    describe('GTE (大于等于) 条件', () => {
      const condition: AlertCondition = 'GTE'

      it('当值大于阈值时应返回 true', () => {
        expect(evaluateCondition(70, condition, 60)).toBe(true)
      })

      it('当值等于阈值时应返回 true', () => {
        expect(evaluateCondition(60, condition, 60)).toBe(true)
      })

      it('当值小于阈值时应返回 false', () => {
        expect(evaluateCondition(50, condition, 60)).toBe(false)
      })
    })

    describe('边界情况', () => {
      it('应正确处理浮点数精度', () => {
        expect(evaluateCondition(0.1 + 0.2, 'LT', 0.4)).toBe(true)
        expect(evaluateCondition(0.1 + 0.2, 'GT', 0.2)).toBe(true)
      })

      it('应正确处理负数', () => {
        expect(evaluateCondition(-5, 'LT', -3)).toBe(true)
        expect(evaluateCondition(-3, 'GT', -5)).toBe(true)
      })

      it('应正确处理零值', () => {
        expect(evaluateCondition(0, 'EQ', 0)).toBe(true)
        expect(evaluateCondition(0, 'LT', 0.001)).toBe(true)
        expect(evaluateCondition(0, 'GT', -0.001)).toBe(true)
      })

      it('应正确处理大数值', () => {
        expect(evaluateCondition(1e10, 'GT', 1e9)).toBe(true)
        expect(evaluateCondition(1e-10, 'LT', 1e-9)).toBe(true)
      })
    })

    describe('告警场景模拟', () => {
      it('通过率告警：通过率低于 80% 触发告警', () => {
        const threshold = 0.8
        expect(evaluateCondition(0.75, 'LT', threshold)).toBe(true) // 触发
        expect(evaluateCondition(0.85, 'LT', threshold)).toBe(false) // 不触发
      })

      it('错误率告警：错误率高于 5% 触发告警', () => {
        const threshold = 0.05
        expect(evaluateCondition(0.08, 'GT', threshold)).toBe(true) // 触发
        expect(evaluateCondition(0.03, 'GT', threshold)).toBe(false) // 不触发
      })

      it('平均耗时告警：耗时超过 3000ms 触发告警', () => {
        const threshold = 3000
        expect(evaluateCondition(3500, 'GT', threshold)).toBe(true) // 触发
        expect(evaluateCondition(2500, 'GT', threshold)).toBe(false) // 不触发
      })

      it('成本告警：成本达到 100 美元触发告警', () => {
        const threshold = 100
        expect(evaluateCondition(100, 'GTE', threshold)).toBe(true) // 触发
        expect(evaluateCondition(99.99, 'GTE', threshold)).toBe(false) // 不触发
      })
    })
  })
})
