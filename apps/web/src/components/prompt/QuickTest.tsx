'use client'

import { useState, useMemo } from 'react'
import { Card, Form, Input, Button, Typography, Spin, Statistic, Row, Col, Table, Collapse, Tag } from 'antd'
import { PlayCircleOutlined, LoadingOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons'
import type { PromptVariable } from '@platform/shared'
import type { TestPromptResult } from '@/services/prompts'
import { SimpleModelSelector } from '@/components/common'
import type { UnifiedModel } from '@/services/models'

const { TextArea } = Input
const { Text } = Typography

type QuickTestProps = {
  variables: PromptVariable[]
  models: Array<{ id: string; name: string; provider: { name: string } }>
  modelsLoading?: boolean
  onTest: (modelId: string, variables: Record<string, string>) => Promise<TestPromptResult>
}

export function QuickTest({
  variables,
  models,
  modelsLoading = false,
  onTest,
}: QuickTestProps) {
  const [form] = Form.useForm()
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestPromptResult | null>(null)

  // 转换为 UnifiedModel 格式
  const unifiedModels: UnifiedModel[] = useMemo(() => {
    return models.map(m => ({
      id: m.id,
      name: m.name,
      provider: m.provider.name,
      type: 'llm',
      isActive: true,
      isCustom: true,
      source: 'local' as const,
    }))
  }, [models])

  const handleTest = async () => {
    try {
      const values = await form.validateFields()
      const { modelId, ...variableValues } = values

      setTesting(true)
      setResult(null)

      const testResult = await onTest(modelId, variableValues)
      setResult(testResult)
    } catch {
      // 表单验证失败
    } finally {
      setTesting(false)
    }
  }

  return (
    <Card
      title="快速测试"
      size="small"
      styles={{ body: { padding: 16 } }}
    >
      <Form form={form} layout="vertical" size="small">
        <Form.Item
          name="modelId"
          label="选择模型"
          rules={[{ required: true, message: '请选择模型' }]}
        >
          <SimpleModelSelector
            models={unifiedModels}
            placeholder="选择测试模型"
            loading={modelsLoading}
          />
        </Form.Item>

        {variables.length > 0 && (
          <>
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
              变量值
            </Text>
            {variables.map((v) => (
              <Form.Item
                key={v.name}
                name={v.name}
                label={v.name}
                rules={v.required ? [{ required: true, message: `请输入 ${v.name}` }] : []}
                initialValue={v.defaultValue as string}
              >
                <Input placeholder={`输入 ${v.name} 的值`} />
              </Form.Item>
            ))}
          </>
        )}

        <Button
          type="primary"
          icon={testing ? <LoadingOutlined /> : <PlayCircleOutlined />}
          onClick={handleTest}
          loading={testing}
          block
        >
          运行测试
        </Button>
      </Form>

      {testing && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Spin tip="正在调用模型..." />
        </div>
      )}

      {result && (
        <div style={{ marginTop: 16 }}>
          {result.success ? (
            <>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                  <Statistic
                    title="延迟"
                    value={result.latencyMs}
                    suffix="ms"
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="输入 Token"
                    value={result.tokens?.input || 0}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="输出 Token"
                    value={result.tokens?.output || 0}
                    valueStyle={{ fontSize: 16 }}
                  />
                </Col>
              </Row>

              {/* 结构化输出展示 */}
              {result.outputFields && result.outputFields.length > 0 ? (
                <>
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>解析结果</Text>
                    {result.parseSuccess ? (
                      <Tag icon={<CheckCircleOutlined />} color="success">解析成功</Tag>
                    ) : (
                      <Tag icon={<WarningOutlined />} color="warning">解析失败</Tag>
                    )}
                  </div>
                  {result.parseSuccess ? (
                    <Table
                      size="small"
                      pagination={false}
                      dataSource={result.outputFields.map((f, i) => ({ ...f, _index: i }))}
                      columns={[
                        {
                          title: '字段名',
                          dataIndex: 'name',
                          key: 'name',
                          width: 120,
                          render: (name: string, record: { key: string }) => (
                            <span>
                              <Text strong>{name}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 11 }}>{record.key}</Text>
                            </span>
                          ),
                        },
                        {
                          title: '值',
                          dataIndex: 'value',
                          key: 'value',
                          render: (value: unknown) => {
                            if (value === undefined || value === null) {
                              return <Text type="secondary">-</Text>
                            }
                            if (typeof value === 'object') {
                              return (
                                <Text code style={{ fontSize: 12, wordBreak: 'break-all' }}>
                                  {JSON.stringify(value, null, 2)}
                                </Text>
                              )
                            }
                            return <Text>{String(value)}</Text>
                          },
                        },
                      ]}
                      rowKey="_index"
                      style={{ marginBottom: 12 }}
                    />
                  ) : (
                    <div style={{ color: '#faad14', padding: '8px 12px', background: '#fffbe6', borderRadius: 6, marginBottom: 12 }}>
                      <Text type="warning">解析失败: {result.parseError || '未知错误'}</Text>
                    </div>
                  )}
                  <Collapse
                    size="small"
                    items={[
                      {
                        key: 'raw',
                        label: '原始输出',
                        children: (
                          <TextArea
                            value={result.output}
                            readOnly
                            autoSize={{ minRows: 2, maxRows: 8 }}
                          />
                        ),
                      },
                    ]}
                  />
                </>
              ) : (
                <>
                  <Text type="secondary" style={{ fontSize: 12 }}>输出结果</Text>
                  <TextArea
                    value={result.output}
                    readOnly
                    autoSize={{ minRows: 3, maxRows: 10 }}
                    style={{ marginTop: 8 }}
                  />
                </>
              )}
            </>
          ) : (
            <div style={{ color: '#ff4d4f', padding: '12px', background: '#fff2f0', borderRadius: 6 }}>
              <Text type="danger">测试失败: {result.error}</Text>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
