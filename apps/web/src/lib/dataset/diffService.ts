/**
 * Phase 10: 数据集版本对比服务
 */

import { prisma } from '@/lib/prisma'

export type ModifiedField = {
  index: number
  field: string
  oldValue: unknown
  newValue: unknown
}

export type DatasetDiff = {
  added: number[]
  removed: number[]
  modified: ModifiedField[]
  summary: {
    addedCount: number
    removedCount: number
    modifiedCount: number
  }
}

/**
 * 对比两个版本的差异
 */
export async function diffDatasetVersions(
  datasetId: string,
  versionANum: number,
  versionBNum: number
): Promise<DatasetDiff> {
  // 获取两个版本
  const [versionA, versionB] = await Promise.all([
    prisma.datasetVersion.findFirst({
      where: { datasetId, version: versionANum },
      include: {
        rows: {
          orderBy: { rowIndex: 'asc' },
        },
      },
    }),
    prisma.datasetVersion.findFirst({
      where: { datasetId, version: versionBNum },
      include: {
        rows: {
          orderBy: { rowIndex: 'asc' },
        },
      },
    }),
  ])

  if (!versionA || !versionB) {
    throw new Error('版本不存在')
  }

  // 创建哈希映射
  const hashMapA = new Map(versionA.rows.map((r) => [r.hash, r]))
  const hashSetA = new Set(versionA.rows.map((r) => r.hash))
  const hashSetB = new Set(versionB.rows.map((r) => r.hash))

  const added: number[] = []
  const removed: number[] = []
  const modified: ModifiedField[] = []

  // 找出新增和修改的行
  versionB.rows.forEach((rowB) => {
    if (!hashSetA.has(rowB.hash)) {
      // 这一行在 A 中不存在
      // 检查同位置是否有不同的行（修改）
      const rowA = versionA.rows.find((r) => r.rowIndex === rowB.rowIndex)
      if (rowA && rowA.hash !== rowB.hash) {
        // 同位置但内容不同，是修改
        const dataA = rowA.data as Record<string, unknown>
        const dataB = rowB.data as Record<string, unknown>
        const allKeys = new Set([...Object.keys(dataA), ...Object.keys(dataB)])

        for (const key of allKeys) {
          if (JSON.stringify(dataA[key]) !== JSON.stringify(dataB[key])) {
            modified.push({
              index: rowB.rowIndex,
              field: key,
              oldValue: dataA[key],
              newValue: dataB[key],
            })
          }
        }
      } else if (!rowA) {
        // 真正的新增行
        added.push(rowB.rowIndex)
      }
    }
  })

  // 找出删除的行
  versionA.rows.forEach((rowA) => {
    if (!hashSetB.has(rowA.hash)) {
      // 检查是否是修改（同位置有不同内容）
      const rowB = versionB.rows.find((r) => r.rowIndex === rowA.rowIndex)
      if (!rowB) {
        // 真正删除的行
        removed.push(rowA.rowIndex)
      }
    }
  })

  return {
    added,
    removed,
    modified,
    summary: {
      addedCount: added.length,
      removedCount: removed.length,
      modifiedCount: new Set(modified.map((m) => m.index)).size,
    },
  }
}

/**
 * 获取版本详情用于对比展示
 */
export async function getVersionsForDiff(
  datasetId: string,
  versionANum: number,
  versionBNum: number
) {
  const [versionA, versionB] = await Promise.all([
    prisma.datasetVersion.findFirst({
      where: { datasetId, version: versionANum },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.datasetVersion.findFirst({
      where: { datasetId, version: versionBNum },
      include: {
        createdBy: {
          select: { id: true, name: true },
        },
      },
    }),
  ])

  if (!versionA || !versionB) {
    throw new Error('版本不存在')
  }

  const diff = await diffDatasetVersions(datasetId, versionANum, versionBNum)

  return {
    versionA,
    versionB,
    diff,
  }
}
