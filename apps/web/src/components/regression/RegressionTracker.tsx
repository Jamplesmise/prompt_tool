'use client'

import { useMemo, useState } from 'react'
import {
  Card,
  Row,
  Col,
  Alert,
  Space,
  Typography,
  Button,
  Select,
  Empty,
  Tag,
  Tooltip,
  Divider,
} from 'antd'
import {
  HistoryOutlined,
  WarningOutlined,
  RollbackOutlined,
  SwapOutlined,
  LineChartOutlined,
} from '@ant-design/icons'
import { VersionTrendChart } from './VersionTrendChart'
import { VersionTimeline } from './VersionTimeline'
import type { VersionSnapshot, Regression } from '@/components/results/types'
import { detectRegressions, getRegressionTypeName, getSeverityStyle } from '@/lib/results'

const { Text, Title } = Typography

type RegressionTrackerProps = {
  /** 提示词 ID */
  promptId: string
  /** 当前版本 */
  currentVersion?: number
  /** 版本快照列表 */
  snapshots: VersionSnapshot[]
  /** 加载状态 */
  loading?: boolean
  /** 回滚到指定版本 */
  onRollback?: (version: number) => void
  /** 对比两个版本 */
  onCompare?: (fromVersion: number, toVersion: number) => void
}

/**
 * 回归追踪面板
 * 整合版本趋势、时间线、回归问题检测
 */
export function RegressionTracker({
  promptId,
  currentVersion,
  snapshots,
  loading = false,
  onRollback,
  onCompare,
}: RegressionTrackerProps) {
  const [selectedMetric, setSelectedMetric] = useState<'passRate' | 'avgLatency' | 'avgCost'>('passRate')
  const [selectedSnapshot, setSelectedSnapshot] = useState<VersionSnapshot | null>(null)

  // 检测回归问题
  const regressions = useMemo(
    () => detectRegressions(snapshots),
    [snapshots]
  )

  // 高严重度回归数量
  const highSeverityCount = useMemo(
    () => regressions.filter(r => r.severity === 'high').length,
    [regressions]
  )

  // 按版本排序的快照
  const sortedSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => a.version - b.version),
    [snapshots]
  )

  // 最新快照
  const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1]

  // 处理版本点击
  const handleVersionClick = (snapshot: VersionSnapshot) => {
    setSelectedSnapshot(snapshot)
  }

  if (snapshots.length === 0) {
    return (
      <Card>
        <Empty description="暂无版本测试记录" />
      </Card>
    )
  }

  return (
    <div>
      {/* 回归告警 */}
      {highSeverityCount > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          message={`检测到 ${highSeverityCount} 个高严重度回归问题`}
          description="最近的版本更新可能导致了性能或质量下降，请及时检查。"
          style={{ marginBottom: 16 }}
          action={
            onRollback && latestSnapshot && sortedSnapshots.length > 1 && (
              <Button
                size="small"
                danger
                icon={<RollbackOutlined />}
                onClick={() => onRollback(sortedSnapshots[sortedSnapshots.length - 2].version)}
              >
                回滚
              </Button>
            )
          }
        />
      )}

      {/* 回归问题列表 */}
      {regressions.length > 0 && (
        <Card
          size="small"
          title={
            <Space>
              <WarningOutlined style={{ color: '#faad14' }} />
              回归问题 ({regressions.length})
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            {regressions.map((regression, index) => {
              const style = getSeverityStyle(regression.severity)
              return (
                <div
                  key={index}
                  style={{
                    padding: '12px 16px',
                    background: style.background,
                    borderRadius: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Space style={{ marginBottom: 4 }}>
                      <Tag color={style.color}>{style.text}</Tag>
                      <Text strong>{getRegressionTypeName(regression.type)}</Text>
                    </Space>
                    <div>
                      <Text type="secondary">
                        v{regression.fromVersion} → v{regression.toVersion}：
                        {regression.type === 'passRate_drop'
                          ? `${regression.oldValue.toFixed(1)}% → ${regression.newValue.toFixed(1)}%`
                          : regression.type === 'latency_increase'
                          ? `${(regression.oldValue / 1000).toFixed(2)}s → ${(regression.newValue / 1000).toFixed(2)}s`
                          : `$${regression.oldValue.toFixed(4)} → $${regression.newValue.toFixed(4)}`
                        }
                        <span style={{ color: style.color, marginLeft: 8 }}>
                          ({regression.changePercent > 0 ? '+' : ''}{regression.changePercent.toFixed(1)}%)
                        </span>
                      </Text>
                    </div>
                  </div>
                  {onCompare && (
                    <Tooltip title="对比版本">
                      <Button
                        type="text"
                        size="small"
                        icon={<SwapOutlined />}
                        onClick={() => onCompare(regression.fromVersion, regression.toVersion)}
                      />
                    </Tooltip>
                  )}
                </div>
              )
            })}
          </Space>
        </Card>
      )}

      <Row gutter={[16, 16]}>
        {/* 趋势图 */}
        <Col xs={24} md={24} lg={14}>
          <Card
            size="small"
            title={
              <Space>
                <LineChartOutlined />
                版本趋势
              </Space>
            }
            extra={
              <Select
                value={selectedMetric}
                onChange={setSelectedMetric}
                size="small"
                style={{ width: 100 }}
                options={[
                  { value: 'passRate', label: '通过率' },
                  { value: 'avgLatency', label: '延迟' },
                  { value: 'avgCost', label: '成本' },
                ]}
              />
            }
          >
            <VersionTrendChart
              snapshots={sortedSnapshots}
              metric={selectedMetric}
              onPointClick={handleVersionClick}
              height={250}
            />
          </Card>
        </Col>

        {/* 时间线 */}
        <Col xs={24} md={24} lg={10}>
          <div style={{ maxHeight: 350, overflow: 'auto' }}>
            <VersionTimeline
              snapshots={snapshots}
              currentVersion={currentVersion}
              onVersionClick={handleVersionClick}
            />
          </div>
        </Col>
      </Row>

      {/* 选中版本详情 */}
      {selectedSnapshot && (
        <Card
          size="small"
          title={`版本 ${selectedSnapshot.version} 详情`}
          extra={
            <Space>
              {onCompare && currentVersion && selectedSnapshot.version !== currentVersion && (
                <Button
                  size="small"
                  icon={<SwapOutlined />}
                  onClick={() => onCompare(selectedSnapshot.version, currentVersion)}
                >
                  与当前对比
                </Button>
              )}
              {onRollback && selectedSnapshot.version !== currentVersion && (
                <Button
                  size="small"
                  icon={<RollbackOutlined />}
                  onClick={() => onRollback(selectedSnapshot.version)}
                >
                  回滚到此版本
                </Button>
              )}
              <Button size="small" onClick={() => setSelectedSnapshot(null)}>
                关闭
              </Button>
            </Space>
          }
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Text type="secondary">通过率</Text>
              <div>
                <Text
                  strong
                  style={{
                    fontSize: 20,
                    color: selectedSnapshot.metrics.passRate >= 80 ? '#52c41a' : '#ff4d4f',
                  }}
                >
                  {selectedSnapshot.metrics.passRate.toFixed(1)}%
                </Text>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">测试数</Text>
              <div>
                <Text strong style={{ fontSize: 20 }}>
                  {selectedSnapshot.metrics.totalTests}
                </Text>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">平均延迟</Text>
              <div>
                <Text strong style={{ fontSize: 20 }}>
                  {selectedSnapshot.metrics.avgLatency > 0
                    ? `${(selectedSnapshot.metrics.avgLatency / 1000).toFixed(2)}s`
                    : '-'}
                </Text>
              </div>
            </Col>
            <Col span={6}>
              <Text type="secondary">平均成本</Text>
              <div>
                <Text strong style={{ fontSize: 20 }}>
                  {selectedSnapshot.metrics.avgCost > 0
                    ? `$${selectedSnapshot.metrics.avgCost.toFixed(4)}`
                    : '-'}
                </Text>
              </div>
            </Col>
          </Row>
          {selectedSnapshot.changeDescription && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <Text type="secondary">变更说明：</Text>
              <Text>{selectedSnapshot.changeDescription}</Text>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
