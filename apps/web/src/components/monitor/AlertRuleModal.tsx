'use client'

import { useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Space,
  Typography,
} from 'antd'
import type { AlertMetric, AlertCondition, AlertSeverity } from '@platform/shared'

const { TextArea } = Input
const { Text } = Typography

type AlertRuleFormData = {
  name: string
  description?: string
  metric: AlertMetric
  condition: AlertCondition
  threshold: number
  duration: number
  severity: AlertSeverity
  silencePeriod: number
  isActive: boolean
}

type AlertRuleModalProps = {
  open: boolean
  onCancel: () => void
  onSubmit: (data: AlertRuleFormData) => Promise<void>
  initialData?: Partial<AlertRuleFormData>
  loading?: boolean
  title?: string
}

const metricOptions: { value: AlertMetric; label: string; unit: string }[] = [
  { value: 'PASS_RATE', label: '通过率', unit: '%' },
  { value: 'AVG_LATENCY', label: '平均延迟', unit: 'ms' },
  { value: 'ERROR_RATE', label: '错误率', unit: '%' },
  { value: 'COST', label: '成本', unit: '$' },
]

const conditionOptions: { value: AlertCondition; label: string }[] = [
  { value: 'LT', label: '< (小于)' },
  { value: 'LTE', label: '<= (小于等于)' },
  { value: 'GT', label: '> (大于)' },
  { value: 'GTE', label: '>= (大于等于)' },
  { value: 'EQ', label: '= (等于)' },
]

const severityOptions: { value: AlertSeverity; label: string; color: string }[] = [
  { value: 'WARNING', label: '警告', color: '#faad14' },
  { value: 'CRITICAL', label: '严重', color: '#ff4d4f' },
  { value: 'URGENT', label: '紧急', color: '#cf1322' },
]

export default function AlertRuleModal({
  open,
  onCancel,
  onSubmit,
  initialData,
  loading,
  title = '创建告警规则',
}: AlertRuleModalProps) {
  const [form] = Form.useForm<AlertRuleFormData>()
  const selectedMetric = Form.useWatch('metric', form)

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue(initialData)
      } else {
        form.resetFields()
        form.setFieldsValue({
          severity: 'WARNING',
          duration: 5,
          silencePeriod: 30,
          isActive: true,
        })
      }
    }
  }, [open, initialData, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      await onSubmit(values)
      form.resetFields()
    } catch {
      // 表单验证失败
    }
  }

  const getMetricUnit = () => {
    const metric = metricOptions.find((m) => m.value === selectedMetric)
    return metric?.unit || ''
  }

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={handleOk}
      confirmLoading={loading}
      width={560}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="name"
          label="规则名称"
          rules={[{ required: true, message: '请输入规则名称' }]}
        >
          <Input placeholder="例如：通过率低于阈值告警" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述"
        >
          <TextArea
            placeholder="可选：描述此规则的用途"
            rows={2}
            maxLength={500}
          />
        </Form.Item>

        <Space size={16} style={{ width: '100%' }}>
          <Form.Item
            name="metric"
            label="监控指标"
            rules={[{ required: true, message: '请选择监控指标' }]}
            style={{ width: 200 }}
          >
            <Select
              placeholder="选择指标"
              options={metricOptions.map((m) => ({
                value: m.value,
                label: `${m.label} (${m.unit})`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="condition"
            label="触发条件"
            rules={[{ required: true, message: '请选择条件' }]}
            style={{ width: 160 }}
          >
            <Select
              placeholder="选择条件"
              options={conditionOptions}
            />
          </Form.Item>

          <Form.Item
            name="threshold"
            label={`阈值 ${getMetricUnit()}`}
            rules={[{ required: true, message: '请输入阈值' }]}
            style={{ width: 120 }}
          >
            <InputNumber
              placeholder="阈值"
              style={{ width: '100%' }}
              min={0}
              step={selectedMetric === 'COST' ? 0.01 : 1}
            />
          </Form.Item>
        </Space>

        <Form.Item
          name="duration"
          label="持续时间（分钟）"
          rules={[{ required: true, message: '请输入持续时间' }]}
          extra="指标超过阈值持续多少分钟后触发告警"
        >
          <InputNumber
            placeholder="分钟"
            min={1}
            max={1440}
            style={{ width: 200 }}
          />
        </Form.Item>

        <Space size={16} style={{ width: '100%' }}>
          <Form.Item
            name="severity"
            label="告警级别"
            rules={[{ required: true }]}
            style={{ width: 200 }}
          >
            <Select
              options={severityOptions.map((s) => ({
                value: s.value,
                label: (
                  <Space>
                    <span style={{ color: s.color }}>●</span>
                    {s.label}
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item
            name="silencePeriod"
            label="静默期（分钟）"
            rules={[{ required: true }]}
            extra="同一规则再次触发的最小间隔"
            style={{ width: 200 }}
          >
            <InputNumber
              min={1}
              max={1440}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Space>

        <Form.Item
          name="isActive"
          label="启用规则"
          valuePropName="checked"
        >
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>

        <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            预览：当 <Text strong>{metricOptions.find((m) => m.value === selectedMetric)?.label || '指标'}</Text>
            {' '}{conditionOptions.find((c) => c.value === form.getFieldValue('condition'))?.label.split(' ')[0] || ''}{' '}
            <Text strong>{form.getFieldValue('threshold') || '?'}{getMetricUnit()}</Text>
            {' '}持续 <Text strong>{form.getFieldValue('duration') || '?'} 分钟</Text> 时触发告警
          </Text>
        </div>
      </Form>
    </Modal>
  )
}
