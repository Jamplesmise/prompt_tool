/**
 * GOI 任务取消与回滚模块
 *
 * 功能：
 * - 取消正在执行的任务
 * - 回滚到任务开始前的状态
 * - 提供取消确认对话框
 *
 * 注意：此模块在客户端运行，使用 API 调用进行服务端操作
 */

import { useExecutionStore } from './progressSync'
import { usePauseStore } from './pauseController'
import { useControlStore } from './controlTransfer'
import type { RestoreResult } from '@platform/shared'

// ============================================
// 类型定义
// ============================================

/**
 * 取消结果
 */
export type CancelResult = {
  /** 是否成功 */
  success: boolean
  /** 回滚结果 */
  rollbackResult?: {
    /** 是否已回滚 */
    restored: boolean
    /** 回滚详情 */
    details?: RestoreResult
    /** 错误信息 */
    error?: string
  }
  /** 错误信息 */
  error?: string
}

/**
 * 取消选项
 */
export type CancelOptions = {
  /** 是否跳过回滚 */
  skipRollback?: boolean
  /** 自定义回滚快照 ID */
  snapshotId?: string
}

// ============================================
// 核心函数
// ============================================

/**
 * 取消任务
 *
 * @param sessionId 会话 ID
 * @param options 取消选项
 * @returns 取消结果
 */
export async function cancelTask(
  sessionId: string,
  options: CancelOptions = {}
): Promise<CancelResult> {
  try {
    // 1. 重置暂停状态
    usePauseStore.getState().reset()

    // 2. 重置控制权状态
    useControlStore.getState().reset()

    // 3. 如果不跳过回滚，尝试回滚到任务开始时的快照
    if (!options.skipRollback) {
      let snapshotId = options.snapshotId

      // 如果没有指定快照 ID，通过 API 查找任务开始时的快照
      if (!snapshotId) {
        try {
          const response = await fetch(`/api/goi/snapshot?sessionId=${sessionId}&trigger=todo_start&limit=1`)
          if (response.ok) {
            const data = await response.json()
            if (data.data?.snapshots?.length > 0) {
              snapshotId = data.data.snapshots[0].id
            }
          }
        } catch {
          // 查询失败，继续没有快照的流程
        }
      }

      // 通过 API 执行回滚
      if (snapshotId) {
        try {
          const response = await fetch('/api/goi/snapshot/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ snapshotId }),
          })

          const result = await response.json()

          // 4. 重置执行状态
          useExecutionStore.getState().reset()

          if (response.ok && result.data) {
            const restoreResult = result.data as RestoreResult
            return {
              success: true,
              rollbackResult: {
                restored: restoreResult.success,
                details: restoreResult,
                error: restoreResult.errors?.length > 0
                  ? restoreResult.errors.map((e: { error: string }) => e.error).join('; ')
                  : undefined,
              },
            }
          } else {
            return {
              success: true,
              rollbackResult: {
                restored: false,
                error: result.message || 'Restore failed',
              },
            }
          }
        } catch (error) {
          // 回滚失败，仍然重置状态
          useExecutionStore.getState().reset()

          return {
            success: true,
            rollbackResult: {
              restored: false,
              error: error instanceof Error ? error.message : 'Unknown rollback error',
            },
          }
        }
      }
    }

    // 没有快照可回滚，只重置状态
    useExecutionStore.getState().reset()

    return {
      success: true,
      rollbackResult: {
        restored: false,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 中止任务（不回滚，只停止执行）
 *
 * @param reason 中止原因
 */
export function abortTask(reason?: string): void {
  // 重置暂停状态
  usePauseStore.getState().reset()

  // 重置控制权状态
  useControlStore.getState().reset()

  // 设置执行状态为中止
  const store = useExecutionStore.getState()
  store.setStatus('aborted')
  if (reason) {
    store.setError(reason)
  }
}

/**
 * 检查是否可以取消
 */
export function canCancel(): boolean {
  const status = useExecutionStore.getState().status
  return (
    status === 'executing' ||
    status === 'paused' ||
    status === 'checkpoint' ||
    status === 'ready'
  )
}

/**
 * 检查是否有可用的回滚快照
 */
export async function hasRollbackSnapshot(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/goi/snapshot?sessionId=${sessionId}&trigger=todo_start&limit=1`)
    if (response.ok) {
      const data = await response.json()
      return data.data?.snapshots?.length > 0
    }
    return false
  } catch {
    return false
  }
}

// ============================================
// Hooks
// ============================================

/**
 * 使用任务取消
 */
export function useTaskCancel() {
  return {
    cancelTask,
    abortTask,
    canCancel,
    hasRollbackSnapshot,
  }
}
