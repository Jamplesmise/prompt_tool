'use client'

import {
  Card,
  Table,
  Progress,
  Tag,
  Space,
  Typography,
  Tooltip,
  Collapse,
  Alert,
  Spin,
  Statistic,
  Row,
  Col,
} from 'antd'
import {
  StarFilled,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useFieldStats } from '@/hooks/useTasks'
import type { FieldStatsItem } from '@/services/tasks'

const { Text } = Typography

type FieldAnalysisPanelProps = {
  taskId: string
}

export function FieldAnalysisPanel({ taskId }: FieldAnalysisPanelProps) {
  const { data, isLoading, error } = useFieldStats(taskId)

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert
        type="error"
        message="加载失败"
        description={error instanceof Error ? error.message : '未知错误'}
      />
    )
  }

  if (!data || data.fields.length === 0) {
    return (
      <Alert
        type="info"
        message="无字段统计数据"
        description="该任务没有字段级评估数据，可能是使用传统评估器或未配置输出结构 Schema"
      />
    )
  }

  const { fields, failureReasons, summary } = data

  // 表格列定义
  const columns = [
    {
      title: '字段',
      key: 'field',
      width: 200,
      render: (_: unknown, record: FieldStatsItem) => (
        <Space>
          {record.isCritical && (
            <Tooltip title="关键字段">
              <StarFilled style={{ color: '#faad14' }} />
            </Tooltip>
          )}
          <Text strong>{record.fieldName}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            ({record.fieldKey})
          </Text>
        </Space>
      ),
    },
    {
      title: '通过率',
      dataIndex: 'passRate',
      key: 'passRate',
      width: 180,
      sorter: (a: FieldStatsItem, b: FieldStatsItem) => a.passRate - b.passRate,
      render: (passRate: number, record: FieldStatsItem) => {
        const percent = Math.round(passRate * 100)
        let status: 'success' | 'exception' | 'normal' = 'normal'
        if (percent >= 90) status = 'success'
        else if (percent < 60) status = 'exception'

        return (
          <Space>
            <Progress
              percent={percent}
              size="small"
              status={status}
              style={{ width: 100 }}
            />
            {record.isCritical && percent < 100 && (
              <Tooltip title="关键字段未全部通过">
                <WarningOutlined style={{ color: '#faad14' }} />
              </Tooltip>
            )}
          </Space>
        )
      },
    },
    {
      title: '平均得分',
      dataIndex: 'avgScore',
      key: 'avgScore',
      width: 100,
      sorter: (a: FieldStatsItem, b: FieldStatsItem) => a.avgScore - b.avgScore,
      render: (score: number) => (
        <Text>{(score * 100).toFixed(1)}%</Text>
      ),
    },
    {
      title: '通过',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 80,
      render: (count: number) => (
        <Text type="success">
          <CheckCircleOutlined /> {count}
        </Text>
      ),
    },
    {
      title: '失败',
      dataIndex: 'failCount',
      key: 'failCount',
      width: 80,
      render: (count: number) => (
        <Text type={count > 0 ? 'danger' : 'secondary'}>
          <CloseCircleOutlined /> {count}
        </Text>
      ),
    },
    {
      title: '跳过',
      dataIndex: 'skipCount',
      key: 'skipCount',
      width: 80,
      render: (count: number) => (
        <Text type="secondary">{count}</Text>
      ),
    },
  ]

  // 失败原因展开项
  const failureItems = Object.entries(failureReasons)
    .filter(([, reasons]) => reasons.length > 0)
    .map(([fieldKey, reasons]) => {
      const field = fields.find(f => f.fieldKey === fieldKey)
      return {
        key: fieldKey,
        label: (
          <Space>
            <Text strong>{field?.fieldName || fieldKey}</Text>
            <Tag color="red">{reasons.length} 种失败原因</Tag>
          </Space>
        ),
        children: (
          <Table
            dataSource={reasons}
            columns={[
              {
                title: '失败原因',
                dataIndex: 'reason',
                key: 'reason',
                ellipsis: true,
              },
              {
                title: '出现次数',
                dataIndex: 'count',
                key: 'count',
                width: 100,
                sorter: (a, b) => a.count - b.count,
                defaultSortOrder: 'descend' as const,
              },
            ]}
            rowKey="reason"
            pagination={false}
            size="small"
          />
        ),
      }
    })

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* 概览统计 */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="总结果数"
              value={summary.totalResults}
              suffix="条"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="字段数"
              value={summary.totalFields}
              suffix={
                summary.criticalFields > 0 ? (
                  <Text type="warning" style={{ fontSize: 14 }}>
                    ({summary.criticalFields} 关键)
                  </Text>
                ) : undefined
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="评估总数"
              value={summary.totalFieldEvaluations}
              suffix="次"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="平均通过率"
              value={(summary.avgPassRate * 100).toFixed(1)}
              suffix="%"
              valueStyle={{
                color: summary.avgPassRate >= 0.9 ? '#3f8600' :
                       summary.avgPassRate < 0.6 ? '#cf1322' : '#666',
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 字段统计表格 */}
      <Card title="字段通过率统计" size="small">
        <Table
          dataSource={fields}
          columns={columns}
          rowKey="fieldKey"
          pagination={false}
          size="small"
          rowClassName={(record) =>
            record.isCritical ? 'critical-field-row' : ''
          }
        />
      </Card>

      {/* 失败原因分析 */}
      {failureItems.length > 0 && (
        <Card title="失败原因分析" size="small">
          <Collapse items={failureItems} />
        </Card>
      )}

      <style jsx global>{`
        .critical-field-row {
          background-color: #fffbe6 !important;
        }
        .critical-field-row:hover > td {
          background-color: #fff1b8 !important;
        }
      `}</style>
    </Space>
  )
}
