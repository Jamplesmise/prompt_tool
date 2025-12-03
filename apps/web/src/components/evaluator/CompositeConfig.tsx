'use client'

import { Form, Select, InputNumber, Radio, Alert, Typography, Space, Table, Tag } from 'antd'

const { Text } = Typography

type Evaluator = {
  id: string
  name: string
  type: string
  description?: string
}

type CompositeConfigProps = {
  evaluators: Evaluator[]
  currentId?: string // 当前编辑的评估器 ID（用于排除自己）
  loading?: boolean
}

export function CompositeConfig({ evaluators, currentId, loading = false }: CompositeConfigProps) {
  const form = Form.useFormInstance()
  const aggregation = Form.useWatch('aggregation', form)
  const selectedIds = Form.useWatch('evaluatorIds', form) || []

  // 过滤掉自己，允许其他组合评估器（后端会检测循环依赖）
  const availableEvaluators = evaluators.filter(
    (e) => e.id !== currentId
  )

  // 显示权重配置
  const showWeights = aggregation === 'weighted_average' && selectedIds.length > 0

  // 获取已选择的评估器
  const selectedEvaluators = selectedIds
    .map((id: string) => evaluators.find((e) => e.id === id))
    .filter(Boolean)

  return (
    <>
      <Alert
        type="info"
        message="组合评估器"
        description="将多个评估器组合成一个，支持串行/并行执行和多种聚合方式"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form.Item
        name="evaluatorIds"
        label="子评估器"
        rules={[
          { required: true, message: '请选择至少一个子评估器' },
          {
            validator: (_, value) => {
              if (!value || value.length === 0) {
                return Promise.reject(new Error('请选择至少一个子评估器'))
              }
              return Promise.resolve()
            },
          },
        ]}
        extra="选择要组合的评估器（不能包含其他组合评估器）"
      >
        <Select
          mode="multiple"
          placeholder="选择子评估器"
          loading={loading}
          optionFilterProp="label"
          options={availableEvaluators.map((e) => ({
            value: e.id,
            label: (
              <Space>
                <Tag color={e.type === 'preset' ? 'blue' : 'green'}>
                  {e.type === 'preset' ? '预置' : e.type === 'code' ? '代码' : 'LLM'}
                </Tag>
                <span>{e.name}</span>
              </Space>
            ),
          }))}
        />
      </Form.Item>

      <Form.Item
        name="mode"
        label="执行模式"
        extra="串行模式下，AND 聚合会在失败时短路"
      >
        <Radio.Group>
          <Radio.Button value="parallel">并行执行</Radio.Button>
          <Radio.Button value="serial">串行执行</Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item
        name="aggregation"
        label="聚合方式"
      >
        <Radio.Group>
          <Radio.Button value="and">
            <Space>
              <span>AND</span>
              <Text type="secondary" style={{ fontSize: 12 }}>全部通过</Text>
            </Space>
          </Radio.Button>
          <Radio.Button value="or">
            <Space>
              <span>OR</span>
              <Text type="secondary" style={{ fontSize: 12 }}>任一通过</Text>
            </Space>
          </Radio.Button>
          <Radio.Button value="weighted_average">
            <Space>
              <span>加权平均</span>
              <Text type="secondary" style={{ fontSize: 12 }}>≥60%</Text>
            </Space>
          </Radio.Button>
        </Radio.Group>
      </Form.Item>

      {showWeights && (
        <Form.Item label="权重配置">
          <Table
            dataSource={selectedEvaluators}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              {
                title: '评估器',
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: '类型',
                dataIndex: 'type',
                key: 'type',
                width: 80,
                render: (type: string) => (
                  <Tag color={type === 'preset' ? 'blue' : 'green'}>
                    {type === 'preset' ? '预置' : type === 'code' ? '代码' : 'LLM'}
                  </Tag>
                ),
              },
              {
                title: '权重',
                key: 'weight',
                width: 120,
                render: (_, __, index) => (
                  <Form.Item
                    name={['weights', index]}
                    noStyle
                  >
                    <InputNumber min={0} max={10} step={0.1} style={{ width: 80 }} placeholder="1" />
                  </Form.Item>
                ),
              },
            ]}
          />
          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            权重越大，该评估器对最终分数的影响越大
          </Text>
        </Form.Item>
      )}
    </>
  )
}
