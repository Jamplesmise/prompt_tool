import { describe, it, expect } from 'vitest'
import {
  analyzeEffect,
  quickAnalyze,
  getRecommendationExplanation,
  type EffectAnalysis,
} from '../effectAnalyzer'
import type { MetricsComparison, VersionMetrics, MetricChange } from '../metricsCalculator'

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

// 辅助函数：创建模拟指标变化
function createMockChange(overrides: Partial<MetricChange> = {}): MetricChange {
  return {
    value: 0,
    percentage: 0,
    direction: 'same',
    isImprovement: true,
    ...overrides,
  }
}

// 辅助函数：创建模拟对比结果
function createMockComparison(overrides: {
  old?: Partial<VersionMetrics>
  new?: Partial<VersionMetrics>
  changes?: Partial<MetricsComparison['changes']>
} = {}): MetricsComparison {
  const oldMetrics = createMockMetrics(overrides.old)
  const newMetrics = createMockMetrics({ ...overrides.new, version: 2, versionId: 'v2' })

  return {
    old: oldMetrics,
    new: newMetrics,
    changes: {
      passRate: createMockChange(overrides.changes?.passRate),
      avgLatency: createMockChange(overrides.changes?.avgLatency),
      avgTokens: createMockChange(overrides.changes?.avgTokens),
      estimatedCost: createMockChange(overrides.changes?.estimatedCost),
      formatAccuracy: createMockChange(overrides.changes?.formatAccuracy),
      avgScore: overrides.changes?.avgScore ?? null,
    },
    overallImprovement: true,
    improvementScore: 0,
  }
}

describe('effectAnalyzer', () => {
  describe('analyzeEffect', () => {
    it('应识别通过率提升为改进', () => {
      const comparison = createMockComparison({
        old: { passRate: 0.7 },
        new: { passRate: 0.9 },
        changes: {
          passRate: {
            value: 0.2,
            percentage: 28.57,
            direction: 'up',
            isImprovement: true,
          },
        },
      })

      const result = analyzeEffect(comparison)

      expect(result.improvements.length).toBeGreaterThan(0)
      expect(result.improvements.some(i => i.label.includes('通过率'))).toBe(true)
    })

    it('应识别通过率下降为风险', () => {
      const comparison = createMockComparison({
        old: { passRate: 0.9 },
        new: { passRate: 0.6 },
        changes: {
          passRate: {
            value: -0.3,
            percentage: -33.33,
            direction: 'down',
            isImprovement: false,
          },
        },
      })

      const result = analyzeEffect(comparison)

      expect(result.risks.length).toBeGreaterThan(0)
      expect(result.risks.some(r => r.label.includes('通过率'))).toBe(true)
    })

    it('应识别延迟降低为改进', () => {
      const comparison = createMockComparison({
        old: { avgLatency: 3.0 },
        new: { avgLatency: 2.0 },
        changes: {
          avgLatency: {
            value: -1.0,
            percentage: -33.33,
            direction: 'down',
            isImprovement: true,
          },
        },
      })

      const result = analyzeEffect(comparison)

      expect(result.improvements.some(i => i.label.includes('响应更快'))).toBe(true)
    })

    it('应识别成本降低为改进', () => {
      const comparison = createMockComparison({
        old: { estimatedCost: 0.01 },
        new: { estimatedCost: 0.005 },
        changes: {
          estimatedCost: {
            value: -0.005,
            percentage: -50,
            direction: 'down',
            isImprovement: true,
          },
        },
      })

      const result = analyzeEffect(comparison)

      expect(result.improvements.some(i => i.label.includes('成本'))).toBe(true)
    })

    it('无变化时应返回空改进和风险', () => {
      const comparison = createMockComparison()

      const result = analyzeEffect(comparison)

      // 所有变化都是 same，没有改进也没有风险
      expect(result.improvements.length).toBe(0)
      expect(result.risks.length).toBe(0)
    })

    describe('推荐建议', () => {
      it('通过率显著下降应建议回滚', () => {
        const comparison = createMockComparison({
          changes: {
            passRate: {
              value: -0.3,
              percentage: -30,
              direction: 'down',
              isImprovement: false,
            },
          },
        })

        const result = analyzeEffect(comparison)

        expect(result.recommendation).toBe('rollback')
        expect(result.recommendationReason).toContain('通过率')
      })

      it('只有改进无风险应建议发布', () => {
        const comparison = createMockComparison({
          changes: {
            passRate: {
              value: 0.2,
              percentage: 25,
              direction: 'up',
              isImprovement: true,
            },
          },
        })

        const result = analyzeEffect(comparison)

        expect(result.recommendation).toBe('publish')
      })

      it('有改进也有风险应建议评审', () => {
        const comparison = createMockComparison({
          changes: {
            passRate: {
              value: 0.1,
              percentage: 12,
              direction: 'up',
              isImprovement: true,
            },
            avgLatency: {
              value: 1.0,
              percentage: 40,
              direction: 'up',
              isImprovement: false,
            },
          },
        })

        const result = analyzeEffect(comparison)

        expect(result.recommendation).toBe('review')
      })

      it('多个高严重度风险应建议回滚', () => {
        const comparison = createMockComparison({
          changes: {
            avgLatency: {
              value: 2.0,
              percentage: 80,
              direction: 'up',
              isImprovement: false,
            },
            estimatedCost: {
              value: 0.01,
              percentage: 100,
              direction: 'up',
              isImprovement: false,
            },
          },
        })

        const result = analyzeEffect(comparison)

        expect(result.recommendation).toBe('rollback')
      })
    })

    describe('影响程度分级', () => {
      it('变化 >= 20% 应为高影响', () => {
        const comparison = createMockComparison({
          changes: {
            passRate: {
              value: 0.25,
              percentage: 30,
              direction: 'up',
              isImprovement: true,
            },
          },
        })

        const result = analyzeEffect(comparison)

        expect(result.improvements[0].impact).toBe('high')
      })

      it('变化 10-20% 应为中影响', () => {
        const comparison = createMockComparison({
          changes: {
            passRate: {
              value: 0.12,
              percentage: 15,
              direction: 'up',
              isImprovement: true,
            },
          },
        })

        const result = analyzeEffect(comparison)

        expect(result.improvements[0].impact).toBe('medium')
      })

      it('变化 < 10% 应为低影响', () => {
        const comparison = createMockComparison({
          changes: {
            passRate: {
              value: 0.05,
              percentage: 6,
              direction: 'up',
              isImprovement: true,
            },
          },
        })

        const result = analyzeEffect(comparison)

        expect(result.improvements[0].impact).toBe('low')
      })
    })

    describe('置信度计算', () => {
      it('测试数量少时置信度低', () => {
        const comparison = createMockComparison({
          old: { totalTests: 5 },
          new: { totalTests: 5 },
        })

        const result = analyzeEffect(comparison)

        expect(result.confidenceLevel).toBeLessThan(0.5)
      })

      it('测试数量多时置信度高', () => {
        const comparison = createMockComparison({
          old: { totalTests: 200 },
          new: { totalTests: 200 },
        })

        const result = analyzeEffect(comparison)

        expect(result.confidenceLevel).toBeGreaterThan(0.9)
      })

      it('测试数量为 0 时置信度为 0', () => {
        const comparison = createMockComparison({
          old: { totalTests: 0 },
          new: { totalTests: 100 },
        })

        const result = analyzeEffect(comparison)

        expect(result.confidenceLevel).toBe(0)
      })
    })

    describe('总结生成', () => {
      it('无变化时应生成相应总结', () => {
        const comparison = createMockComparison()

        const result = analyzeEffect(comparison)

        expect(result.summary).toContain('基本相同')
      })

      it('有改进时应包含主要改进', () => {
        const comparison = createMockComparison({
          changes: {
            passRate: {
              value: 0.2,
              percentage: 25,
              direction: 'up',
              isImprovement: true,
            },
          },
        })

        const result = analyzeEffect(comparison)

        expect(result.summary).toContain('主要改进')
      })

      it('有风险时应包含主要风险', () => {
        const comparison = createMockComparison({
          changes: {
            passRate: {
              value: -0.2,
              percentage: -20,
              direction: 'down',
              isImprovement: false,
            },
          },
        })

        const result = analyzeEffect(comparison)

        expect(result.summary).toContain('主要风险')
      })
    })
  })

  describe('quickAnalyze', () => {
    it('通过率提升应标记为改进', () => {
      const oldMetrics = createMockMetrics({ passRate: 0.7 })
      const newMetrics = createMockMetrics({ passRate: 0.9 })

      const result = quickAnalyze(oldMetrics, newMetrics)

      expect(result.isImproved).toBe(true)
      expect(result.mainChange).toContain('提升')
      expect(result.riskLevel).toBe('none')
    })

    it('通过率下降应标记风险', () => {
      const oldMetrics = createMockMetrics({ passRate: 0.9 })
      const newMetrics = createMockMetrics({ passRate: 0.6 })

      const result = quickAnalyze(oldMetrics, newMetrics)

      expect(result.isImproved).toBe(false)
      expect(result.mainChange).toContain('下降')
      expect(result.riskLevel).toBe('high')
    })

    it('通过率小幅下降应为低风险', () => {
      const oldMetrics = createMockMetrics({ passRate: 0.85 })
      const newMetrics = createMockMetrics({ passRate: 0.82 })

      const result = quickAnalyze(oldMetrics, newMetrics)

      expect(result.riskLevel).toBe('low')
    })

    it('通过率中等下降应为中风险', () => {
      const oldMetrics = createMockMetrics({ passRate: 0.85 })
      const newMetrics = createMockMetrics({ passRate: 0.73 })

      const result = quickAnalyze(oldMetrics, newMetrics)

      expect(result.riskLevel).toBe('medium')
    })

    it('通过率基本持平应返回相应描述', () => {
      const oldMetrics = createMockMetrics({ passRate: 0.80 })
      const newMetrics = createMockMetrics({ passRate: 0.805 })

      const result = quickAnalyze(oldMetrics, newMetrics)

      expect(result.mainChange).toContain('持平')
    })
  })

  describe('getRecommendationExplanation', () => {
    it('publish 推荐应返回绿色和相应操作', () => {
      const result = getRecommendationExplanation('publish')

      expect(result.title).toContain('发布')
      expect(result.color).toBe('green')
      expect(result.actions.length).toBeGreaterThan(0)
    })

    it('review 推荐应返回橙色和相应操作', () => {
      const result = getRecommendationExplanation('review')

      expect(result.title).toContain('评审')
      expect(result.color).toBe('orange')
      expect(result.actions.length).toBeGreaterThan(0)
    })

    it('rollback 推荐应返回红色和相应操作', () => {
      const result = getRecommendationExplanation('rollback')

      expect(result.title).toContain('回滚')
      expect(result.color).toBe('red')
      expect(result.actions.length).toBeGreaterThan(0)
    })
  })
})
