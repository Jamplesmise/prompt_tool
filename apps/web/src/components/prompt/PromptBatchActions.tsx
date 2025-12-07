'use client'

import { Checkbox, Button, Space, Popconfirm } from 'antd'
import { DeleteOutlined, ExportOutlined } from '@ant-design/icons'

type PromptBatchActionsProps = {
  total: number
  selectedCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onBatchDelete: () => void
  onBatchExport: () => void
  loading?: boolean
}

export function PromptBatchActions({
  total,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  onBatchDelete,
  onBatchExport,
  loading,
}: PromptBatchActionsProps) {
  const isAllSelected = selectedCount > 0 && selectedCount === total
  const isPartialSelected = selectedCount > 0 && selectedCount < total

  const handleCheckboxChange = () => {
    if (isAllSelected || isPartialSelected) {
      onDeselectAll()
    } else {
      onSelectAll()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderTop: '1px solid #f0f0f0',
        marginTop: 8,
      }}
    >
      <Space size={16}>
        <Checkbox
          checked={isAllSelected}
          indeterminate={isPartialSelected}
          onChange={handleCheckboxChange}
        >
          全选
        </Checkbox>

        <span style={{ color: '#666' }}>
          已选择 <span style={{ color: '#EF4444', fontWeight: 500 }}>{selectedCount}</span> 项
        </span>

        <Space size={8}>
          <Popconfirm
            title="批量删除"
            description={`确定要删除选中的 ${selectedCount} 个提示词吗？此操作不可恢复。`}
            onConfirm={onBatchDelete}
            okText="确定"
            cancelText="取消"
            disabled={selectedCount === 0}
          >
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={selectedCount === 0}
              loading={loading}
            >
              批量删除
            </Button>
          </Popconfirm>

          <Button
            size="small"
            icon={<ExportOutlined />}
            disabled={selectedCount === 0}
            onClick={onBatchExport}
            loading={loading}
          >
            批量导出
          </Button>
        </Space>
      </Space>

      <span style={{ color: '#999' }}>共 {total} 项</span>
    </div>
  )
}

export type { PromptBatchActionsProps }
