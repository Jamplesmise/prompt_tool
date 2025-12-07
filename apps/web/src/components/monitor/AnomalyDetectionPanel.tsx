'use client'

import { useState } from 'react'
import { Card, Typography, Empty, Spin, Segmented, Row, Col, Badge, Tooltip } from 'antd'
import {
  WarningOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { useGlobalAnomalyDetection } from '@/hooks/useAnomalyDetection'
import { AnomalyAlertList } from '@/components/alerts/AnomalyAlert'
import { TrendDeviationList } from '@/components/alerts/TrendDeviationCard'

const { Title, Text } = Typography

type ViewMode = 'alerts' | 'trends'

type AnomalyDetectionPanelProps = {
  teamId?: string
}

export default function AnomalyDetectionPanel({ teamId }: AnomalyDetectionPanelProps) {
  const [period, setPeriod] = useState<'7d' | '30d'>('7d')
  const [viewMode, setViewMode] = useState<ViewMode>('alerts')

  const {
    multiStats,
    detailedStats,
    anomalies,
    isLoading,
    error,
  } = useGlobalAnomalyDetection(period, teamId)

  // 按严重程度统计
  const anomalyCountBySeverity = {
    high: anomalies.filter(a => a.severity === 'high').length,
    medium: anomalies.filter(a => a.severity === 'medium').length,
    low: anomalies.filter(a => a.severity === 'low').length,
  }

  // 整合异常和历史数据
  const trendItems = (detailedStats || []).map(stats => {
    const relatedAnomaly = anomalies.find(
      a => a.promptId === stats.promptId && a.modelId === stats.modelId
    )
    return {
      historyStats: stats,
      anomaly: relatedAnomaly || null,
    }
  })

  // 为告警列表准备数据
  const alertListData = anomalies.map(anomaly => ({
    ...anomaly,
    promptName: detailedStats?.find(s => s.promptId === anomaly.promptId)?.promptName,
    modelName: detailedStats?.find(s => s.modelId === anomaly.modelId)?.modelName,
  }))

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningOutlined />
          <span>异常检测</span>
          {anomalies.length > 0 && (
            <Badge
              count={anomalies.length}
              style={{ backgroundColor: '#ff4d4f' }}
            />
          )}
        </div>
      }
      extra={
        <div style={{ display: 'flex', gap: 16 }}>
          <Segmented
            size="small"
            options={[
              { label: '7天', value: '7d' },
              { label: '30天', value: '30d' },
            ]}
            value={period}
            onChange={(v) => setPeriod(v as '7d' | '30d')}
          />
          <Segmented
            size="small"
            options={[
              {
                label: (
                  <Tooltip title="告警列表">
                    <WarningOutlined />
                  </Tooltip>
                ),
                value: 'alerts',
              },
              {
                label: (
                  <Tooltip title="趋势图表">
                    <BarChartOutlined />
                  </Tooltip>
                ),
                value: 'trends',
              },
            ]}
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
          />
        </div>
      }
    >
      {/* 统计摘要 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <div
            style={{
              textAlign: 'center',
              padding: '12px 0',
              background: anomalyCountBySeverity.high > 0 ? '#fff1f0' : '#f6ffed',
              borderRadius: 8,
            }}
          >
            <Text
              strong
              style={{
                fontSize: 24,
                color: anomalyCountBySeverity.high > 0 ? '#cf1322' : '#52c41a',
              }}
            >
              {anomalyCountBySeverity.high}
            </Text>
            <br />
            <Text type="secondary">严重异常</Text>
          </div>
        </Col>
        <Col span={8}>
          <div
            style={{
              textAlign: 'center',
              padding: '12px 0',
              background: anomalyCountBySeverity.medium > 0 ? '#fff7e6' : '#f6ffed',
              borderRadius: 8,
            }}
          >
            <Text
              strong
              style={{
                fontSize: 24,
                color: anomalyCountBySeverity.medium > 0 ? '#d46b08' : '#52c41a',
              }}
            >
              {anomalyCountBySeverity.medium}
            </Text>
            <br />
            <Text type="secondary">中等异常</Text>
          </div>
        </Col>
        <Col span={8}>
          <div
            style={{
              textAlign: 'center',
              padding: '12px 0',
              background: '#fafafa',
              borderRadius: 8,
            }}
          >
            <Text strong style={{ fontSize: 24 }}>
              {anomalyCountBySeverity.low}
            </Text>
            <br />
            <Text type="secondary">轻微异常</Text>
          </div>
        </Col>
      </Row>

      {/* 内容区域 */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">正在检测异常...</Text>
          </div>
        </div>
      ) : error ? (
        <Empty description="加载失败" />
      ) : anomalies.length === 0 && viewMode === 'alerts' ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          <div style={{ marginTop: 8 }}>
            <Title level={5} style={{ color: '#52c41a' }}>
              一切正常
            </Title>
            <Text type="secondary">
              未检测到异常，所有指标在正常范围内
            </Text>
          </div>
        </div>
      ) : viewMode === 'alerts' ? (
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          <AnomalyAlertList
            anomalies={alertListData}
            emptyText="未检测到异常"
          />
        </div>
      ) : (
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {trendItems.length > 0 ? (
            <TrendDeviationList items={trendItems} compact />
          ) : (
            <Empty description="暂无趋势数据" />
          )}
        </div>
      )}
    </Card>
  )
}
