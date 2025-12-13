# Phase 4: 暂停与接管 - 任务清单

## 任务概览

| 任务 | 优先级 | 预估 | 状态 |
|------|-------|------|------|
| 4.1 实现暂停控制器 | P0 | 2h | ✅ 完成 |
| 4.2 实现暂停状态面板 | P0 | 2h | ✅ 完成 |
| 4.3 实现控制权转移 | P0 | 2h | ✅ 完成 |
| 4.4 实现任务取消与回滚 | P1 | 2h | ✅ 完成 |
| 4.5 集成控制按钮 | P0 | 1h | ✅ 完成 |

---

## 4.1 实现暂停控制器

**文件**: `apps/web/src/lib/goi/execution/pauseController.ts`（新建）

### 任务描述

实现暂停信号处理和状态管理。

### 具体步骤

- [ ] 创建暂停控制器：

```typescript
import { create } from 'zustand'
import type { PlanStep } from '@platform/shared'

/**
 * 暂停状态
 */
export type PauseState = {
  isPaused: boolean
  isPausing: boolean           // 正在暂停（等待当前操作完成）
  pausedAt?: Date
  pausedAtStepId?: string
  pauseReason?: 'user_request' | 'checkpoint' | 'error'
}

/**
 * 暂停控制器 Store
 */
export const usePauseStore = create<PauseState & {
  requestPause: (reason?: PauseState['pauseReason']) => Promise<void>
  confirmPaused: (stepId: string) => void
  resume: () => void
  reset: () => void
}>((set, get) => {
  let pauseResolve: (() => void) | null = null

  return {
    isPaused: false,
    isPausing: false,

    requestPause: async (reason = 'user_request') => {
      set({ isPausing: true, pauseReason: reason })

      // 等待执行器确认暂停
      return new Promise(resolve => {
        pauseResolve = resolve
      })
    },

    confirmPaused: (stepId: string) => {
      set({
        isPaused: true,
        isPausing: false,
        pausedAt: new Date(),
        pausedAtStepId: stepId,
      })
      pauseResolve?.()
      pauseResolve = null
    },

    resume: () => {
      set({
        isPaused: false,
        isPausing: false,
        pausedAt: undefined,
        pausedAtStepId: undefined,
        pauseReason: undefined,
      })
    },

    reset: () => {
      set({
        isPaused: false,
        isPausing: false,
        pausedAt: undefined,
        pausedAtStepId: undefined,
        pauseReason: undefined,
      })
      pauseResolve = null
    },
  }
})

/**
 * 暂停检查点 - 在执行步骤间调用
 */
export function checkPausePoint(): boolean {
  const state = usePauseStore.getState()
  return state.isPausing
}

/**
 * 确认已暂停
 */
export function confirmPaused(stepId: string): void {
  usePauseStore.getState().confirmPaused(stepId)
}
```

---

## 4.2 实现暂停状态面板

**文件**: `apps/web/src/components/goi/PauseStatusPanel.tsx`（新建）

### 任务描述

创建暂停状态展示面板。

### 具体步骤

- [ ] 创建状态面板组件：

```tsx
'use client'

import { Card, Button, Space, Typography, List, Divider, Tag } from 'antd'
import {
  PlayCircleOutlined,
  HandOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import { usePauseStore } from '@/lib/goi/execution/pauseController'
import { useExecutionStore } from '@/lib/goi/execution/progressSync'
import type { PlanStep } from '@platform/shared'

const { Text, Title } = Typography

type PauseStatusPanelProps = {
  onResume: () => void
  onTakeover: () => void
  onCancel: () => void
}

export function PauseStatusPanel({
  onResume,
  onTakeover,
  onCancel,
}: PauseStatusPanelProps) {
  const { isPaused, pausedAt, pausedAtStepId } = usePauseStore()
  const { plan, progress } = useExecutionStore()

  if (!isPaused || !plan) return null

  // 分类步骤
  const completedSteps = plan.steps.filter(s => s.status === 'completed')
  const currentStep = plan.steps.find(s => s.id === pausedAtStepId)
  const pendingSteps = plan.steps.filter(s =>
    s.status === 'pending' && s.id !== pausedAtStepId
  )

  const getStatusIcon = (status: PlanStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'executing':
        return <LoadingOutlined style={{ color: '#1890ff' }} />
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />
      default:
        return null
    }
  }

  return (
    <Card
      title={
        <Space>
          <span>⏸️</span>
          <span>已暂停</span>
          {pausedAt && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {pausedAt.toLocaleTimeString()}
            </Text>
          )}
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {/* 已完成 */}
      {completedSteps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">已完成 ({completedSteps.length}/{plan.steps.length}):</Text>
          <List
            size="small"
            dataSource={completedSteps}
            renderItem={step => (
              <List.Item style={{ padding: '4px 0', border: 'none' }}>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text delete={step.status === 'skipped'}>{step.userLabel}</Text>
                </Space>
              </List.Item>
            )}
          />
        </div>
      )}

      {/* 当前步骤 */}
      {currentStep && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">暂停在:</Text>
          <Card
            size="small"
            style={{ marginTop: 8, background: '#fff7e6' }}
            bodyStyle={{ padding: '8px 12px' }}
          >
            <Space>
              <Tag color="orange">当前</Tag>
              <Text strong>{currentStep.userLabel}</Text>
            </Space>
            {currentStep.hint && (
              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  💡 {currentStep.hint}
                </Text>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 待执行 */}
      {pendingSteps.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">等待执行 ({pendingSteps.length}项):</Text>
          <List
            size="small"
            dataSource={pendingSteps.slice(0, 5)}
            renderItem={step => (
              <List.Item style={{ padding: '4px 0', border: 'none' }}>
                <Space>
                  <ClockCircleOutlined style={{ color: '#d9d9d9' }} />
                  <Text type="secondary">{step.userLabel}</Text>
                </Space>
              </List.Item>
            )}
          />
          {pendingSteps.length > 5 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              ... 还有 {pendingSteps.length - 5} 项
            </Text>
          )}
        </div>
      )}

      <Divider style={{ margin: '12px 0' }} />

      {/* 操作按钮 */}
      <Space style={{ width: '100%', justifyContent: 'center' }}>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={onResume}
        >
          继续执行
        </Button>
        <Button
          icon={<HandOutlined />}
          onClick={onTakeover}
        >
          我来操作
        </Button>
        <Button
          danger
          icon={<CloseCircleOutlined />}
          onClick={onCancel}
        >
          取消任务
        </Button>
      </Space>
    </Card>
  )
}
```

---

## 4.3 实现控制权转移

**文件**: `apps/web/src/lib/goi/execution/controlTransfer.ts`（新建）

### 任务描述

实现 AI 和用户之间的控制权转移。

### 具体步骤

- [ ] 创建控制权管理器：

```typescript
import { create } from 'zustand'

/**
 * 控制模式
 */
export type ControlMode = 'ai' | 'human' | 'collaborative'

/**
 * 控制权持有者
 */
export type ControlHolder = 'ai' | 'user'

/**
 * 用户手动操作记录
 */
export type ManualAction = {
  id: string
  timestamp: Date
  type: 'navigate' | 'click' | 'input' | 'select' | 'submit'
  target: string
  data?: unknown
}

/**
 * 控制权状态
 */
export type ControlState = {
  mode: ControlMode
  holder: ControlHolder
  transferredAt?: Date
  manualActions: ManualAction[]
}

/**
 * 控制权 Store
 */
export const useControlStore = create<ControlState & {
  transferToUser: () => void
  transferToAI: () => void
  recordManualAction: (action: Omit<ManualAction, 'id' | 'timestamp'>) => void
  clearManualActions: () => void
  setMode: (mode: ControlMode) => void
  reset: () => void
}>((set, get) => ({
  mode: 'ai',
  holder: 'ai',
  manualActions: [],

  transferToUser: () => set({
    holder: 'user',
    transferredAt: new Date(),
  }),

  transferToAI: () => set({
    holder: 'ai',
    transferredAt: new Date(),
  }),

  recordManualAction: (action) => {
    const newAction: ManualAction = {
      ...action,
      id: `action-${Date.now()}`,
      timestamp: new Date(),
    }
    set(state => ({
      manualActions: [...state.manualActions, newAction],
    }))
  },

  clearManualActions: () => set({ manualActions: [] }),

  setMode: (mode) => set({ mode }),

  reset: () => set({
    mode: 'ai',
    holder: 'ai',
    transferredAt: undefined,
    manualActions: [],
  }),
}))

/**
 * 接管控制权（用户操作）
 */
export function takeoverControl(): void {
  const store = useControlStore.getState()
  store.transferToUser()
  store.clearManualActions()
}

/**
 * 交还控制权（给 AI）
 */
export function handbackControl(): ManualAction[] {
  const store = useControlStore.getState()
  const actions = [...store.manualActions]
  store.transferToAI()
  store.clearManualActions()
  return actions
}

/**
 * 检查当前控制者
 */
export function isUserInControl(): boolean {
  return useControlStore.getState().holder === 'user'
}
```

---

## 4.4 实现任务取消与回滚

**文件**: `apps/web/src/lib/goi/execution/taskCancel.ts`（新建）

### 任务描述

实现任务取消和状态回滚。

### 具体步骤

- [ ] 创建取消处理器：

```typescript
import { useExecutionStore } from './progressSync'
import { usePauseStore } from './pauseController'
import { useControlStore } from './controlTransfer'
import { snapshotManager } from '../../snapshot'

/**
 * 取消任务
 */
export async function cancelTask(sessionId: string): Promise<{
  success: boolean
  rollbackResult?: { restored: boolean; error?: string }
}> {
  try {
    // 1. 停止执行
    usePauseStore.getState().reset()
    useControlStore.getState().reset()

    // 2. 获取任务开始时的快照
    const snapshot = await snapshotManager.getLatestSnapshot(sessionId, 'task_start')

    // 3. 回滚到快照
    if (snapshot) {
      const rollbackResult = await snapshotManager.restoreSnapshot(snapshot.id)

      // 4. 重置执行状态
      useExecutionStore.getState().reset()

      return {
        success: true,
        rollbackResult: { restored: true },
      }
    }

    // 没有快照，只重置状态
    useExecutionStore.getState().reset()

    return {
      success: true,
      rollbackResult: { restored: false },
    }
  } catch (error) {
    return {
      success: false,
      rollbackResult: {
        restored: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }
  }
}

/**
 * 确认取消对话框
 */
export function showCancelConfirmation(
  onConfirm: () => void,
  onCancel: () => void
): void {
  // 使用 Ant Design Modal.confirm
  // Modal.confirm({
  //   title: '确定要取消任务吗？',
  //   content: '取消后将回滚到任务开始前的状态',
  //   okText: '确定取消',
  //   cancelText: '继续执行',
  //   okButtonProps: { danger: true },
  //   onOk: onConfirm,
  //   onCancel: onCancel,
  // })
}
```

---

## 4.5 集成控制按钮

**文件**: 更新 `apps/web/src/components/goi/CopilotPanel/index.tsx`

### 任务描述

在 Copilot 面板中集成暂停/继续/接管按钮。

### 具体步骤

- [ ] 创建控制按钮组件：

```tsx
// apps/web/src/components/goi/ExecutionControls.tsx
'use client'

import { Button, Space, Tooltip } from 'antd'
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  HandOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { usePauseStore } from '@/lib/goi/execution/pauseController'
import { useExecutionStore } from '@/lib/goi/execution/progressSync'
import { useControlStore, takeoverControl, handbackControl } from '@/lib/goi/execution/controlTransfer'
import { cancelTask } from '@/lib/goi/execution/taskCancel'

export function ExecutionControls() {
  const { status } = useExecutionStore()
  const { isPaused, isPausing, requestPause, resume } = usePauseStore()
  const { holder } = useControlStore()

  const isRunning = status === 'executing'
  const canPause = isRunning && !isPausing
  const canResume = isPaused && holder === 'ai'
  const canTakeover = isPaused && holder === 'ai'
  const canHandback = holder === 'user'

  const handlePause = async () => {
    await requestPause('user_request')
  }

  const handleResume = () => {
    resume()
    // 触发执行器继续
  }

  const handleTakeover = () => {
    takeoverControl()
  }

  const handleHandback = () => {
    const actions = handbackControl()
    console.log('User actions during takeover:', actions)
    // AI 可以分析用户操作，更新计划
  }

  const handleCancel = async () => {
    await cancelTask('current-session')
  }

  if (status === 'idle' || status === 'completed') {
    return null
  }

  return (
    <div className="execution-controls">
      <Space>
        {/* 暂停/继续 */}
        {canPause && (
          <Tooltip title="暂停执行">
            <Button
              icon={<PauseCircleOutlined />}
              onClick={handlePause}
              loading={isPausing}
            >
              暂停
            </Button>
          </Tooltip>
        )}

        {canResume && (
          <Tooltip title="继续执行">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleResume}
            >
              继续
            </Button>
          </Tooltip>
        )}

        {/* 接管/交还 */}
        {canTakeover && (
          <Tooltip title="我来手动操作">
            <Button
              icon={<HandOutlined />}
              onClick={handleTakeover}
            >
              我来操作
            </Button>
          </Tooltip>
        )}

        {canHandback && (
          <Tooltip title="让 AI 继续">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleHandback}
            >
              交给 AI
            </Button>
          </Tooltip>
        )}

        {/* 取消 */}
        {(isRunning || isPaused) && (
          <Tooltip title="取消并回滚">
            <Button
              danger
              icon={<StopOutlined />}
              onClick={handleCancel}
            >
              取消
            </Button>
          </Tooltip>
        )}
      </Space>

      {/* 状态提示 */}
      {isPausing && (
        <div className="status-hint">
          正在暂停，等待当前操作完成...
        </div>
      )}

      {holder === 'user' && (
        <div className="status-hint">
          ✋ 你正在控制，完成后点击"交给 AI"继续
        </div>
      )}
    </div>
  )
}
```

- [ ] 集成到 CopilotPanel

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-13 | 4.1 实现暂停控制器 | ✅ 完成 | pauseController.ts |
| 2025-12-13 | 4.2 实现暂停状态面板 | ✅ 完成 | PauseStatusPanel.tsx |
| 2025-12-13 | 4.3 实现控制权转移 | ✅ 完成 | controlTransfer.ts |
| 2025-12-13 | 4.4 实现任务取消与回滚 | ✅ 完成 | taskCancel.ts |
| 2025-12-13 | 4.5 集成控制按钮 | ✅ 完成 | ExecutionControls.tsx + CopilotPanel 集成 |
