'use client'

import { useState } from 'react'
import { Card, Typography } from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import ScheduledTaskTable from '@/components/scheduled/ScheduledTaskTable'
import CreateScheduledModal from '@/components/scheduled/CreateScheduledModal'
import ExecutionHistory from '@/components/scheduled/ExecutionHistory'
import type { ScheduledTaskListItem } from '@/services/scheduledTasks'

const { Title } = Typography

export default function ScheduledTasksPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ScheduledTaskListItem | null>(null)
  const [historyTask, setHistoryTask] = useState<ScheduledTaskListItem | null>(null)

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
