'use client'

import { useState, useEffect } from 'react'
import {
  Alert,
  Card,
  Button,
  Tag,
  Typography,
  Space,
  Collapse,
  List,
  Tooltip,
  Divider,
  Spin,
} from 'antd'
import {
  WarningOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  LineChartOutlined,
  CheckOutlined,
  CloseOutlined,
  RightOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import type { Anomaly, AnomalyType, AnomalySeverity } from '@/lib/analysis/anomalyDetector'
import type { PossibleCause, CauseAnalysisResult } from '@/lib/analysis/anomalyCauseAnalyzer'
import {
  getAnomalyTypeName,
  getSeverityStyle,
  analyzeCausesSync,
  getCauseCategoryName,
  getLikelihoodStyle,
} from '@/lib/analysis'

const { Text, Title, Paragraph } = Typography

/**
 * 获取异常类型的图标
 */
function getAnomalyIcon(type: AnomalyType) {
  const icons: Record<AnomalyType, React.ReactNode> = {
    sudden_drop: <ArrowDownOutlined style={{ color: '#cf1322' }} />,
    sudden_rise: <ArrowUpOutlined style={{ color: '#52c41a' }} />,
    trend_deviation: <LineChartOutlined style={{ color: '#d46b08' }} />,
    unusual_pattern: <ExclamationCircleOutlined style={{ color: '#cf1322' }} />,
    sustained_low: <WarningOutlined style={{ color: '#d46b08' }} />,
  }
  return icons[type] || <InfoCircleOutlined />
}

/**
 * 获取严重程度的 Alert 类型
 */
function getAlertType(severity: AnomalySeverity): 'error' | 'warning' | 'info' {
  const types: Record<AnomalySeverity, 'error' | 'warning' | 'info'> = {
    high: 'error',
    medium: 'warning',
    low: 'info',
  }
  return types[severity]
}

/**
 * 原因列表项组件
 */
type CauseItemProps = {
  cause: PossibleCause
}

function CauseItem({ cause }: CauseItemProps) {
  const likelihoodStyle = getLikelihoodStyle(cause.likelihood)

  return (
    <List.Item>
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Space>
            <Tag color={likelihoodStyle.color === '#cf1322' ? 'red' : likelihoodStyle.color === '#d46b08' ? 'orange' : 'default'}>
              {likelihoodStyle.label}可能性
            </Tag>
            <Tag>{getCauseCategoryName(cause.category)}</Tag>
            <Text strong>{cause.cause}</Text>
          </Space>
          <Link href={cause.action.href}>
            <Button type="link" size="small" icon={<RightOutlined />}>
              {cause.action.label}
            </Button>
          </Link>
        </div>
        <div style={{ marginTop: 8, paddingLeft: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {cause.evidence}
          </Text>
        </div>
      </div>
    </List.Item>
  )
}

/**
 * 异常告警卡片属性
 */
type AnomalyAlertProps = {
  anomaly: Anomaly
  promptId?: string
  promptName?: string
  modelId?: string
  modelName?: string
  taskId?: string
  /** 是否显示详情 */
  showDetails?: boolean
  /** 忽略按钮点击 */
  onIgnore?: () => void
  /** 确认按钮点击 */
  onAcknowledge?: () => void
  /** 自定义样式 */
  style?: React.CSSProperties
}

/**
 * 异常告警组件
 */
export function AnomalyAlert({
  anomaly,
  promptId,
  promptName,
  modelId,
  modelName,
  taskId,
  showDetails = true,
  onIgnore,
  onAcknowledge,
  style,
}: AnomalyAlertProps) {
  const [expanded, setExpanded] = useState(false)
  const [causeAnalysis, setCauseAnalysis] = useState<CauseAnalysisResult | null>(null)

  // 分析原因
  useEffect(() => {
    if (expanded && promptId && modelId && taskId && !causeAnalysis) {
      const result = analyzeCausesSync(anomaly, {
        promptId,
        modelId,
        taskId,
      })
      setCauseAnalysis(result)
    }
  }, [expanded, anomaly, promptId, modelId, taskId, causeAnalysis])

  const severityStyle = getSeverityStyle(anomaly.severity)
  const alertType = getAlertType(anomaly.severity)

  const title = (
    <Space>
      {getAnomalyIcon(anomaly.type)}
      <span>{getAnomalyTypeName(anomaly.type)}</span>
      <Tag color={severityStyle.color} style={{ marginLeft: 8 }}>
        {severityStyle.label}
      </Tag>
    </Space>
  )

  const description = (
    <div>
      <Paragraph style={{ margin: '8px 0' }}>
        {anomaly.description}
      </Paragraph>

      <Space size="large" style={{ marginBottom: 8 }}>
        <div>
          <Text type="secondary">当前值：</Text>
          <Text strong style={{ color: severityStyle.color }}>
            {anomaly.currentValue.toFixed(1)}%
          </Text>
        </div>
        <div>
          <Text type="secondary">预期范围：</Text>
          <Text>
            {anomaly.expectedRange.min.toFixed(1)}% - {anomaly.expectedRange.max.toFixed(1)}%
          </Text>
        </div>
        {anomaly.deviation !== 0 && (
          <div>
            <Text type="secondary">偏离：</Text>
            <Text style={{ color: severityStyle.color }}>
              {anomaly.deviation > 0 ? '+' : ''}{anomaly.deviation.toFixed(2)} 个标准差
            </Text>
          </div>
        )}
      </Space>

      {(promptName || modelName) && (
        <div style={{ marginBottom: 8 }}>
          {promptName && (
            <Tag color="blue">提示词：{promptName}</Tag>
          )}
          {modelName && (
            <Tag color="purple">模型：{modelName}</Tag>
          )}
        </div>
      )}

      {showDetails && (
        <Button
          type="link"
          size="small"
          onClick={() => setExpanded(!expanded)}
          style={{ padding: 0 }}
        >
          {expanded ? '收起详情' : '查看详情'}
        </Button>
      )}
    </div>
  )

  return (
    <Alert
      type={alertType}
      showIcon
      icon={getAnomalyIcon(anomaly.type)}
      message={title}
      description={
        <div>
          {description}

          {expanded && (
            <div style={{ marginTop: 16 }}>
              <Divider style={{ margin: '12px 0' }} />

              {/* 可能原因 */}
              <Title level={5} style={{ marginBottom: 12 }}>
                <BulbOutlined style={{ marginRight: 8 }} />
                可能原因分析
              </Title>

              {causeAnalysis ? (
                <>
                  <List
                    size="small"
                    dataSource={causeAnalysis.causes.slice(0, 4)}
                    renderItem={(cause) => <CauseItem cause={cause} />}
                    style={{ marginBottom: 16 }}
                  />

                  {/* 推荐操作 */}
                  <Alert
                    type="info"
                    message="建议操作"
                    description={causeAnalysis.recommendation}
                    style={{ marginBottom: 16 }}
                  />
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 16 }}>
                  <Spin size="small" />
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    正在分析原因...
                  </Text>
                </div>
              )}

              {/* 操作按钮 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {onIgnore && (
                  <Button size="small" icon={<CloseOutlined />} onClick={onIgnore}>
                    忽略
                  </Button>
                )}
                {onAcknowledge && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckOutlined />}
                    onClick={onAcknowledge}
                  >
                    确认
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      }
      style={{
        borderLeft: `4px solid ${severityStyle.color}`,
        marginBottom: 16,
        ...style,
      }}
    />
  )
}

/**
 * 异常告警列表属性
 */
type AnomalyAlertListProps = {
  anomalies: Array<Anomaly & {
    promptId: string
    promptName?: string
    modelId: string
    modelName?: string
    taskId?: string
  }>
  onIgnore?: (index: number) => void
  onAcknowledge?: (index: number) => void
  emptyText?: string
}

/**
 * 异常告警列表组件
 */
export function AnomalyAlertList({
  anomalies,
  onIgnore,
  onAcknowledge,
  emptyText = '暂无异常告警',
}: AnomalyAlertListProps) {
  if (anomalies.length === 0) {
    return (
      <Alert
        type="success"
        showIcon
        icon={<CheckOutlined />}
        message={emptyText}
        style={{ marginBottom: 16 }}
      />
    )
  }

  return (
    <div>
      {anomalies.map((anomaly, index) => (
        <AnomalyAlert
          key={`${anomaly.promptId}-${anomaly.modelId}-${index}`}
          anomaly={anomaly}
          promptId={anomaly.promptId}
          promptName={anomaly.promptName}
          modelId={anomaly.modelId}
          modelName={anomaly.modelName}
          taskId={anomaly.taskId}
          onIgnore={onIgnore ? () => onIgnore(index) : undefined}
          onAcknowledge={onAcknowledge ? () => onAcknowledge(index) : undefined}
        />
      ))}
    </div>
  )
}

/**
 * 迷你版异常提示
 */
type AnomalyHintProps = {
  anomaly: Anomaly | null
  onClick?: () => void
}

export function AnomalyHint({ anomaly, onClick }: AnomalyHintProps) {
  if (!anomaly) return null

  const severityStyle = getSeverityStyle(anomaly.severity)

  return (
    <Alert
      type={getAlertType(anomaly.severity)}
      showIcon
      icon={getAnomalyIcon(anomaly.type)}
      message={
        <Space>
          <span>{getAnomalyTypeName(anomaly.type)}：{anomaly.description}</span>
          {onClick && (
            <Button type="link" size="small" onClick={onClick}>
              查看详情
            </Button>
          )}
        </Space>
      }
      style={{
        borderLeft: `4px solid ${severityStyle.color}`,
        marginBottom: 16,
      }}
    />
  )
}
