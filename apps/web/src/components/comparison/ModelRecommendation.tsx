'use client'

import { Card, List, Tag, Typography, Space, Tooltip, Alert } from 'antd'
import {
  BulbOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import type { ModelRecommendation as RecommendationType } from '@/services/comparisonService'

const { Text, Paragraph } = Typography

type ModelRecommendationProps = {
  recommendations: RecommendationType[]
}

/**
 * 获取场景图标
 */
function getScenarioIcon(scenario: string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    '质量优先': <SafetyCertificateOutlined style={{ color: '#52c41a' }} />,
    '成本敏感': <DollarOutlined style={{ color: '#faad14' }} />,
    '速度优先': <ThunderboltOutlined style={{ color: '#EF4444' }} />,
    '综合均衡': <SwapOutlined style={{ color: '#722ed1' }} />,
  }
  return iconMap[scenario] || <BulbOutlined />
}

/**
 * 获取场景颜色
 */
function getScenarioColor(scenario: string): string {
  const colorMap: Record<string, string> = {
    '质量优先': 'green',
    '成本敏感': 'gold',
    '速度优先': 'blue',
    '综合均衡': 'purple',
  }
  return colorMap[scenario] || 'default'
}

/**
 * 模型推荐建议组件
 */
export function ModelRecommendation({ recommendations }: ModelRecommendationProps) {
  if (recommendations.length === 0) {
    return (
      <Alert
        type="info"
        message="暂无推荐建议"
        description="需要更多测试数据才能生成有意义的推荐"
        showIcon
      />
    )
  }

  return (
    <Card
      title={
        <Space>
          <BulbOutlined style={{ color: '#faad14' }} />
          <span>使用场景建议</span>
        </Space>
      }
      size="small"
    >
      <List
        dataSource={recommendations}
        renderItem={(item: RecommendationType) => (
          <List.Item style={{ padding: '12px 0' }}>
            <div style={{ width: '100%' }}>
              {/* 场景和推荐模型 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Space>
                  {getScenarioIcon(item.scenario)}
                  <Tag color={getScenarioColor(item.scenario)}>{item.scenario}</Tag>
                </Space>
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  推荐：{item.modelName}
                </Tag>
              </div>

              {/* 推荐原因 */}
              <div style={{ marginBottom: 4 }}>
                <Space size={4}>
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                  <Text style={{ fontSize: 13 }}>{item.reason}</Text>
                </Space>
              </div>

              {/* 权衡点 */}
              {item.tradeoff && item.tradeoff !== '无明显缺点' && (
                <div>
                  <Space size={4}>
                    <WarningOutlined style={{ color: '#faad14', fontSize: 12 }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      权衡：{item.tradeoff}
                    </Text>
                  </Space>
                </div>
              )}
            </div>
          </List.Item>
        )}
      />
    </Card>
  )
}

/**
 * 简化的推荐展示（用于卡片或小空间）
 */
type QuickRecommendationProps = {
  scenario: string
  modelName: string
  reason?: string
}

export function QuickRecommendation({ scenario, modelName, reason }: QuickRecommendationProps) {
  return (
    <Tooltip title={reason}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          background: '#f6ffed',
          borderRadius: 16,
          border: '1px solid #b7eb8f',
        }}
      >
        {getScenarioIcon(scenario)}
        <Text style={{ fontSize: 12 }}>
          {scenario}：<Text strong>{modelName}</Text>
        </Text>
      </div>
    </Tooltip>
  )
}

/**
 * 推荐摘要卡片
 */
type RecommendationSummaryProps = {
  recommendations: RecommendationType[]
  primaryScenario?: string
}

export function RecommendationSummary({
  recommendations,
  primaryScenario = '综合均衡',
}: RecommendationSummaryProps) {
  const primary = recommendations.find(r => r.scenario === primaryScenario) || recommendations[0]

  if (!primary) {
    return null
  }

  return (
    <Card size="small">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: '#f0f5ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}
        >
          {getScenarioIcon(primary.scenario)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>推荐模型</Text>
          </div>
          <Text strong style={{ fontSize: 16 }}>{primary.modelName}</Text>
          <div style={{ marginTop: 4 }}>
            <Tag color={getScenarioColor(primary.scenario)}>{primary.scenario}</Tag>
          </div>
        </div>
      </div>
      <Paragraph
        type="secondary"
        style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }}
        ellipsis={{ rows: 2 }}
      >
        {primary.reason}
      </Paragraph>
    </Card>
  )
}

/**
 * 场景选择卡片组
 */
type ScenarioCardsProps = {
  recommendations: RecommendationType[]
  selectedScenario?: string
  onSelect?: (scenario: string) => void
}

export function ScenarioCards({ recommendations, selectedScenario, onSelect }: ScenarioCardsProps) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {recommendations.map(rec => (
        <div
          key={rec.scenario}
          onClick={() => onSelect?.(rec.scenario)}
          style={{
            padding: 16,
            borderRadius: 8,
            border: `2px solid ${selectedScenario === rec.scenario ? '#EF4444' : '#f0f0f0'}`,
            background: selectedScenario === rec.scenario ? '#e6f4ff' : '#fff',
            cursor: 'pointer',
            transition: 'all 0.2s',
            minWidth: 150,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {getScenarioIcon(rec.scenario)}
            <Text strong>{rec.scenario}</Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>推荐：</Text>
            <Text>{rec.modelName}</Text>
          </div>
        </div>
      ))}
    </div>
  )
}
