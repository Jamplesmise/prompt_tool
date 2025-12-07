'use client'

import { Card, Alert, List, Tag, Typography, Space, Button, Progress, Tooltip } from 'antd'
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  RocketOutlined,
  EyeOutlined,
  RollbackOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import type {
  EffectAnalysis,
  Improvement,
  Risk,
  Recommendation,
  ImpactLevel,
} from '@/lib/comparison'
import { getRecommendationExplanation } from '@/lib/comparison'

const { Text, Paragraph } = Typography

/**
 * 获取影响程度的颜色
 */
function getImpactColor(level: ImpactLevel): string {
  switch (level) {
    case 'high':
      return '#ff4d4f'
    case 'medium':
      return '#faad14'
    case 'low':
      return '#52c41a'
  }
}

/**
 * 获取影响程度的标签
 */
function getImpactLabel(level: ImpactLevel): string {
  switch (level) {
    case 'high':
      return '高'
    case 'medium':
      return '中'
    case 'low':
      return '低'
  }
}

/**
 * 获取推荐结论的配置
 */
function getRecommendationConfig(recommendation: Recommendation) {
  switch (recommendation) {
    case 'publish':
      return {
        type: 'success' as const,
        icon: <RocketOutlined />,
        title: '建议发布',
        color: '#52c41a',
      }
    case 'review':
      return {
        type: 'warning' as const,
        icon: <EyeOutlined />,
        title: '建议评审',
        color: '#faad14',
      }
    case 'rollback':
      return {
        type: 'error' as const,
        icon: <RollbackOutlined />,
        title: '建议回滚',
        color: '#ff4d4f',
      }
  }
}

type EffectChangeAnalysisProps = {
  analysis: EffectAnalysis
  onPublish?: () => void
  onContinueOptimize?: () => void
  onRollback?: () => void
  showActions?: boolean
}

/**
 * 效果变化分析组件
 */
export function EffectChangeAnalysis({
  analysis,
  onPublish,
  onContinueOptimize,
  onRollback,
  showActions = true,
}: EffectChangeAnalysisProps) {
  const { improvements, risks, recommendation, recommendationReason, confidenceLevel, summary } = analysis
  const recommendConfig = getRecommendationConfig(recommendation)
  const explanation = getRecommendationExplanation(recommendation)

  return (
    <div>
      {/* 一句话总结 */}
      <Alert
        type={recommendConfig.type}
        icon={recommendConfig.icon}
        message={recommendConfig.title}
        description={
          <div>
            <Paragraph style={{ marginBottom: 8 }}>{summary}</Paragraph>
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                分析置信度：
              </Text>
              <Progress
                percent={Math.round(confidenceLevel * 100)}
                size="small"
                style={{ width: 100 }}
                status={confidenceLevel >= 0.6 ? 'success' : 'exception'}
              />
            </Space>
          </div>
        }
        style={{ marginBottom: 16 }}
      />

      {/* 改进项列表 */}
      {improvements.length > 0 && (
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>改进项</span>
              <Tag color="green">{improvements.length}</Tag>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <List
            size="small"
            dataSource={improvements}
            renderItem={(item: Improvement) => (
              <List.Item style={{ padding: '8px 0' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <ArrowUpOutlined style={{ color: '#52c41a' }} />
                      <Text strong>{item.label}</Text>
                    </Space>
                    <Tag color={getImpactColor(item.impact)}>
                      影响：{getImpactLabel(item.impact)}
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
                    {item.description}
                  </Text>
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 风险项列表 */}
      {risks.length > 0 && (
        <Card
          title={
            <Space>
              <WarningOutlined style={{ color: '#faad14' }} />
              <span>风险项</span>
              <Tag color="orange">{risks.length}</Tag>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <List
            size="small"
            dataSource={risks}
            renderItem={(item: Risk) => (
              <List.Item style={{ padding: '8px 0' }}>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space>
                      <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
                      <Text strong>{item.label}</Text>
                    </Space>
                    <Tag color={getImpactColor(item.severity)}>
                      严重性：{getImpactLabel(item.severity)}
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block' }}>
                    {item.description}
                  </Text>
                </div>
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* 推荐建议详情 */}
      <Card
        title={
          <Space>
            <QuestionCircleOutlined style={{ color: recommendConfig.color }} />
            <span>推荐建议</span>
          </Space>
        }
        size="small"
        style={{ marginBottom: 16 }}
      >
        <div style={{ marginBottom: 12 }}>
          <Text strong>{explanation.title}</Text>
          <Paragraph type="secondary" style={{ marginBottom: 8, marginTop: 4 }}>
            {recommendationReason}
          </Paragraph>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>建议后续步骤：</Text>
          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
            {explanation.actions.map((action, index) => (
              <li key={index} style={{ marginBottom: 4, color: '#595959' }}>
                {action}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* 操作按钮 */}
      {showActions && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {recommendation === 'rollback' && onRollback && (
            <Button danger onClick={onRollback}>
              <RollbackOutlined /> 回滚版本
            </Button>
          )}
          {onContinueOptimize && (
            <Button onClick={onContinueOptimize}>
              继续优化
            </Button>
          )}
          {recommendation === 'publish' && onPublish && (
            <Button type="primary" onClick={onPublish}>
              <RocketOutlined /> 发布版本
            </Button>
          )}
          {recommendation === 'review' && onPublish && (
            <Tooltip title="请仔细评审后再决定">
              <Button type="primary" onClick={onPublish}>
                确认发布
              </Button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * 简化的效果摘要（用于列表或小空间）
 */
type EffectSummaryProps = {
  analysis: EffectAnalysis
}

export function EffectSummary({ analysis }: EffectSummaryProps) {
  const { improvements, risks, recommendation } = analysis
  const config = getRecommendationConfig(recommendation)

  return (
    <Space>
      {improvements.length > 0 && (
        <Tooltip title={`${improvements.length} 项改进`}>
          <Tag color="green">
            <CheckCircleOutlined /> {improvements.length}
          </Tag>
        </Tooltip>
      )}
      {risks.length > 0 && (
        <Tooltip title={`${risks.length} 项风险`}>
          <Tag color="orange">
            <WarningOutlined /> {risks.length}
          </Tag>
        </Tooltip>
      )}
      <Tag color={config.color}>
        {config.icon} {config.title}
      </Tag>
    </Space>
  )
}

/**
 * 改进分数显示
 */
type ImprovementScoreProps = {
  score: number
  size?: 'small' | 'default' | 'large'
}

export function ImprovementScore({ score, size = 'default' }: ImprovementScoreProps) {
  const isPositive = score >= 0
  const absScore = Math.abs(score)

  const fontSize = size === 'small' ? 14 : size === 'large' ? 24 : 18
  const iconSize = size === 'small' ? 12 : size === 'large' ? 20 : 16

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {isPositive ? (
        <ArrowUpOutlined style={{ color: '#52c41a', fontSize: iconSize }} />
      ) : (
        <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: iconSize }} />
      )}
      <Text
        style={{
          fontSize,
          fontWeight: 600,
          color: isPositive ? '#52c41a' : '#ff4d4f',
        }}
      >
        {isPositive ? '+' : ''}{score.toFixed(1)}
      </Text>
    </div>
  )
}

/**
 * 推荐结论徽章
 */
type RecommendationBadgeProps = {
  recommendation: Recommendation
}

export function RecommendationBadge({ recommendation }: RecommendationBadgeProps) {
  const config = getRecommendationConfig(recommendation)

  return (
    <Tag color={config.color} icon={config.icon}>
      {config.title}
    </Tag>
  )
}
