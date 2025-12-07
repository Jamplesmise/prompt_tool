import { describe, it, expect } from 'vitest'
import {
  compareMetrics,
  formatMetricValue,
  formatChangeText,
  type VersionMetrics,
  type MetricChange,
} from '../metricsCalculator'

// 辅助函数：创建模拟版本指标
function createMockMetrics(overrides: Partial<VersionMetrics> = {}): VersionMetrics {
  return {
    versionId: 'v1',
    version: 1,
    passRate: 0.8,
    avgLatency: 2.5,
    avgTokens: 500,
    estimatedCost: 0.005,
    formatAccuracy: 0.9,
    totalTests: 100,
    passedTests: 80,
    failedTests: 20,
    avgScore: 0.75,
    ...overrides,
  }
}

describe('metricsCalculator', () => {
  describe('compareMetrics', () => {
    it('应正确对比两个版本的指标', () => {
      const oldMetrics = createMockMetrics({ passRate: 0.7, version: 1 })
      const newMetrics = createMockMetrics({ passRate: 0.8, version: 2 })

      const comparison = compareMetrics(oldMetrics, newMetrics)

      expect(comparison.old).toBe(oldMetrics)
      expect(comparison.new).toBe(newMetrics)
      expect(comparison.changes.passRate).toBeDefined()
    })

    describe('通过率变化', () => {
      it('通过率上升应标记为改进', () => {
        const oldMetrics = createMockMetrics({ passRate: 0.7 })
        const newMetrics = createMockMetrics({ passRate: 0.9 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.passRate.direction).toBe('up')
        expect(comparison.changes.passRate.isImprovement).toBe(true)
        expect(comparison.changes.passRate.value).toBeCloseTo(0.2)
      })

      it('通过率下降应标记为非改进', () => {
        const oldMetrics = createMockMetrics({ passRate: 0.9 })
        const newMetrics = createMockMetrics({ passRate: 0.7 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.passRate.direction).toBe('down')
        expect(comparison.changes.passRate.isImprovement).toBe(false)
      })

      it('通过率不变应标记为 same', () => {
        const oldMetrics = createMockMetrics({ passRate: 0.8 })
        const newMetrics = createMockMetrics({ passRate: 0.8 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.passRate.direction).toBe('same')
        expect(comparison.changes.passRate.isImprovement).toBe(true)
      })
    })

    describe('延迟变化', () => {
      it('延迟下降应标记为改进', () => {
        const oldMetrics = createMockMetrics({ avgLatency: 3.0 })
        const newMetrics = createMockMetrics({ avgLatency: 2.0 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.avgLatency.direction).toBe('down')
        expect(comparison.changes.avgLatency.isImprovement).toBe(true)
      })

      it('延迟上升应标记为非改进', () => {
        const oldMetrics = createMockMetrics({ avgLatency: 2.0 })
        const newMetrics = createMockMetrics({ avgLatency: 3.0 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.avgLatency.direction).toBe('up')
        expect(comparison.changes.avgLatency.isImprovement).toBe(false)
      })
    })

    describe('成本变化', () => {
      it('成本下降应标记为改进', () => {
        const oldMetrics = createMockMetrics({ estimatedCost: 0.01 })
        const newMetrics = createMockMetrics({ estimatedCost: 0.005 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.estimatedCost.direction).toBe('down')
        expect(comparison.changes.estimatedCost.isImprovement).toBe(true)
      })

      it('成本上升应标记为非改进', () => {
        const oldMetrics = createMockMetrics({ estimatedCost: 0.005 })
        const newMetrics = createMockMetrics({ estimatedCost: 0.01 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.estimatedCost.direction).toBe('up')
        expect(comparison.changes.estimatedCost.isImprovement).toBe(false)
      })
    })

    describe('Token 变化', () => {
      it('Token 下降应标记为改进', () => {
        const oldMetrics = createMockMetrics({ avgTokens: 1000 })
        const newMetrics = createMockMetrics({ avgTokens: 800 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.avgTokens.direction).toBe('down')
        expect(comparison.changes.avgTokens.isImprovement).toBe(true)
      })
    })

    describe('格式准确率变化', () => {
      it('格式准确率上升应标记为改进', () => {
        const oldMetrics = createMockMetrics({ formatAccuracy: 0.8 })
        const newMetrics = createMockMetrics({ formatAccuracy: 0.95 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.formatAccuracy.direction).toBe('up')
        expect(comparison.changes.formatAccuracy.isImprovement).toBe(true)
      })
    })

    describe('评分变化', () => {
      it('两个版本都有评分时应计算变化', () => {
        const oldMetrics = createMockMetrics({ avgScore: 0.6 })
        const newMetrics = createMockMetrics({ avgScore: 0.8 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.avgScore).not.toBeNull()
        expect(comparison.changes.avgScore?.direction).toBe('up')
        expect(comparison.changes.avgScore?.isImprovement).toBe(true)
      })

      it('一个版本没有评分时应返回 null', () => {
        const oldMetrics = createMockMetrics({ avgScore: null })
        const newMetrics = createMockMetrics({ avgScore: 0.8 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.avgScore).toBeNull()
      })
    })

    describe('整体改进判断', () => {
      it('多数指标改进时整体应为改进', () => {
        const oldMetrics = createMockMetrics({
          passRate: 0.7,
          avgLatency: 3.0,
          estimatedCost: 0.01,
          formatAccuracy: 0.8,
        })
        const newMetrics = createMockMetrics({
          passRate: 0.9,
          avgLatency: 2.0,
          estimatedCost: 0.005,
          formatAccuracy: 0.95,
        })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.overallImprovement).toBe(true)
        expect(comparison.improvementScore).toBeGreaterThan(0)
      })

      it('多数指标退步时整体应为非改进', () => {
        const oldMetrics = createMockMetrics({
          passRate: 0.9,
          avgLatency: 2.0,
          estimatedCost: 0.005,
          formatAccuracy: 0.95,
        })
        const newMetrics = createMockMetrics({
          passRate: 0.6,
          avgLatency: 4.0,
          estimatedCost: 0.02,
          formatAccuracy: 0.7,
        })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.overallImprovement).toBe(false)
        expect(comparison.improvementScore).toBeLessThan(0)
      })

      it('改进分数应在 -100 到 100 之间', () => {
        const oldMetrics = createMockMetrics({ passRate: 0.1 })
        const newMetrics = createMockMetrics({ passRate: 1.0 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.improvementScore).toBeGreaterThanOrEqual(-100)
        expect(comparison.improvementScore).toBeLessThanOrEqual(100)
      })
    })

    describe('变化百分比计算', () => {
      it('应正确计算变化百分比', () => {
        const oldMetrics = createMockMetrics({ passRate: 0.5 })
        const newMetrics = createMockMetrics({ passRate: 0.75 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        // 从 0.5 到 0.75 是 50% 的增长
        expect(comparison.changes.passRate.percentage).toBeCloseTo(50)
      })

      it('原值为 0 时应返回 100%', () => {
        const oldMetrics = createMockMetrics({ estimatedCost: 0 })
        const newMetrics = createMockMetrics({ estimatedCost: 0.01 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.estimatedCost.percentage).toBe(100)
      })

      it('新值也为 0 时应返回 0%', () => {
        const oldMetrics = createMockMetrics({ estimatedCost: 0 })
        const newMetrics = createMockMetrics({ estimatedCost: 0 })

        const comparison = compareMetrics(oldMetrics, newMetrics)

        expect(comparison.changes.estimatedCost.percentage).toBe(0)
      })
    })
  })

  describe('formatMetricValue', () => {
    it('应正确格式化通过率', () => {
      expect(formatMetricValue('passRate', 0.85)).toBe('85.0%')
      expect(formatMetricValue('passRate', 1)).toBe('100.0%')
      expect(formatMetricValue('passRate', 0)).toBe('0.0%')
    })

    it('应正确格式化格式准确率', () => {
      expect(formatMetricValue('formatAccuracy', 0.9)).toBe('90.0%')
    })

    it('应正确格式化延迟', () => {
      expect(formatMetricValue('avgLatency', 2.567)).toBe('2.57s')
      expect(formatMetricValue('avgLatency', 0.5)).toBe('0.50s')
    })

    it('应正确格式化 Token', () => {
      expect(formatMetricValue('avgTokens', 1234.5)).toBe('1235')
      expect(formatMetricValue('avgTokens', 500)).toBe('500')
    })

    it('应正确格式化成本', () => {
      expect(formatMetricValue('estimatedCost', 0.0123)).toBe('$0.0123')
      expect(formatMetricValue('estimatedCost', 1.5)).toBe('$1.5000')
    })

    it('应正确格式化评分', () => {
      expect(formatMetricValue('avgScore', 0.756)).toBe('0.76')
    })

    it('null 值应返回 -', () => {
      expect(formatMetricValue('avgScore', null)).toBe('-')
    })
  })

  describe('formatChangeText', () => {
    it('无变化应显示无变化', () => {
      const change: MetricChange = {
        value: 0,
        percentage: 0,
        direction: 'same',
        isImprovement: true,
      }

      expect(formatChangeText(change, 'passRate')).toBe('无变化')
    })

    it('通过率上升应显示正确格式', () => {
      const change: MetricChange = {
        value: 0.1,
        percentage: 14.3,
        direction: 'up',
        isImprovement: true,
      }

      const text = formatChangeText(change, 'passRate')
      expect(text).toContain('↑')
      expect(text).toContain('+10.0%')
    })

    it('通过率下降应显示正确格式', () => {
      const change: MetricChange = {
        value: -0.15,
        percentage: -15,
        direction: 'down',
        isImprovement: false,
      }

      const text = formatChangeText(change, 'passRate')
      expect(text).toContain('↓')
      expect(text).toContain('-15.0%')
    })

    it('延迟变化应显示秒单位', () => {
      const change: MetricChange = {
        value: -0.5,
        percentage: -20,
        direction: 'down',
        isImprovement: true,
      }

      const text = formatChangeText(change, 'avgLatency')
      expect(text).toContain('↓')
      expect(text).toContain('-0.50s')
    })

    it('成本变化应显示美元单位', () => {
      const change: MetricChange = {
        value: 0.001,
        percentage: 20,
        direction: 'up',
        isImprovement: false,
      }

      const text = formatChangeText(change, 'estimatedCost')
      expect(text).toContain('↑')
      expect(text).toContain('$0.0010')
    })
  })
})
