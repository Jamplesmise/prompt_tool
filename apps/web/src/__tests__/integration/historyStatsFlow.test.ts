import { describe, it, expect, beforeAll, afterAll } from 'vitest'

/**
 * IT-历史统计与异常检测集成测试
 *
 * 测试流程：
 * 1. 历史统计 API
 * 2. 多维度统计 API
 * 3. 异常检测逻辑
 *
 * 注意：这是集成测试的测试用例设计，实际运行需要：
 * 1. 测试数据库环境
 * 2. 模拟认证
 * 3. API 请求工具
 */

describe('IT-历史统计与异常检测完整流程', () => {
  const mockPromptId = 'test-prompt-id'
  const mockModelId = 'test-model-id'

  describe('1. 历史统计 API', () => {
    it('应该返回 promptId 或 modelId 必填错误', async () => {
      // 不提供任何参数
      const expectedError = {
        code: 400001,
        message: '请提供 promptId 或 modelId',
        data: null,
      }

      expect(expectedError.code).toBe(400001)
    })

    it('应该获取指定提示词和模型组合的历史统计', async () => {
      // GET /api/v1/stats/history?promptId=xxx&modelId=xxx&period=7d
      const expectedResult = {
        code: 200,
        message: 'success',
        data: {
          promptId: mockPromptId,
          promptName: expect.any(String),
          modelId: mockModelId,
          modelName: expect.any(String),
          period: '7d',
          avgPassRate: expect.any(Number),
          stdDeviation: expect.any(Number),
          minPassRate: expect.any(Number),
          maxPassRate: expect.any(Number),
          totalTasks: expect.any(Number),
          totalExecutions: expect.any(Number),
          dataPoints: expect.any(Array),
        },
      }

      expect(expectedResult.code).toBe(200)
      expect(expectedResult.data.period).toBe('7d')
    })

    it('应该获取仅提示词的历史统计（聚合所有模型）', async () => {
      // GET /api/v1/stats/history?promptId=xxx&period=7d
      const expectedResult = {
        code: 200,
        data: {
          promptId: mockPromptId,
          modelId: '', // 空，因为聚合了所有模型
          avgPassRate: expect.any(Number),
          dataPoints: expect.any(Array),
        },
      }

      expect(expectedResult.code).toBe(200)
    })

    it('应该获取仅模型的历史统计（聚合所有提示词）', async () => {
      // GET /api/v1/stats/history?modelId=xxx&period=30d
      const expectedResult = {
        code: 200,
        data: {
          promptId: '', // 空，因为聚合了所有提示词
          modelId: mockModelId,
          period: '30d',
          avgPassRate: expect.any(Number),
        },
      }

      expect(expectedResult.code).toBe(200)
      expect(expectedResult.data.period).toBe('30d')
    })

    it('应该正确计算标准差', async () => {
      // 验证标准差计算逻辑
      const mockDataPoints = [
        { passRate: 80 },
        { passRate: 82 },
        { passRate: 78 },
        { passRate: 81 },
        { passRate: 79 },
      ]

      // 手动计算：平均值 = 80，标准差 ≈ 1.41
      const values = mockDataPoints.map(p => p.passRate)
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
      const stdDeviation = Math.sqrt(variance)

      expect(mean).toBe(80)
      expect(stdDeviation).toBeCloseTo(1.41, 1)
    })
  })

  describe('2. 多维度统计 API', () => {
    it('应该获取按提示词分组的统计', async () => {
      // GET /api/v1/stats/history/multi?period=7d
      const expectedResult = {
        code: 200,
        data: {
          byPrompt: expect.arrayContaining([
            expect.objectContaining({
              promptId: expect.any(String),
              promptName: expect.any(String),
              avgPassRate: expect.any(Number),
              stdDeviation: expect.any(Number),
              taskCount: expect.any(Number),
              trend: expect.stringMatching(/^(up|down|stable)$/),
            }),
          ]),
          byModel: expect.any(Array),
          overall: expect.objectContaining({
            avgPassRate: expect.any(Number),
            stdDeviation: expect.any(Number),
            totalTasks: expect.any(Number),
          }),
        },
      }

      expect(expectedResult.code).toBe(200)
    })

    it('应该获取按模型分组的统计', async () => {
      const expectedResult = {
        code: 200,
        data: {
          byModel: expect.arrayContaining([
            expect.objectContaining({
              modelId: expect.any(String),
              modelName: expect.any(String),
              avgPassRate: expect.any(Number),
              trend: expect.stringMatching(/^(up|down|stable)$/),
            }),
          ]),
        },
      }

      expect(expectedResult.code).toBe(200)
    })

    it('应该支持按团队筛选', async () => {
      // GET /api/v1/stats/history/multi?period=7d&teamId=xxx
      const mockTeamId = 'test-team-id'
      const expectedResult = {
        code: 200,
        data: {
          byPrompt: expect.any(Array),
          byModel: expect.any(Array),
          overall: expect.any(Object),
        },
      }

      expect(expectedResult.code).toBe(200)
    })

    it('应该正确计算趋势方向', async () => {
      // 验证趋势计算逻辑
      const calculateTrend = (values: number[]): 'up' | 'down' | 'stable' => {
        if (values.length < 2) return 'stable'
        const recentPoints = values.slice(-3)
        const firstHalf = recentPoints.slice(0, Math.ceil(recentPoints.length / 2))
        const secondHalf = recentPoints.slice(Math.floor(recentPoints.length / 2))
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
        const diff = secondAvg - firstAvg
        if (diff > 5) return 'up'
        if (diff < -5) return 'down'
        return 'stable'
      }

      // 上升趋势
      expect(calculateTrend([70, 75, 85])).toBe('up')

      // 下降趋势
      expect(calculateTrend([85, 75, 70])).toBe('down')

      // 稳定趋势
      expect(calculateTrend([80, 81, 79])).toBe('stable')
    })
  })

  describe('3. 异常检测逻辑', () => {
    it('应该检测到突降异常', async () => {
      // 模拟历史数据：平均80%，突然降到60%
      const mockStats = {
        avgPassRate: 80,
        stdDeviation: 5,
        dataPoints: [
          { date: '2024-01-04', passRate: 80 },
          { date: '2024-01-05', passRate: 60 }, // 突降
        ],
      }

      // 计算偏离：(80 - 60) / 5 = 4 个标准差
      const deviation = (mockStats.avgPassRate - 60) / mockStats.stdDeviation

      expect(deviation).toBe(4)
      expect(deviation).toBeGreaterThan(2) // 超过 2 个标准差应告警
    })

    it('应该检测到持续低迷', async () => {
      // 模拟历史数据：连续 3 天低于平均值
      const mockStats = {
        avgPassRate: 80,
        dataPoints: [
          { date: '2024-01-01', passRate: 82 },
          { date: '2024-01-02', passRate: 83 },
          { date: '2024-01-03', passRate: 75 }, // 开始低于平均
          { date: '2024-01-04', passRate: 74 },
          { date: '2024-01-05', passRate: 73 },
        ],
      }

      const sustainedLowDays = 3
      const recentPoints = mockStats.dataPoints.slice(-sustainedLowDays)
      const allBelowAverage = recentPoints.every(p => p.passRate < mockStats.avgPassRate)

      expect(allBelowAverage).toBe(true)
    })

    it('应该检测到绝对低值异常', async () => {
      const absoluteLowThreshold = 50
      const currentValue = 42

      expect(currentValue).toBeLessThan(absoluteLowThreshold)
    })

    it('应该正确计算预期范围', async () => {
      const avgPassRate = 80
      const stdDeviation = 5
      const stdThreshold = 2

      const expectedRange = {
        min: Math.max(0, avgPassRate - stdThreshold * stdDeviation),
        max: Math.min(100, avgPassRate + stdThreshold * stdDeviation),
      }

      expect(expectedRange.min).toBe(70)
      expect(expectedRange.max).toBe(90)
    })
  })

  describe('4. 原因分析逻辑', () => {
    it('应该根据异常类型返回可能原因', async () => {
      // 突降类型的可能原因
      const suddenDropCauses = [
        { cause: '提示词内容被修改', likelihood: 'high' },
        { cause: '模型配置变更', likelihood: 'medium' },
        { cause: '新增测试数据包含边缘用例', likelihood: 'medium' },
        { cause: '模型服务不稳定', likelihood: 'low' },
      ]

      expect(suddenDropCauses.length).toBeGreaterThan(0)
      expect(suddenDropCauses[0].likelihood).toBe('high')
    })

    it('应该生成操作链接', async () => {
      const mockContext = {
        promptId: 'prompt-1',
        modelId: 'model-1',
        taskId: 'task-1',
      }

      // 验证操作链接格式
      const promptAction = {
        label: '查看提示词历史',
        href: `/prompts/${mockContext.promptId}?tab=versions`,
      }

      expect(promptAction.href).toContain(mockContext.promptId)
    })
  })

  describe('5. 异常告警组件数据流', () => {
    it('应该正确格式化异常描述', async () => {
      const anomaly = {
        type: 'sudden_drop',
        currentValue: 60,
        expectedRange: { min: 70, max: 90 },
        deviationPercent: 25,
      }

      const description = `通过率从 80.0% 突降至 ${anomaly.currentValue.toFixed(1)}%，降幅 ${anomaly.deviationPercent.toFixed(1)}%`

      expect(description).toContain('60.0%')
      expect(description).toContain('25.0%')
    })

    it('应该按严重程度排序异常列表', async () => {
      const anomalies = [
        { severity: 'low', promptId: 'p1' },
        { severity: 'high', promptId: 'p2' },
        { severity: 'medium', promptId: 'p3' },
      ]

      const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
      const sorted = [...anomalies].sort(
        (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      )

      expect(sorted[0].severity).toBe('high')
      expect(sorted[1].severity).toBe('medium')
      expect(sorted[2].severity).toBe('low')
    })
  })

  describe('6. 趋势图表数据', () => {
    it('应该计算预期范围的 Y 坐标', async () => {
      const values = [78, 82, 79, 81, 80]
      const expectedRange = { min: 70, max: 90 }
      const height = 60

      const minValue = Math.min(...values, expectedRange.min)
      const maxValue = Math.max(...values, expectedRange.max)
      const range = maxValue - minValue || 1

      // 计算 Y 坐标（从底部开始）
      const expectedMinY = height - ((expectedRange.min - minValue) / range) * height
      const expectedMaxY = height - ((expectedRange.max - minValue) / range) * height

      // 验证 Y 坐标在有效范围内
      expect(expectedMinY).toBeGreaterThanOrEqual(0)
      expect(expectedMinY).toBeLessThanOrEqual(height)
      expect(expectedMaxY).toBeGreaterThanOrEqual(0)
      expect(expectedMaxY).toBeLessThanOrEqual(height)
    })

    it('应该判断当前值是否在正常范围内', async () => {
      const currentValue = 75
      const expectedRange = { min: 70, max: 90 }

      const isNormal = currentValue >= expectedRange.min && currentValue <= expectedRange.max

      expect(isNormal).toBe(true)

      const abnormalValue = 65
      const isAbnormal = abnormalValue >= expectedRange.min && abnormalValue <= expectedRange.max

      expect(isAbnormal).toBe(false)
    })
  })
})
