# Phase 2: 操作可视化 - 任务清单

## 任务概览

| 任务 | 优先级 | 预估 | 状态 |
|------|-------|------|------|
| 2.1 实现高亮组件 | P0 | 2h | ✅ 完成 |
| 2.2 实现操作气泡 | P0 | 2h | ✅ 完成 |
| 2.3 实现执行速度控制 | P1 | 1h | ✅ 完成 |
| 2.4 实现进度同步 | P0 | 2h | ✅ 完成 |
| 2.5 集成到执行循环 | P0 | 2h | ✅ 完成 |

---

## 2.1 实现高亮组件

**文件**: `apps/web/src/components/goi/OperationHighlight.tsx`（新建）

### 任务描述

创建目标元素高亮组件，提供视觉焦点。

### 具体步骤

- [ ] 创建组件文件：

```tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

type HighlightProps = {
  targetSelector?: string       // CSS 选择器
  targetElement?: HTMLElement   // 直接传入元素
  isActive: boolean
  pulseColor?: string           // 光圈颜色
  showClickEffect?: boolean     // 是否显示点击效果
  onClickEffectEnd?: () => void
}

export function OperationHighlight({
  targetSelector,
  targetElement,
  isActive,
  pulseColor = '#3b82f6',
  showClickEffect = false,
  onClickEffectEnd,
}: HighlightProps) {
  const [position, setPosition] = useState<DOMRect | null>(null)
  const [showClick, setShowClick] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // 获取目标元素
  useEffect(() => {
    if (!isActive) {
      setPosition(null)
      return
    }

    const target = targetElement || (targetSelector ? document.querySelector(targetSelector) : null)
    if (!target) return

    const updatePosition = () => {
      const rect = (target as HTMLElement).getBoundingClientRect()
      setPosition(rect)
    }

    updatePosition()

    // 监听滚动和 resize
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [targetSelector, targetElement, isActive])

  // 点击效果
  useEffect(() => {
    if (showClickEffect && position) {
      setShowClick(true)
      const timer = setTimeout(() => {
        setShowClick(false)
        onClickEffectEnd?.()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [showClickEffect, position, onClickEffectEnd])

  if (!isActive || !position) return null

  const highlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: position.top - 4,
    left: position.left - 4,
    width: position.width + 8,
    height: position.height + 8,
    borderRadius: '6px',
    pointerEvents: 'none',
    zIndex: 10000,
    animation: 'goi-breathe 1.5s ease-in-out infinite',
    boxShadow: `
      0 0 0 2px ${pulseColor}80,
      0 0 0 4px ${pulseColor}50,
      0 0 0 8px ${pulseColor}20
    `,
  }

  const clickEffectStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '20px',
    height: '20px',
    marginTop: '-10px',
    marginLeft: '-10px',
    borderRadius: '50%',
    background: `${pulseColor}80`,
    animation: 'goi-click-ripple 0.5s ease-out forwards',
  }

  return createPortal(
    <div ref={overlayRef}>
      <style>{`
        @keyframes goi-breathe {
          0%, 100% {
            box-shadow:
              0 0 0 2px ${pulseColor}80,
              0 0 0 4px ${pulseColor}50,
              0 0 0 8px ${pulseColor}20;
          }
          50% {
            box-shadow:
              0 0 0 4px ${pulseColor}90,
              0 0 0 8px ${pulseColor}60,
              0 0 0 12px ${pulseColor}30;
          }
        }
        @keyframes goi-click-ripple {
          0% { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>
      <div style={highlightStyle}>
        {showClick && <div style={clickEffectStyle} />}
      </div>
    </div>,
    document.body
  )
}
```

- [ ] 导出组件
- [ ] 添加样式文件（可选）

---

## 2.2 实现操作气泡

**文件**: `apps/web/src/components/goi/ActionBubble.tsx`（新建）

### 任务描述

创建操作说明气泡，告诉用户 AI 正在做什么。

### 具体步骤

- [ ] 创建组件文件：

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type BubblePosition = 'top' | 'bottom' | 'left' | 'right'

type ActionBubbleProps = {
  targetSelector?: string
  targetElement?: HTMLElement
  message: string
  icon?: string
  position?: BubblePosition
  isVisible: boolean
  autoHide?: number           // 自动隐藏时间（ms）
  onHide?: () => void
}

export function ActionBubble({
  targetSelector,
  targetElement,
  message,
  icon = '🤖',
  position = 'top',
  isVisible,
  autoHide,
  onHide,
}: ActionBubbleProps) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)
  const [visible, setVisible] = useState(isVisible)

  // 计算位置
  useEffect(() => {
    if (!isVisible) {
      setVisible(false)
      return
    }

    const target = targetElement || (targetSelector ? document.querySelector(targetSelector) : null)
    if (!target) return

    const rect = (target as HTMLElement).getBoundingClientRect()
    const padding = 12

    let x: number, y: number

    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2
        y = rect.top - padding
        break
      case 'bottom':
        x = rect.left + rect.width / 2
        y = rect.bottom + padding
        break
      case 'left':
        x = rect.left - padding
        y = rect.top + rect.height / 2
        break
      case 'right':
        x = rect.right + padding
        y = rect.top + rect.height / 2
        break
    }

    setCoords({ x, y })
    setVisible(true)
  }, [targetSelector, targetElement, position, isVisible])

  // 自动隐藏
  useEffect(() => {
    if (!visible || !autoHide) return

    const timer = setTimeout(() => {
      setVisible(false)
      onHide?.()
    }, autoHide)

    return () => clearTimeout(timer)
  }, [visible, autoHide, onHide])

  if (!visible || !coords) return null

  const bubbleStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10001,
    padding: '8px 12px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
    color: 'white',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    animation: 'goi-bubble-appear 0.2s ease-out',
    ...(position === 'top' && {
      left: coords.x,
      top: coords.y,
      transform: 'translate(-50%, -100%)',
    }),
    ...(position === 'bottom' && {
      left: coords.x,
      top: coords.y,
      transform: 'translate(-50%, 0)',
    }),
    ...(position === 'left' && {
      left: coords.x,
      top: coords.y,
      transform: 'translate(-100%, -50%)',
    }),
    ...(position === 'right' && {
      left: coords.x,
      top: coords.y,
      transform: 'translate(0, -50%)',
    }),
  }

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    border: '6px solid transparent',
    ...(position === 'top' && {
      bottom: '-12px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderTopColor: '#334155',
    }),
    ...(position === 'bottom' && {
      top: '-12px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderBottomColor: '#1e293b',
    }),
  }

  return createPortal(
    <>
      <style>{`
        @keyframes goi-bubble-appear {
          from { opacity: 0; transform: translate(-50%, -100%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
        }
      `}</style>
      <div style={bubbleStyle}>
        <span>{icon}</span>
        <span>{message}</span>
        <div style={arrowStyle} />
      </div>
    </>,
    document.body
  )
}
```

---

## 2.3 实现执行速度控制

**文件**: `apps/web/src/lib/goi/execution/speedControl.ts`（新建）

### 任务描述

实现执行速度控制，让用户可以调节 AI 操作的快慢。

### 具体步骤

- [ ] 创建速度控制模块：

```typescript
/**
 * 执行速度等级
 */
export type ExecutionSpeed = 'fast' | 'normal' | 'slow' | 'step'

/**
 * 速度配置
 */
export const SPEED_CONFIG: Record<ExecutionSpeed, {
  delay: number           // 操作间隔（ms）
  highlightDuration: number  // 高亮持续时间
  bubbleDuration: number     // 气泡显示时间
  label: string
}> = {
  fast: {
    delay: 200,
    highlightDuration: 300,
    bubbleDuration: 500,
    label: '快速',
  },
  normal: {
    delay: 800,
    highlightDuration: 600,
    bubbleDuration: 1500,
    label: '正常',
  },
  slow: {
    delay: 2000,
    highlightDuration: 1500,
    bubbleDuration: 3000,
    label: '慢速（演示）',
  },
  step: {
    delay: -1,  // 需要手动确认
    highlightDuration: -1,
    bubbleDuration: -1,
    label: '单步执行',
  },
}

/**
 * 速度控制器
 */
export class SpeedController {
  private speed: ExecutionSpeed = 'normal'
  private stepResolve: (() => void) | null = null

  setSpeed(speed: ExecutionSpeed): void {
    this.speed = speed
  }

  getSpeed(): ExecutionSpeed {
    return this.speed
  }

  getConfig() {
    return SPEED_CONFIG[this.speed]
  }

  /**
   * 等待适当的时间
   */
  async wait(): Promise<void> {
    const config = SPEED_CONFIG[this.speed]

    if (config.delay === -1) {
      // 单步模式：等待用户确认
      return new Promise(resolve => {
        this.stepResolve = resolve
      })
    }

    return new Promise(resolve => setTimeout(resolve, config.delay))
  }

  /**
   * 用户确认继续（单步模式）
   */
  confirmStep(): void {
    if (this.stepResolve) {
      this.stepResolve()
      this.stepResolve = null
    }
  }
}

// 全局单例
export const speedController = new SpeedController()
```

- [ ] 创建速度选择器组件：

```tsx
// apps/web/src/components/goi/SpeedSelector.tsx
'use client'

import { useState } from 'react'
import { ExecutionSpeed, SPEED_CONFIG, speedController } from '@/lib/goi/execution/speedControl'

export function SpeedSelector() {
  const [speed, setSpeed] = useState<ExecutionSpeed>(speedController.getSpeed())

  const handleChange = (newSpeed: ExecutionSpeed) => {
    setSpeed(newSpeed)
    speedController.setSpeed(newSpeed)
  }

  return (
    <div className="speed-selector">
      <label>执行速度：</label>
      <div className="speed-options">
        {(Object.keys(SPEED_CONFIG) as ExecutionSpeed[]).map(s => (
          <button
            key={s}
            className={`speed-option ${speed === s ? 'active' : ''}`}
            onClick={() => handleChange(s)}
          >
            {SPEED_CONFIG[s].label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## 2.4 实现进度同步

**文件**: `apps/web/src/lib/goi/execution/progressSync.ts`（新建）

### 任务描述

实现执行进度与 UI 的实时同步。

### 具体步骤

- [ ] 创建进度同步模块：

```typescript
import { create } from 'zustand'
import type { PlanStep, TaskPlan } from '@platform/shared'

/**
 * 执行状态
 */
export type ExecutionState = {
  // 计划
  plan: TaskPlan | null
  // 当前步骤
  currentStepId: string | null
  // 高亮目标
  highlightTarget: string | null
  // 操作消息
  actionMessage: string | null
  // 是否显示点击效果
  showClickEffect: boolean
  // 进度
  progress: {
    completed: number
    total: number
    percentage: number
  }
  // 状态
  status: 'idle' | 'planning' | 'ready' | 'executing' | 'paused' | 'checkpoint' | 'completed' | 'failed'
}

/**
 * 执行状态 Store
 */
export const useExecutionStore = create<ExecutionState & {
  // Actions
  setPlan: (plan: TaskPlan) => void
  startStep: (stepId: string, target: string, message: string) => void
  completeStep: (stepId: string) => void
  failStep: (stepId: string, error: string) => void
  showClick: () => void
  setStatus: (status: ExecutionState['status']) => void
  reset: () => void
}>((set, get) => ({
  // Initial state
  plan: null,
  currentStepId: null,
  highlightTarget: null,
  actionMessage: null,
  showClickEffect: false,
  progress: { completed: 0, total: 0, percentage: 0 },
  status: 'idle',

  // Actions
  setPlan: (plan) => set({
    plan,
    progress: { completed: 0, total: plan.steps.length, percentage: 0 },
    status: 'ready',
  }),

  startStep: (stepId, target, message) => set({
    currentStepId: stepId,
    highlightTarget: target,
    actionMessage: message,
    showClickEffect: false,
    status: 'executing',
  }),

  completeStep: (stepId) => {
    const state = get()
    const plan = state.plan
    if (!plan) return

    // 更新步骤状态
    const updatedSteps = plan.steps.map(s =>
      s.id === stepId ? { ...s, status: 'completed' as const } : s
    )
    const completed = updatedSteps.filter(s => s.status === 'completed').length

    set({
      plan: { ...plan, steps: updatedSteps },
      currentStepId: null,
      highlightTarget: null,
      actionMessage: null,
      progress: {
        completed,
        total: plan.steps.length,
        percentage: Math.round((completed / plan.steps.length) * 100),
      },
    })
  },

  failStep: (stepId, error) => {
    const state = get()
    const plan = state.plan
    if (!plan) return

    const updatedSteps = plan.steps.map(s =>
      s.id === stepId ? { ...s, status: 'failed' as const, error } : s
    )

    set({
      plan: { ...plan, steps: updatedSteps },
      status: 'failed',
    })
  },

  showClick: () => set({ showClickEffect: true }),

  setStatus: (status) => set({ status }),

  reset: () => set({
    plan: null,
    currentStepId: null,
    highlightTarget: null,
    actionMessage: null,
    showClickEffect: false,
    progress: { completed: 0, total: 0, percentage: 0 },
    status: 'idle',
  }),
}))
```

---

## 2.5 集成到执行循环

**文件**: `apps/web/src/lib/goi/execution/executor.ts`（新建或修改）

### 任务描述

将可视化组件集成到执行循环中。

### 具体步骤

- [ ] 创建可视化执行器：

```typescript
import { speedController } from './speedControl'
import { useExecutionStore } from './progressSync'
import type { TaskPlan, PlanStep, GoiOperation } from '@platform/shared'
import { executeAccess, executeState } from '../executor'

/**
 * 可视化执行器
 */
export class VisualExecutor {
  private plan: TaskPlan
  private abortController: AbortController | null = null

  constructor(plan: TaskPlan) {
    this.plan = plan
  }

  /**
   * 开始执行
   */
  async execute(): Promise<void> {
    const store = useExecutionStore.getState()
    store.setPlan(this.plan)

    this.abortController = new AbortController()

    try {
      for (const step of this.plan.steps) {
        // 检查是否被中止
        if (this.abortController.signal.aborted) {
          break
        }

        // 跳过已完成或跳过的步骤
        if (step.status === 'completed' || step.status === 'skipped') {
          continue
        }

        // 执行步骤
        await this.executeStep(step)

        // 等待（根据速度设置）
        await speedController.wait()
      }

      store.setStatus('completed')
    } catch (error) {
      store.setStatus('failed')
      throw error
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: PlanStep): Promise<void> {
    const store = useExecutionStore.getState()

    // 1. 开始步骤（显示高亮和消息）
    const target = this.getTargetSelector(step.operation)
    store.startStep(step.id, target, step.userLabel)

    // 2. 等待高亮显示一段时间
    const config = speedController.getConfig()
    if (config.highlightDuration > 0) {
      await new Promise(r => setTimeout(r, config.highlightDuration))
    }

    // 3. 显示点击效果
    store.showClick()
    await new Promise(r => setTimeout(r, 300))

    // 4. 执行操作
    try {
      await this.executeOperation(step.operation)
      store.completeStep(step.id)
    } catch (error) {
      store.failStep(step.id, error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  /**
   * 获取目标元素选择器
   */
  private getTargetSelector(operation: GoiOperation): string {
    switch (operation.type) {
      case 'access':
        if (operation.action === 'select') {
          return `[data-goi-selector="${operation.target.resourceType}"]`
        }
        if (operation.action === 'create') {
          return `[data-goi-create="${operation.target.resourceType}"]`
        }
        return `[data-goi-nav="${operation.target.resourceType}"]`

      case 'state':
        return `[data-goi-resource="${operation.target.resourceType}"]`

      default:
        return 'body'
    }
  }

  /**
   * 执行具体操作
   */
  private async executeOperation(operation: GoiOperation): Promise<void> {
    const context = {
      sessionId: 'current-session',
      userId: 'current-user',
    }

    switch (operation.type) {
      case 'access':
        await executeAccess(operation, context)
        break
      case 'state':
        await executeState(operation, context)
        break
      // ... 其他类型
    }
  }

  /**
   * 暂停执行
   */
  pause(): void {
    useExecutionStore.getState().setStatus('paused')
  }

  /**
   * 中止执行
   */
  abort(): void {
    this.abortController?.abort()
  }
}
```

- [ ] 创建可视化容器组件：

```tsx
// apps/web/src/components/goi/ExecutionOverlay.tsx
'use client'

import { OperationHighlight } from './OperationHighlight'
import { ActionBubble } from './ActionBubble'
import { useExecutionStore } from '@/lib/goi/execution/progressSync'
import { speedController } from '@/lib/goi/execution/speedControl'

export function ExecutionOverlay() {
  const {
    status,
    highlightTarget,
    actionMessage,
    showClickEffect,
  } = useExecutionStore()

  const isExecuting = status === 'executing'

  return (
    <>
      <OperationHighlight
        targetSelector={highlightTarget || undefined}
        isActive={isExecuting && !!highlightTarget}
        showClickEffect={showClickEffect}
      />
      <ActionBubble
        targetSelector={highlightTarget || undefined}
        message={actionMessage || ''}
        isVisible={isExecuting && !!actionMessage}
        autoHide={speedController.getConfig().bubbleDuration}
      />
    </>
  )
}
```

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-13 | 2.1 实现高亮组件 | ✅ 完成 | OperationHighlight.tsx - 呼吸光圈 + 点击涟漪动画 |
| 2025-12-13 | 2.2 实现操作气泡 | ✅ 完成 | ActionBubble.tsx - 支持 auto 位置、深色/浅色主题 |
| 2025-12-13 | 2.3 实现速度控制 | ✅ 完成 | speedControl.ts + SpeedSelector.tsx - 4 种速度等级 |
| 2025-12-13 | 2.4 实现进度同步 | ✅ 完成 | progressSync.ts - Zustand store + 选择器 hooks |
| 2025-12-13 | 2.5 集成执行循环 | ✅ 完成 | visualExecutor.ts + ExecutionOverlay.tsx |
| 2025-12-13 | 导出更新 | ✅ 完成 | 更新 components/goi/index.ts 和 lib/goi/index.ts |
