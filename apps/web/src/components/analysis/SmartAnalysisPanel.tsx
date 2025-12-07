'use client'

import { useState, useMemo } from 'react'
import {
  Card,
  Tabs,
  Spin,
  Empty,
  Button,
  Statistic,
  Row,
  Col,
  Space,
  Typography,
  Alert,
  message,
} from 'antd'
import {
  ExperimentOutlined,
  BulbOutlined,
  ReloadOutlined,
  RobotOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  PieChartOutlined,
} from '@ant-design/icons'
import { FailurePatternList } from './FailurePatternCard'
import { OptimizationSuggestionList } from './OptimizationSuggestion'
import type { DetectionResult, Suggestion, PromptInfo } from '@/lib/analysis'
import { detectPatterns, generateSuggestions, clusterFailures, generateClusterSummary } from '@/lib/analysis'
import type { FailedResult } from '@/lib/analysis'

const { Text, Title } = Typography

type SmartAnalysisPanelProps = {
  /** 任务 ID */
  taskId: string
  /** 失败的结果列表 */
  failedResults: FailedResult[]
  /** 提示词信息 */
  prompt?: PromptInfo
  /** 是否正在加载 */
  loading?: boolean
  /** 当应用建议时的回调 */
  onApplySuggestion?: (suggestion: Suggestion) => void
  /** 重新分析的回调 */
  onReanalyze?: () => void
}

/**
 * 智能分析面板
 */
export function SmartAnalysisPanel({
  taskId,
  failedResults,
  prompt,
  loading = false,
  onApplySuggestion,
  onReanalyze,
}: SmartAnalysisPanelProps) {
  const [activeTab, setActiveTab] = useState('overview')

  // 计算分析结果
  const analysisResult = useMemo(() => {
    if (failedResults.length === 0) return null
    return detectPatterns(failedResults)
  }, [failedResults])

  // 生成优化建议
  const suggestions = useMemo(() => {
    if (!analysisResult || !prompt) return []
    return generateSuggestions(analysisResult.patterns, prompt)
  }, [analysisResult, prompt])

  // 聚类分析
  const clusterResult = useMemo(() => {
    if (failedResults.length < 2) return null
    const clusters = clusterFailures(failedResults)
    return generateClusterSummary(clusters)
  }, [failedResults])

  // 处理应用建议
  const handleApplySuggestion = (suggestion: Suggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion(suggestion)
    } else {
      message.info('建议已复制，请手动应用到提示词中')
    }
  }

  // 没有失败的情况
  if (!loading && failedResults.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
          <Title level={4} style={{ marginBottom: 8 }}>所有测试通过</Title>
          <Text type="secondary">没有检测到失败的测试用例</Text>
        </div>
      </Card>
    )
  }

  // 加载中
  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">正在分析失败模式...</Text>
          </div>
        </div>
      </Card>
    )
  }

  const tabItems = [
    {
      key: 'overview',
      label: (
        <Space>
          <PieChartOutlined />
          概览
        </Space>
      ),
      children: (
        <div>
          {/* 统计摘要 */}
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Statistic
                title="失败总数"
                value={analysisResult?.totalFailed || 0}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<WarningOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="失败模式"
                value={analysisResult?.patterns.length || 0}
                prefix={<ExperimentOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="聚类数量"
                value={clusterResult?.clusterCount || 0}
                prefix={<PieChartOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="优化建议"
                value={suggestions.length}
                prefix={<BulbOutlined />}
              />
            </Col>
          </Row>

          {/* 主要失败模式 */}
          {analysisResult?.dominantPattern && (
            <Alert
              type="warning"
              showIcon
              icon={<RobotOutlined />}
              message="主要失败原因"
              description={
                <div>
                  <Text>
                    最主要的失败类型是 <Text strong>{analysisResult.patterns[0]?.type}</Text>，
                    占所有失败的 <Text strong>{analysisResult.patterns[0]?.percentage}%</Text>。
                  </Text>
                  {suggestions.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary">
                        建议优先处理高优先级的优化建议，预计可显著提升通过率。
                      </Text>
                    </div>
                  )}
                </div>
              }
              style={{ marginBottom: 24 }}
            />
          )}

          {/* 失败模式概览（简化版） */}
          {analysisResult && analysisResult.patterns.length > 0 && (
            <Card title="失败模式分布" size="small" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {analysisResult.patterns.slice(0, 4).map(pattern => (
                  <div
                    key={pattern.type}
                    style={{
                      padding: '8px 16px',
                      background: '#fafafa',
                      borderRadius: 8,
                      border: `1px solid ${pattern.type === analysisResult.dominantPattern ? '#EF4444' : '#d9d9d9'}`,
                    }}
                  >
                    <Text strong>{pattern.type}</Text>
                    <div>
                      <Text type="secondary">{pattern.count} 个 ({pattern.percentage}%)</Text>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 聚类概览 */}
          {clusterResult && clusterResult.clusterCount > 0 && (
            <Card title="失败聚类分析" size="small">
              <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                将 {clusterResult.totalSamples} 个失败样本聚为 {clusterResult.clusterCount} 组，
                每组样本具有相似的失败特征。
              </Text>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {clusterResult.clusters.slice(0, 5).map(cluster => (
                  <div
                    key={cluster.id}
                    style={{
                      padding: '4px 12px',
                      background: '#f0f5ff',
                      borderRadius: 4,
                      border: '1px solid #adc6ff',
                    }}
                  >
                    <Text>{cluster.label}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      {cluster.size} 个 ({cluster.percentage}%)
                    </Text>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ),
    },
    {
      key: 'patterns',
      label: (
        <Space>
          <ExperimentOutlined />
          失败分析
          {analysisResult && analysisResult.patterns.length > 0 && (
            <span style={{ color: '#ff4d4f' }}>({analysisResult.patterns.length})</span>
          )}
        </Space>
      ),
      children: (
        <FailurePatternList patterns={analysisResult?.patterns || []} />
      ),
    },
    {
      key: 'suggestions',
      label: (
        <Space>
          <BulbOutlined />
          优化建议
          {suggestions.length > 0 && (
            <span style={{ color: '#faad14' }}>({suggestions.length})</span>
          )}
        </Space>
      ),
      children: prompt ? (
        <OptimizationSuggestionList
          suggestions={suggestions}
          onApply={handleApplySuggestion}
        />
      ) : (
        <Empty description="需要提示词信息才能生成优化建议" />
      ),
    },
  ]

  return (
    <Card
      title={
        <Space>
          <RobotOutlined />
          智能分析
        </Space>
      }
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={onReanalyze}
          disabled={loading}
        >
          重新分析
        </Button>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </Card>
  )
}

/**
 * 简化版智能分析面板（用于任务详情页内嵌）
 */
type SmartAnalysisSummaryProps = {
  failedResults: FailedResult[]
  onViewDetail?: () => void
}

export function SmartAnalysisSummary({
  failedResults,
  onViewDetail,
}: SmartAnalysisSummaryProps) {
  const analysisResult = useMemo(() => {
    if (failedResults.length === 0) return null
    return detectPatterns(failedResults)
  }, [failedResults])

  if (!analysisResult || analysisResult.patterns.length === 0) {
    return null
  }

  return (
    <Alert
      type="info"
      showIcon
      icon={<RobotOutlined />}
      message={
        <Space>
          <span>智能分析发现 {analysisResult.patterns.length} 种失败模式</span>
          {analysisResult.dominantPattern && (
            <Text type="secondary">
              主要问题：{analysisResult.patterns[0]?.type}
              ({analysisResult.patterns[0]?.percentage}%)
            </Text>
          )}
        </Space>
      }
      action={
        onViewDetail && (
          <Button size="small" type="link" onClick={onViewDetail}>
            查看详情
          </Button>
        )
      }
    />
  )
}
