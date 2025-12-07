'use client'

import { Card, Progress, Space, Typography, Button, Tag, Tooltip, Statistic, Row, Col } from 'antd'
import {
  EyeOutlined,
  StopOutlined,
  ReloadOutlined,
  ExportOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import type { CSSProperties, ReactNode } from 'react'
import type { TaskStatus, TaskProgress as TaskProgressType, TaskStats, TaskType } from '@platform/shared'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { PRIMARY, GRAY, SEMANTIC } from '@/theme/colors'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text, Title } = Typography

// 状态颜色映射 - 使用主题色
const STATUS_CONFIG: Record<TaskStatus, { color: string; icon: ReactNode; label: string }> = {
  PENDING: { color: GRAY[500], icon: <ClockCircleOutlined />, label: '等待中' },
  RUNNING: { color: PRIMARY[500], icon: <LoadingOutlined spin />, label: '执行中' },
  PAUSED: { color: SEMANTIC.warning, icon: <PauseCircleOutlined />, label: '已暂停' },
  COMPLETED: { color: SEMANTIC.success, icon: <CheckCircleOutlined />, label: '已完成' },
  FAILED: { color: SEMANTIC.error, icon: <CloseCircleOutlined />, label: '失败' },
  STOPPED: { color: GRAY[500], icon: <StopOutlined />, label: '已终止' },
}

type TaskCardProps = {
  id: string
  name: string
  status: TaskStatus
  type: TaskType
  progress: TaskProgressType
  stats?: TaskStats
  error?: string | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
  // 队列信息
  queuePosition?: number
  queueState?: string
  // 预估时间（可选）
  estimatedTime?: string
  // 回调
  onView?: () => void
  onRun?: () => void
  onStop?: () => void
  onPause?: () => void
  onResume?: () => void
  onRetry?: () => void
  onExport?: () => void
  // 状态
  loading?: boolean
}

export function TaskCard({
  id,
  name,
  status,
  type,
  progress,
  stats,
  error,
  startedAt,
  completedAt,
  createdAt,
  queuePosition,
  queueState,
  estimatedTime,
  onView,
  onRun,
  onStop,
  onPause,
  onResume,
  onRetry,
  onExport,
  loading = false,
}: TaskCardProps) {
  const statusConfig = STATUS_CONFIG[status]
  const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
  const passedCount = progress.completed - progress.failed
  const passRate = stats?.passRate !== undefined ? (stats.passRate * 100).toFixed(1) : null

  // 计算耗时
  const getDuration = () => {
    if (!startedAt) return null
    const start = dayjs(startedAt)
    const end = completedAt ? dayjs(completedAt) : dayjs()
    const diff = end.diff(start, 'second')
    if (diff < 60) return `${diff}秒`
    if (diff < 3600) return `${Math.floor(diff / 60)}分${diff % 60}秒`
    return `${Math.floor(diff / 3600)}时${Math.floor((diff % 3600) / 60)}分`
  }

  const cardStyle: CSSProperties = {
    borderRadius: 12,
    transition: 'all 0.3s ease',
    overflow: 'hidden',
  }

  const headerStyle: CSSProperties = {
    borderBottom: '1px solid #f0f0f0',
    paddingBottom: 12,
    marginBottom: 16,
  }

  // 渲染运行中状态的内容
  const renderRunningContent = () => (
    <>
      {/* 进度条 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text type="secondary">进度</Text>
          <Text strong>{percent}%</Text>
        </div>
        <Progress
          percent={percent}
          status="active"
          strokeColor={{
            '0%': PRIMARY[500],
            '100%': PRIMARY[400],
          }}
          showInfo={false}
        />
      </div>

      {/* 统计指标 */}
      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', background: GRAY[50], borderRadius: 6, minHeight: 56 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: GRAY[800], lineHeight: 1.2 }}>{progress.total}</div>
            <div style={{ fontSize: 11, color: GRAY[500], marginTop: 2 }}>总数</div>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', background: GRAY[50], borderRadius: 6, minHeight: 56 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: PRIMARY[500], lineHeight: 1.2 }}>{progress.completed}</div>
            <div style={{ fontSize: 11, color: GRAY[500], marginTop: 2 }}>已完成</div>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', background: GRAY[50], borderRadius: 6, minHeight: 56 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: SEMANTIC.success, lineHeight: 1.2 }}>{passedCount}</div>
            <div style={{ fontSize: 11, color: GRAY[500], marginTop: 2 }}>通过</div>
          </div>
        </Col>
        <Col span={6}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 4px', background: GRAY[50], borderRadius: 6, minHeight: 56 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: progress.failed > 0 ? SEMANTIC.error : GRAY[800], lineHeight: 1.2 }}>
              {progress.failed}
            </div>
            <div style={{ fontSize: 11, color: GRAY[500], marginTop: 2 }}>失败</div>
          </div>
        </Col>
      </Row>

      {/* 预估时间 & 操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          <ClockCircleOutlined style={{ marginRight: 4 }} />
          {estimatedTime ? `预估剩余: ${estimatedTime}` : getDuration() ? `已耗时: ${getDuration()}` : ''}
        </Text>
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={onView} style={{ color: PRIMARY[500] }}>
            查看详情
          </Button>
          {status === 'RUNNING' && onPause && (
            <Button type="link" size="small" icon={<PauseCircleOutlined />} onClick={onPause} style={{ color: PRIMARY[500] }}>
              暂停
            </Button>
          )}
          {(status === 'RUNNING' || queueState === 'active') && onStop && (
            <Button type="link" size="small" danger icon={<StopOutlined />} onClick={onStop} loading={loading}>
              终止
            </Button>
          )}
        </Space>
      </div>
    </>
  )

  // 渲染已完成/失败状态的内容
  const renderCompletedContent = () => (
    <>
      {/* 结果概览 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Statistic
            title="通过率"
            value={passRate || '-'}
            suffix={passRate ? '%' : ''}
            valueStyle={{
              color: passRate && parseFloat(passRate) >= 90 ? SEMANTIC.success : passRate && parseFloat(passRate) >= 70 ? SEMANTIC.warning : SEMANTIC.error,
              fontSize: 24,
            }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="耗时"
            value={getDuration() || '-'}
            valueStyle={{ fontSize: 24 }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="完成时间"
            value={completedAt ? dayjs(completedAt).fromNow() : '-'}
            valueStyle={{ fontSize: 16, color: GRAY[500] }}
          />
        </Col>
      </Row>

      {/* 错误信息 */}
      {error && (
        <div style={{
          background: '#fff2f0',
          border: '1px solid #ffccc7',
          borderRadius: 6,
          padding: '8px 12px',
          marginBottom: 16,
        }}>
          <Text type="danger" style={{ fontSize: 13 }}>
            {error}
          </Text>
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={onView} style={{ color: PRIMARY[500] }}>
            查看详情
          </Button>
          {progress.failed > 0 && onRetry && (
            <Button type="link" size="small" icon={<ReloadOutlined />} onClick={onRetry} loading={loading} style={{ color: PRIMARY[500] }}>
              重试失败
            </Button>
          )}
          {onExport && (
            <Button type="link" size="small" icon={<ExportOutlined />} onClick={onExport} style={{ color: PRIMARY[500] }}>
              导出报告
            </Button>
          )}
        </Space>
      </div>
    </>
  )

  // 渲染等待中状态的内容
  const renderPendingContent = () => (
    <>
      <div style={{
        textAlign: 'center',
        padding: '24px 0',
        color: GRAY[500],
      }}>
        {queueState === 'waiting' ? (
          <>
            <ClockCircleOutlined style={{ fontSize: 32, marginBottom: 12 }} />
            <div>队列等待中，位置 #{queuePosition || '?'}</div>
          </>
        ) : (
          <>
            <ClockCircleOutlined style={{ fontSize: 32, marginBottom: 12 }} />
            <div>等待执行</div>
          </>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={onView} style={{ color: PRIMARY[500] }}>
            查看详情
          </Button>
          {!queueState && onRun && (
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={onRun} loading={loading} style={{ color: PRIMARY[500] }}>
              启动任务
            </Button>
          )}
        </Space>
      </div>
    </>
  )

  // 渲染暂停状态的内容
  const renderPausedContent = () => (
    <>
      {/* 进度条 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text type="secondary">进度</Text>
          <Text strong>{percent}%</Text>
        </div>
        <Progress
          percent={percent}
          status="normal"
          strokeColor={SEMANTIC.warning}
          showInfo={false}
        />
      </div>

      {/* 统计指标 */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <div style={{ textAlign: 'center', padding: '8px 0', background: GRAY[50], borderRadius: 6 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: GRAY[800] }}>{progress.completed}/{progress.total}</div>
            <div style={{ fontSize: 12, color: GRAY[500] }}>已完成</div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center', padding: '8px 0', background: GRAY[50], borderRadius: 6 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: SEMANTIC.success }}>{passedCount}</div>
            <div style={{ fontSize: 12, color: GRAY[500] }}>通过</div>
          </div>
        </Col>
        <Col span={8}>
          <div style={{ textAlign: 'center', padding: '8px 0', background: GRAY[50], borderRadius: 6 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: progress.failed > 0 ? SEMANTIC.error : GRAY[800] }}>
              {progress.failed}
            </div>
            <div style={{ fontSize: 12, color: GRAY[500] }}>失败</div>
          </div>
        </Col>
      </Row>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={onView} style={{ color: PRIMARY[500] }}>
            查看详情
          </Button>
          {onResume && (
            <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={onResume} loading={loading} style={{ color: PRIMARY[500] }}>
              继续执行
            </Button>
          )}
          {onStop && (
            <Button type="link" size="small" danger icon={<StopOutlined />} onClick={onStop} loading={loading}>
              终止
            </Button>
          )}
        </Space>
      </div>
    </>
  )

  // 根据状态渲染内容
  const renderContent = () => {
    switch (status) {
      case 'RUNNING':
        return renderRunningContent()
      case 'COMPLETED':
      case 'FAILED':
      case 'STOPPED':
        return renderCompletedContent()
      case 'PENDING':
        return renderPendingContent()
      case 'PAUSED':
        return renderPausedContent()
      default:
        return null
    }
  }

  return (
    <Card
      style={cardStyle}
      styles={{
        body: { padding: 20 },
      }}
      hoverable
      className="task-card"
    >
      {/* 卡片头部 */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {type === 'AB_TEST' && (
                <Tag color="purple" icon={<ExperimentOutlined />}>
                  A/B 测试
                </Tag>
              )}
              <Title level={5} style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
              </Title>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              创建于 {dayjs(createdAt).format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
          <Tag
            color={statusConfig.color}
            icon={statusConfig.icon}
            style={{
              marginLeft: 8,
              borderRadius: 4,
              padding: '2px 8px',
            }}
          >
            {statusConfig.label}
          </Tag>
        </div>
      </div>

      {/* 卡片内容 */}
      {renderContent()}

      <style jsx global>{`
        .task-card {
          border: 1px solid ${GRAY[200]};
        }
        .task-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          border-color: ${PRIMARY[300]};
        }
      `}</style>
    </Card>
  )
}
