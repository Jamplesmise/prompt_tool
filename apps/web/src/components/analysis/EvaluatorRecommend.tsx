'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Card,
  List,
  Checkbox,
  Button,
  Tag,
  Typography,
  Space,
  Progress,
  Tooltip,
  Alert,
  Spin,
} from 'antd'
import {
  BulbOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  ThunderboltOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import type { EvaluatorRecommendation, MatchResult } from '@/lib/recommendation'

const { Text, Paragraph } = Typography

type EvaluatorRecommendProps = {
  /** 推荐结果 */
  matchResult: MatchResult | null
  /** 是否正在加载 */
  loading?: boolean
  /** 选中的评估器ID列表 */
  selectedIds?: string[]
  /** 选中状态变化回调 */
  onSelectionChange?: (selectedIds: string[]) => void
  /** 应用推荐按钮点击 */
  onApplyRecommendation?: (recommendations: EvaluatorRecommendation[]) => void
}

/**
 * 获取匹配度颜色
 */
function getMatchScoreColor(score: number): string {
  if (score >= 90) return '#52c41a'
  if (score >= 70) return '#EF4444'
  if (score >= 50) return '#faad14'
  return '#8c8c8c'
}

/**
 * 单个评估器推荐项
 */
type RecommendationItemProps = {
  recommendation: EvaluatorRecommendation
  checked: boolean
  onChange: (checked: boolean) => void
}

function RecommendationItem({
  recommendation,
  checked,
  onChange,
}: RecommendationItemProps) {
  const scoreColor = getMatchScoreColor(recommendation.matchScore)

  return (
    <List.Item
      style={{
        padding: '12px 16px',
        background: checked ? '#f6ffed' : undefined,
        borderLeft: recommendation.required ? '3px solid #52c41a' : undefined,
      }}
    >
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Checkbox
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
            />
            <Text strong>{recommendation.evaluatorName}</Text>
            {recommendation.required && (
              <Tag color="green">推荐必选</Tag>
            )}
          </Space>
          <Tooltip title={`匹配度 ${recommendation.matchScore}%`}>
            <Progress
              type="circle"
              percent={recommendation.matchScore}
              size={36}
              strokeColor={scoreColor}
              format={(percent) => (
                <span style={{ fontSize: 10 }}>{percent}</span>
              )}
            />
          </Tooltip>
        </div>

        <div style={{ marginTop: 8, marginLeft: 24 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {recommendation.reason}
          </Text>
        </div>

        {recommendation.suggestedConfig && (
          <div style={{ marginTop: 8, marginLeft: 24 }}>
            <Tag color="blue" style={{ fontSize: 11 }}>
              建议配置: {JSON.stringify(recommendation.suggestedConfig)}
            </Tag>
          </div>
        )}
      </div>
    </List.Item>
  )
}

/**
 * 评估器推荐组件
 */
export function EvaluatorRecommend({
  matchResult,
  loading = false,
  selectedIds = [],
  onSelectionChange,
  onApplyRecommendation,
}: EvaluatorRecommendProps) {
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set(selectedIds))

  // 同步外部选中状态
  useEffect(() => {
    setLocalSelectedIds(new Set(selectedIds))
  }, [selectedIds])

  // 计算推荐的必选项
  const requiredIds = useMemo(() => {
    if (!matchResult) return new Set<string>()
    return new Set(
      matchResult.recommendations
        .filter(r => r.required)
        .map(r => r.evaluatorId)
    )
  }, [matchResult])

  const handleChange = (evaluatorId: string, checked: boolean) => {
    const newSelected = new Set(localSelectedIds)
    if (checked) {
      newSelected.add(evaluatorId)
    } else {
      newSelected.delete(evaluatorId)
    }
    setLocalSelectedIds(newSelected)
    onSelectionChange?.(Array.from(newSelected))
  }

  const handleApplyAll = () => {
    if (!matchResult) return

    // 选中所有推荐的评估器
    const allIds = matchResult.recommendations.map(r => r.evaluatorId)
    setLocalSelectedIds(new Set(allIds))
    onSelectionChange?.(allIds)
    onApplyRecommendation?.(matchResult.recommendations)
  }

  const handleApplyRequired = () => {
    if (!matchResult) return

    // 只选中必选的评估器
    const requiredRecommendations = matchResult.recommendations.filter(r => r.required)
    const requiredIdsList = requiredRecommendations.map(r => r.evaluatorId)
    setLocalSelectedIds(new Set(requiredIdsList))
    onSelectionChange?.(requiredIdsList)
    onApplyRecommendation?.(requiredRecommendations)
  }

  // 加载中
  if (loading) {
    return (
      <Card size="small">
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">正在分析并生成推荐...</Text>
          </div>
        </div>
      </Card>
    )
  }

  // 无推荐结果
  if (!matchResult || matchResult.recommendations.length === 0) {
    return (
      <Card size="small">
        <div style={{ textAlign: 'center', padding: 24, color: '#8c8c8c' }}>
          <QuestionCircleOutlined style={{ fontSize: 32, marginBottom: 8 }} />
          <div>暂无评估器推荐</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            请先选择提示词和数据集
          </Text>
        </div>
      </Card>
    )
  }

  const { recommendations, overallConfidence, summary } = matchResult
  const selectedCount = localSelectedIds.size
  const requiredCount = requiredIds.size

  return (
    <Card
      size="small"
      title={
        <Space>
          <RobotOutlined />
          智能推荐评估器
        </Space>
      }
      extra={
        <Tooltip title={`置信度 ${Math.round(overallConfidence * 100)}%`}>
          <Progress
            type="circle"
            percent={Math.round(overallConfidence * 100)}
            size={28}
            strokeColor="#EF4444"
          />
        </Tooltip>
      }
    >
      {/* 摘要 */}
      <Alert
        type="info"
        showIcon
        icon={<BulbOutlined />}
        message={summary}
        style={{ marginBottom: 16 }}
      />

      {/* 推荐列表 */}
      <List
        size="small"
        bordered
        dataSource={recommendations}
        renderItem={(rec) => (
          <RecommendationItem
            key={rec.evaluatorId}
            recommendation={rec}
            checked={localSelectedIds.has(rec.evaluatorId)}
            onChange={(checked) => handleChange(rec.evaluatorId, checked)}
          />
        )}
      />

      {/* 操作按钮 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #f0f0f0',
        }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          已选择 {selectedCount} / {recommendations.length} 个评估器
        </Text>
        <Space>
          {requiredCount > 0 && (
            <Button size="small" onClick={handleApplyRequired}>
              选择必选项 ({requiredCount})
            </Button>
          )}
          <Button
            type="primary"
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={handleApplyAll}
          >
            使用全部推荐
          </Button>
        </Space>
      </div>
    </Card>
  )
}

/**
 * 迷你版评估器推荐提示
 */
type EvaluatorRecommendHintProps = {
  matchResult: MatchResult | null
  onClick?: () => void
}

export function EvaluatorRecommendHint({
  matchResult,
  onClick,
}: EvaluatorRecommendHintProps) {
  if (!matchResult || matchResult.recommendations.length === 0) {
    return null
  }

  const requiredCount = matchResult.recommendations.filter(r => r.required).length

  return (
    <Alert
      type="info"
      showIcon
      icon={<RobotOutlined />}
      message={
        <Space>
          <span>
            智能推荐了 {matchResult.recommendations.length} 个评估器
            {requiredCount > 0 && `（${requiredCount} 个必选）`}
          </span>
          {onClick && (
            <Button type="link" size="small" onClick={onClick}>
              查看推荐
            </Button>
          )}
        </Space>
      }
      style={{ marginBottom: 16 }}
    />
  )
}
