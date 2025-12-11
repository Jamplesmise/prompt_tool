'use client'

import { useState } from 'react'
import {
  Drawer,
  Descriptions,
  Typography,
  Divider,
  Tag,
  Space,
  Card,
  Table,
  Progress,
  Tooltip,
  Tabs,
  Alert,
  Spin,
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  StarFilled,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { useTaskResultDetail } from '@/hooks/useTasks'
import { ResultStatusTag, EvaluationTag } from './TaskStatusTag'
import type { TaskResultItem, FieldEvaluationItem } from '@/services/tasks'

const { Text, Paragraph } = Typography

// 格式化成本显示
const formatCost = (cost: number | null, currency: 'USD' | 'CNY' = 'USD'): string => {
  if (cost === null) return '-'
  const symbol = currency === 'CNY' ? '¥' : '$'
  return `${symbol}${cost.toFixed(6)}`
}

// 格式化值显示
const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '(空)'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

type ResultDetailV2Props = {
  taskId: string
  result: TaskResultItem | null
  visible: boolean
  onClose: () => void
}

export function ResultDetailV2({ taskId, result, visible, onClose }: ResultDetailV2Props) {
  const [activeTab, setActiveTab] = useState('overview')

  // 获取详情数据
  const { data: detail, isLoading } = useTaskResultDetail(
    visible ? taskId : undefined,
    visible ? result?.id : undefined
  )

  if (!result) return null

  // 字段评估表格列
  const fieldColumns = [
    {
      title: '字段',
      key: 'field',
      width: 150,
      render: (_: unknown, record: FieldEvaluationItem) => (
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
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: unknown, record: FieldEvaluationItem) => {
        if (record.skipped) {
          return (
            <Tooltip title={record.skipReason || '已跳过'}>
              <Tag icon={<MinusCircleOutlined />} color="default">
                跳过
              </Tag>
            </Tooltip>
          )
        }
        return record.passed ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            通过
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="error">
            失败
          </Tag>
        )
      },
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (score: number | null, record: FieldEvaluationItem) => {
        if (record.skipped) return '-'
        if (score === null) return '-'
        const percent = Math.round(score * 100)
        return (
          <Progress
            percent={percent}
            size="small"
            status={record.passed ? 'success' : 'exception'}
            format={(p) => `${p}%`}
          />
        )
      },
    },
    {
      title: '实际值',
      dataIndex: 'fieldValue',
      key: 'fieldValue',
      width: 180,
      ellipsis: true,
      render: (value: unknown) => (
        <Tooltip title={formatValue(value)}>
          <Text style={{ maxWidth: 160 }} ellipsis>
            {formatValue(value)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '期望值',
      dataIndex: 'expectedValue',
      key: 'expectedValue',
      width: 180,
      ellipsis: true,
      render: (value: unknown) => (
        <Tooltip title={formatValue(value)}>
          <Text style={{ maxWidth: 160 }} ellipsis>
            {formatValue(value)}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '原因',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
      render: (reason: string | null) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {reason || '-'}
        </Text>
      ),
    },
  ]

  // 渲染基础信息
  const renderOverview = () => (
    <>
      {/* 基本信息 */}
      <Descriptions column={2} size="small">
        <Descriptions.Item label="序号">{result.rowIndex + 1}</Descriptions.Item>
        <Descriptions.Item label="状态">
          <ResultStatusTag status={result.status} />
        </Descriptions.Item>
        <Descriptions.Item label="提示词">
          {result.promptName} (v{result.promptVersion})
        </Descriptions.Item>
        <Descriptions.Item label="模型">{result.modelName}</Descriptions.Item>
        <Descriptions.Item label="耗时">
          {result.latencyMs ? `${result.latencyMs}ms` : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="费用">
          {formatCost(result.cost, result.costCurrency)}
        </Descriptions.Item>
      </Descriptions>

      {/* Token 消耗 */}
      <Card size="small" title="Token 消耗" style={{ marginTop: 16 }}>
        <Space size="large">
          <Text>输入: {result.tokens.input}</Text>
          <Text>输出: {result.tokens.output}</Text>
          <Text strong>总计: {result.tokens.total}</Text>
        </Space>
      </Card>

      {/* 错误信息 */}
      {result.error && (
        <Alert
          type="error"
          message="执行错误"
          description={result.error}
          style={{ marginTop: 16 }}
        />
      )}

      <Divider />

      {/* 输入 */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>输入数据</Text>
        <Card size="small" style={{ marginTop: 8, backgroundColor: '#fafafa' }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
            {JSON.stringify(result.input, null, 2)}
          </pre>
        </Card>
      </div>

      {/* 输出 */}
      <div style={{ marginBottom: 16 }}>
        <Text strong>模型输出</Text>
        <Card size="small" style={{ marginTop: 8, backgroundColor: '#fafafa' }}>
          <Paragraph
            style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}
            copyable={!!result.output}
          >
            {result.output || '(无输出)'}
          </Paragraph>
        </Card>
      </div>

      {/* 期望输出 */}
      {result.expected && (
        <div style={{ marginBottom: 16 }}>
          <Text strong>期望输出</Text>
          <Card size="small" style={{ marginTop: 8, backgroundColor: '#f0f5ff' }}>
            <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {result.expected}
            </Paragraph>
          </Card>
        </div>
      )}
    </>
  )

  // 渲染字段评估
  const renderFieldEvaluations = () => {
    if (isLoading) {
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      )
    }

    if (!detail?.fieldEvaluations || detail.fieldEvaluations.length === 0) {
      return (
        <Alert
          type="info"
          message="无字段级评估数据"
          description="该结果没有字段级评估信息，可能是使用传统评估器或未配置输出结构 Schema"
        />
      )
    }

    const { aggregation } = detail

    return (
      <>
        {/* 聚合信息 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Descriptions size="small" column={3}>
            <Descriptions.Item label="聚合模式">
              <Tag color="purple">{aggregation.mode}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="通过阈值">
              {(aggregation.passThreshold * 100).toFixed(0)}%
            </Descriptions.Item>
            <Descriptions.Item label="关键字段">
              {aggregation.criticalPassed ? (
                <Tag color="success">全部通过</Tag>
              ) : (
                <Tag color="error">
                  失败: {aggregation.criticalFailed.join(', ')}
                </Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="总字段数">
              {aggregation.totalFields}
            </Descriptions.Item>
            <Descriptions.Item label="已评估">
              {aggregation.evaluatedFields}
            </Descriptions.Item>
            <Descriptions.Item label="通过/失败/跳过">
              <Space>
                <Text type="success">{aggregation.passedFields}</Text>
                <Text>/</Text>
                <Text type="danger">{aggregation.failedFields}</Text>
                <Text>/</Text>
                <Text type="secondary">{aggregation.skippedFields}</Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 字段评估表格 */}
        <Table
          dataSource={detail.fieldEvaluations}
          columns={fieldColumns}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ x: 800 }}
          rowClassName={(record) =>
            record.isCritical ? 'critical-field-row' : ''
          }
        />

        {/* 解析信息 */}
        {detail.parsedOutput && (
          <div style={{ marginTop: 16 }}>
            <Text strong>
              <InfoCircleOutlined /> 解析后的结构化输出
            </Text>
            <Card size="small" style={{ marginTop: 8, backgroundColor: '#f6ffed' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
                {JSON.stringify(detail.parsedOutput, null, 2)}
              </pre>
            </Card>
          </div>
        )}

        {detail.parseError && (
          <Alert
            type="warning"
            message="解析警告"
            description={detail.parseError}
            style={{ marginTop: 16 }}
          />
        )}
      </>
    )
  }

  // 渲染传统评估结果
  const renderEvaluations = () => {
    if (result.evaluations.length === 0) {
      return (
        <Alert
          type="info"
          message="暂无评估结果"
        />
      )
    }

    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {result.evaluations.map((evaluation, index) => (
          <Card size="small" key={index}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Text strong>{evaluation.evaluatorName}</Text>
                <Tag>{evaluation.evaluatorType}</Tag>
              </Space>
              <EvaluationTag passed={evaluation.passed} score={evaluation.score} />
            </div>
            {evaluation.reason && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">原因: {evaluation.reason}</Text>
              </div>
            )}
            {evaluation.details && Object.keys(evaluation.details).length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">详情:</Text>
                <pre style={{ margin: 0, fontSize: 11, color: '#666' }}>
                  {JSON.stringify(evaluation.details, null, 2)}
                </pre>
              </div>
            )}
            {evaluation.latencyMs && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  评估耗时: {evaluation.latencyMs}ms
                </Text>
              </div>
            )}
          </Card>
        ))}
      </Space>
    )
  }

  return (
    <Drawer
      title="结果详情"
      placement="right"
      width={800}
      open={visible}
      onClose={onClose}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: '概览',
            children: renderOverview(),
          },
          {
            key: 'fields',
            label: (
              <Space>
                字段评估
                {detail?.fieldEvaluations && detail.fieldEvaluations.length > 0 && (
                  <Tag color="blue">{detail.fieldEvaluations.length}</Tag>
                )}
              </Space>
            ),
            children: renderFieldEvaluations(),
          },
          {
            key: 'evaluations',
            label: (
              <Space>
                传统评估
                {result.evaluations.length > 0 && (
                  <Tag>{result.evaluations.length}</Tag>
                )}
              </Space>
            ),
            children: renderEvaluations(),
          },
        ]}
      />

      <style jsx global>{`
        .critical-field-row {
          background-color: #fffbe6 !important;
        }
        .critical-field-row:hover > td {
          background-color: #fff1b8 !important;
        }
      `}</style>
    </Drawer>
  )
}
