/**
 * 同步模型服务
 * 查询已同步到 PostgreSQL 的模型数据
 */
import { prisma } from '@/lib/prisma'
import type { SyncedModel, SyncedModelType } from '@prisma/client'

// 同步结果类型（复制定义，避免导入 MongoDB 相关模块）
export type SyncResult = {
  success: boolean
  synced: number
  created: number
  updated: number
  deleted: number
  errors: string[]
  syncedAt: Date
}

/**
 * 获取所有同步的模型
 */
export async function getAllSyncedModels(activeOnly = false): Promise<SyncedModel[]> {
  return prisma.syncedModel.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ provider: 'asc' }, { name: 'asc' }],
  })
}

/**
 * 按类型获取同步的模型
 */
export async function getSyncedModelsByType(
  type: SyncedModelType,
  activeOnly = false
): Promise<SyncedModel[]> {
  return prisma.syncedModel.findMany({
    where: {
      type,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ provider: 'asc' }, { name: 'asc' }],
  })
}

/**
 * 获取单个同步的模型
 */
export async function getSyncedModelByModelId(modelId: string): Promise<SyncedModel | null> {
  return prisma.syncedModel.findUnique({
    where: { modelId },
  })
}

/**
 * 获取同步统计信息
 */
export async function getSyncedModelStats(): Promise<{
  total: number
  active: number
  byType: Record<string, number>
  lastSyncedAt: Date | null
}> {
  const [total, active, byType, lastSynced] = await Promise.all([
    prisma.syncedModel.count(),
    prisma.syncedModel.count({ where: { isActive: true } }),
    prisma.syncedModel.groupBy({
      by: ['type'],
      _count: true,
    }),
    prisma.syncedModel.findFirst({
      select: { syncedAt: true },
      orderBy: { syncedAt: 'desc' },
    }),
  ])

  return {
    total,
    active,
    byType: byType.reduce(
      (acc, item) => {
        acc[item.type] = item._count
        return acc
      },
      {} as Record<string, number>
    ),
    lastSyncedAt: lastSynced?.syncedAt ?? null,
  }
}

/**
 * 获取 LLM 类型的同步模型（用于任务执行）
 */
export async function getSyncedLLMModels(): Promise<SyncedModel[]> {
  return prisma.syncedModel.findMany({
    where: {
      type: 'llm',
      isActive: true,
    },
    orderBy: [{ provider: 'asc' }, { name: 'asc' }],
  })
}
