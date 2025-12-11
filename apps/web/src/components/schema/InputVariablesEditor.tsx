'use client'

import { useCallback } from 'react'
import {
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
  Empty,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  DragOutlined,
} from '@ant-design/icons'
import type { InputVariableDefinition, InputVariableType } from '@platform/shared'

const { Text } = Typography
import { Typography } from 'antd'

// 变量类型选项
const VARIABLE_TYPES: { value: InputVariableType; label: string }[] = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔' },
  { value: 'array', label: '数组' },
  { value: 'object', label: '对象' },
]

// 空变量模板
const createEmptyVariable = (): InputVariableDefinition => ({
  name: '',
  key: '',
  description: '',
  type: 'string',
  required: true,
})

type Props = {
  variables: InputVariableDefinition[]
  onChange: (variables: InputVariableDefinition[]) => void
}

export function InputVariablesEditor({ variables, onChange }: Props) {
  // 更新变量
  const updateVariable = useCallback(
    (index: number, updates: Partial<InputVariableDefinition>) => {
      const newVars = [...variables]
      newVars[index] = { ...newVars[index], ...updates }
      onChange(newVars)
    },
    [variables, onChange]
  )

  // 添加变量
  const addVariable = useCallback(() => {
    onChange([...variables, createEmptyVariable()])
  }, [variables, onChange])

  // 删除变量
  const removeVariable = useCallback(
    (index: number) => {
      onChange(variables.filter((_, i) => i !== index))
    },
    [variables, onChange]
  )

  // 渲染单个变量
  const renderVariable = (variable: InputVariableDefinition, index: number) => (
    <Card
      key={index}
      size="small"
      style={{ marginBottom: 12 }}
      extra={
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeVariable(index)}
        />
      }
      title={
        <Space>
          <DragOutlined style={{ cursor: 'move', color: '#999' }} />
          <Text strong>变量 {index + 1}</Text>
          {variable.required && <Tag color="orange">必填</Tag>}
          <Tag color="blue">
            {VARIABLE_TYPES.find((t) => t.value === variable.type)?.label}
          </Tag>
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
          <Form.Item label="描述">
            <Input
              placeholder="变量说明（可选）"
              value={variable.description}
              onChange={(e) => updateVariable(index, { description: e.target.value })}
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

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="dashed" icon={<PlusOutlined />} onClick={addVariable}>
          添加变量
        </Button>
      </div>

      {variables.length > 0 ? (
        variables.map((v, i) => renderVariable(v, i))
      ) : (
        <Empty
          description="暂无输入变量"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={addVariable}>
            添加第一个变量
          </Button>
        </Empty>
      )}
    </div>
  )
}
