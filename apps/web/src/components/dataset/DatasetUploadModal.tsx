'use client'

import { useState, useCallback } from 'react'
import { Modal, Steps, Upload, Button, Space, Typography, Radio, Alert, Progress } from 'antd'
import { InboxOutlined, FileExcelOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { appMessage } from '@/lib/message'
import { parseFile } from '@/lib/fileParser'
import { DatasetPreview } from './DatasetPreview'
import { FieldMapper } from './FieldMapper'
import type { FieldMapping } from './FieldMapper'

const { Dragger } = Upload
const { Text, Title } = Typography

type ParsedData = {
  headers: string[]
  rows: Record<string, unknown>[]
  totalRows: number
}

type StorageType = 'persistent' | 'temporary'

type UploadStep = 'upload' | 'preview' | 'mapping' | 'confirm'

type DatasetUploadModalProps = {
  open: boolean
  onOk: (
    file: File,
    isPersistent: boolean,
    fieldMapping: Record<string, string>,
    onProgress?: (percent: number) => void
  ) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const STEP_CONFIG: { key: UploadStep; title: string }[] = [
  { key: 'upload', title: '选择文件' },
  { key: 'preview', title: '预览数据' },
  { key: 'mapping', title: '字段映射' },
  { key: 'confirm', title: '确认上传' },
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ACCEPTED_TYPES = ['.xlsx', '.xls', '.csv']

export function DatasetUploadModal({
  open,
  onOk,
  onCancel,
  loading = false,
}: DatasetUploadModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [storageType, setStorageType] = useState<StorageType>('temporary')
  const [parseError, setParseError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    // 文件大小校验
    if (selectedFile.size > MAX_FILE_SIZE) {
      appMessage.error('文件大小不能超过 50MB')
      return
    }

    // 文件类型校验
    const ext = selectedFile.name.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (!ext || !ACCEPTED_TYPES.includes(ext)) {
      appMessage.error('仅支持 xlsx、xls、csv 格式')
      return
    }

    setParseError(null)

    try {
      const result = await parseFile(selectedFile)
      setFile(selectedFile)
      setParsedData(result)

      // 初始化字段映射（空映射，让 FieldMapper 组件自动检测）
      const initialMappings: FieldMapping[] = result.headers.map((header) => ({
        sourceField: header,
        targetField: '',
        autoDetected: false,
      }))
      setFieldMappings(initialMappings)

      setCurrentStep(1)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : '文件解析失败')
      appMessage.error(err instanceof Error ? err.message : '文件解析失败')
    }
  }, [])

  const handleConfirm = async () => {
    if (!file) return

    // 转换字段映射格式
    const mappingRecord: Record<string, string> = {}
    fieldMappings.forEach((m) => {
      if (m.targetField && m.targetField !== 'ignore') {
        mappingRecord[m.sourceField] = m.targetField
      }
    })

    setIsUploading(true)
    setUploadProgress(0)

    try {
      await onOk(file, storageType === 'persistent', mappingRecord, (percent) => {
        setUploadProgress(percent)
      })
      handleReset()
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleReset = () => {
    setCurrentStep(0)
    setFile(null)
    setParsedData(null)
    setFieldMappings([])
    setStorageType('temporary')
    setParseError(null)
    setUploadProgress(0)
    setIsUploading(false)
  }

  const handleCancel = () => {
    handleReset()
    onCancel()
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return !!file
      case 1:
        return !!parsedData
      case 2:
        // 检查 input 字段是否已映射
        return fieldMappings.some((m) => m.targetField === 'input')
      case 3:
        return true
      default:
        return false
    }
  }

  const renderUploadStep = () => (
    <div>
      <Dragger
        accept={ACCEPTED_TYPES.join(',')}
        showUploadList={false}
        beforeUpload={(f) => {
          handleFileSelect(f)
          return false
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined style={{ fontSize: 48 }} />
        </p>
        <p className="ant-upload-text" style={{ fontSize: 16, marginBottom: 8 }}>
          拖拽文件到此处或点击上传
        </p>
        <p className="ant-upload-hint" style={{ color: '#999' }}>
          支持 .xlsx, .csv 格式，单文件最大 50MB
        </p>
      </Dragger>

      {parseError && (
        <Alert
          type="error"
          message="文件解析失败"
          description={parseError}
          style={{ marginTop: 16 }}
          showIcon
        />
      )}

      {file && (
        <div
          style={{
            marginTop: 16,
            padding: '12px 16px',
            background: '#f5f5f5',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <FileExcelOutlined style={{ fontSize: 24, color: '#52c41a' }} />
          <div style={{ flex: 1 }}>
            <Text strong>{file.name}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {(file.size / 1024).toFixed(1)} KB
            </Text>
          </div>
          <CheckCircleOutlined style={{ fontSize: 20, color: '#52c41a' }} />
        </div>
      )}
    </div>
  )

  const renderPreviewStep = () => {
    if (!parsedData) return null

    return (
      <DatasetPreview
        data={parsedData.rows}
        columns={parsedData.headers}
        totalRows={parsedData.totalRows}
        previewRows={5}
      />
    )
  }

  const renderMappingStep = () => {
    if (!parsedData) return null

    return (
      <FieldMapper
        sourceColumns={parsedData.headers}
        value={fieldMappings}
        onChange={setFieldMappings}
      />
    )
  }

  const renderConfirmStep = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {isUploading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Progress
            type="circle"
            percent={uploadProgress}
            status={uploadProgress === 100 ? 'success' : 'active'}
          />
          <div style={{ marginTop: 16 }}>
            <Text>
              {uploadProgress < 100 ? '正在上传数据...' : '上传完成，正在处理...'}
            </Text>
          </div>
        </div>
      ) : (
        <>
          <div>
            <Title level={5} style={{ marginBottom: 12 }}>
              存储选项
            </Title>
            <Radio.Group
              value={storageType}
              onChange={(e) => setStorageType(e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              <Radio value="temporary">
                <Space direction="vertical" size={0}>
                  <Text>临时存储</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    任务完成后自动清理，适合一次性测试
                  </Text>
                </Space>
              </Radio>
              <Radio value="persistent">
                <Space direction="vertical" size={0}>
                  <Text>持久化存储</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    长期保留，可复用于多次测试
                  </Text>
                </Space>
              </Radio>
            </Radio.Group>
          </div>

          <div
            style={{
              padding: 16,
              background: '#f5f5f5',
              borderRadius: 8,
            }}
          >
            <Title level={5} style={{ marginBottom: 12 }}>
              上传摘要
            </Title>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px 16px' }}>
              <Text type="secondary">文件名：</Text>
              <Text>{file?.name}</Text>
              <Text type="secondary">数据行数：</Text>
              <Text>{parsedData?.totalRows} 行</Text>
              <Text type="secondary">字段数：</Text>
              <Text>{parsedData?.headers.length} 个</Text>
              <Text type="secondary">存储方式：</Text>
              <Text>{storageType === 'persistent' ? '持久化存储' : '临时存储'}</Text>
            </div>
          </div>
        </>
      )}
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderUploadStep()
      case 1:
        return renderPreviewStep()
      case 2:
        return renderMappingStep()
      case 3:
        return renderConfirmStep()
      default:
        return null
    }
  }

  return (
    <Modal
      title="上传数据集"
      open={open}
      onCancel={handleCancel}
      width={720}
      footer={
        <Space>
          <Button onClick={handleCancel} disabled={isUploading}>
            取消
          </Button>
          {currentStep > 0 && (
            <Button onClick={() => setCurrentStep(currentStep - 1)} disabled={isUploading}>
              上一步
            </Button>
          )}
          {currentStep < STEP_CONFIG.length - 1 ? (
            <Button type="primary" disabled={!canProceed()} onClick={() => setCurrentStep(currentStep + 1)}>
              下一步
            </Button>
          ) : (
            <Button
              type="primary"
              loading={loading || isUploading}
              disabled={!canProceed() || isUploading}
              onClick={handleConfirm}
            >
              {isUploading ? '上传中...' : '确认上传'}
            </Button>
          )}
        </Space>
      }
      destroyOnHidden
    >
      <Steps
        current={currentStep}
        items={STEP_CONFIG.map((s) => ({ title: s.title }))}
        style={{ marginBottom: 24 }}
        size="small"
      />
      {renderStepContent()}
    </Modal>
  )
}
