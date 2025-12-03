'use client'

import { Modal, Select, Empty, Spin, Typography, Space, Divider } from 'antd'
import { DiffEditor } from '@monaco-editor/react'
import type { VersionListItem, VersionDiffResponse } from '@/services/prompts'

const { Text } = Typography

type VersionDiffProps = {
  open: boolean
  versions: VersionListItem[]
  diffData: VersionDiffResponse | null
  loading?: boolean
  selectedVersions: { v1?: string; v2?: string }
  onVersionChange: (key: 'v1' | 'v2', versionId: string) => void
  onClose: () => void
}

export function VersionDiff({
  open,
  versions,
  diffData,
  loading = false,
  selectedVersions,
  onVersionChange,
  onClose,
}: VersionDiffProps) {
  const versionOptions = versions.map((v) => ({
    value: v.id,
    label: `v${v.version} - ${v.changeLog || '无说明'}`,
  }))

  return (
    <Modal
      title="版本对比"
      open={open}
      onCancel={onClose}
      footer={null}
      width={1000}
      styles={{ body: { padding: '16px 24px' } }}
    >
      <Space style={{ marginBottom: 16 }}>
        <Text>旧版本:</Text>
        <Select
          style={{ width: 200 }}
          placeholder="选择旧版本"
          value={selectedVersions.v1}
          onChange={(value) => onVersionChange('v1', value)}
          options={versionOptions}
        />
        <Text>新版本:</Text>
        <Select
          style={{ width: 200 }}
          placeholder="选择新版本"
          value={selectedVersions.v2}
          onChange={(value) => onVersionChange('v2', value)}
          options={versionOptions}
        />
      </Space>

      <Divider style={{ margin: '12px 0' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="加载中..." />
        </div>
      ) : diffData ? (
        <DiffEditor
          height={500}
          original={diffData.v1.content}
          modified={diffData.v2.content}
          language="markdown"
          options={{
            readOnly: true,
            renderSideBySide: true,
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
          }}
          theme="vs-dark"
        />
      ) : (
        <Empty
          description="请选择两个版本进行对比"
          style={{ padding: '40px 0' }}
        />
      )}
    </Modal>
  )
}
