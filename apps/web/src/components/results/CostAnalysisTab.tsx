'use client'

import { useMemo } from 'react'
import { Row, Col, Card, Statistic, Progress, Typography, Space, Empty, Alert } from 'antd'
import {
  DollarOutlined,
  FileTextOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import type { TaskResultData, ResultStats } from './types'

const { Text } = Typography

type CostAnalysisTabProps = {
  results: TaskResultData[]
  stats: ResultStats
}

/**
 * 成本分析标签页
 * 展示成本相关指标分析
 */
export function CostAnalysisTab({ results, stats }: CostAnalysisTabProps) {
  // Token 消耗分析
  const tokenAnalysis = useMemo(() => {
    const total = stats.totalInputTokens + stats.totalOutputTokens
    const inputPercentage = total > 0 ? (stats.totalInputTokens / total) * 100 : 0
    const outputPercentage = total > 0 ? (stats.totalOutputTokens / total) * 100 : 0

    const avgInputTokens = results.length > 0
      ? stats.totalInputTokens / results.length
      : 0
    const avgOutputTokens = results.length > 0
      ? stats.totalOutputTokens / results.length
      : 0

    return {
      total,
      inputPercentage: Math.round(inputPercentage),
      outputPercentage: Math.round(outputPercentage),
      avgInputTokens: Math.round(avgInputTokens),
      avgOutputTokens: Math.round(avgOutputTokens),
    }
  }, [stats, results.length])

  // 成本效率分析
  const costEfficiency = useMemo(() => {
    const passedResults = results.filter(r => r.passed)
    const failedResults = results.filter(r => !r.passed)

    const passedCost = passedResults.reduce((sum, r) => sum + (r.cost || 0), 0)
    const failedCost = failedResults.reduce((sum, r) => sum + (r.cost || 0), 0)

    const passedTokens = passedResults.reduce(
      (sum, r) => sum + (r.inputTokens || 0) + (r.outputTokens || 0),
      0
    )
    const failedTokens = failedResults.reduce(
      (sum, r) => sum + (r.inputTokens || 0) + (r.outputTokens || 0),
      0
    )

    const wastedCostPercentage = stats.totalCost > 0
      ? (failedCost / stats.totalCost) * 100
      : 0

    return {
      passedCost,
      failedCost,
      passedTokens,
      failedTokens,
      wastedCostPercentage: Math.round(wastedCostPercentage * 10) / 10,
    }
  }, [results, stats.totalCost])

  // 成本优化建议
  const optimizationSuggestions = useMemo(() => {
    const suggestions: Array<{ type: 'warning' | 'info'; message: string }> = []

    // 检查输入输出比例
    if (tokenAnalysis.inputPercentage > 70) {
      suggestions.push({
        type: 'info',
        message: '输入 Token 占比较高，考虑精简提示词内容或使用更高效的模板'
      })
    }

    // 检查失败成本
    if (costEfficiency.wastedCostPercentage > 20) {
      suggestions.push({
        type: 'warning',
        message: `失败测试消耗了 ${costEfficiency.wastedCostPercentage}% 的成本，优化通过率可显著降低支出`
      })
    }

    // 检查平均成本
    if (stats.avgCost > 0.01) {
      suggestions.push({
        type: 'info',
        message: '单次调用成本较高，考虑使用更经济的模型或减少输出长度'
      })
    }

    // 检查输出 Token
    if (tokenAnalysis.avgOutputTokens > 1000) {
      suggestions.push({
        type: 'info',
        message: '平均输出 Token 较多，如非必要可考虑限制输出长度'
      })
    }

    return suggestions
  }, [tokenAnalysis, costEfficiency, stats.avgCost])

  const hasCostData = stats.totalCost > 0 || tokenAnalysis.total > 0

  if (!hasCostData) {
    return (
      <Empty description="暂无成本数据" />
    )
  }

  return (
    <div>
      {/* 成本统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="总成本"
              value={stats.totalCost}
              precision={4}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="平均成本"
              value={stats.avgCost}
              precision={6}
              prefix="$"
              suffix="/次"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="总 Token"
              value={tokenAnalysis.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="失败成本占比"
              value={costEfficiency.wastedCostPercentage}
              precision={1}
              suffix="%"
              valueStyle={{ color: costEfficiency.wastedCostPercentage > 20 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Token 消耗分布 */}
        <Col xs={24} md={12} lg={12}>
          <Card
            size="small"
            title={
              <Space>
                <FileTextOutlined />
                Token 消耗分布
              </Space>
            }
          >
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text>输入 Token</Text>
                <Text strong>{stats.totalInputTokens.toLocaleString()}</Text>
              </div>
              <Progress
                percent={tokenAnalysis.inputPercentage}
                strokeColor="#1890ff"
                showInfo={false}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text>输出 Token</Text>
                <Text strong>{stats.totalOutputTokens.toLocaleString()}</Text>
              </div>
              <Progress
                percent={tokenAnalysis.outputPercentage}
                strokeColor="#52c41a"
                showInfo={false}
              />
            </div>

            {/* 平均值 */}
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" style={{ background: '#f6f8fa' }}>
                  <Statistic
                    title="平均输入"
                    value={tokenAnalysis.avgInputTokens}
                    suffix="token/次"
                    valueStyle={{ fontSize: 20 }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ background: '#f6f8fa' }}>
                  <Statistic
                    title="平均输出"
                    value={tokenAnalysis.avgOutputTokens}
                    suffix="token/次"
                    valueStyle={{ fontSize: 20 }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 成本效率分析 */}
        <Col xs={24} md={12} lg={12}>
          <Card
            size="small"
            title={
              <Space>
                <DollarOutlined />
                成本效率分析
              </Space>
            }
          >
            {/* 通过 vs 失败成本对比 */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                成本分配
              </Text>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: '#52c41a',
                  }}
                />
                <Text>有效成本（通过）</Text>
                <Text strong style={{ marginLeft: 'auto' }}>
                  ${costEfficiency.passedCost.toFixed(4)}
                </Text>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: '#ff4d4f',
                  }}
                />
                <Text>无效成本（失败）</Text>
                <Text strong style={{ marginLeft: 'auto', color: '#ff4d4f' }}>
                  ${costEfficiency.failedCost.toFixed(4)}
                </Text>
              </div>

              {/* 成本比例条 */}
              <div
                style={{
                  marginTop: 12,
                  height: 24,
                  borderRadius: 12,
                  overflow: 'hidden',
                  display: 'flex',
                  background: '#f0f0f0',
                }}
              >
                <div
                  style={{
                    width: `${100 - costEfficiency.wastedCostPercentage}%`,
                    background: '#52c41a',
                    transition: 'width 0.3s',
                  }}
                />
                <div
                  style={{
                    width: `${costEfficiency.wastedCostPercentage}%`,
                    background: '#ff4d4f',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>

            {/* Token 效率 */}
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                  <Statistic
                    title="有效 Token"
                    value={costEfficiency.passedTokens}
                    valueStyle={{ fontSize: 18, color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ background: '#fff2f0', border: '1px solid #ffa39e' }}>
                  <Statistic
                    title="浪费 Token"
                    value={costEfficiency.failedTokens}
                    valueStyle={{ fontSize: 18, color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* 成本优化建议 */}
      {optimizationSuggestions.length > 0 && (
        <Card
          size="small"
          title={
            <Space>
              <BulbOutlined style={{ color: '#faad14' }} />
              成本优化建议
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {optimizationSuggestions.map((suggestion, index) => (
              <Alert
                key={index}
                message={suggestion.message}
                type={suggestion.type}
                showIcon
              />
            ))}
          </Space>
        </Card>
      )}
    </div>
  )
}
