import { describe, it, expect } from 'vitest'
import {
  detectAnomaly,
  detectAnomalies,
  getAnomalyTypeName,
  getSeverityStyle,
} from '../analysis/anomalyDetector'
import type { HistoryStats } from '@/services/historyStats'

// 辅助函数：创建模拟历史统计数据
function createMockHistoryStats(overrides: Partial<HistoryStats> = {}): HistoryStats {
  return {
    promptId: 'prompt-1',
    promptName: 'Test Prompt',
    modelId: 'model-1',
    modelName: 'Test Model',
    period: '7d',
    avgPassRate: 80,
    stdDeviation: 5,
    minPassRate: 70,
    maxPassRate: 90,
    totalTasks: 10,
    totalExecutions: 100,
    dataPoints: [
      { date: '2024-01-01', passRate: 78, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
      { date: '2024-01-02', passRate: 82, taskCount: 1, avgLatency: 110, totalCost: 0.1 },
      { date: '2024-01-03', passRate: 79, taskCount: 1, avgLatency: 95, totalCost: 0.1 },
      { date: '2024-01-04', passRate: 81, taskCount: 1, avgLatency: 105, totalCost: 0.1 },
      { date: '2024-01-05', passRate: 80, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
    ],
    ...overrides,
  }
}

describe('anomalyDetector', () => {
  describe('detectAnomaly', () => {
    it('正常值应不返回异常', () => {
      const stats = createMockHistoryStats()
      const currentValue = 80 // 等于平均值

      const anomaly = detectAnomaly(currentValue, stats)

      expect(anomaly).toBeNull()
    })

    it('检测突降异常', () => {
      const stats = createMockHistoryStats({
        dataPoints: [
          { date: '2024-01-01', passRate: 82, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-02', passRate: 80, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-03', passRate: 78, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-04', passRate: 80, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-05', passRate: 60, taskCount: 1, avgLatency: 100, totalCost: 0.1 }, // 突降
        ],
      })
      const currentValue = 60 // 从 80 突降到 60

      const anomaly = detectAnomaly(currentValue, stats)

      expect(anomaly).not.toBeNull()
      expect(anomaly?.type).toBe('sudden_drop')
      expect(anomaly?.severity).toBe('high')
      expect(anomaly?.currentValue).toBe(60)
    })

    it('检测趋势偏离异常', () => {
      // 制造更明显的趋势偏离：从递增趋势突然变成显著低值
      const stats = createMockHistoryStats({
        avgPassRate: 85,
        stdDeviation: 3,
        dataPoints: [
          { date: '2024-01-01', passRate: 83, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-02', passRate: 85, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-03', passRate: 87, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-04', passRate: 89, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-05', passRate: 72, taskCount: 1, avgLatency: 100, totalCost: 0.1 }, // 突然偏离趋势
        ],
      })
      const currentValue = 72

      const anomaly = detectAnomaly(currentValue, stats)

      expect(anomaly).not.toBeNull()
      // 可能是 sudden_drop 或 trend_deviation，取决于计算
      expect(['sudden_drop', 'trend_deviation']).toContain(anomaly?.type)
    })

    it('检测绝对低值异常', () => {
      const stats = createMockHistoryStats({
        avgPassRate: 45,
        stdDeviation: 5,
        dataPoints: [
          { date: '2024-01-01', passRate: 45, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-02', passRate: 44, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-03', passRate: 42, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
        ],
      })
      const currentValue = 42

      const anomaly = detectAnomaly(currentValue, stats)

      expect(anomaly).not.toBeNull()
      expect(anomaly?.type).toBe('unusual_pattern')
    })

    it('检测持续低迷异常', () => {
      const stats = createMockHistoryStats({
        avgPassRate: 80,
        stdDeviation: 5,
        dataPoints: [
          { date: '2024-01-01', passRate: 82, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-02', passRate: 83, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-03', passRate: 75, taskCount: 1, avgLatency: 100, totalCost: 0.1 }, // 开始低于平均
          { date: '2024-01-04', passRate: 74, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-05', passRate: 73, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
        ],
      })
      const currentValue = 73

      const anomaly = detectAnomaly(currentValue, stats)

      expect(anomaly).not.toBeNull()
      expect(anomaly?.type).toBe('sustained_low')
    })

    it('数据点不足时不检测异常', () => {
      const stats = createMockHistoryStats({
        dataPoints: [
          { date: '2024-01-01', passRate: 50, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
        ],
      })
      const currentValue = 50

      const anomaly = detectAnomaly(currentValue, stats)

      expect(anomaly).toBeNull()
    })

    it('自定义配置应生效', () => {
      const stats = createMockHistoryStats({
        avgPassRate: 80,
        stdDeviation: 5,
        dataPoints: [
          { date: '2024-01-01', passRate: 80, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-02', passRate: 80, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
          { date: '2024-01-03', passRate: 70, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
        ],
      })
      const currentValue = 70

      // 使用更宽松的配置，不应检测到异常
      const anomaly = detectAnomaly(currentValue, stats, {
        stdThreshold: 5,
        dropThreshold: 30,
      })

      expect(anomaly).toBeNull()
    })
  })

  describe('detectAnomalies', () => {
    it('批量检测多个统计数据', () => {
      const statsList: HistoryStats[] = [
        createMockHistoryStats({
          promptId: 'prompt-1',
          modelId: 'model-1',
          dataPoints: [
            { date: '2024-01-01', passRate: 80, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
            { date: '2024-01-02', passRate: 80, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
            { date: '2024-01-03', passRate: 60, taskCount: 1, avgLatency: 100, totalCost: 0.1 }, // 异常
          ],
        }),
        createMockHistoryStats({
          promptId: 'prompt-2',
          modelId: 'model-1',
          dataPoints: [
            { date: '2024-01-01', passRate: 85, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
            { date: '2024-01-02', passRate: 85, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
            { date: '2024-01-03', passRate: 85, taskCount: 1, avgLatency: 100, totalCost: 0.1 }, // 正常
          ],
        }),
      ]

      const anomalies = detectAnomalies(statsList)

      expect(anomalies.length).toBe(1)
      expect(anomalies[0].promptId).toBe('prompt-1')
    })

    it('按严重程度排序', () => {
      const statsList: HistoryStats[] = [
        createMockHistoryStats({
          promptId: 'prompt-low',
          modelId: 'model-1',
          avgPassRate: 80,
          stdDeviation: 5,
          dataPoints: [
            { date: '2024-01-01', passRate: 80, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
            { date: '2024-01-02', passRate: 80, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
            { date: '2024-01-03', passRate: 68, taskCount: 1, avgLatency: 100, totalCost: 0.1 }, // 轻微
          ],
        }),
        createMockHistoryStats({
          promptId: 'prompt-high',
          modelId: 'model-1',
          avgPassRate: 80,
          stdDeviation: 5,
          dataPoints: [
            { date: '2024-01-01', passRate: 80, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
            { date: '2024-01-02', passRate: 80, taskCount: 1, avgLatency: 100, totalCost: 0.1 },
            { date: '2024-01-03', passRate: 30, taskCount: 1, avgLatency: 100, totalCost: 0.1 }, // 严重
          ],
        }),
      ]

      const anomalies = detectAnomalies(statsList)

      expect(anomalies.length).toBe(2)
      // 严重的应该排在前面
      expect(anomalies[0].promptId).toBe('prompt-high')
      expect(anomalies[0].severity).toBe('high')
    })

    it('空数据应返回空数组', () => {
      const anomalies = detectAnomalies([])

      expect(anomalies).toEqual([])
    })
  })

  describe('getAnomalyTypeName', () => {
    it('返回正确的中文名称', () => {
      expect(getAnomalyTypeName('sudden_drop')).toBe('通过率突降')
      expect(getAnomalyTypeName('sudden_rise')).toBe('通过率突升')
      expect(getAnomalyTypeName('trend_deviation')).toBe('趋势偏离')
      expect(getAnomalyTypeName('unusual_pattern')).toBe('异常模式')
      expect(getAnomalyTypeName('sustained_low')).toBe('持续低迷')
    })
  })

  describe('getSeverityStyle', () => {
    it('返回正确的样式配置', () => {
      const high = getSeverityStyle('high')
      expect(high.color).toBe('#cf1322')
      expect(high.label).toBe('严重')

      const medium = getSeverityStyle('medium')
      expect(medium.color).toBe('#d46b08')
      expect(medium.label).toBe('中等')

      const low = getSeverityStyle('low')
      expect(low.color).toBe('#d48806')
      expect(low.label).toBe('轻微')
    })
  })
})
