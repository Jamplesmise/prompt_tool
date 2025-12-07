'use client'

import { useMemo } from 'react'
import { Row, Col, Card, Statistic, Progress, Typography, Alert, Space, Divider } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import type { TaskResultData, ResultStats } from './types'
import { detectPatterns, getFailureTypeName } from '@/lib/analysis'
import type { FailedResult } from '@/lib/analysis'

const { Text, Title } = Typography

type OverviewTabProps = {
  stats: ResultStats
  results: TaskResultData[]
  failedResults: TaskResultData[]
}

/**
 * 概览标签页
 * 展示测试结果的总体概览
 */
export function OverviewTab({ stats, results, failedResults }: OverviewTabProps) {
  // 转换为分析所需格式并检测失败模式
  const analysisResult = useMemo(() => {
    if (failedResults.length === 0) return null

    const convertedResults: FailedResult[] = failedResults.map(r => ({
      id: r.id,
      input: r.input,
      output: r.output,
      expected: r.expected,
      status: r.status,
      error: r.error,
      evaluations: r.evaluations,
    }))

    return detectPatterns(convertedResults)
  }, [failedResults])

  // 生成快速洞察
  const insights = useMemo(() => {
    const items: Array<{ type: 'success' | 'warning' | 'error' | 'info'; message: string }> = []

    // 通过率分析
    if (stats.passRate >= 95) {
      items.push({ type: 'success', message: `通过率高达 ${stats.passRate.toFixed(1)}%，表现优秀！` })
    } else if (stats.passRate >= 80) {
      items.push({ type: 'info', message: `通过率 ${stats.passRate.toFixed(1)}%，还有优化空间` })
    } else if (stats.passRate >= 60) {
      items.push({ type: 'warning', message: `通过率仅 ${stats.passRate.toFixed(1)}%，建议检查失败原因` })
    } else {
      items.push({ type: 'error', message: `通过率较低（${stats.passRate.toFixed(1)}%），需要重点关注` })
    }

    // 主要失败原因
    if (analysisResult?.dominantPattern) {
      const pattern = analysisResult.patterns[0]
      items.push({
        type: 'warning',
        message: `主要失败原因：${getFailureTypeName(pattern.type)}（占 ${pattern.percentage}%）`
      })
    }

    // 性能分析
    if (stats.avgLatency > 5000) {
      items.push({ type: 'warning', message: `平均延迟较高（${(stats.avgLatency / 1000).toFixed(2)}s），可能影响用户体验` })
    } else if (stats.avgLatency > 0) {
      items.push({ type: 'info', message: `平均响应时间 ${(stats.avgLatency / 1000).toFixed(2)}s` })
    }

    // 成本分析
    if (stats.totalCost > 0) {
      items.push({ type: 'info', message: `总成本 $${stats.totalCost.toFixed(4)}，平均 $${stats.avgCost.toFixed(6)}/次` })
    }

    return items
  }, [stats, analysisResult])

  return (
    <div>
      {/* 核心统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="测试总数"
              value={stats.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="通过"
              value={stats.passed}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="失败"
              value={stats.failed}
              valueStyle={{ color: stats.failed > 0 ? '#ff4d4f' : undefined }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="通过率"
              value={stats.passRate}
              precision={1}
              suffix="%"
              valueStyle={{ color: stats.passRate >= 80 ? '#52c41a' : stats.passRate >= 60 ? '#faad14' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 通过率可视化 */}
      <Card size="small" title="通过率分布" style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col span={8}>
            <Progress
              type="circle"
              percent={stats.passRate}
              format={percent => `${percent?.toFixed(1)}%`}
              strokeColor={stats.passRate >= 80 ? '#52c41a' : stats.passRate >= 60 ? '#faad14' : '#ff4d4f'}
              size={120}
            />
          </Col>
          <Col span={16}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text>通过</Text>
                </Space>
                <Text strong>{stats.passed}</Text>
              </div>
              <Progress
                percent={(stats.passed / Math.max(stats.total, 1)) * 100}
                showInfo={false}
                strokeColor="#52c41a"
                size="small"
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Space>
                  <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                  <Text>失败</Text>
                </Space>
                <Text strong>{stats.failed}</Text>
              </div>
              <Progress
                percent={(stats.failed / Math.max(stats.total, 1)) * 100}
                showInfo={false}
                strokeColor="#ff4d4f"
                size="small"
              />
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {/* 性能指标 */}
        <Col xs={24} md={12}>
          <Card size="small" title={<><ClockCircleOutlined /> 性能指标</>}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="平均延迟"
                  value={stats.avgLatency > 0 ? stats.avgLatency / 1000 : '-'}
                  precision={2}
                  suffix={stats.avgLatency > 0 ? 's' : ''}
                  prefix={<ThunderboltOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="P90 延迟"
                  value={stats.p90Latency > 0 ? stats.p90Latency / 1000 : '-'}
                  precision={2}
                  suffix={stats.p90Latency > 0 ? 's' : ''}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="P50 延迟"
                  value={stats.p50Latency > 0 ? stats.p50Latency / 1000 : '-'}
                  precision={2}
                  suffix={stats.p50Latency > 0 ? 's' : ''}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="P99 延迟"
                  value={stats.p99Latency > 0 ? stats.p99Latency / 1000 : '-'}
                  precision={2}
                  suffix={stats.p99Latency > 0 ? 's' : ''}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 成本指标 */}
        <Col xs={24} md={12}>
          <Card size="small" title={<><DollarOutlined /> 成本指标</>}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="总成本"
                  value={stats.totalCost > 0 ? stats.totalCost : '-'}
                  precision={4}
                  prefix={stats.totalCost > 0 ? '$' : ''}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="平均成本"
                  value={stats.avgCost > 0 ? stats.avgCost : '-'}
                  precision={6}
                  prefix={stats.avgCost > 0 ? '$' : ''}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="输入 Token"
                  value={stats.totalInputTokens || '-'}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="输出 Token"
                  value={stats.totalOutputTokens || '-'}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 快速洞察 */}
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined />
            快速洞察
          </Space>
        }
      >
        {insights.length > 0 ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {insights.map((insight, index) => (
              <Alert
                key={index}
                message={insight.message}
                type={insight.type}
                showIcon
              />
            ))}
          </Space>
        ) : (
          <Text type="secondary">暂无洞察信息</Text>
        )}
      </Card>

      {/* 失败模式概览 */}
      {analysisResult && analysisResult.patterns.length > 0 && (
        <Card
          size="small"
          title="失败模式概览"
          style={{ marginTop: 16 }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {analysisResult.patterns.slice(0, 5).map(pattern => (
              <div
                key={pattern.type}
                style={{
                  padding: '12px 16px',
                  background: '#fafafa',
                  borderRadius: 8,
                  border: `1px solid ${pattern.type === analysisResult.dominantPattern ? '#ff4d4f' : '#d9d9d9'}`,
                  minWidth: 140,
                }}
              >
                <Text strong>{getFailureTypeName(pattern.type)}</Text>
                <div>
                  <Text type="secondary">{pattern.count} 个</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({pattern.percentage}%)
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
