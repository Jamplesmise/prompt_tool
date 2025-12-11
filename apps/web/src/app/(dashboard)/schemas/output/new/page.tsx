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
  Divider,
  Row,
  Col,
  InputNumber,
  Switch,
  Collapse,
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
import { useCreateOutputSchema } from '@/hooks/useSchemas'
import { useEvaluators } from '@/hooks/useEvaluators'
import type {
  OutputFieldDefinition,
  OutputFieldType,
  ParseMode,
  AggregationMode,
  AggregationConfig,
} from '@platform/shared'

const { Title, Text } = Typography
const { TextArea } = Input

// 字段类型选项
const FIELD_TYPES: { value: OutputFieldType; label: string; description: string }[] = [
  { value: 'string', label: '字符串', description: '文本内容' },
  { value: 'number', label: '数字', description: '数值' },
  { value: 'boolean', label: '布尔', description: 'true/false' },
  { value: 'enum', label: '枚举', description: '固定选项' },
  { value: 'array', label: '数组', description: '列表' },
  { value: 'object', label: '对象', description: 'JSON 对象' },
]

// 解析模式选项
const PARSE_MODES: { value: ParseMode; label: string; description: string }[] = [
  { value: 'JSON', label: 'JSON 解析', description: '直接解析 JSON 格式输出' },
  { value: 'JSON_EXTRACT', label: 'JSON 提取', description: '从文本中提取 JSON 块' },
  { value: 'REGEX', label: '正则提取', description: '使用正则表达式提取字段' },
  { value: 'TEMPLATE', label: '模板解析', description: '使用模板匹配解析' },
]

// 聚合模式选项
const AGGREGATION_MODES: { value: AggregationMode; label: string; description: string }[] = [
  { value: 'all_pass', label: '全部通过', description: '所有字段评估通过才算通过' },
  { value: 'weighted_average', label: '加权平均', description: '按权重计算综合分数' },
  { value: 'critical_first', label: '关键优先', description: '关键字段失败直接不通过' },
  { value: 'custom', label: '自定义', description: '使用自定义表达式' },
]

// 空字段模板
const createEmptyField = (): OutputFieldDefinition => ({
  name: '',
  key: '',
  description: '',
  type: 'string',
  required: true,
  evaluation: {
    weight: 1,
    isCritical: false,
  },
})

type FormValues = {
  name: string
  description?: string
  parseMode: ParseMode
  aggregation: AggregationConfig
}

export default function NewOutputSchemaPage() {
  const router = useRouter()
  const [form] = Form.useForm<FormValues>()
  const createMutation = useCreateOutputSchema()
  const { data: evaluators } = useEvaluators()

  // 字段列表状态
  const [fields, setFields] = useState<OutputFieldDefinition[]>([createEmptyField()])

  // 更新字段
  const updateField = useCallback((index: number, updates: Partial<OutputFieldDefinition>) => {
    setFields((prev) => {
      const newFields = [...prev]
      newFields[index] = { ...newFields[index], ...updates }
      return newFields
    })
  }, [])

  // 添加字段
  const addField = useCallback(() => {
    setFields((prev) => [...prev, createEmptyField()])
  }, [])

  // 删除字段
  const removeField = useCallback((index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      // 验证字段
      const validFields = fields.filter((f) => f.name && f.key)
      if (validFields.length === 0) {
        return
      }

      // 检查 key 唯一性
      const keys = validFields.map((f) => f.key)
      const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i)
      if (duplicates.length > 0) {
        return
      }

      await createMutation.mutateAsync({
        name: values.name,
        description: values.description,
        fields: validFields,
        parseMode: values.parseMode,
        aggregation: values.aggregation,
      })

      router.push('/schemas')
    } catch (error) {
      // 表单验证失败
    }
  }

  // 渲染字段表单
  const renderFieldForm = (field: OutputFieldDefinition, index: number) => {
    const collapseItems = [
      {
        key: 'evaluation',
        label: (
          <Space>
            <span>评估配置</span>
            {field.evaluation.isCritical && <Tag color="red">关键</Tag>}
            <Tag>权重: {field.evaluation.weight}</Tag>
          </Space>
        ),
        children: (
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="评估器">
                <Select
                  placeholder="选择评估器（可选）"
                  allowClear
                  value={field.evaluation.evaluatorId}
                  onChange={(v) =>
                    updateField(index, {
                      evaluation: { ...field.evaluation, evaluatorId: v },
                    })
                  }
                  options={evaluators?.map((e) => ({ value: e.id, label: e.name })) || []}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={
                  <Space>
                    期望值字段
                    <Tooltip title="数据集中对应的期望值列名">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
              >
                <Input
                  placeholder={`expected_${field.key}`}
                  value={field.evaluation.expectedField}
                  onChange={(e) =>
                    updateField(index, {
                      evaluation: { ...field.evaluation, expectedField: e.target.value },
                    })
                  }
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="权重">
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  value={field.evaluation.weight}
                  onChange={(v) =>
                    updateField(index, {
                      evaluation: { ...field.evaluation, weight: v ?? 1 },
                    })
                  }
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="关键字段">
                <Switch
                  checked={field.evaluation.isCritical}
                  onChange={(v) =>
                    updateField(index, {
                      evaluation: { ...field.evaluation, isCritical: v },
                    })
                  }
                />
              </Form.Item>
            </Col>
          </Row>
        ),
      },
    ]

    return (
      <Card
        key={index}
        size="small"
        style={{ marginBottom: 12 }}
        extra={
          fields.length > 1 && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => removeField(index)}
            />
          )
        }
        title={
          <Space>
            <DragOutlined style={{ cursor: 'move', color: '#999' }} />
            <Text strong>字段 {index + 1}</Text>
            {field.required && <Tag color="orange">必填</Tag>}
            <Tag color="blue">{FIELD_TYPES.find((t) => t.value === field.type)?.label}</Tag>
          </Space>
        }
      >
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="字段名称" required>
              <Input
                placeholder="如：问题分类"
                value={field.name}
                onChange={(e) => updateField(index, { name: e.target.value })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label={
                <Space>
                  字段 Key
                  <Tooltip title="JSON 中的键名，需符合变量命名规则">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </Space>
              }
              required
            >
              <Input
                placeholder="如：problem_type"
                value={field.key}
                onChange={(e) => updateField(index, { key: e.target.value })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="类型">
              <Select
                value={field.type}
                onChange={(v) => updateField(index, { type: v })}
                options={FIELD_TYPES}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={16}>
            <Form.Item label="描述">
              <Input
                placeholder="字段说明（可选）"
                value={field.description}
                onChange={(e) => updateField(index, { description: e.target.value })}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="必填">
              <Switch
                checked={field.required}
                onChange={(v) => updateField(index, { required: v })}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 枚举值输入 */}
        {field.type === 'enum' && (
          <Form.Item
            label={
              <Space>
                枚举值
                <Tooltip title="可选值列表，每行一个">
                  <QuestionCircleOutlined />
                </Tooltip>
              </Space>
            }
          >
            <TextArea
              placeholder="每行一个选项，如：&#10;bluetooth&#10;wifi&#10;battery"
              rows={3}
              value={field.enumValues?.join('\n')}
              onChange={(e) =>
                updateField(index, {
                  enumValues: e.target.value.split('\n').filter((v) => v.trim()),
                })
              }
            />
          </Form.Item>
        )}

        <Collapse items={collapseItems} size="small" ghost />
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
            新建输出结构
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
        {/* 左侧：基础信息和字段定义 */}
        <Col xs={24} lg={16}>
          <Card title="基础信息" style={{ marginBottom: 16 }}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                parseMode: 'JSON_EXTRACT',
                aggregation: { mode: 'all_pass', passThreshold: 0.6 },
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="name"
                    label="名称"
                    rules={[{ required: true, message: '请输入名称' }]}
                  >
                    <Input placeholder="如：意图识别输出结构" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="parseMode" label="解析模式">
                    <Select options={PARSE_MODES} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="描述">
                <TextArea placeholder="结构说明（可选）" rows={2} />
              </Form.Item>
            </Form>
          </Card>

          <Card
            title="字段定义"
            extra={
              <Button type="dashed" icon={<PlusOutlined />} onClick={addField}>
                添加字段
              </Button>
            }
          >
            {fields.map((field, index) => renderFieldForm(field, index))}
          </Card>
        </Col>

        {/* 右侧：聚合配置和预览 */}
        <Col xs={24} lg={8}>
          <Card title="聚合配置" style={{ marginBottom: 16 }}>
            <Form form={form} layout="vertical">
              <Form.Item name={['aggregation', 'mode']} label="聚合模式">
                <Select options={AGGREGATION_MODES} />
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) =>
                  prev.aggregation?.mode !== curr.aggregation?.mode
                }
              >
                {({ getFieldValue }) => {
                  const mode = getFieldValue(['aggregation', 'mode'])
                  if (mode === 'weighted_average' || mode === 'critical_first') {
                    return (
                      <Form.Item name={['aggregation', 'passThreshold']} label="通过阈值">
                        <InputNumber
                          min={0}
                          max={1}
                          step={0.1}
                          style={{ width: '100%' }}
                          addonAfter="（0-1）"
                        />
                      </Form.Item>
                    )
                  }
                  if (mode === 'custom') {
                    return (
                      <>
                        <Form.Item name={['aggregation', 'passThreshold']} label="通过阈值">
                          <InputNumber
                            min={0}
                            max={1}
                            step={0.1}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                        <Form.Item name={['aggregation', 'customExpression']} label="表达式">
                          <TextArea
                            placeholder="如：fields.type.passed && fields.score.score > 0.8"
                            rows={3}
                          />
                        </Form.Item>
                      </>
                    )
                  }
                  return null
                }}
              </Form.Item>
            </Form>
          </Card>

          <Card title="JSON 预览">
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
                  fields: fields.filter((f) => f.key).map((f) => ({
                    key: f.key,
                    type: f.type,
                    required: f.required,
                    ...(f.enumValues?.length ? { enumValues: f.enumValues } : {}),
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
            description="期望值字段名留空时，将自动尝试匹配数据集中的 expected_{key} 或 {key}_expected 列"
          />
        </Col>
      </Row>
    </div>
  )
}
