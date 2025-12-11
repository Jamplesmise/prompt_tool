'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Typography,
  Card,
  Form,
  Input,
  Button,
  Space,
  Row,
  Col,
  Tabs,
  Tag,
  Alert,
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import { useCreateEvaluationSchema } from '@/hooks/useSchemas'
import { InputVariablesEditor } from '@/components/schema/InputVariablesEditor'
import { OutputFieldsEditor } from '@/components/schema/OutputFieldsEditor'
import type {
  InputVariableDefinition,
  OutputFieldDefinition,
  ParseMode,
  AggregationConfig,
} from '@platform/shared'

const { Title } = Typography
const { TextArea } = Input

type FormValues = {
  name: string
  description?: string
}

export default function NewEvaluationSchemaPage() {
  const router = useRouter()
  const [form] = Form.useForm<FormValues>()
  const createMutation = useCreateEvaluationSchema()

  // 输入结构状态
  const [inputVariables, setInputVariables] = useState<InputVariableDefinition[]>([])

  // 输出结构状态
  const [outputFields, setOutputFields] = useState<OutputFieldDefinition[]>([])
  const [parseMode, setParseMode] = useState<ParseMode>('JSON_EXTRACT')
  const [aggregation, setAggregation] = useState<AggregationConfig>({ mode: 'critical_first' })

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      await createMutation.mutateAsync({
        name: values.name,
        description: values.description,
        inputSchema:
          inputVariables.length > 0
            ? { variables: inputVariables }
            : undefined,
        outputSchema:
          outputFields.length > 0
            ? { fields: outputFields, parseMode, aggregation }
            : undefined,
      })

      router.push('/schemas')
    } catch {
      // 表单验证失败
    }
  }

  const tabItems = [
    {
      key: 'input',
      label: (
        <Space>
          <ExportOutlined rotate={180} />
          输入结构
          {inputVariables.length > 0 && (
            <Tag color="blue">{inputVariables.length} 变量</Tag>
          )}
        </Space>
      ),
      children: (
        <InputVariablesEditor
          variables={inputVariables}
          onChange={setInputVariables}
        />
      ),
    },
    {
      key: 'output',
      label: (
        <Space>
          <ExportOutlined />
          输出结构
          {outputFields.length > 0 && (
            <Tag color="green">{outputFields.length} 字段</Tag>
          )}
        </Space>
      ),
      children: (
        <OutputFieldsEditor
          fields={outputFields}
          onChange={setOutputFields}
          parseMode={parseMode}
          onParseModeChange={setParseMode}
          aggregation={aggregation}
          onAggregationChange={setAggregation}
        />
      ),
    },
  ]

  return (
    <div>
      {/* 页面标题 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} />
          <Title level={4} style={{ margin: 0 }}>
            新建结构定义
          </Title>
        </Space>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSubmit}
          loading={createMutation.isPending}
        >
          保存
        </Button>
      </div>

      {/* 基础信息 */}
      <Card title="基础信息" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="结构名称"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input placeholder="如：智能客服评估结构" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="description" label="描述">
                <TextArea placeholder="结构说明（可选）" rows={1} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 输入输出结构编辑 */}
      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* 提示信息 */}
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 16 }}
        message="提示"
        description="一个完整的评估结构包含输入结构（定义输入变量）和输出结构（定义期望的输出字段及其评估方式）。可以先创建再完善。"
      />
    </div>
  )
}
