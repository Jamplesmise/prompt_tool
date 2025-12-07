'use client'

import { useState } from 'react'
import { Modal, Steps, Upload, Button, Table, Select, Switch, Space, Typography } from 'antd'
import { appMessage } from '@/lib/message'
import { UploadOutlined, InboxOutlined } from '@ant-design/icons'
import { parseFile, generateSchema } from '@/lib/fileParser'

const { Dragger } = Upload
const { Text } = Typography

type ParsedData = {
  headers: string[]
  rows: Record<string, unknown>[]
  totalRows: number
}

type UploadModalProps = {
  open: boolean
  onOk: (file: File, isPersistent: boolean, fieldMapping: Record<string, string>) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

export function UploadModal({ open, onOk, onCancel, loading = false }: UploadModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [isPersistent, setIsPersistent] = useState(false)

  const handleFileSelect = async (selectedFile: File) => {
    try {
      const result = await parseFile(selectedFile)
      setFile(selectedFile)
      setParsedData(result)

      // 自动推断字段映射
      const autoMapping: Record<string, string> = {}
      if (result.headers.includes('input')) {
        autoMapping.input = 'input'
      }
      if (result.headers.includes('expected')) {
        autoMapping.expected = 'expected'
      }
      setFieldMapping(autoMapping)

      setCurrentStep(1)
    } catch (err) {
      appMessage.error(err instanceof Error ? err.message : '文件解析失败')
    }
  }

  const handleConfirm = async () => {
    if (!file) return
    await onOk(file, isPersistent, fieldMapping)
    handleReset()
  }

  const handleReset = () => {
    setCurrentStep(0)
    setFile(null)
    setParsedData(null)
    setFieldMapping({})
    setIsPersistent(false)
  }

  const handleCancel = () => {
    handleReset()
    onCancel()
  }

  const steps = [
    { title: '选择文件' },
    { title: '预览数据' },
    { title: '字段映射' },
    { title: '存储设置' },
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Dragger
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            beforeUpload={(f) => {
              handleFileSelect(f)
              return false
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域</p>
            <p className="ant-upload-hint">支持 xlsx、xls、csv 格式</p>
          </Dragger>
        )

      case 1:
        if (!parsedData) return null
        return (
          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
              共 {parsedData.totalRows} 行数据，预览前 5 行
            </Text>
            <Table
              size="small"
              dataSource={parsedData.rows.slice(0, 5).map((row, i) => ({ key: i, ...row }))}
              columns={parsedData.headers.map((h) => ({
                title: h,
                dataIndex: h,
                key: h,
                ellipsis: true,
              }))}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          </div>
        )

      case 2:
        if (!parsedData) return null
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Text type="secondary">
              将文件中的字段映射到标准字段（可选）
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Text style={{ width: 100 }}>输入字段 (input):</Text>
              <Select
                style={{ width: 200 }}
                placeholder="选择对应字段"
                allowClear
                value={fieldMapping.input}
                onChange={(v) => setFieldMapping({ ...fieldMapping, input: v })}
                options={parsedData.headers.map((h) => ({ value: h, label: h }))}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Text style={{ width: 100 }}>期望输出 (expected):</Text>
              <Select
                style={{ width: 200 }}
                placeholder="选择对应字段（可选）"
                allowClear
                value={fieldMapping.expected}
                onChange={(v) => setFieldMapping({ ...fieldMapping, expected: v })}
                options={parsedData.headers.map((h) => ({ value: h, label: h }))}
              />
            </div>
          </div>
        )

      case 3:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Text>持久化存储:</Text>
              <Switch checked={isPersistent} onChange={setIsPersistent} />
            </div>
            <Text type="secondary">
              {isPersistent
                ? '数据将永久保存，适合重复使用的测试数据'
                : '数据为临时存储，适合一次性测试'}
            </Text>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Modal
      title="上传数据集"
      open={open}
      onCancel={handleCancel}
      width={700}
      footer={
        <Space>
          <Button onClick={handleCancel}>取消</Button>
          {currentStep > 0 && (
            <Button onClick={() => setCurrentStep(currentStep - 1)}>上一步</Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button
              type="primary"
              disabled={currentStep === 0 && !file}
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              下一步
            </Button>
          ) : (
            <Button type="primary" loading={loading} onClick={handleConfirm}>
              确认上传
            </Button>
          )}
        </Space>
      }
      destroyOnHidden
    >
      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} size="small" />
      {renderStepContent()}
    </Modal>
  )
}
