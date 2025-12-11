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
  InputNumber,
  Switch,
  Collapse,
  Tag,
  Tooltip,
  Empty,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  DragOutlined,
} from '@ant-design/icons'
import { useEvaluators } from '@/hooks/useEvaluators'
import type {
  OutputFieldDefinition,
  OutputFieldType,
  ParseMode,
  AggregationMode,
  AggregationConfig,
} from '@platform/shared'

const { Text } = Typography
const { TextArea } = Input

// 字段类型选项
const FIELD_TYPES: { value: OutputFieldType; label: string }[] = [
  { value: 'string', label: '字符串' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔' },
  { value: 'enum', label: '枚举' },
  { value: 'array', label: '数组' },
  { value: 'object', label: '对象' },
]

// 解析模式选项
const PARSE_MODES: { value: ParseMode; label: string }[] = [
  { value: 'JSON', label: 'JSON 解析' },
  { value: 'JSON_EXTRACT', label: 'JSON 提取' },
  { value: 'REGEX', label: '正则提取' },
  { value: 'TEMPLATE', label: '模板解析' },
]

// 聚合模式选项
const AGGREGATION_MODES: { value: AggregationMode; label: string }[] = [
  { value: 'all_pass', label: '全部通过' },
  { value: 'weighted_average', label: '加权平均' },
  { value: 'critical_first', label: '关键优先' },
  { value: 'custom', label: '自定义' },
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

type Props = {
  fields: OutputFieldDefinition[]
  onChange: (fields: OutputFieldDefinition[]) => void
  parseMode: ParseMode
  onParseModeChange: (mode: ParseMode) => void
  aggregation: AggregationConfig
  onAggregationChange: (config: AggregationConfig) => void
}

export function OutputFieldsEditor({
  fields,
  onChange,
  parseMode,
  onParseModeChange,
  aggregation,
  onAggregationChange,
}: Props) {
  const { data: evaluators } = useEvaluators()

  // 更新字段
  const updateField = useCallback(
    (index: number, updates: Partial<OutputFieldDefinition>) => {
      const newFields = [...fields]
      newFields[index] = { ...newFields[index], ...updates }
      onChange(newFields)
    },
    [fields, onChange]
  )

  // 添加字段
  const addField = useCallback(() => {
    onChange([...fields, createEmptyField()])
  }, [fields, onChange])

  // 删除字段
  const removeField = useCallback(
    (index: number) => {
      onChange(fields.filter((_, i) => i !== index))
    },
    [fields, onChange]
  )

  // 渲染单个字段
  const renderField = (field: OutputFieldDefinition, index: number) => {
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
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => removeField(index)}
          />
        }
        title={
          <Space>
            <DragOutlined style={{ cursor: 'move', color: '#999' }} />
            <Text strong>字段 {index + 1}</Text>
            {field.required && <Tag color="orange">必填</Tag>}
            <Tag color="blue">
              {FIELD_TYPES.find((t) => t.value === field.type)?.label}
            </Tag>
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
                  <Tooltip title="JSON 中的键名">
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
              placeholder="每行一个选项"
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
      {/* 解析和聚合配置 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="解析模式">
              <Select
                value={parseMode}
                onChange={onParseModeChange}
                options={PARSE_MODES}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="聚合模式">
              <Select
                value={aggregation.mode}
                onChange={(mode) => onAggregationChange({ ...aggregation, mode })}
                options={AGGREGATION_MODES}
              />
            </Form.Item>
          </Col>
          {(aggregation.mode === 'weighted_average' || aggregation.mode === 'critical_first') && (
            <Col span={8}>
              <Form.Item label="通过阈值">
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  value={aggregation.passThreshold}
                  onChange={(v) =>
                    onAggregationChange({ ...aggregation, passThreshold: v ?? undefined })
                  }
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          )}
        </Row>
      </Card>

      {/* 字段列表 */}
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="dashed" icon={<PlusOutlined />} onClick={addField}>
          添加字段
        </Button>
      </div>

      {fields.length > 0 ? (
        fields.map((f, i) => renderField(f, i))
      ) : (
        <Empty
          description="暂无输出字段"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={addField}>
            添加第一个字段
          </Button>
        </Empty>
      )}
    </div>
  )
}
