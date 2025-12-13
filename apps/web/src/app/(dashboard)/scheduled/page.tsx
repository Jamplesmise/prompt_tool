'use client'

import { useState } from 'react'
import { Card, Typography } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import ScheduledTaskTable from '@/components/scheduled/ScheduledTaskTable'
import CreateScheduledModal from '@/components/scheduled/CreateScheduledModal'
import ExecutionHistory from '@/components/scheduled/ExecutionHistory'
import type { ScheduledTaskListItem } from '@/services/scheduledTasks'
import { useGoiDialogListener } from '@/hooks/useGoiDialogListener'
import { GOI_DIALOG_IDS } from '@/lib/goi/dialogIds'

const { Title } = Typography

export default function ScheduledTasksPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ScheduledTaskListItem | null>(null)
  const [historyTask, setHistoryTask] = useState<ScheduledTaskListItem | null>(null)

  // GOI 弹窗事件监听
  useGoiDialogListener({
    [GOI_DIALOG_IDS.CREATE_SCHEDULED]: () => {
      setEditingTask(null)
      setCreateModalOpen(true)
    },
    [GOI_DIALOG_IDS.EDIT_SCHEDULED]: () => {
      // 编辑定时任务，需要用户通过表格选择
      // 这里仅打开创建弹窗，用户需要先从表格选择要编辑的任务
      setEditingTask(null)
      setCreateModalOpen(true)
    },
  })

  const handleCreateClick = () => {
    setEditingTask(null)
    setCreateModalOpen(true)
  }

  const handleEditClick = (task: ScheduledTaskListItem) => {
    setEditingTask(task)
    setCreateModalOpen(true)
  }

  const handleHistoryClick = (task: ScheduledTaskListItem) => {
    setHistoryTask(task)
  }

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false)
    setEditingTask(null)
  }

  const handleCloseHistoryModal = () => {
    setHistoryTask(null)
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={4} style={{ marginBottom: 24 }}>
        <ClockCircleOutlined style={{ marginRight: 8 }} />
        定时任务
      </Title>

      <Card>
        <ScheduledTaskTable
          onCreateClick={handleCreateClick}
          onEditClick={handleEditClick}
          onHistoryClick={handleHistoryClick}
        />
      </Card>

      <CreateScheduledModal
        open={createModalOpen}
        onClose={handleCloseCreateModal}
        editingTask={editingTask}
      />

      <ExecutionHistory
        open={!!historyTask}
        onClose={handleCloseHistoryModal}
        scheduledTask={historyTask}
      />
    </div>
  )
}
