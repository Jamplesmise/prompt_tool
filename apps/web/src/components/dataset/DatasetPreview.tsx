'use client'

import { Table, Typography, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

type DatasetPreviewProps = {
  data: Record<string, unknown>[]
  columns: string[]
  totalRows: number
  previewRows?: number
}

export function DatasetPreview({
  data,
  columns,
  totalRows,
  previewRows = 5,
}: DatasetPreviewProps) {
  const displayData = data.slice(0, previewRows).map((row, index) => ({
    _rowNumber: index + 1,
    _key: index,
    ...row,
  }))

  const tableColumns: ColumnsType<Record<string, unknown>> = [
    {
      title: '#',
      dataIndex: '_rowNumber',
      key: '_rowNumber',
      width: 50,
      fixed: 'left',
      align: 'center',
      render: (num) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {num}
        </Text>
      ),
    },
    ...columns.map((col) => ({
      title: col,
      dataIndex: col,
      key: col,
      ellipsis: true,
      width: 180,
      render: (value: unknown) => {
        if (value === null || value === undefined || value === '') {
          return (
            <Tag color="default" style={{ fontSize: 11 }}>
              空值
            </Tag>
          )
        }
        return (
          <Text
            ellipsis={{ tooltip: String(value) }}
            style={{ maxWidth: 160, display: 'inline-block' }}
          >
            {String(value)}
          </Text>
        )
      },
    })),
  ]

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text strong style={{ fontSize: 14 }}>
          数据预览
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          共 {totalRows.toLocaleString()} 行，显示前 {Math.min(previewRows, data.length)} 行
        </Text>
      </div>

      <Table
        size="small"
        dataSource={displayData}
        columns={tableColumns}
        rowKey="_key"
        pagination={false}
        scroll={{ x: 'max-content' }}
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: 8,
        }}
      />

      {totalRows > previewRows && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 12px',
            background: '#fafafa',
            borderRadius: 4,
            textAlign: 'center',
          }}
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            还有 {(totalRows - previewRows).toLocaleString()} 行数据未显示
          </Text>
        </div>
      )}
    </div>
  )
}
