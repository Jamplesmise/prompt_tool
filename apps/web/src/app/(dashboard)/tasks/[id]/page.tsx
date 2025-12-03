'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Space, Spin, Typography, Tabs } from 'antd'
import { appMessage } from '@/lib/message'
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  PauseCircleOutlined,
  CaretRightOutlined,
} from '@ant-design/icons'
import { useTask, useRunTask, useStopTask, useRetryTask, usePauseTask, useResumeTask, useRefreshTask } from '@/hooks/useTasks'
import { useTaskProgress } from '@/hooks/useTaskProgress'
import { TaskOverview } from '@/components/task/TaskOverview'
import { ResultTable } from '@/components/task/ResultTable'
import { ResultDetail } from '@/components/task/ResultDetail'
import { ExportButton } from '@/components/task/ExportButton'
import { ABTestResults } from '@/components/task/ABTestResults'
import type { TaskResultItem } from '@/services/tasks'

const { Title } = Typography

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.id as string

  const { data: task, isLoading, error } = useTask(taskId)
  const runTask = useRunTask()
  const stopTask = useStopTask()
  const retryTask = useRetryTask()
  const pauseTask = usePauseTask()
  const resumeTask = useResumeTask()
  const refreshTask = useRefreshTask()

  // 使用 ref 追踪 refreshTask，避免回调依赖
  const refreshTaskRef = useRef(refreshTask)
  refreshTaskRef.current = refreshTask

  // 使用 useMemo 创建稳定的回调选项，避免无限循环
  const progressOptions = useMemo(
    () => ({
      enabled: !!task && task.status === 'RUNNING',
      onCompleted: () => {
        appMessage.success('任务执行完成')
        refreshTaskRef.current(taskId)
      },
      onFailed: (err: string) => {
        appMessage.error(`任务执行失败: ${err}`)
        refreshTaskRef.current(taskId)
      },
      onStopped: () => {
        appMessage.info('任务已终止')
        refreshTaskRef.current(taskId)
      },
    }),
    [task, taskId]
  )

  // SSE 进度订阅
  const { progress, status } = useTaskProgress(taskId, task?.status, progressOptions)

  // 结果详情抽屉
  const [selectedResult, setSelectedResult] = useState<TaskResultItem | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)

  const handleViewDetail = useCallback((result: TaskResultItem) => {
    setSelectedResult(result)
    setDrawerVisible(true)
  }, [])

  // 当任务状态变化时刷新数据
  useEffect(() => {
    if (status !== task?.status && ['COMPLETED', 'FAILED', 'STOPPED'].includes(status)) {
      refreshTaskRef.current(taskId)
    }
  }, [status, task?.status, taskId])

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error || !task) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Typography.Text type="danger">
          {error instanceof Error ? error.message : '加载失败'}
        </Typography.Text>
        <br />
        <Button style={{ marginTop: 16 }} onClick={() => router.back()}>
          返回
        </Button>
      </div>
    )
  }

  const currentStatus = status || task.status
  const currentProgress = status === 'RUNNING' ? progress : task.progress

  return (
    <div>
      {/* 页头 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/tasks')}
          >
            返回
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {task.name}
          </Title>
        </Space>

        <Space>
          {currentStatus === 'PENDING' && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => runTask.mutate(taskId)}
              loading={runTask.isPending}
            >
              启动任务
            </Button>
          )}

          {currentStatus === 'RUNNING' && (
            <>
              <Button
                icon={<PauseCircleOutlined />}
                onClick={() => pauseTask.mutate(taskId)}
                loading={pauseTask.isPending}
              >
                暂停
              </Button>
              <Button
                danger
                icon={<StopOutlined />}
                onClick={() => stopTask.mutate(taskId)}
                loading={stopTask.isPending}
              >
                终止任务
              </Button>
            </>
          )}

          {['PAUSED', 'FAILED', 'STOPPED'].includes(currentStatus) && (
            <Button
              type={currentStatus === 'PAUSED' ? 'primary' : 'default'}
              icon={<CaretRightOutlined />}
              onClick={() => resumeTask.mutate(taskId)}
              loading={resumeTask.isPending}
            >
              {currentStatus === 'PAUSED' ? '继续执行' : '从断点续跑'}
            </Button>
          )}

          {['COMPLETED', 'FAILED', 'STOPPED'].includes(currentStatus) &&
            currentProgress.failed > 0 && (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => retryTask.mutate(taskId)}
                loading={retryTask.isPending}
              >
                重试失败用例
              </Button>
            )}

          {['PAUSED', 'COMPLETED', 'FAILED', 'STOPPED'].includes(currentStatus) && (
            <ExportButton taskId={taskId} taskName={task.name} />
          )}
        </Space>
      </div>

      {/* 内容区域 */}
      <Tabs
        defaultActiveKey="overview"
        items={[
          {
            key: 'overview',
            label: '概览',
            children: (
              <TaskOverview
                task={{ ...task, status: currentStatus }}
                progress={currentProgress}
              />
            ),
          },
          ...(task.type === 'AB_TEST'
            ? [
                {
                  key: 'ab-results',
                  label: 'A/B 对比结果',
                  children: <ABTestResults taskId={taskId} />,
                },
              ]
            : []),
          {
            key: 'results',
            label: `结果列表 (${currentProgress.completed}/${currentProgress.total})`,
            children: (
              <ResultTable taskId={taskId} onViewDetail={handleViewDetail} />
            ),
          },
        ]}
      />

      {/* 结果详情抽屉 */}
      <ResultDetail
        result={selectedResult}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
    </div>
  )
}
