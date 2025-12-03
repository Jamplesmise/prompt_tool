'use client'

import { useState } from 'react'
import { Card, Form, Select, Input, Button, Space, Typography, Spin, Statistic, Row, Col } from 'antd'
import { PlayCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import type { PromptVariable } from '@platform/shared'
import type { TestPromptResult } from '@/services/prompts'

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
          <Select
            placeholder="选择测试模型"
            loading={modelsLoading}
            options={models.map((m) => ({
              value: m.id,
              label: `${m.name} (${m.provider.name})`,
            }))}
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
              <Text type="secondary" style={{ fontSize: 12 }}>输出结果</Text>
              <TextArea
                value={result.output}
                readOnly
                autoSize={{ minRows: 3, maxRows: 10 }}
                style={{ marginTop: 8 }}
              />
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
