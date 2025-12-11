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
  Divider,
  Alert,
} from 'antd'
import type { AlertMetric, AlertCondition, AlertSeverity, AlertScope, FieldAlertConfig } from '@platform/shared'

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
  // 字段级配置
  fieldKey?: string
  fieldName?: string
  isCritical?: boolean
  baselineTaskId?: string
  promptIds?: string[]
}

type AlertRuleModalProps = {
  open: boolean
  onCancel: () => void
  onSubmit: (data: AlertRuleFormData & { scope?: AlertScope }) => Promise<void>
  initialData?: Partial<AlertRuleFormData> & { scope?: AlertScope }
  loading?: boolean
  title?: string
  // 可选：提供可用的字段列表和任务列表
  availableFields?: { key: string; name: string }[]
  availableTasks?: { id: string; name: string }[]
  availablePrompts?: { id: string; name: string }[]
}

// 普通指标
const basicMetricOptions: { value: AlertMetric; label: string; unit: string }[] = [
  { value: 'PASS_RATE', label: '通过率', unit: '%' },
  { value: 'AVG_LATENCY', label: '平均延迟', unit: 'ms' },
  { value: 'ERROR_RATE', label: '错误率', unit: '%' },
  { value: 'COST', label: '成本', unit: '$' },
]

// 字段级指标
const fieldMetricOptions: { value: AlertMetric; label: string; unit: string; description: string }[] = [
  { value: 'FIELD_PASS_RATE', label: '字段通过率', unit: '%', description: '特定字段的评估通过率' },
  { value: 'FIELD_AVG_SCORE', label: '字段平均分', unit: '', description: '特定字段的平均评估分数' },
  { value: 'FIELD_REGRESSION', label: '字段回归', unit: '%', description: '与基准任务相比的通过率变化' },
]

// 合并所有指标
const metricOptions = [...basicMetricOptions, ...fieldMetricOptions]

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
  availableFields = [],
  availableTasks = [],
  availablePrompts = [],
}: AlertRuleModalProps) {
  const [form] = Form.useForm<AlertRuleFormData>()
  const selectedMetric = Form.useWatch('metric', form)

  // 是否选择了字段级指标
  const isFieldMetric = selectedMetric?.startsWith('FIELD_')
  const isRegressionMetric = selectedMetric === 'FIELD_REGRESSION'

  useEffect(() => {
    if (open) {
      if (initialData) {
        // 从 scope 中提取字段配置
        const fieldConfig = initialData.scope?.fieldConfig
        form.setFieldsValue({
          ...initialData,
          fieldKey: fieldConfig?.fieldKey,
          fieldName: fieldConfig?.fieldName,
          isCritical: fieldConfig?.isCritical,
          baselineTaskId: fieldConfig?.baselineTaskId,
          promptIds: initialData.scope?.promptIds,
        })
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

      // 构建 scope 对象
      let scope: AlertScope | undefined
      if (values.metric?.startsWith('FIELD_') && values.fieldKey) {
        const fieldConfig: FieldAlertConfig = {
          fieldKey: values.fieldKey,
          fieldName: values.fieldName,
          isCritical: values.isCritical,
          baselineTaskId: values.baselineTaskId,
        }
        scope = {
          fieldConfig,
          promptIds: values.promptIds,
        }
      }

      // 移除字段级配置字段，只保留基础字段
      const { fieldKey, fieldName, isCritical, baselineTaskId, promptIds, ...baseData } = values

      await onSubmit({ ...baseData, scope })
      form.resetFields()
    } catch {
      // 表单验证失败
    }
  }

  const getMetricUnit = () => {
    const metric = metricOptions.find((m) => m.value === selectedMetric)
    return metric?.unit || ''
  }

  const getFieldMetricDescription = () => {
    const metric = fieldMetricOptions.find((m) => m.value === selectedMetric)
    return metric?.description
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

        <Form.Item
          name="metric"
          label="监控指标"
          rules={[{ required: true, message: '请选择监控指标' }]}
        >
          <Select
            placeholder="选择指标"
            options={[
              {
                label: '基础指标',
                options: basicMetricOptions.map((m) => ({
                  value: m.value,
                  label: `${m.label} (${m.unit})`,
                })),
              },
              {
                label: '字段级指标',
                options: fieldMetricOptions.map((m) => ({
                  value: m.value,
                  label: `${m.label}${m.unit ? ` (${m.unit})` : ''}`,
                })),
              },
            ]}
          />
        </Form.Item>

        {isFieldMetric && (
          <>
            <Alert
              type="info"
              message={getFieldMetricDescription()}
              style={{ marginBottom: 16 }}
              showIcon
            />

            <Space size={16} style={{ width: '100%' }}>
              <Form.Item
                name="fieldKey"
                label="目标字段"
                rules={[{ required: true, message: '请输入或选择字段' }]}
                style={{ flex: 1 }}
              >
                {availableFields.length > 0 ? (
                  <Select
                    placeholder="选择字段"
                    showSearch
                    optionFilterProp="label"
                    options={availableFields.map((f) => ({
                      value: f.key,
                      label: `${f.name} (${f.key})`,
                    }))}
                  />
                ) : (
                  <Input placeholder="输入字段 key，如: intent" />
                )}
              </Form.Item>

              <Form.Item
                name="fieldName"
                label="字段名称"
                style={{ width: 150 }}
              >
                <Input placeholder="显示名称（可选）" />
              </Form.Item>
            </Space>

            {availablePrompts.length > 0 && (
              <Form.Item
                name="promptIds"
                label="关联提示词"
                extra="只监控选定提示词的字段评估结果"
              >
                <Select
                  mode="multiple"
                  placeholder="选择提示词（可选）"
                  options={availablePrompts.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  allowClear
                />
              </Form.Item>
            )}

            {isRegressionMetric && (
              <Form.Item
                name="baselineTaskId"
                label="基准任务"
                rules={[{ required: true, message: '回归检测需要选择基准任务' }]}
                extra="将与此任务的结果进行对比"
              >
                {availableTasks.length > 0 ? (
                  <Select
                    placeholder="选择基准任务"
                    showSearch
                    optionFilterProp="label"
                    options={availableTasks.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                  />
                ) : (
                  <Input placeholder="输入任务 ID" />
                )}
              </Form.Item>
            )}

            <Form.Item
              name="isCritical"
              valuePropName="checked"
            >
              <Switch checkedChildren="关键字段" unCheckedChildren="普通字段" />
            </Form.Item>

            <Divider style={{ margin: '8px 0' }} />
          </>
        )}

        <Space size={16} style={{ width: '100%' }}>
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
            extra={isRegressionMetric ? '负数表示下降' : undefined}
          >
            <InputNumber
              placeholder="阈值"
              style={{ width: '100%' }}
              min={isRegressionMetric ? -100 : 0}
              max={isRegressionMetric ? 100 : undefined}
              step={selectedMetric === 'COST' ? 0.01 : 1}
            />
          </Form.Item>

          <Form.Item
            name="duration"
            label="持续时间（分钟）"
            rules={[{ required: true, message: '请输入持续时间' }]}
            style={{ width: 160 }}
          >
            <InputNumber
              placeholder="分钟"
              min={1}
              max={1440}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Space>

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
            预览：当{' '}
            {isFieldMetric && form.getFieldValue('fieldKey') && (
              <>字段 <Text strong>{form.getFieldValue('fieldName') || form.getFieldValue('fieldKey')}</Text> 的</>
            )}
            <Text strong>{metricOptions.find((m) => m.value === selectedMetric)?.label || '指标'}</Text>
            {' '}{conditionOptions.find((c) => c.value === form.getFieldValue('condition'))?.label.split(' ')[0] || ''}{' '}
            <Text strong>{form.getFieldValue('threshold') || '?'}{getMetricUnit()}</Text>
            {' '}持续 <Text strong>{form.getFieldValue('duration') || '?'} 分钟</Text> 时触发告警
          </Text>
        </div>
      </Form>
    </Modal>
  )
}
