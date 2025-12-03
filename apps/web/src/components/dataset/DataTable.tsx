'use client'

import { useState } from 'react'
import { Table, Input, Button, Space, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { DatasetRow } from '@platform/shared'

type DataTableProps = {
  schema: Array<{ name: string; type: string }> | null
  rows: DatasetRow[]
  loading?: boolean
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
  onAddRow?: (data: Record<string, unknown>) => Promise<void>
  onUpdateRow?: (rowId: string, data: Record<string, unknown>) => Promise<void>
  onDeleteRow?: (rowId: string) => Promise<void>
}

export function DataTable({
  schema,
  rows,
  loading = false,
  pagination,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
}: DataTableProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Record<string, unknown>>({})
  const [addingNew, setAddingNew] = useState(false)
  const [newRowData, setNewRowData] = useState<Record<string, unknown>>({})

  const columnNames = schema?.map((s) => s.name) || []

  const handleEdit = (row: DatasetRow) => {
    setEditingRowId(row.id)
    setEditingData(row.data as Record<string, unknown>)
  }

  const handleSave = async (rowId: string) => {
    try {
      await onUpdateRow?.(rowId, editingData)
      setEditingRowId(null)
      setEditingData({})
    } catch {
      // 错误已在 hook 中处理
    }
  }

  const handleCancel = () => {
    setEditingRowId(null)
    setEditingData({})
  }

  const handleAddNew = async () => {
    try {
      await onAddRow?.(newRowData)
      setAddingNew(false)
      setNewRowData({})
    } catch {
      // 错误已在 hook 中处理
    }
  }

  const handleCancelAdd = () => {
    setAddingNew(false)
    setNewRowData({})
  }

  const columns: ColumnsType<DatasetRow> = [
    {
      title: '#',
      key: 'index',
      width: 60,
      render: (_, record) => record.rowIndex + 1,
    },
    ...columnNames.map((name) => ({
      title: name,
      key: name,
      dataIndex: ['data', name],
      ellipsis: true,
      render: (value: unknown, record: DatasetRow) => {
        if (editingRowId === record.id) {
          return (
            <Input
              size="small"
              value={String(editingData[name] ?? '')}
              onChange={(e) =>
                setEditingData({ ...editingData, [name]: e.target.value })
              }
            />
          )
        }
        return String(value ?? '')
      },
    })),
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_, record) => {
        if (editingRowId === record.id) {
          return (
            <Space size="small">
              <Button
                type="link"
                size="small"
                icon={<SaveOutlined />}
                onClick={() => handleSave(record.id)}
              >
                保存
              </Button>
              <Button
                type="link"
                size="small"
                icon={<CloseOutlined />}
                onClick={handleCancel}
              >
                取消
              </Button>
            </Space>
          )
        }
        return (
          <Space size="small">
            <Button type="link" size="small" onClick={() => handleEdit(record)}>
              编辑
            </Button>
            <Popconfirm
              title="确认删除此行？"
              onConfirm={() => onDeleteRow?.(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  // 新增行表单
  const newRowForm = addingNew && (
    <tr className="ant-table-row">
      <td style={{ padding: '8px 16px' }}>新</td>
      {columnNames.map((name) => (
        <td key={name} style={{ padding: '8px 16px' }}>
          <Input
            size="small"
            placeholder={name}
            value={String(newRowData[name] ?? '')}
            onChange={(e) => setNewRowData({ ...newRowData, [name]: e.target.value })}
          />
        </td>
      ))}
      <td style={{ padding: '8px 16px' }}>
        <Space size="small">
          <Button type="link" size="small" onClick={handleAddNew}>
            保存
          </Button>
          <Button type="link" size="small" onClick={handleCancelAdd}>
            取消
          </Button>
        </Space>
      </td>
    </tr>
  )

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setAddingNew(true)}
          disabled={addingNew}
        >
          新增行
        </Button>
      </div>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={rows}
        loading={loading}
        size="small"
        pagination={
          pagination
            ? {
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条`,
                onChange: pagination.onChange,
              }
            : false
        }
        scroll={{ x: 'max-content' }}
        summary={() =>
          addingNew ? (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>新</Table.Summary.Cell>
                {columnNames.map((name, index) => (
                  <Table.Summary.Cell key={name} index={index + 1}>
                    <Input
                      size="small"
                      placeholder={name}
                      value={String(newRowData[name] ?? '')}
                      onChange={(e) =>
                        setNewRowData({ ...newRowData, [name]: e.target.value })
                      }
                    />
                  </Table.Summary.Cell>
                ))}
                <Table.Summary.Cell index={columnNames.length + 1}>
                  <Space size="small">
                    <Button type="link" size="small" onClick={handleAddNew}>
                      保存
                    </Button>
                    <Button type="link" size="small" onClick={handleCancelAdd}>
                      取消
                    </Button>
                  </Space>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          ) : null
        }
      />
    </div>
  )
}
