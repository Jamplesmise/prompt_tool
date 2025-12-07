/**
 * Phase 10: 分支合并服务
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getLatestBranchVersion } from './branchService'

export type MergeBranchParams = {
  sourceBranchId: string
  targetBranchId: string
  changeLog?: string
  userId: string
}

/**
 * 合并分支
 * 将源分支的最新内容合并到目标分支，创建新版本
 */
export async function mergeBranch(params: MergeBranchParams) {
  const { sourceBranchId, targetBranchId, changeLog, userId } = params

  // 获取源分支
  const sourceBranch = await prisma.promptBranch.findUnique({
    where: { id: sourceBranchId },
  })

  if (!sourceBranch) {
    throw new Error('源分支不存在')
  }

  if (sourceBranch.status !== 'ACTIVE') {
    throw new Error('只能合并活跃状态的分支')
  }

  // 获取目标分支
  const targetBranch = await prisma.promptBranch.findUnique({
    where: { id: targetBranchId },
  })

  if (!targetBranch) {
    throw new Error('目标分支不存在')
  }

  if (targetBranch.status !== 'ACTIVE') {
    throw new Error('目标分支必须是活跃状态')
  }

  if (sourceBranch.promptId !== targetBranch.promptId) {
    throw new Error('源分支和目标分支必须属于同一个提示词')
  }

  if (sourceBranchId === targetBranchId) {
    throw new Error('不能将分支合并到自身')
  }

  // 获取源分支最新版本
  const sourceVersion = await getLatestBranchVersion(sourceBranchId)

  if (!sourceVersion) {
    throw new Error('源分支没有任何版本')
  }

  // 获取该 prompt 下的最大版本号（考虑所有分支的版本）
  const maxVersionResult = await prisma.promptVersion.aggregate({
    where: { promptId: targetBranch.promptId },
    _max: { version: true },
  })
  const newVersion = (maxVersionResult._max.version || targetBranch.currentVersion) + 1
  const mergeChangeLog = changeLog || `合并自分支 "${sourceBranch.name}"`

  // 使用事务执行合并
  return prisma.$transaction(async (tx) => {
    // 在目标分支创建新版本
    const newVersionRecord = await tx.promptVersion.create({
      data: {
        promptId: targetBranch.promptId,
        branchId: targetBranchId,
        version: newVersion,
        content: sourceVersion.content,
        variables: sourceVersion.variables as Prisma.InputJsonValue,
        changeLog: mergeChangeLog,
        createdById: userId,
      },
    })

    // 更新目标分支版本号
    await tx.promptBranch.update({
      where: { id: targetBranchId },
      data: { currentVersion: newVersion },
    })

    // 如果目标是默认分支，同步更新提示词内容和版本号
    if (targetBranch.isDefault) {
      await tx.prompt.update({
        where: { id: targetBranch.promptId },
        data: {
          content: sourceVersion.content,
          variables: sourceVersion.variables as Prisma.InputJsonValue,
          currentVersion: newVersion,
        },
      })
    }

    // 更新源分支状态为已合并
    await tx.promptBranch.update({
      where: { id: sourceBranchId },
      data: {
        status: 'MERGED',
        mergedAt: new Date(),
        mergedById: userId,
        mergedToId: targetBranchId,
      },
    })

    return newVersionRecord
  })
}

/**
 * 计算两个版本之间的差异
 */
export function diffContent(contentA: string, contentB: string): string {
  // 简单的行级别 diff
  const linesA = contentA.split('\n')
  const linesB = contentB.split('\n')

  const result: string[] = []
  const maxLines = Math.max(linesA.length, linesB.length)

  for (let i = 0; i < maxLines; i++) {
    const lineA = linesA[i]
    const lineB = linesB[i]

    if (lineA === lineB) {
      result.push(`  ${lineA || ''}`)
    } else if (lineA === undefined) {
      result.push(`+ ${lineB}`)
    } else if (lineB === undefined) {
      result.push(`- ${lineA}`)
    } else {
      result.push(`- ${lineA}`)
      result.push(`+ ${lineB}`)
    }
  }

  return result.join('\n')
}

export type VariableDiff = {
  added: Array<{ name: string; type: string }>
  removed: Array<{ name: string; type: string }>
  modified: Array<{
    name: string
    oldValue: { type: string; description?: string }
    newValue: { type: string; description?: string }
  }>
}

/**
 * 计算变量差异
 */
export function diffVariables(
  variablesA: Array<{ name: string; type: string; description?: string }>,
  variablesB: Array<{ name: string; type: string; description?: string }>
): VariableDiff {
  const mapA = new Map(variablesA.map((v) => [v.name, v]))
  const mapB = new Map(variablesB.map((v) => [v.name, v]))

  const added: VariableDiff['added'] = []
  const removed: VariableDiff['removed'] = []
  const modified: VariableDiff['modified'] = []

  // 查找新增和修改
  for (const [name, varB] of mapB) {
    const varA = mapA.get(name)
    if (!varA) {
      added.push({ name, type: varB.type })
    } else if (
      varA.type !== varB.type ||
      varA.description !== varB.description
    ) {
      modified.push({
        name,
        oldValue: { type: varA.type, description: varA.description },
        newValue: { type: varB.type, description: varB.description },
      })
    }
  }

  // 查找删除
  for (const [name, varA] of mapA) {
    if (!mapB.has(name)) {
      removed.push({ name, type: varA.type })
    }
  }

  return { added, removed, modified }
}

/**
 * 获取分支对比
 */
export async function compareBranches(
  promptId: string,
  sourceBranchId: string,
  targetBranchId: string
) {
  const [sourceVersion, targetVersion] = await Promise.all([
    getLatestBranchVersion(sourceBranchId),
    getLatestBranchVersion(targetBranchId),
  ])

  if (!sourceVersion || !targetVersion) {
    throw new Error('分支没有版本')
  }

  const contentDiff = diffContent(targetVersion.content, sourceVersion.content)
  const variablesDiff = diffVariables(
    (targetVersion.variables as Array<{ name: string; type: string; description?: string }>) || [],
    (sourceVersion.variables as Array<{ name: string; type: string; description?: string }>) || []
  )

  return {
    sourceVersion: {
      id: sourceVersion.id,
      version: sourceVersion.version,
      content: sourceVersion.content,
      variables: sourceVersion.variables,
      branchId: sourceVersion.branchId,
    },
    targetVersion: {
      id: targetVersion.id,
      version: targetVersion.version,
      content: targetVersion.content,
      variables: targetVersion.variables,
      branchId: targetVersion.branchId,
    },
    contentDiff,
    variablesDiff,
  }
}
