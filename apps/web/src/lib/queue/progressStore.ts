// 任务执行进度 Redis 持久化

import { redis } from '../redis'
import type { TaskProgress } from '@platform/shared'

// Redis Key 前缀
const PROGRESS_KEY_PREFIX = 'task:progress:'
const CHECKPOINT_KEY_PREFIX = 'task:checkpoint:'

// 检查点数据结构
export type Checkpoint = {
  lastUpdated: string  // ISO 日期字符串
  completedItems: string[]  // 已完成的 plan item IDs
  failedItems: string[]     // 失败的 plan item IDs
  currentProgress: TaskProgress
}

// 执行进度数据结构
export type ExecutionProgress = {
  taskId: string
  total: number
  completed: string[]   // 已完成的 planItem IDs
  failed: string[]      // 失败的 planItem IDs
  pending: string[]     // 待执行的 planItem IDs
  lastCheckpoint: string  // ISO 日期字符串
}

/**
 * 保存执行进度到 Redis
 */
export async function saveProgress(
  taskId: string,
  progress: ExecutionProgress
): Promise<void> {
  const key = `${PROGRESS_KEY_PREFIX}${taskId}`
  await redis.set(key, JSON.stringify(progress), 'EX', 86400)  // 24 小时过期
}

/**
 * 获取执行进度
 */
export async function getProgress(taskId: string): Promise<ExecutionProgress | null> {
  const key = `${PROGRESS_KEY_PREFIX}${taskId}`
  const data = await redis.get(key)
  if (!data) return null
  return JSON.parse(data) as ExecutionProgress
}

/**
 * 删除执行进度
 */
export async function deleteProgress(taskId: string): Promise<void> {
  const key = `${PROGRESS_KEY_PREFIX}${taskId}`
  await redis.del(key)
}

/**
 * 添加已完成的项
 */
export async function addCompletedItem(taskId: string, itemId: string): Promise<void> {
  const progress = await getProgress(taskId)
  if (!progress) return

  if (!progress.completed.includes(itemId)) {
    progress.completed.push(itemId)
  }
  progress.pending = progress.pending.filter(id => id !== itemId)
  progress.lastCheckpoint = new Date().toISOString()

  await saveProgress(taskId, progress)
}

/**
 * 添加失败的项
 */
export async function addFailedItem(taskId: string, itemId: string): Promise<void> {
  const progress = await getProgress(taskId)
  if (!progress) return

  if (!progress.failed.includes(itemId)) {
    progress.failed.push(itemId)
  }
  progress.pending = progress.pending.filter(id => id !== itemId)
  progress.lastCheckpoint = new Date().toISOString()

  await saveProgress(taskId, progress)
}

/**
 * 初始化执行进度
 */
export async function initProgress(
  taskId: string,
  planItemIds: string[]
): Promise<ExecutionProgress> {
  const progress: ExecutionProgress = {
    taskId,
    total: planItemIds.length,
    completed: [],
    failed: [],
    pending: [...planItemIds],
    lastCheckpoint: new Date().toISOString(),
  }
  await saveProgress(taskId, progress)
  return progress
}

/**
 * 保存检查点
 */
export async function saveCheckpoint(
  taskId: string,
  checkpoint: Checkpoint
): Promise<void> {
  const key = `${CHECKPOINT_KEY_PREFIX}${taskId}`
  await redis.set(key, JSON.stringify(checkpoint), 'EX', 604800)  // 7 天过期
}

/**
 * 获取检查点
 */
export async function getCheckpoint(taskId: string): Promise<Checkpoint | null> {
  const key = `${CHECKPOINT_KEY_PREFIX}${taskId}`
  const data = await redis.get(key)
  if (!data) return null
  return JSON.parse(data) as Checkpoint
}

/**
 * 删除检查点
 */
export async function deleteCheckpoint(taskId: string): Promise<void> {
  const key = `${CHECKPOINT_KEY_PREFIX}${taskId}`
  await redis.del(key)
}

/**
 * 从进度创建检查点
 */
export async function createCheckpointFromProgress(
  taskId: string
): Promise<Checkpoint | null> {
  const progress = await getProgress(taskId)
  if (!progress) return null

  const checkpoint: Checkpoint = {
    lastUpdated: new Date().toISOString(),
    completedItems: progress.completed,
    failedItems: progress.failed,
    currentProgress: {
      total: progress.total,
      completed: progress.completed.length,
      failed: progress.failed.length,
    },
  }

  await saveCheckpoint(taskId, checkpoint)
  return checkpoint
}

/**
 * 获取待恢复的项目 ID 列表
 */
export async function getPendingItems(taskId: string): Promise<string[]> {
  const progress = await getProgress(taskId)
  if (!progress) return []
  return progress.pending
}

/**
 * 检查项目是否已完成
 */
export async function isItemCompleted(taskId: string, itemId: string): Promise<boolean> {
  const progress = await getProgress(taskId)
  if (!progress) return false
  return progress.completed.includes(itemId)
}
