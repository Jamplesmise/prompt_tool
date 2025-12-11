'use client'

import { useState, useCallback } from 'react'
import {
  Modal,
  Input,
  Button,
  Space,
  Table,
  Tag,
  Select,
  Typography,
  Alert,
  Spin,
  Divider,
} from 'antd'
import {
  ThunderboltOutlined,
  EditOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useInferSchemaFromOutput, useCreateOutputSchema } from '@/hooks/useSchemas'
import type { InferredField } from '@/services/schemas'

const { TextArea } = Input
const { Text } = Typography

type InferSchemaModalProps = {
  open: boolean
  onClose: () => void
  onSuccess?: (outputSchemaId: string) => void
}

// 类型选项
const typeOptions = [
  { label: 'string', value: 'string' },
  { label: 'number', value: 'number' },
  { label: 'boolean', value: 'boolean' },
  { label: 'enum', value: 'enum' },
  { label: 'array', value: 'array' },
  { label: 'object', value: 'object' },
]

export function InferSchemaModal({ open, onClose, onSuccess }: InferSchemaModalProps) {
  // 状态
  const [sampleOutput, setSampleOutput] = useState('')
  const [inferredFields, setInferredFields] = useState<InferredField[]>([])
  const [editedFields, setEditedFields] = useState<InferredField[]>([])
  const [schemaName, setSchemaName] = useState('')
  const [step, setStep] = useState<'input' | 'review'>('input')

  // API hooks
  const inferMutation = useInferSchemaFromOutput()
  const createOutputSchemaMutation = useCreateOutputSchema()

  // 推断 Schema
  const handleInfer = useCallback(async () => {
    if (!sampleOutput.trim()) return

    try {
      const result = await inferMutation.mutateAsync(sampleOutput)
      setInferredFields(result.fields)
      setEditedFields(result.fields.map((f) => ({ ...f, name: f.suggestedName })))
      setSchemaName('推断的输出结构')
      setStep('review')
    } catch {
      // error handled by mutation
    }
  }, [sampleOutput, inferMutation])

  // 更新字段名称
  const handleUpdateFieldName = useCallback((key: string, newName: string) => {
    setEditedFields((fields) =>
      fields.map((f) => (f.key === key ? { ...f, name: newName } : f))
    )
  }, [])

  // 更新字段类型
  const handleUpdateFieldType = useCallback((key: string, newType: string) => {
    setEditedFields((fields) =>
      fields.map((f) => (f.key === key ? { ...f, type: newType as InferredField['type'] } : f))
    )
  }, [])

  // 创建 OutputSchema
  const handleCreateSchema = useCallback(async () => {
    if (!schemaName.trim() || editedFields.length === 0) return

    try {
      const result = await createOutputSchemaMutation.mutateAsync({
        name: schemaName,
        fields: editedFields.map((f) => ({
          name: f.name,
          key: f.key,
          type: f.type as 'string' | 'number' | 'boolean' | 'enum' | 'array' | 'object',
          required: f.required,
          itemType: f.itemType,
          properties: f.properties,
          evaluation: {
            weight: 1 / editedFields.length,
            isCritical: false,
          },
        })),
        parseMode: 'JSON',
        aggregation: {
          mode: 'weighted_average',
          passThreshold: 0.7,
        },
      })

      onSuccess?.(result.id)
      handleClose()
    } catch {
      // error handled by mutation
    }
  }, [schemaName, editedFields, createOutputSchemaMutation, onSuccess])

  // 关闭弹窗
  const handleClose = useCallback(() => {
    setSampleOutput('')
    setInferredFields([])
    setEditedFields([])
    setSchemaName('')
    setStep('input')
    onClose()
  }, [onClose])

  // 返回上一步
  const handleBack = useCallback(() => {
    setStep('input')
  }, [])

  // 渲染输入步骤
  const renderInputStep = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Alert
        type="info"
        showIcon
        message="粘贴一个模型输出的 JSON 样本，系统将自动推断输出结构"
      />

      <div>
        <Text strong>样本 JSON 输出</Text>
        <TextArea
          placeholder={`粘贴 JSON 输出，例如：
{
  "thinking": "分析用户问题...",
  "category": "bluetooth",
  "confidence": 0.95,
  "entities": ["iPhone", "耳机"]
}`}
          value={sampleOutput}
          onChange={(e) => setSampleOutput(e.target.value)}
          rows={12}
          className="mt-2 font-mono"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          loading={inferMutation.isPending}
          disabled={!sampleOutput.trim()}
          onClick={handleInfer}
        >
          推断结构
        </Button>
      </div>
    </Space>
  )

  // 渲染审核步骤
  const renderReviewStep = () => {
    const columns = [
      {
        title: '字段名称',
        dataIndex: 'name',
        key: 'name',
        width: 180,
        render: (name: string, record: InferredField) => (
          <Input
            value={name}
            onChange={(e) => handleUpdateFieldName(record.key, e.target.value)}
            size="small"
            prefix={<EditOutlined className="text-gray-400" />}
          />
        ),
      },
      {
        title: 'Key',
        dataIndex: 'key',
        key: 'key',
        width: 120,
        render: (key: string) => <Text code>{key}</Text>,
      },
      {
        title: '类型',
        dataIndex: 'type',
        key: 'type',
        width: 120,
        render: (type: string, record: InferredField) => (
          <Select
            value={type}
            onChange={(value) => handleUpdateFieldType(record.key, value)}
            options={typeOptions}
            size="small"
            style={{ width: '100%' }}
          />
        ),
      },
      {
        title: '必填',
        dataIndex: 'required',
        key: 'required',
        width: 60,
        render: (required: boolean) => (
          <Tag color={required ? 'red' : 'default'}>{required ? '是' : '否'}</Tag>
        ),
      },
      {
        title: '子类型',
        dataIndex: 'itemType',
        key: 'itemType',
        width: 80,
        render: (itemType: string | undefined) =>
          itemType ? <Tag>{itemType}</Tag> : '-',
      },
    ]

    return (
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Alert
          type="success"
          showIcon
          message={`成功推断出 ${editedFields.length} 个字段，您可以编辑字段名称和类型`}
        />

        <div>
          <Text strong>Schema 名称</Text>
          <Input
            value={schemaName}
            onChange={(e) => setSchemaName(e.target.value)}
            placeholder="输入 Schema 名称"
            className="mt-2"
          />
        </div>

        <Divider className="my-2" />

        <div>
          <Text strong>推断结果</Text>
          <Table
            dataSource={editedFields}
            columns={columns}
            rowKey="key"
            pagination={false}
            size="small"
            className="mt-2"
            scroll={{ y: 300 }}
          />
        </div>

        <div className="flex justify-between">
          <Button onClick={handleBack}>返回修改</Button>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={createOutputSchemaMutation.isPending}
            disabled={!schemaName.trim()}
            onClick={handleCreateSchema}
          >
            创建 OutputSchema
          </Button>
        </div>
      </Space>
    )
  }

  return (
    <Modal
      title="从样本输出推断结构"
      open={open}
      onCancel={handleClose}
      width={800}
      footer={null}
      destroyOnClose
    >
      {inferMutation.isPending ? (
        <div className="text-center py-8">
          <Spin tip="正在推断结构..." />
        </div>
      ) : step === 'input' ? (
        renderInputStep()
      ) : (
        renderReviewStep()
      )}
    </Modal>
  )
}

export default InferSchemaModal
