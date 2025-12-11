'use client'

import { useState } from 'react'
import { Card, Select, Button, Table, Typography, Alert, Space, Row, Col, Statistic, Tag, Spin, Empty } from 'antd'
import { SwapOutlined, WarningOutlined, CheckCircleOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { tasksService } from '@/services/tasks'
import type { FieldComparison, TaskCompareResponse } from '@/services/tasks'

const { Title, Text } = Typography

export default function TaskComparePage() {
  const [baseTaskId, setBaseTaskId] = useState<string>()
  const [compareTaskId, setCompareTaskId] = useState<string>()
  const [compareResult, setCompareResult] = useState<TaskCompareResponse | null>(null)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取任务列表
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'list', { pageSize: 100 }],
    queryFn: () => tasksService.list({ pageSize: 100 }),
  })

  const tasks = tasksData?.data?.list || []

  // 执行对比
  const handleCompare = async () => {
    if (!baseTaskId || !compareTaskId) return

    setComparing(true)
    setError(null)
    setCompareResult(null)

    try {
      const result = await tasksService.compare({
        baseTaskId,
        compareTaskId,
      })

      if (result.code === 200 && result.data) {
        setCompareResult(result.data)
      } else {
        setError(result.message || '对比失败')
      }
    } catch {
      setError('对比请求失败')
    } finally {
      setComparing(false)
    }
  }

  // 交换基准和对比任务
  const handleSwap = () => {
    const temp = baseTaskId
    setBaseTaskId(compareTaskId)
    setCompareTaskId(temp)
    setCompareResult(null)
  }

  // 格式化百分比变化
  const formatChange = (change: number) => {
    const percent = (change * 100).toFixed(1)
    if (change > 0) {
      return <Text type="success"><ArrowUpOutlined /> +{percent}%</Text>
    } else if (change < 0) {
      return <Text type="danger"><ArrowDownOutlined /> {percent}%</Text>
    }
    return <Text type="secondary">0%</Text>
  }

  // 表格列定义
  const columns = [
    {
      title: '字段',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 180,
      render: (name: string, record: FieldComparison) => (
        <Space direction="vertical" size={0}>
          <Space>
            <Text strong>{name}</Text>
            {record.isCritical && <Tag color="red">关键</Tag>}
          </Space>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.fieldKey}</Text>
        </Space>
      ),
    },
    {
      title: '基准通过率',
      dataIndex: 'basePassRate',
      key: 'basePassRate',
      width: 120,
      align: 'center' as const,
      render: (rate: number) => `${(rate * 100).toFixed(1)}%`,
    },
    {
      title: '对比通过率',
      dataIndex: 'comparePassRate',
      key: 'comparePassRate',
      width: 120,
      align: 'center' as const,
      render: (rate: number) => `${(rate * 100).toFixed(1)}%`,
    },
    {
      title: '变化',
      dataIndex: 'change',
      key: 'change',
      width: 100,
      align: 'center' as const,
      render: (change: number) => formatChange(change),
    },
    {
      title: '状态',
      dataIndex: 'isRegression',
      key: 'isRegression',
      width: 100,
      align: 'center' as const,
      render: (isRegression: boolean, record: FieldComparison) => {
        if (isRegression) {
          return <Tag icon={<WarningOutlined />} color="error">回归</Tag>
        }
        if (record.change > 0.01) {
          return <Tag icon={<CheckCircleOutlined />} color="success">提升</Tag>
        }
        return <Tag color="default">稳定</Tag>
      },
    },
    {
      title: '基准评分',
      dataIndex: 'baseAvgScore',
      key: 'baseAvgScore',
      width: 100,
      align: 'center' as const,
      render: (score: number) => score > 0 ? score.toFixed(2) : '-',
    },
    {
      title: '对比评分',
      dataIndex: 'compareAvgScore',
      key: 'compareAvgScore',
      width: 100,
      align: 'center' as const,
      render: (score: number) => score > 0 ? score.toFixed(2) : '-',
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>任务对比</Title>

      {/* 任务选择 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col flex="1">
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">基准任务</Text>
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="选择基准任务"
              loading={tasksLoading}
              value={baseTaskId}
              onChange={setBaseTaskId}
              showSearch
              optionFilterProp="label"
              options={tasks.map(t => ({
                value: t.id,
                label: `${t.name} (${t.status})`,
              }))}
            />
          </Col>
          <Col>
            <Button
              icon={<SwapOutlined />}
              onClick={handleSwap}
              disabled={!baseTaskId || !compareTaskId}
              style={{ marginTop: 24 }}
            />
          </Col>
          <Col flex="1">
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">对比任务</Text>
            </div>
            <Select
              style={{ width: '100%' }}
              placeholder="选择对比任务"
              loading={tasksLoading}
              value={compareTaskId}
              onChange={setCompareTaskId}
              showSearch
              optionFilterProp="label"
              options={tasks.map(t => ({
                value: t.id,
                label: `${t.name} (${t.status})`,
              }))}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              onClick={handleCompare}
              disabled={!baseTaskId || !compareTaskId || baseTaskId === compareTaskId}
              loading={comparing}
              style={{ marginTop: 24 }}
            >
              开始对比
            </Button>
          </Col>
        </Row>
      </Card>

      {/* 错误提示 */}
      {error && (
        <Alert
          type="error"
          message={error}
          style={{ marginBottom: 24 }}
          closable
          onClose={() => setError(null)}
        />
      )}

      {/* 加载中 */}
      {comparing && (
        <Card>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在对比..." />
          </div>
        </Card>
      )}

      {/* 对比结果 */}
      {compareResult && !comparing && (
        <>
          {/* 总体统计 */}
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={24}>
              <Col span={6}>
                <Statistic
                  title="基准通过率"
                  value={(compareResult.summary.basePassRate * 100).toFixed(1)}
                  suffix="%"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="对比通过率"
                  value={(compareResult.summary.comparePassRate * 100).toFixed(1)}
                  suffix="%"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="变化"
                  value={(compareResult.summary.change * 100).toFixed(1)}
                  suffix="%"
                  valueStyle={{
                    color: compareResult.summary.change > 0 ? '#52c41a' : compareResult.summary.change < 0 ? '#ff4d4f' : undefined
                  }}
                  prefix={compareResult.summary.change > 0 ? <ArrowUpOutlined /> : compareResult.summary.change < 0 ? <ArrowDownOutlined /> : null}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="回归字段数"
                  value={compareResult.summary.regressionCount}
                  valueStyle={{
                    color: compareResult.summary.regressionCount > 0 ? '#ff4d4f' : '#52c41a'
                  }}
                />
              </Col>
            </Row>
          </Card>

          {/* 回归告警 */}
          {compareResult.summary.hasRegression && (
            <Alert
              type="warning"
              icon={<WarningOutlined />}
              message="检测到性能回归"
              description={
                <div>
                  <Text>以下字段的通过率显著下降：</Text>
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    {compareResult.regressions.map(r => (
                      <li key={r.fieldKey}>
                        <Text strong>{r.fieldName}</Text>
                        {r.isCritical && <Tag color="red" style={{ marginLeft: 8 }}>关键</Tag>}
                        <Text type="secondary" style={{ marginLeft: 8 }}>
                          {(r.basePassRate * 100).toFixed(1)}% → {(r.comparePassRate * 100).toFixed(1)}%
                          ({(r.change * 100).toFixed(1)}%)
                        </Text>
                      </li>
                    ))}
                  </ul>
                </div>
              }
              style={{ marginBottom: 24 }}
            />
          )}

          {/* 任务信息 */}
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col span={12}>
              <Card size="small" title="基准任务">
                <Text strong>{compareResult.baseTask.name}</Text>
                <br />
                <Text type="secondary">
                  提示词: {compareResult.baseTask.promptName || '-'}
                </Text>
                <br />
                <Text type="secondary">
                  创建时间: {new Date(compareResult.baseTask.createdAt).toLocaleString()}
                </Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="对比任务">
                <Text strong>{compareResult.compareTask.name}</Text>
                <br />
                <Text type="secondary">
                  提示词: {compareResult.compareTask.promptName || '-'}
                </Text>
                <br />
                <Text type="secondary">
                  创建时间: {new Date(compareResult.compareTask.createdAt).toLocaleString()}
                </Text>
              </Card>
            </Col>
          </Row>

          {/* 字段级对比表格 */}
          <Card title="字段级对比">
            {compareResult.fieldComparison.length > 0 ? (
              <Table
                dataSource={compareResult.fieldComparison}
                columns={columns}
                rowKey="fieldKey"
                pagination={false}
                size="small"
                rowClassName={(record) => record.isRegression ? 'regression-row' : ''}
              />
            ) : (
              <Empty description="没有字段评估数据" />
            )}
          </Card>
        </>
      )}

      {/* 无结果提示 */}
      {!compareResult && !comparing && (
        <Card>
          <Empty
            description="选择两个任务并点击「开始对比」查看字段级回归分析"
          />
        </Card>
      )}

      <style jsx global>{`
        .regression-row {
          background-color: #fff2f0 !important;
        }
        .regression-row:hover > td {
          background-color: #ffccc7 !important;
        }
      `}</style>
    </div>
  )
}
