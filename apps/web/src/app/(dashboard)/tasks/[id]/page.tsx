'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button, Space, Spin, Typography, Tabs, Badge } from 'antd'
import { appMessage } from '@/lib/message'
import {
  ArrowLeftOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  PauseCircleOutlined,
  CaretRightOutlined,
  RobotOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import { PRIMARY } from '@/theme/colors'
import { useTask, useRunTask, useStopTask, useRetryTask, usePauseTask, useResumeTask, useRefreshTask } from '@/hooks/useTasks'
import { useTaskProgress } from '@/hooks/useTaskProgress'
import { useSmartAnalysis } from '@/hooks/useAnalysis'
import { useTaskAnomalyDetection } from '@/hooks/useAnomalyDetection'
import { TaskOverview } from '@/components/task/TaskOverview'
import { ResultTable } from '@/components/task/ResultTable'
import { ResultDetail } from '@/components/task/ResultDetail'
import { ExportButton } from '@/components/task/ExportButton'
import { ABTestResults } from '@/components/task/ABTestResults'
import { SmartAnalysisPanel } from '@/components/analysis'
import { TaskCompleteSummary, NextStepGuide } from '@/components/guidance'
import { AnomalyHint } from '@/components/alerts'
import { eventBus } from '@/lib/eventBus'
import type { TaskResultItem } from '@/services/tasks'
import type { FailedResult, PromptInfo } from '@/lib/analysis'

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
        // 触发任务完成事件
        if (task) {
          const { total, completed, failed } = task.progress
          const passed = completed - failed
          const passRate = total > 0 ? passed / total : 0
          eventBus.emit('task:completed', {
            taskId,
            taskName: task.name,
            passRate,
          })
        }
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

  // 智能分析
  const isTaskCompleted = ['COMPLETED', 'FAILED', 'STOPPED'].includes(task?.status || '')
  const hasFailed = task && (task.progress.failed > 0 || (task.progress.completed > 0 && (task.stats.passRate ?? 1) < 1))
  const {
    patterns,
    suggestions,
    isLoading: isAnalysisLoading,
    reanalyze,
  } = useSmartAnalysis(
    taskId,
    task?.prompts?.[0]?.promptId,
    isTaskCompleted && hasFailed
  )

  // 异常检测 - 获取提示词和模型组合
  const promptModelPairs = useMemo(() => {
    if (!task) return []
    const pairs: Array<{ promptId: string; modelId: string }> = []
    for (const prompt of task.prompts || []) {
      for (const model of task.models || []) {
        pairs.push({ promptId: prompt.promptId, modelId: model.modelId })
      }
    }
    return pairs
  }, [task])

  const { anomalies } = useTaskAnomalyDetection(
    taskId,
    promptModelPairs,
    '7d',
    { enabled: isTaskCompleted }
  )

  // 获取首个异常（如果存在）
  const primaryAnomaly = anomalies.length > 0 ? anomalies[0] : null

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
              style={{
                background: `linear-gradient(135deg, ${PRIMARY[400]} 0%, ${PRIMARY[500]} 50%, ${PRIMARY[600]} 100%)`,
                border: 'none',
                boxShadow: `0 2px 8px ${PRIMARY[500]}40`,
              }}
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
              style={currentStatus === 'PAUSED' ? {
                background: `linear-gradient(135deg, ${PRIMARY[400]} 0%, ${PRIMARY[500]} 50%, ${PRIMARY[600]} 100%)`,
                border: 'none',
                boxShadow: `0 2px 8px ${PRIMARY[500]}40`,
              } : undefined}
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
            <>
              <Button
                icon={<BarChartOutlined />}
                onClick={() => {
                  const promptId = task.prompts?.[0]?.promptId
                  const datasetId = task.dataset?.id
                  const params = new URLSearchParams()
                  if (promptId) params.set('promptId', promptId)
                  if (datasetId) params.set('datasetId', datasetId)
                  router.push(`/comparison/models?${params.toString()}`)
                }}
              >
                模型对比
              </Button>
              <ExportButton taskId={taskId} taskName={task.name} />
            </>
          )}
        </Space>
      </div>

      {/* 异常检测告警 */}
      {currentStatus === 'COMPLETED' && primaryAnomaly && (
        <AnomalyHint anomaly={primaryAnomaly} />
      )}

      {/* 任务完成摘要 */}
      {currentStatus === 'COMPLETED' && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <div style={{ flex: 2 }}>
            <TaskCompleteSummary
              stats={{
                total: currentProgress.total,
                passed: currentProgress.completed - currentProgress.failed,
                failed: currentProgress.failed,
              }}
              results={[]}
              onViewFailures={() => {
                // 切换到结果列表并筛选失败项
                const tab = document.querySelector('[data-node-key="results"]') as HTMLElement
                tab?.click()
              }}
              onOptimizePrompt={() => {
                const firstPrompt = task.prompts?.[0]
                if (firstPrompt?.promptId) {
                  router.push(`/prompts/${firstPrompt.promptId}`)
                }
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <NextStepGuide
              passRate={task.stats.passRate ?? 0}
              onViewFailures={() => {
                const tab = document.querySelector('[data-node-key="results"]') as HTMLElement
                tab?.click()
              }}
              onOptimizePrompt={() => {
                const firstPrompt = task.prompts?.[0]
                if (firstPrompt?.promptId) {
                  router.push(`/prompts/${firstPrompt.promptId}`)
                }
              }}
              onRerun={() => retryTask.mutate(taskId)}
            />
          </div>
        </div>
      )}

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
          // 智能分析标签页（仅在任务完成且有失败时显示）
          ...(isTaskCompleted && hasFailed
            ? [
                {
                  key: 'analysis',
                  label: (
                    <Space>
                      <RobotOutlined />
                      智能分析
                      {patterns && patterns.patterns.length > 0 && (
                        <Badge count={patterns.patterns.length} size="small" />
                      )}
                    </Space>
                  ),
                  children: (
                    <SmartAnalysisPanel
                      taskId={taskId}
                      failedResults={
                        patterns
                          ? patterns.patterns.flatMap(p =>
                              p.examples.map(e => ({
                                id: e.id,
                                input: JSON.parse(e.input || '{}'),
                                output: e.actual,
                                expected: e.expected,
                                status: 'FAILED',
                                evaluations: [],
                              }))
                            )
                          : []
                      }
                      prompt={
                        task.prompts?.[0]
                          ? {
                              id: task.prompts[0].promptId,
                              name: task.prompts[0].promptName,
                              content: '', // 由后端 API 获取
                            }
                          : undefined
                      }
                      loading={isAnalysisLoading}
                      onReanalyze={reanalyze}
                    />
                  ),
                },
              ]
            : []),
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
