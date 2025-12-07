'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Typography, Pagination, Row, Col, Spin } from 'antd'
import { useTaskList } from '@/hooks/useTaskList'
import { useRunTask, useStopTask, useRetryTask, usePauseTask, useResumeTask } from '@/hooks/useTasks'
import { TaskCard, TaskFilters, TaskEmptyState } from '@/components/task'
import type { TaskFiltersValue } from '@/components/task'
import { ErrorState } from '@/components/common'

const { Title } = Typography

export default function TasksPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<TaskFiltersValue>({})

  const {
    tasks,
    loading,
    error,
    pagination,
    hasFilters,
    refresh,
    setPage,
    setPageSize,
  } = useTaskList({
    filters,
    enablePolling: true,
    pollInterval: 3000,
  })

  const runTask = useRunTask()
  const stopTask = useStopTask()
  const retryTask = useRetryTask()
  const pauseTask = usePauseTask()
  const resumeTask = useResumeTask()

  // 错误状态
  if (error) {
    return <ErrorState message="获取任务列表失败" onRetry={refresh} />
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  return (
    <div className="fade-in">
      {/* 页面标题 */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          测试任务
        </Title>
      </div>

      {/* 筛选器 */}
      <TaskFilters
        value={filters}
        onChange={setFilters}
        onRefresh={refresh}
        onCreateTask={() => router.push('/tasks/new')}
        onCreateABTest={() => router.push('/tasks/new-ab')}
        loading={loading}
      />

      {/* 任务列表 */}
      {loading && tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : tasks.length === 0 ? (
        <TaskEmptyState
          filtered={hasFilters}
          onCreateTask={() => router.push('/tasks/new')}
          onClearFilter={handleClearFilters}
        />
      ) : (
        <>
          {/* 任务卡片网格 */}
          <Row gutter={[16, 16]}>
            {tasks.map((task) => (
              <Col key={task.id} xs={24} sm={24} md={12} lg={12} xl={8}>
                <TaskCard
                  id={task.id}
                  name={task.name}
                  status={task.status}
                  type={task.type}
                  progress={task.progress}
                  stats={task.stats}
                  error={task.error}
                  startedAt={task.startedAt}
                  completedAt={task.completedAt}
                  createdAt={task.createdAt}
                  queuePosition={task.queuePosition}
                  queueState={task.queueState}
                  onView={() => router.push(`/tasks/${task.id}`)}
                  onRun={() => runTask.mutate(task.id)}
                  onStop={() => stopTask.mutate(task.id)}
                  onPause={() => pauseTask.mutate(task.id)}
                  onResume={() => resumeTask.mutate(task.id)}
                  onRetry={() => retryTask.mutate(task.id)}
                  loading={
                    runTask.isPending ||
                    stopTask.isPending ||
                    retryTask.isPending ||
                    pauseTask.isPending ||
                    resumeTask.isPending
                  }
                />
              </Col>
            ))}
          </Row>

          {/* 分页 */}
          {pagination.total > pagination.pageSize && (
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                showSizeChanger
                showTotal={(total) => `共 ${total} 条`}
                onChange={(page, size) => {
                  if (size !== pagination.pageSize) {
                    setPageSize(size)
                  } else {
                    setPage(page)
                  }
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
