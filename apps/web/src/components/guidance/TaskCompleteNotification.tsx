'use client'

import { useCallback, useEffect, useRef } from 'react'
import { notification, Button, Space, Progress } from 'antd'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEventBus, type EventData } from '@/lib/eventBus'

type TaskCompletedData = EventData['task:completed']

/**
 * 任务完成通知组件
 *
 * 监听任务完成事件并弹出通知
 */
export function TaskCompleteNotification() {
  const router = useRouter()
  const [api, contextHolder] = notification.useNotification()
  const notifiedTasksRef = useRef<Set<string>>(new Set())

  const showNotification = useCallback(
    (data: TaskCompletedData) => {
      // 避免重复通知
      if (notifiedTasksRef.current.has(data.taskId)) {
        return
      }
      notifiedTasksRef.current.add(data.taskId)

      const passRate = data.passRate * 100
      const isGood = passRate >= 80
      const isMedium = passRate >= 50

      const getIcon = () => {
        if (isGood) return <CheckCircle size={20} style={{ color: '#52c41a' }} />
        if (isMedium) return <AlertTriangle size={20} style={{ color: '#faad14' }} />
        return <XCircle size={20} style={{ color: '#ff4d4f' }} />
      }

      const getStatusColor = () => {
        if (isGood) return '#52c41a'
        if (isMedium) return '#faad14'
        return '#ff4d4f'
      }

      api.open({
        key: `task-complete-${data.taskId}`,
        message: (
          <Space>
            {getIcon()}
            <span>任务完成</span>
          </Space>
        ),
        description: (
          <div>
            <div style={{ marginBottom: 8 }}>{data.taskName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Progress
                type="line"
                percent={Math.round(passRate)}
                size="small"
                strokeColor={getStatusColor()}
                style={{ flex: 1, marginBottom: 0 }}
              />
              <Button
                type="link"
                size="small"
                onClick={() => {
                  router.push(`/tasks/${data.taskId}`)
                  api.destroy(`task-complete-${data.taskId}`)
                }}
                style={{ padding: 0 }}
              >
                查看详情
              </Button>
            </div>
          </div>
        ),
        duration: 8,
        placement: 'bottomRight',
      })
    },
    [api, router]
  )

  // 监听任务完成事件
  useEventBus('task:completed', showNotification, [showNotification])

  // 清理超时的任务 ID
  useEffect(() => {
    const timer = setInterval(() => {
      // 保留最近 20 个任务 ID
      const ids = Array.from(notifiedTasksRef.current)
      if (ids.length > 20) {
        notifiedTasksRef.current = new Set(ids.slice(-20))
      }
    }, 60000)

    return () => clearInterval(timer)
  }, [])

  return <>{contextHolder}</>
}
