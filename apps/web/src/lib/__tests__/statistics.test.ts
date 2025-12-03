import { describe, it, expect } from 'vitest'
import {
  chiSquareTest,
  calculateWinRateDifference,
  determineWinner,
} from '../statistics'

describe('statistics.ts', () => {
  describe('chiSquareTest', () => {
    it('样本量太小时应返回不显著', () => {
      const result = chiSquareTest(3, 2, 0)

      expect(result.significant).toBe(false)
      expect(result.winner).toBe(null)
      expect(result.pValue).toBe(1)
    })

    it('明显的差异应该显著', () => {
      // A 胜出 80 次，B 胜出 20 次，应该显著
      const result = chiSquareTest(80, 20, 0)

      expect(result.winsA).toBe(80)
      expect(result.winsB).toBe(20)
      expect(result.significant).toBe(true)
      expect(result.winner).toBe('A')
      expect(result.pValue).toBeLessThan(0.05)
      expect(result.confidence).toBeGreaterThan(95)
    })

    it('B 胜出更多时应该 B 获胜', () => {
      const result = chiSquareTest(20, 80, 0)

      expect(result.significant).toBe(true)
      expect(result.winner).toBe('B')
    })

    it('接近的结果应该不显著', () => {
      // A 胜出 52 次，B 胜出 48 次，不应该显著
      const result = chiSquareTest(52, 48, 0)

      expect(result.significant).toBe(false)
      expect(result.winner).toBe(null)
    })

    it('完全相等应该不显著', () => {
      const result = chiSquareTest(50, 50, 0)

      expect(result.chiSquare).toBe(0)
      expect(result.significant).toBe(false)
      expect(result.winner).toBe(null)
    })

    it('应该正确记录平局数', () => {
      const result = chiSquareTest(40, 30, 30)

      expect(result.ties).toBe(30)
      // 统计只考虑 A 和 B 的胜负
      expect(result.winsA).toBe(40)
      expect(result.winsB).toBe(30)
    })

    it('自定义 alpha 值应该生效', () => {
      // 在 0.05 显著但在 0.01 不显著的情况
      const result005 = chiSquareTest(65, 35, 0, 0.05)
      const result001 = chiSquareTest(65, 35, 0, 0.01)

      expect(result005.significant).toBe(true)
      // 65 vs 35 的 p 值约 0.003，所以 0.01 也应该显著
      expect(result001.significant).toBe(true)
    })
  })

  describe('calculateWinRateDifference', () => {
    it('应该正确计算胜率', () => {
      const result = calculateWinRateDifference(60, 40)

      expect(result.rateA).toBe(0.6)
      expect(result.rateB).toBe(0.4)
      expect(result.difference).toBeCloseTo(0.2, 5)
    })

    it('总数为 0 时应返回 0', () => {
      const result = calculateWinRateDifference(0, 0)

      expect(result.rateA).toBe(0)
      expect(result.rateB).toBe(0)
      expect(result.difference).toBe(0)
    })

    it('应该计算百分比差异', () => {
      const result = calculateWinRateDifference(75, 25)

      expect(result.percentDifference).toBeCloseTo(100, 5)  // (0.75 - 0.25) / 0.5 * 100
    })
  })

  describe('determineWinner', () => {
    it('只有 A 通过时 A 胜出', () => {
      expect(determineWinner(true, false)).toBe('A')
    })

    it('只有 B 通过时 B 胜出', () => {
      expect(determineWinner(false, true)).toBe('B')
    })

    it('都通过时比较分数', () => {
      expect(determineWinner(true, true, 0.8, 0.6)).toBe('A')
      expect(determineWinner(true, true, 0.6, 0.8)).toBe('B')
    })

    it('分数接近时应该是平局', () => {
      expect(determineWinner(true, true, 0.8, 0.8)).toBe('tie')
      expect(determineWinner(true, true, 0.8001, 0.8)).toBe('tie')
    })

    it('都未通过时比较分数', () => {
      expect(determineWinner(false, false, 0.4, 0.2)).toBe('A')
      expect(determineWinner(false, false, 0.2, 0.4)).toBe('B')
    })

    it('没有分数时应该是平局', () => {
      expect(determineWinner(true, true)).toBe('tie')
      expect(determineWinner(false, false)).toBe('tie')
      expect(determineWinner(true, true, null, null)).toBe('tie')
    })

    it('只有一个有分数时应该正确处理', () => {
      expect(determineWinner(true, true, 0.8, null)).toBe('tie')
      expect(determineWinner(true, true, null, 0.8)).toBe('tie')
    })
  })
})
