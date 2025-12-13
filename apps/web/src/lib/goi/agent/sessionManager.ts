/**
 * GOI Agent Session Manager
 *
 * 管理 Agent Loop 会话实例
 */

import { AgentLoop, type AgentLoopConfig, type AgentLoopSnapshot } from './agentLoop'

// ============================================
// 类型定义
// ============================================

/**
 * 会话记录
 */
type SessionRecord = {
  agentLoop: AgentLoop
  createdAt: Date
  lastAccessAt: Date
}

/**
 * 会话管理器配置
 */
type SessionManagerConfig = {
  /** 会话超时时间（毫秒），默认 30 分钟 */
  sessionTimeout?: number
  /** 最大会话数，默认 100 */
  maxSessions?: number
  /** 清理间隔（毫秒），默认 5 分钟 */
  cleanupInterval?: number
}

// ============================================
// Session Manager 类
// ============================================

/**
 * Agent Session Manager - 管理 Agent Loop 实例
 */
class AgentSessionManager {
  private sessions: Map<string, SessionRecord> = new Map()
  private config: Required<SessionManagerConfig>
  private cleanupTimer: NodeJS.Timeout | null = null

  constructor(config?: SessionManagerConfig) {
    this.config = {
      sessionTimeout: 30 * 60 * 1000, // 30 分钟
      maxSessions: 100,
      cleanupInterval: 5 * 60 * 1000, // 5 分钟
      ...config,
    }

    // 启动清理定时器
    this.startCleanupTimer()
  }

  /**
   * 获取或创建 Agent Loop
   */
  getOrCreate(sessionId: string, config: Omit<AgentLoopConfig, 'sessionId'>): AgentLoop {
    let record = this.sessions.get(sessionId)

    if (record) {
      // 更新访问时间
      record.lastAccessAt = new Date()
      return record.agentLoop
    }

    // 检查是否超过最大会话数
    if (this.sessions.size >= this.config.maxSessions) {
      this.evictOldestSession()
    }

    // 创建新会话
    const agentLoop = new AgentLoop({ sessionId, ...config })
    record = {
      agentLoop,
      createdAt: new Date(),
      lastAccessAt: new Date(),
    }
    this.sessions.set(sessionId, record)

    return agentLoop
  }

  /**
   * 获取已存在的 Agent Loop
   */
  get(sessionId: string): AgentLoop | null {
    const record = this.sessions.get(sessionId)
    if (record) {
      record.lastAccessAt = new Date()
      return record.agentLoop
    }
    return null
  }

  /**
   * 检查会话是否存在
   */
  has(sessionId: string): boolean {
    return this.sessions.has(sessionId)
  }

  /**
   * 删除会话
   */
  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId)
  }

  /**
   * 获取会话状态
   */
  getStatus(sessionId: string): AgentLoopSnapshot | null {
    const agentLoop = this.get(sessionId)
    return agentLoop?.getStatus() ?? null
  }

  /**
   * 获取所有会话的摘要
   */
  getAllSessions(): Array<{ sessionId: string; status: AgentLoopSnapshot; createdAt: Date }> {
    const result: Array<{ sessionId: string; status: AgentLoopSnapshot; createdAt: Date }> = []

    for (const [sessionId, record] of this.sessions) {
      result.push({
        sessionId,
        status: record.agentLoop.getStatus(),
        createdAt: record.createdAt,
      })
    }

    return result
  }

  /**
   * 清理过期会话
   */
  cleanup(): number {
    const now = Date.now()
    let cleanedCount = 0

    for (const [sessionId, record] of this.sessions) {
      const status = record.agentLoop.getStatus()
      const lastAccess = record.lastAccessAt.getTime()

      // 检查是否过期
      if (now - lastAccess > this.config.sessionTimeout) {
        // 如果会话已完成或失败，或者已经过期，删除它
        if (status.status === 'completed' || status.status === 'failed' || status.status === 'idle') {
          this.sessions.delete(sessionId)
          cleanedCount++
        }
      }
    }

    return cleanedCount
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalSessions: number
    activeSessions: number
    idleSessions: number
    completedSessions: number
    failedSessions: number
  } {
    let activeSessions = 0
    let idleSessions = 0
    let completedSessions = 0
    let failedSessions = 0

    for (const [, record] of this.sessions) {
      const status = record.agentLoop.getStatus()
      switch (status.status) {
        case 'running':
        case 'planning':
        case 'waiting':
        case 'paused':
          activeSessions++
          break
        case 'idle':
          idleSessions++
          break
        case 'completed':
          completedSessions++
          break
        case 'failed':
          failedSessions++
          break
      }
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions,
      idleSessions,
      completedSessions,
      failedSessions,
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      const cleaned = this.cleanup()
      if (cleaned > 0) {
        console.log(`[AgentSessionManager] Cleaned ${cleaned} expired sessions`)
      }
    }, this.config.cleanupInterval)
  }

  /**
   * 停止清理定时器
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  /**
   * 驱逐最老的会话
   */
  private evictOldestSession(): void {
    let oldestSessionId: string | null = null
    let oldestTime = Date.now()

    for (const [sessionId, record] of this.sessions) {
      const status = record.agentLoop.getStatus()
      // 优先驱逐已完成或已失败的会话
      if (status.status === 'completed' || status.status === 'failed') {
        this.sessions.delete(sessionId)
        return
      }
      // 或者驱逐最老的空闲会话
      if (status.status === 'idle' && record.lastAccessAt.getTime() < oldestTime) {
        oldestTime = record.lastAccessAt.getTime()
        oldestSessionId = sessionId
      }
    }

    if (oldestSessionId) {
      this.sessions.delete(oldestSessionId)
    }
  }
}

// ============================================
// 单例导出
// ============================================

/**
 * 全局 Agent Session Manager 实例
 */
export const agentSessionManager = new AgentSessionManager()

/**
 * 获取 Agent Session Manager
 */
export function getAgentSessionManager(): AgentSessionManager {
  return agentSessionManager
}

// 导出类型
export type { SessionManagerConfig, AgentSessionManager }
