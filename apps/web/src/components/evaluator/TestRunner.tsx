'use client'

import { useState } from 'react'
import { Card, Form, Input, Button, Space, Alert, Spin, Typography, Descriptions, Tag, Table, Collapse } from 'antd'
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { useTestEvaluator } from '@/hooks/useEvaluators'
import type { TestEvaluatorResult } from '@/services/evaluators'

const { TextArea } = Input
const { Text } = Typography
const { Panel } = Collapse

type IndividualResult = {
  passed: boolean
  score?: number
  reason?: string
}

type TestRunnerProps = {
  evaluatorId: string
}

// 渲染详情（支持组合评估器的子评估器结果）
function renderDetails(details: Record<string, unknown>) {
  const { aggregation, individualResults, tokenUsage, cost, ...otherDetails } = details as {
    aggregation?: string
    individualResults?: IndividualResult[]
    tokenUsage?: { input: number; output: number; total: number }
    cost?: number | null
    [key: string]: unknown
  }

  const items: React.ReactNode[] = []

  // 如果是组合评估器，显示子评估器结果表格
  if (aggregation && individualResults && Array.isArray(individualResults)) {
    items.push(
      <Descriptions.Item key="aggregation" label="聚合方式">
        <Tag color="blue">{aggregation.toUpperCase()}</Tag>
      </Descriptions.Item>
    )

    items.push(
      <Descriptions.Item key="childResults" label="子评估器结果">
        <Table
          dataSource={individualResults.map((r, i) => ({ ...r, key: i, index: i + 1 }))}
          size="small"
          pagination={false}
          columns={[
            {
              title: '#',
              dataIndex: 'index',
              width: 40,
            },
            {
              title: '状态',
              dataIndex: 'passed',
              width: 60,
              render: (passed: boolean) => (
                <Tag color={passed ? 'green' : 'red'} icon={passed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
                  {passed ? '通过' : '失败'}
                </Tag>
              ),
            },
            {
              title: '分数',
              dataIndex: 'score',
              width: 70,
              render: (score?: number) => score !== undefined ? `${(score * 100).toFixed(0)}%` : '-',
            },
            {
              title: '原因',
              dataIndex: 'reason',
              ellipsis: true,
            },
          ]}
        />
      </Descriptions.Item>
    )
  }

  // 如果有 token 使用信息（LLM 评估器）
  if (tokenUsage) {
    items.push(
      <Descriptions.Item key="tokenUsage" label="Token 使用">
        <Space>
          <Tag>输入: {tokenUsage.input}</Tag>
          <Tag>输出: {tokenUsage.output}</Tag>
          <Tag>总计: {tokenUsage.total}</Tag>
        </Space>
      </Descriptions.Item>
    )
  }

  // 如果有成本信息
  if (cost !== undefined && cost !== null) {
    items.push(
      <Descriptions.Item key="cost" label="成本">
        <Tag color="gold">${cost.toFixed(6)}</Tag>
      </Descriptions.Item>
    )
  }

  // 其他详情
  const filteredOther = Object.entries(otherDetails).filter(
    ([key]) => !['totalCount', 'passedCount', 'failedCount', 'weights', 'latencyMs'].includes(key)
  )

  if (filteredOther.length > 0) {
    items.push(
      <Descriptions.Item key="other" label="其他详情">
        <Collapse size="small" ghost>
          <Panel header="查看详情" key="1">
            <pre style={{ margin: 0, fontSize: 11, maxHeight: 200, overflow: 'auto' }}>
              {JSON.stringify(otherDetails, null, 2)}
            </pre>
          </Panel>
        </Collapse>
      </Descriptions.Item>
    )
  }

  return items.length > 0 ? items : (
    <Descriptions.Item label="详情">
      <pre style={{ margin: 0, fontSize: 12 }}>
        {JSON.stringify(details, null, 2)}
      </pre>
    </Descriptions.Item>
  )
}

export function TestRunner({ evaluatorId }: TestRunnerProps) {
  const [form] = Form.useForm()
  const [result, setResult] = useState<TestEvaluatorResult | null>(null)
  const testMutation = useTestEvaluator()

  const handleTest = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        input: values.input,
        output: values.output,
        expected: values.expected || undefined,
        metadata: values.metadata ? JSON.parse(values.metadata) : undefined,
      }
      const res = await testMutation.mutateAsync({ id: evaluatorId, data })
      setResult(res)
    } catch (err) {
      // 表单验证失败或 JSON 解析失败
      if (err instanceof SyntaxError) {
        setResult({
          passed: false,
          score: 0,
          reason: 'metadata 不是有效的 JSON',
          latencyMs: 0,
          error: err.message,
        })
      }
    }
  }

  return (
    <Card title="测试运行" size="small">
      <Form form={form} layout="vertical" size="small">
        <Space style={{ width: '100%' }} direction="vertical" size="small">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              name="input"
              label="输入 (input)"
              rules={[{ required: true, message: '请输入测试输入' }]}
              style={{ marginBottom: 8 }}
            >
              <TextArea rows={3} placeholder="原始输入内容" />
            </Form.Item>
            <Form.Item
              name="output"
              label="输出 (output)"
              rules={[{ required: true, message: '请输入模型输出' }]}
              style={{ marginBottom: 8 }}
            >
              <TextArea rows={3} placeholder="模型输出内容" />
            </Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Form.Item
              name="expected"
              label="期望值 (expected)"
              style={{ marginBottom: 8 }}
            >
              <TextArea rows={2} placeholder="期望输出（可选）" />
            </Form.Item>
            <Form.Item
              name="metadata"
              label="元数据 (metadata)"
              style={{ marginBottom: 8 }}
            >
              <TextArea rows={2} placeholder='JSON 格式，如 {"minLength": 100}' />
            </Form.Item>
          </div>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleTest}
            loading={testMutation.isPending}
          >
            运行测试
          </Button>
        </Space>
      </Form>

      {testMutation.isPending && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spin tip="执行中..." />
        </div>
      )}

      {result && !testMutation.isPending && (
        <div style={{ marginTop: 16 }}>
          <Alert
            type={result.passed ? 'success' : 'error'}
            icon={result.passed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            message={
              <Space>
                <Text strong>{result.passed ? '通过' : '未通过'}</Text>
                {result.score !== null && (
                  <Tag color={result.passed ? 'green' : 'red'}>
                    分数: {(result.score * 100).toFixed(1)}%
                  </Tag>
                )}
                <Tag>{result.latencyMs}ms</Tag>
              </Space>
            }
            description={
              <Descriptions column={1} size="small" style={{ marginTop: 8 }}>
                {result.reason && (
                  <Descriptions.Item label="原因">{result.reason}</Descriptions.Item>
                )}
                {result.error && (
                  <Descriptions.Item label="错误">
                    <Text type="danger">{result.error}</Text>
                  </Descriptions.Item>
                )}
                {result.details && renderDetails(result.details)}
              </Descriptions>
            }
            showIcon
          />
        </div>
      )}
    </Card>
  )
}
