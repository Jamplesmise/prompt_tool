'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Typography,
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  Switch,
  Tag,
  Tooltip,
  Alert,
} from 'antd'
import {
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  QuestionCircleOutlined,
  DragOutlined,
} from '@ant-design/icons'
import { useCreateInputSchema } from '@/hooks/useSchemas'
import type { InputVariableDefinition, InputVariableType } from '@platform/shared'

const { Title, Text } = Typography
const { TextArea } = Input

// 变量类型选项
const VARIABLE_TYPES: { value: InputVariableType; label: string; description: string }[] = [
  { value: 'string', label: '字符串', description: '文本内容' },
  { value: 'number', label: '数字', description: '数值' },
  { value: 'boolean', label: '布尔', description: 'true/false' },
  { value: 'array', label: '数组', description: '列表' },
  { value: 'object', label: '对象', description: 'JSON 对象' },
]

// 空变量模板
const createEmptyVariable = (): InputVariableDefinition => ({
  name: '',
  key: '',
  description: '',
  type: 'string',
  required: true,
})

type FormValues = {
  name: string
  description?: string
}

export default function NewInputSchemaPage() {
  const router = useRouter()
  const [form] = Form.useForm<FormValues>()
  const createMutation = useCreateInputSchema()

  // 变量列表状态
  const [variables, setVariables] = useState<InputVariableDefinition[]>([createEmptyVariable()])

  // 更新变量
  const updateVariable = useCallback((index: number, updates: Partial<InputVariableDefinition>) => {
    setVariables((prev) => {
      const newVars = [...prev]
      newVars[index] = { ...newVars[index], ...updates }
      return newVars
    })
  }, [])

  // 添加变量
  const addVariable = useCallback(() => {
    setVariables((prev) => [...prev, createEmptyVariable()])
  }, [])

  // 删除变量
  const removeVariable = useCallback((index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // 验证变量
      const validVars = variables.filter((v) => v.name && v.key)
      if (validVars.length === 0) {
        return
      }

      // 检查 key 唯一性
      const keys = validVars.map((v) => v.key)
      const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i)
      if (duplicates.length > 0) {
        return
      }

      await createMutation.mutateAsync({
        name: values.name,
        description: values.description,
        variables: validVars,
      })

      router.push('/schemas')
    } catch (error) {
      // 表单验证失败
    }
  }

  // 渲染变量表单
  const renderVariableForm = (variable: InputVariableDefinition, index: number) => {
    return (
      <Card
        key={index}
        size="small"
        style={{ marginBottom: 12 }}
        extra={
          variables.length > 1 && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeVariable(index)}
            />
          )
        }
        title={
          <Space>
            <DragOutlined style={{ cursor: 'move', color: '#999' }} />
            <Text strong>变量 {index + 1}</Text>
            {variable.required && <Tag color="orange">必填</Tag>}
            <Tag color="blue">{VARIABLE_TYPES.find((t) => t.value === variable.type)?.label}</Tag>
          </Space>
        }
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="变量名称" required>
              <Input
                placeholder="如：用户问题"
                value={variable.name}
                onChange={(e) => updateVariable(index, { name: e.target.value })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={
                <Space>
                  变量 Key
                  <Tooltip title="模板中使用的变量名，如 {{user_question}}">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </Space>
              }
              required
            >
              <Input
                placeholder="如：user_question"
                value={variable.key}
                onChange={(e) => updateVariable(index, { key: e.target.value })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="类型">
              <Select
                value={variable.type}
                onChange={(v) => updateVariable(index, { type: v })}
                options={VARIABLE_TYPES}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              label={
                <Space>
                  数据集字段
                  <Tooltip title="映射到数据集的哪一列">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <Input
                placeholder="留空则使用变量 Key"
                value={variable.datasetField}
                onChange={(e) => updateVariable(index, { datasetField: e.target.value })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="默认值">
              <Input
                placeholder="可选"
                value={variable.defaultValue as string | undefined}
                onChange={(e) => updateVariable(index, { defaultValue: e.target.value })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="必填">
              <Switch
                checked={variable.required}
                onChange={(v) => updateVariable(index, { required: v })}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item label="描述">
              <Input
                placeholder="变量说明（可选）"
                value={variable.description}
                onChange={(e) => updateVariable(index, { description: e.target.value })}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* array 类型的元素类型 */}
        {variable.type === 'array' && (
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="元素类型">
                <Select
                  value={variable.itemType}
                  onChange={(v) => updateVariable(index, { itemType: v })}
                  options={[
                    { value: 'string', label: '字符串' },
                    { value: 'number', label: '数字' },
                    { value: 'boolean', label: '布尔' },
                    { value: 'object', label: '对象' },
                  ]}
                  placeholder="选择元素类型"
                />
              </Form.Item>
            </Col>
          </Row>
        )}
      </Card>
    )
  }

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
            新建输入结构
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

      <Row gutter={24}>
        {/* 左侧：基础信息和变量定义 */}
        <Col xs={24} lg={16}>
          <Card title="基础信息" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="name"
                    label="名称"
                    rules={[{ required: true, message: '请输入名称' }]}
                  >
                    <Input placeholder="如：智能客服输入结构" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="描述">
                <TextArea placeholder="结构说明（可选）" rows={2} />
              </Form.Item>
            </Form>
          </Card>

          <Card
            title="变量定义"
            extra={
              <Button type="dashed" icon={<PlusOutlined />} onClick={addVariable}>
                添加变量
              </Button>
            }
          >
            {variables.map((variable, index) => renderVariableForm(variable, index))}
          </Card>
        </Col>

        {/* 右侧：模板预览 */}
        <Col xs={24} lg={8}>
          <Card title="模板变量预览">
            <pre
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 4,
                fontSize: 12,
                maxHeight: 300,
                overflow: 'auto',
              }}
            >
              {variables
                .filter((v) => v.key)
                .map((v) => `{{${v.key}}} - ${v.name || '未命名'}`)
                .join('\n') || '暂无变量'}
            </pre>
          </Card>

          <Card title="JSON 预览" style={{ marginTop: 16 }}>
            <pre
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 4,
                fontSize: 12,
                maxHeight: 300,
                overflow: 'auto',
              }}
            >
              {JSON.stringify(
                {
                  variables: variables.filter((v) => v.key).map((v) => ({
                    key: v.key,
                    type: v.type,
                    required: v.required,
                    ...(v.datasetField ? { datasetField: v.datasetField } : {}),
                  })),
                },
                null,
                2
              )}
            </pre>
          </Card>

          <Alert
            type="info"
            showIcon
            style={{ marginTop: 16 }}
            message="提示"
            description="数据集字段留空时，将使用变量 Key 作为数据集列名"
          />
        </Col>
      </Row>
    </div>
  )
}
