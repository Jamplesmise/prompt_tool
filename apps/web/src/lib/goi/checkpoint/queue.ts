/**
 * 检查点等待队列
 *
 * 负责：
 * - 管理待处理的检查点
 * - 支持内存存储和 Redis 存储
 * - 超时检测和处理
 * - 按会话查询检查点
 */

import type {
  PendingCheckpoint,
  PendingCheckpointStatus,
  CheckpointResponse,
} from '@platform/shared'

// ============================================
// 队列配置
// ============================================

export type CheckpointQueueConfig = {
  /** 检查点过期检测间隔（毫秒） */
  expirationCheckInterval: number
  /** 是否使用 Redis 存储 */
  useRedis: boolean
  /** Redis key 前缀 */
  redisKeyPrefix: string
}

const DEFAULT_CONFIG: CheckpointQueueConfig = {
  expirationCheckInterval: 10000, // 10 秒
  useRedis: false, // 默认使用内存存储
  redisKeyPrefix: 'goi:checkpoint:',
}

// ============================================
// 检查点队列类
// ============================================

export class CheckpointQueue {
  private config: CheckpointQueueConfig
  private memoryStore: Map<string, PendingCheckpoint> = new Map()
  private expirationTimer: ReturnType<typeof setInterval> | null = null
  private onExpiration: ((checkpoint: PendingCheckpoint) => void) | null = null

  constructor(config: Partial<CheckpointQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 启动过期检测
   */
  startExpirationCheck(callback: (checkpoint: PendingCheckpoint) => void): void {
    this.onExpiration = callback

    if (this.expirationTimer) {
      clearInterval(this.expirationTimer)
    }

    this.expirationTimer = setInterval(async () => {
      await this.checkExpirations()
    }, this.config.expirationCheckInterval)
  }

  /**
   * 停止过期检测
   */
  stopExpirationCheck(): void {
    if (this.expirationTimer) {
      clearInterval(this.expirationTimer)
      this.expirationTimer = null
    }
    this.onExpiration = null
  }

  /**
   * 检查过期的检查点
   */
  private async checkExpirations(): Promise<void> {
    const now = new Date()

    if (this.config.useRedis) {
      // TODO: 实现 Redis 过期检查
    } else {
      for (const [id, checkpoint] of this.memoryStore) {
        if (
          checkpoint.status === 'pending' &&
          checkpoint.expiresAt &&
          checkpoint.expiresAt < now
        ) {
          // 更新状态为过期
          checkpoint.status = 'expired'
          this.memoryStore.set(id, checkpoint)

          // 触发过期回调
          if (this.onExpiration) {
            this.onExpiration(checkpoint)
          }
        }
      }
    }
  }

  /**
   * 添加检查点到队列
   */
  async add(checkpoint: PendingCheckpoint): Promise<void> {
    if (this.config.useRedis) {
      // TODO: 实现 Redis 存储
      // await redis.set(
      //   `${this.config.redisKeyPrefix}${checkpoint.id}`,
      //   JSON.stringify(checkpoint),
      //   'EX',
      //   Math.ceil((checkpoint.expiresAt?.getTime() || Date.now() + 300000 - Date.now()) / 1000)
      // )
    } else {
      this.memoryStore.set(checkpoint.id, checkpoint)
    }
  }

  /**
   * 获取检查点
   */
  async get(checkpointId: string): Promise<PendingCheckpoint | null> {
    if (this.config.useRedis) {
      // TODO: 实现 Redis 读取
      return null
    } else {
      return this.memoryStore.get(checkpointId) || null
    }
  }

  /**
   * 更新检查点
   */
  async update(
    checkpointId: string,
    updates: Partial<Pick<PendingCheckpoint, 'status' | 'response' | 'respondedAt'>>
  ): Promise<boolean> {
    if (this.config.useRedis) {
      // TODO: 实现 Redis 更新
      return false
    } else {
      const checkpoint = this.memoryStore.get(checkpointId)
      if (!checkpoint) return false

      const updated = {
        ...checkpoint,
        ...updates,
      }
      this.memoryStore.set(checkpointId, updated)
      return true
    }
  }

  /**
   * 移除检查点
   */
  async remove(checkpointId: string): Promise<boolean> {
    if (this.config.useRedis) {
      // TODO: 实现 Redis 删除
      return false
    } else {
      return this.memoryStore.delete(checkpointId)
    }
  }

  /**
   * 获取会话的待处理检查点
   */
  async getPending(sessionId: string): Promise<PendingCheckpoint[]> {
    if (this.config.useRedis) {
      // TODO: 实现 Redis 查询
      return []
    } else {
      const pending: PendingCheckpoint[] = []
      for (const checkpoint of this.memoryStore.values()) {
        if (checkpoint.sessionId === sessionId && checkpoint.status === 'pending') {
          pending.push(checkpoint)
        }
      }
      return pending.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    }
  }

  /**
   * 获取会话的所有检查点
   */
  async getBySession(sessionId: string): Promise<PendingCheckpoint[]> {
    if (this.config.useRedis) {
      // TODO: 实现 Redis 查询
      return []
    } else {
      const checkpoints: PendingCheckpoint[] = []
      for (const checkpoint of this.memoryStore.values()) {
        if (checkpoint.sessionId === sessionId) {
          checkpoints.push(checkpoint)
        }
      }
      return checkpoints.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    }
  }

  /**
   * 按状态获取检查点
   */
  async getByStatus(
    sessionId: string,
    status: PendingCheckpointStatus[]
  ): Promise<PendingCheckpoint[]> {
    if (this.config.useRedis) {
      // TODO: 实现 Redis 查询
      return []
    } else {
      const checkpoints: PendingCheckpoint[] = []
      for (const checkpoint of this.memoryStore.values()) {
        if (checkpoint.sessionId === sessionId && status.includes(checkpoint.status)) {
          checkpoints.push(checkpoint)
        }
      }
      return checkpoints.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    }
  }

  /**
   * 清理会话的所有检查点
   */
  async clearSession(sessionId: string): Promise<number> {
    if (this.config.useRedis) {
      // TODO: 实现 Redis 清理
      return 0
    } else {
      let count = 0
      for (const [id, checkpoint] of this.memoryStore) {
        if (checkpoint.sessionId === sessionId) {
          this.memoryStore.delete(id)
          count++
        }
      }
      return count
    }
  }

  /**
   * 清理已响应的检查点（保留一定时间用于审计）
   */
  async cleanupResponded(maxAge: number = 3600000): Promise<number> {
    const cutoff = new Date(Date.now() - maxAge)

    if (this.config.useRedis) {
      // TODO: 实现 Redis 清理
      return 0
    } else {
      let count = 0
      for (const [id, checkpoint] of this.memoryStore) {
        if (
          (checkpoint.status === 'responded' || checkpoint.status === 'expired') &&
          checkpoint.respondedAt &&
          checkpoint.respondedAt < cutoff
        ) {
          this.memoryStore.delete(id)
          count++
        }
      }
      return count
    }
  }

  /**
   * 获取队列统计
   */
  async getStats(): Promise<{
    total: number
    pending: number
    responded: number
    expired: number
    cancelled: number
  }> {
    if (this.config.useRedis) {
      // TODO: 实现 Redis 统计
      return { total: 0, pending: 0, responded: 0, expired: 0, cancelled: 0 }
    } else {
      const stats = {
        total: this.memoryStore.size,
        pending: 0,
        responded: 0,
        expired: 0,
        cancelled: 0,
      }

      for (const checkpoint of this.memoryStore.values()) {
        switch (checkpoint.status) {
          case 'pending':
            stats.pending++
            break
          case 'responded':
            stats.responded++
            break
          case 'expired':
            stats.expired++
            break
          case 'cancelled':
            stats.cancelled++
            break
        }
      }

      return stats
    }
  }

  /**
   * 清空队列
   */
  async clear(): Promise<void> {
    if (this.config.useRedis) {
      // TODO: 实现 Redis 清空
    } else {
      this.memoryStore.clear()
    }
  }

  /**
   * 销毁队列
   */
  destroy(): void {
    this.stopExpirationCheck()
    this.memoryStore.clear()
  }
}

// ============================================
// 导出单例
// ============================================

let queueInstance: CheckpointQueue | null = null

export function getCheckpointQueue(): CheckpointQueue {
  if (!queueInstance) {
    queueInstance = new CheckpointQueue()
  }
  return queueInstance
}

export function resetCheckpointQueue(): void {
  if (queueInstance) {
    queueInstance.destroy()
  }
  queueInstance = null
}

// ============================================
// 初始化函数
// ============================================

/**
 * 初始化检查点队列并启动过期检测
 */
export function initializeCheckpointQueue(
  config?: Partial<CheckpointQueueConfig>,
  onExpiration?: (checkpoint: PendingCheckpoint) => void
): CheckpointQueue {
  if (queueInstance) {
    queueInstance.destroy()
  }

  queueInstance = new CheckpointQueue(config)

  if (onExpiration) {
    queueInstance.startExpirationCheck(onExpiration)
  }

  return queueInstance
}
