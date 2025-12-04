/**
 * Phase 10: 数据集版本服务
 */

import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * 计算行数据哈希
 */
export function hashRow(data: Record<string, unknown>): string {
  const content = JSON.stringify(data)
  return createHash('md5').update(content).digest('hex')
}

/**
 * 创建数据集版本
 */
export async function createDatasetVersion(
  datasetId: string,
  changeLog: string | undefined,
  createdById: string
) {
  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId },
    include: {
      rows: {
        orderBy: { rowIndex: 'asc' },
      },
    },
  })

  if (!dataset) {
    throw new Error('数据集不存在')
  }

  // 获取列名
  const columns = dataset.schema
    ? (dataset.schema as { columns?: Array<{ name: string }> }).columns?.map((c) => c.name) || []
    : Object.keys(dataset.rows[0]?.data as Record<string, unknown> || {})

  // 计算行哈希
  const rowHashes = dataset.rows.map((row) => hashRow(row.data as Record<string, unknown>))

  const newVersion = dataset.currentVersion + 1

  // 使用事务创建版本
  return prisma.$transaction(async (tx) => {
    // 创建版本记录
    const version = await tx.datasetVersion.create({
      data: {
        datasetId,
        version: newVersion,
        rowCount: dataset.rows.length,
        changeLog,
        columns,
        rowHashes,
        createdById,
      },
    })

    // 创建行快照
    if (dataset.rows.length > 0) {
      await tx.datasetVersionRow.createMany({
        data: dataset.rows.map((row, index) => ({
          versionId: version.id,
          rowIndex: index,
          data: row.data as Prisma.InputJsonValue,
          hash: rowHashes[index],
        })),
      })
    }

    // 更新数据集当前版本号
    await tx.dataset.update({
      where: { id: datasetId },
      data: { currentVersion: newVersion },
    })

    return version
  })
}

/**
 * 获取版本列表
 */
export async function getDatasetVersions(datasetId: string) {
  return prisma.datasetVersion.findMany({
    where: { datasetId },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { version: 'desc' },
  })
}

/**
 * 获取版本详情
 */
export async function getDatasetVersion(datasetId: string, versionId: string) {
  return prisma.datasetVersion.findFirst({
    where: { id: versionId, datasetId },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  })
}

/**
 * 获取版本数据行
 */
export async function getDatasetVersionRows(
  versionId: string,
  options?: { offset?: number; limit?: number }
) {
  const { offset = 0, limit = 100 } = options || {}

  return prisma.datasetVersionRow.findMany({
    where: { versionId },
    orderBy: { rowIndex: 'asc' },
    skip: offset,
    take: limit,
  })
}

/**
 * 回滚到指定版本
 */
export async function rollbackToVersion(
  datasetId: string,
  versionId: string,
  userId: string
) {
  const version = await prisma.datasetVersion.findFirst({
    where: { id: versionId, datasetId },
    include: {
      rows: {
        orderBy: { rowIndex: 'asc' },
      },
    },
  })

  if (!version) {
    throw new Error('版本不存在')
  }

  // 使用事务执行回滚
  return prisma.$transaction(async (tx) => {
    // 删除当前所有数据行
    await tx.datasetRow.deleteMany({
      where: { datasetId },
    })

    // 从版本快照恢复数据行
    if (version.rows.length > 0) {
      await tx.datasetRow.createMany({
        data: version.rows.map((row) => ({
          datasetId,
          rowIndex: row.rowIndex,
          data: row.data as Prisma.InputJsonValue,
        })),
      })
    }

    // 更新数据集信息
    await tx.dataset.update({
      where: { id: datasetId },
      data: {
        rowCount: version.rowCount,
        currentVersion: version.version,
        schema: { columns: (version.columns as string[]).map((name) => ({ name, type: 'string' })) },
      },
    })

    // 创建一个新版本记录表示回滚操作
    const newVersion = await tx.datasetVersion.create({
      data: {
        datasetId,
        version: version.version + 1,
        rowCount: version.rowCount,
        changeLog: `回滚到 v${version.version}`,
        columns: version.columns as Prisma.InputJsonValue,
        rowHashes: version.rowHashes as Prisma.InputJsonValue,
        createdById: userId,
      },
    })

    // 复制行快照
    if (version.rows.length > 0) {
      await tx.datasetVersionRow.createMany({
        data: version.rows.map((row) => ({
          versionId: newVersion.id,
          rowIndex: row.rowIndex,
          data: row.data as Prisma.InputJsonValue,
          hash: row.hash,
        })),
      })
    }

    // 再次更新版本号
    await tx.dataset.update({
      where: { id: datasetId },
      data: { currentVersion: newVersion.version },
    })

    return { version: newVersion }
  })
}
