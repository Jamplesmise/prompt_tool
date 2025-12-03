'use client'

import { Card, Table, Tag, Typography, Statistic, Row, Col, Progress, Empty, Spin, Tooltip } from 'antd'
import { TrophyOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { useABTestResults } from '@/hooks/useTasks'
import type { ABTestResults as ABTestResultsType } from '@/services/tasks'

const { Text } = Typography

type ABTestResultsProps = {
  taskId: string
}

type ComparisonRow = ABTestResultsType['results'][number]

export function ABTestResults({ taskId }: ABTestResultsProps) {
  const { data, isLoading, error } = useABTestResults(taskId)

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Empty
        description={error instanceof Error ? error.message : '加载失败'}
      />
    )
  }

  const { summary, results, compareType } = data

  // 统计摘要
  const winsA = summary.winsA ?? 0
  const winsB = summary.winsB ?? 0
  const ties = summary.ties ?? 0
  const total = winsA + winsB + ties
  const winRateA = total > 0 ? (winsA / total) * 100 : 0
  const winRateB = total > 0 ? (winsB / total) * 100 : 0

  const columns: ColumnsType<ComparisonRow> = [
    {
      title: '行号',
      dataIndex: 'rowIndex',
      key: 'rowIndex',
      width: 80,
      render: (val) => val + 1,
    },
    {
      title: '配置 A',
      key: 'configA',
      width: 300,
      render: (_, record) => (
        <div>
          <Text
            style={{
              display: 'block',
              maxWidth: 280,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={record.configA.output ?? ''}
          >
            {record.configA.output || <Text type="secondary">-</Text>}
          </Text>
          <div style={{ marginTop: 4 }}>
            {record.configA.evaluations.map((e, i) => (
              <Tag key={i} color={e.passed ? 'success' : 'error'} style={{ marginBottom: 2 }}>
                {e.passed ? '通过' : '未通过'}
                {e.score != null && ` (${(e.score * 100).toFixed(0)}%)`}
              </Tag>
            ))}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.configA.latencyMs ?? '-'}ms | {record.configA.tokens.total} tokens
            {record.configA.cost != null && ` | $${record.configA.cost.toFixed(4)}`}
          </Text>
        </div>
      ),
    },
    {
      title: '胜出',
      key: 'winner',
      width: 100,
      align: 'center',
      render: (_, record) => {
        if (record.winner === 'A') {
          return <Tag color="blue" icon={<TrophyOutlined />}>A 胜出</Tag>
        }
        if (record.winner === 'B') {
          return <Tag color="green" icon={<TrophyOutlined />}>B 胜出</Tag>
        }
        return <Tag>平局</Tag>
      },
    },
    {
      title: '配置 B',
      key: 'configB',
      width: 300,
      render: (_, record) => (
        <div>
          <Text
            style={{
              display: 'block',
              maxWidth: 280,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={record.configB.output ?? ''}
          >
            {record.configB.output || <Text type="secondary">-</Text>}
          </Text>
          <div style={{ marginTop: 4 }}>
            {record.configB.evaluations.map((e, i) => (
              <Tag key={i} color={e.passed ? 'success' : 'error'} style={{ marginBottom: 2 }}>
                {e.passed ? '通过' : '未通过'}
                {e.score != null && ` (${(e.score * 100).toFixed(0)}%)`}
              </Tag>
            ))}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.configB.latencyMs ?? '-'}ms | {record.configB.tokens.total} tokens
            {record.configB.cost != null && ` | $${record.configB.cost.toFixed(4)}`}
          </Text>
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* 统计摘要 */}
      <Card title="对比结果摘要" style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={6}>
            <Statistic
              title={
                <span>
                  配置 A 胜出
                  <Tooltip title={compareType === 'prompt' ? '不同提示词' : '不同模型'}>
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
              value={winsA}
              suffix={`(${winRateA.toFixed(1)}%)`}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="配置 B 胜出"
              value={winsB}
              suffix={`(${winRateB.toFixed(1)}%)`}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平局"
              value={ties}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title={
                <span>
                  统计显著性
                  <Tooltip title={`p 值: ${summary.pValue?.toFixed(4) ?? '-'}`}>
                    <QuestionCircleOutlined style={{ marginLeft: 4 }} />
                  </Tooltip>
                </span>
              }
              value={summary.significant ? '是' : '否'}
              valueStyle={{ color: summary.significant ? '#52c41a' : '#8c8c8c' }}
            />
          </Col>
        </Row>

        {/* 胜率对比条 */}
        <div style={{ marginTop: 24 }}>
          <Text strong>胜率对比</Text>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ width: 80 }}>配置 A</Text>
            <Progress
              percent={winRateA}
              showInfo={false}
              strokeColor="#1890ff"
              style={{ flex: 1, margin: '0 16px' }}
            />
            <Text style={{ width: 80, textAlign: 'right' }}>配置 B</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
            <div style={{ width: 80 }} />
            <Progress
              percent={winRateB}
              showInfo={false}
              strokeColor="#52c41a"
              style={{ flex: 1, margin: '0 16px' }}
            />
            <div style={{ width: 80 }} />
          </div>
        </div>

        {/* 结论 */}
        {summary.significant && summary.winner && (
          <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 4 }}>
            <TrophyOutlined style={{ color: '#52c41a', marginRight: 8 }} />
            <Text strong>
              结论：配置 {summary.winner} 显著优于配置 {summary.winner === 'A' ? 'B' : 'A'}
              {summary.confidence && ` (置信度 ${summary.confidence.toFixed(1)}%)`}
            </Text>
          </div>
        )}

        {!summary.significant && total > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: '#fffbe6', borderRadius: 4 }}>
            <QuestionCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
            <Text>
              结论：两个配置之间没有显著差异，可能需要更多样本
            </Text>
          </div>
        )}
      </Card>

      {/* 详细对比表格 */}
      <Card title="逐行对比">
        <Table
          columns={columns}
          dataSource={results}
          rowKey="rowIndex"
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
          }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  )
}
