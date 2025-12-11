'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Modal,
  Form,
  Select,
  Switch,
  Button,
  Table,
  Tag,
  Space,
  Divider,
  Typography,
  Radio,
  Alert,
  Spin,
} from 'antd'
import { DownloadOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons'
import { useInputSchemas, useOutputSchemas } from '@/hooks/useSchemas'
import type { InputSchemaListItem, OutputSchemaListItem, InputVariableDefinition, OutputFieldDefinition } from '@platform/shared'

const { Text } = Typography

type TemplateFormat = 'xlsx' | 'csv' | 'json'

type TemplateColumn = {
  key: string
  name: string
  type: string
  required: boolean
  source: 'input' | 'expected'
  description?: string
}

type TemplateDownloadModalProps = {
  open: boolean
  onClose: () => void
  defaultInputSchemaId?: string
  defaultOutputSchemaId?: string
  promptId?: string
}

export function TemplateDownloadModal({
  open,
  onClose,
  defaultInputSchemaId,
  defaultOutputSchemaId,
  promptId,
}: TemplateDownloadModalProps) {
  const [form] = Form.useForm()
  const [downloading, setDownloading] = useState(false)

  // 获取 Schema 列表
  const { data: inputSchemas, isLoading: inputLoading } = useInputSchemas()
  const { data: outputSchemas, isLoading: outputLoading } = useOutputSchemas()

  // 选中的 Schema
  const [selectedInputId, setSelectedInputId] = useState<string | undefined>(defaultInputSchemaId)
  const [selectedOutputId, setSelectedOutputId] = useState<string | undefined>(defaultOutputSchemaId)
  const [format, setFormat] = useState<TemplateFormat>('xlsx')
  const [includeExpected, setIncludeExpected] = useState(true)

  // 初始化表单值
  useEffect(() => {
    if (open) {
      setSelectedInputId(defaultInputSchemaId)
      setSelectedOutputId(defaultOutputSchemaId)
      form.setFieldsValue({
        inputSchemaId: defaultInputSchemaId,
        outputSchemaId: defaultOutputSchemaId,
        format: 'xlsx',
        includeExpected: true,
      })
    }
  }, [open, defaultInputSchemaId, defaultOutputSchemaId, form])

  // 获取选中的 Schema 数据
  const selectedInput = useMemo(() => {
    return inputSchemas?.find((s) => s.id === selectedInputId) as (InputSchemaListItem & { variables: InputVariableDefinition[] }) | undefined
  }, [inputSchemas, selectedInputId])

  const selectedOutput = useMemo(() => {
    return outputSchemas?.find((s) => s.id === selectedOutputId) as (OutputSchemaListItem & { fields: OutputFieldDefinition[] }) | undefined
  }, [outputSchemas, selectedOutputId])

  // 生成列定义预览
  const columns = useMemo<TemplateColumn[]>(() => {
    const cols: TemplateColumn[] = []

    // 添加输入变量列
    if (selectedInput?.variables) {
      for (const variable of selectedInput.variables) {
        cols.push({
          key: variable.datasetField || variable.key,
          name: variable.name,
          type: variable.type,
          required: variable.required,
          source: 'input',
          description: variable.description,
        })
      }
    }

    // 添加期望值列
    if (includeExpected && selectedOutput?.fields) {
      for (const field of selectedOutput.fields) {
        const expectedKey = field.evaluation?.expectedField || `expected_${field.key}`
        cols.push({
          key: expectedKey,
          name: `${field.name}（期望值）`,
          type: field.type,
          required: false,
          source: 'expected',
          description: field.description,
        })
      }
    }

    return cols
  }, [selectedInput, selectedOutput, includeExpected])

  // 下载模板
  const handleDownload = async () => {
    try {
      setDownloading(true)

      const params = new URLSearchParams()
      if (selectedInputId) params.append('inputSchemaId', selectedInputId)
      if (selectedOutputId) params.append('outputSchemaId', selectedOutputId)
      if (promptId) params.append('promptId', promptId)
      params.append('format', format)
      if (!includeExpected) params.append('includeExpected', 'false')

      const response = await fetch(`/api/v1/datasets/template?${params.toString()}`)

      if (!response.ok) {
        throw new Error('下载失败')
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `template.${format}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (match?.[1]) {
          filename = match[1].replace(/['"]/g, '')
        }
      }

      // 下载文件
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      onClose()
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloading(false)
    }
  }

  // 表格列
  const tableColumns = [
    {
      title: '列名',
      dataIndex: 'key',
      key: 'key',
      render: (text: string, record: TemplateColumn) => (
        <Space>
          <Text code>{text}</Text>
          {record.required && <Tag color="orange">必填</Tag>}
        </Space>
      ),
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: 'input' | 'expected') =>
        source === 'input' ? (
          <Tag color="blue">输入变量</Tag>
        ) : (
          <Tag color="green">期望值</Tag>
        ),
    },
  ]

  const isLoading = inputLoading || outputLoading

  return (
    <Modal
      title="下载数据集模板"
      open={open}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button
          key="download"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={handleDownload}
          loading={downloading}
          disabled={columns.length === 0}
        >
          下载模板
        </Button>,
      ]}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <Form form={form} layout="vertical">
          <Form.Item name="inputSchemaId" label="输入结构">
            <Select
              placeholder="选择输入结构（可选）"
              allowClear
              value={selectedInputId}
              onChange={setSelectedInputId}
              options={inputSchemas?.map((s) => ({
                value: s.id,
                label: (
                  <Space>
                    {s.name}
                    <Tag>{s.variables?.length ?? 0} 变量</Tag>
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item name="outputSchemaId" label="输出结构">
            <Select
              placeholder="选择输出结构（可选）"
              allowClear
              value={selectedOutputId}
              onChange={setSelectedOutputId}
              options={outputSchemas?.map((s) => ({
                value: s.id,
                label: (
                  <Space>
                    {s.name}
                    <Tag>{s.fields?.length ?? 0} 字段</Tag>
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item name="includeExpected" label="包含期望值列" valuePropName="checked">
            <Switch
              checked={includeExpected}
              onChange={setIncludeExpected}
              checkedChildren="是"
              unCheckedChildren="否"
            />
          </Form.Item>

          <Form.Item name="format" label="文件格式">
            <Radio.Group value={format} onChange={(e) => setFormat(e.target.value)}>
              <Radio.Button value="xlsx">
                <FileExcelOutlined /> Excel
              </Radio.Button>
              <Radio.Button value="csv">
                <FileTextOutlined /> CSV
              </Radio.Button>
              <Radio.Button value="json">
                <FileTextOutlined /> JSON
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Divider>列定义预览</Divider>

          {columns.length > 0 ? (
            <Table
              dataSource={columns}
              columns={tableColumns}
              rowKey="key"
              size="small"
              pagination={false}
              scroll={{ y: 200 }}
            />
          ) : (
            <Alert
              type="info"
              message="请选择至少一个结构定义"
              description="选择输入结构或输出结构后，将显示模板列定义"
            />
          )}
        </Form>
      )}
    </Modal>
  )
}

export default TemplateDownloadModal
