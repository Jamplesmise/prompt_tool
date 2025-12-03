'use client'

import { useState } from 'react'
import { Button, Dropdown } from 'antd'
import { appMessage } from '@/lib/message'
import { DownloadOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'

type ExportButtonProps = {
  taskId: string
  taskName?: string
}

const menuItems: MenuProps['items'] = [
  { key: 'xlsx', label: '导出 Excel (.xlsx)' },
  { key: 'csv', label: '导出 CSV (.csv)' },
  { key: 'json', label: '导出 JSON (.json)' },
]

export function ExportButton({ taskId, taskName }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleExport = async (format: string) => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/v1/tasks/${taskId}/results/export?format=${format}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '导出失败')
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = `${taskName || 'results'}.${format}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*=UTF-8''(.+)/)
        if (match) {
          fileName = decodeURIComponent(match[1])
        }
      }

      // 下载文件
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      appMessage.success('导出成功')
    } catch (err) {
      appMessage.error(err instanceof Error ? err.message : '导出失败')
    } finally {
      setLoading(false)
    }
  }

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    handleExport(key)
  }

  return (
    <Dropdown
      menu={{ items: menuItems, onClick: handleMenuClick }}
      disabled={loading}
    >
      <Button icon={<DownloadOutlined />} loading={loading}>
        导出结果
      </Button>
    </Dropdown>
  )
}
