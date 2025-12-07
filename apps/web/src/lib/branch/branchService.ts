/**
 * Phase 10: 提示词分支服务
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type CreateBranchParams = {
  promptId: string
  name: string
  description?: string
  sourceVersionId: string
  createdById: string
}

export type UpdateBranchParams = {
  name?: string
  description?: string
}

/**
 * 创建分支
 */
export async function createBranch(params: CreateBranchParams) {
  const { promptId, name, description, sourceVersionId, createdById } = params

  // 验证源版本存在
  const sourceVersion = await prisma.promptVersion.findUnique({
    where: { id: sourceVersionId },
  })

  if (!sourceVersion) {
    throw new Error('源版本不存在')
  }

  if (sourceVersion.promptId !== promptId) {
    throw new Error('源版本不属于该提示词')
  }

  // 检查分支名是否已存在
  const existingBranch = await prisma.promptBranch.findUnique({
    where: {
      promptId_name: { promptId, name },
    },
  })

  if (existingBranch) {
    throw new Error('分支名称已存在')
  }

  // 获取该 prompt 下的最大版本号
  const maxVersionResult = await prisma.promptVersion.aggregate({
    where: { promptId },
    _max: { version: true },
  })
  const nextVersion = (maxVersionResult._max.version || 0) + 1

  // 使用事务创建分支和第一个版本
  const branch = await prisma.$transaction(async (tx) => {
    // 创建分支
    const newBranch = await tx.promptBranch.create({
      data: {
        promptId,
        name,
        description,
        sourceVersionId,
        currentVersion: nextVersion,
        isDefault: false,
        status: 'ACTIVE',
        createdById,
      },
    })

    // 创建分支的第一个版本（复制源版本内容）
    // 注意：版本号在 promptId 范围内必须唯一，所以使用全局递增的版本号
    await tx.promptVersion.create({
      data: {
        promptId,
        branchId: newBranch.id,
        version: nextVersion,
        content: sourceVersion.content,
        variables: sourceVersion.variables as Prisma.InputJsonValue,
        changeLog: `从 v${sourceVersion.version} 创建分支`,
        createdById,
      },
    })

    return newBranch
  })

  return branch
}

/**
 * 获取分支列表
 */
export async function getBranches(promptId: string) {
  return prisma.promptBranch.findMany({
    where: { promptId },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
      mergedBy: {
        select: { id: true, name: true },
      },
      _count: {
        select: { versions: true },
      },
    },
    orderBy: [
      { isDefault: 'desc' },
      { status: 'asc' },
      { updatedAt: 'desc' },
    ],
  })
}

/**
 * 获取分支详情
 */
export async function getBranch(promptId: string, branchId: string) {
  const branch = await prisma.promptBranch.findFirst({
    where: { id: branchId, promptId },
    include: {
      sourceVersion: true,
      versions: {
        orderBy: { version: 'desc' },
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
        },
      },
      createdBy: {
        select: { id: true, name: true },
      },
      mergedBy: {
        select: { id: true, name: true },
      },
    },
  })

  return branch
}

/**
 * 更新分支
 */
export async function updateBranch(
  promptId: string,
  branchId: string,
  data: UpdateBranchParams
) {
  // 检查分支是否存在
  const branch = await prisma.promptBranch.findFirst({
    where: { id: branchId, promptId },
  })

  if (!branch) {
    throw new Error('分支不存在')
  }

  if (branch.isDefault && data.name) {
    throw new Error('不能重命名默认分支')
  }

  // 如果重命名，检查新名称是否冲突
  if (data.name && data.name !== branch.name) {
    const existingBranch = await prisma.promptBranch.findUnique({
      where: {
        promptId_name: { promptId, name: data.name },
      },
    })

    if (existingBranch) {
      throw new Error('分支名称已存在')
    }
  }

  return prisma.promptBranch.update({
    where: { id: branchId },
    data,
  })
}

/**
 * 归档分支
 */
export async function archiveBranch(promptId: string, branchId: string) {
  const branch = await prisma.promptBranch.findFirst({
    where: { id: branchId, promptId },
  })

  if (!branch) {
    throw new Error('分支不存在')
  }

  if (branch.isDefault) {
    throw new Error('不能归档默认分支')
  }

  if (branch.status === 'ARCHIVED') {
    throw new Error('分支已归档')
  }

  return prisma.promptBranch.update({
    where: { id: branchId },
    data: { status: 'ARCHIVED' },
  })
}

/**
 * 删除分支
 */
export async function deleteBranch(promptId: string, branchId: string) {
  const branch = await prisma.promptBranch.findFirst({
    where: { id: branchId, promptId },
  })

  if (!branch) {
    throw new Error('分支不存在')
  }

  if (branch.isDefault) {
    throw new Error('不能删除默认分支')
  }

  // 删除分支（版本会因为 onDelete: SetNull 而保留，只是失去分支关联）
  return prisma.promptBranch.delete({
    where: { id: branchId },
  })
}

/**
 * 在分支上发布新版本
 */
export async function publishBranchVersion(
  promptId: string,
  branchId: string,
  content: string,
  variables: Prisma.InputJsonValue,
  changeLog: string | undefined,
  createdById: string
) {
  const branch = await prisma.promptBranch.findFirst({
    where: { id: branchId, promptId },
  })

  if (!branch) {
    throw new Error('分支不存在')
  }

  if (branch.status !== 'ACTIVE') {
    throw new Error('只能在活跃分支上发布版本')
  }

  // 获取该 prompt 下的最大版本号（考虑所有分支的版本）
  const maxVersionResult = await prisma.promptVersion.aggregate({
    where: { promptId },
    _max: { version: true },
  })
  const newVersion = (maxVersionResult._max.version || branch.currentVersion) + 1

  return prisma.$transaction(async (tx) => {
    // 创建新版本
    const version = await tx.promptVersion.create({
      data: {
        promptId,
        branchId,
        version: newVersion,
        content,
        variables,
        changeLog,
        createdById,
      },
    })

    // 更新分支版本号
    await tx.promptBranch.update({
      where: { id: branchId },
      data: { currentVersion: newVersion },
    })

    // 如果是默认分支，同步更新提示词的 currentVersion
    if (branch.isDefault) {
      await tx.prompt.update({
        where: { id: promptId },
        data: { currentVersion: newVersion },
      })
    }

    return version
  })
}

/**
 * 获取分支最新版本
 */
export async function getLatestBranchVersion(branchId: string) {
  return prisma.promptVersion.findFirst({
    where: { branchId },
    orderBy: { version: 'desc' },
  })
}

/**
 * 确保提示词有默认分支
 */
export async function ensureDefaultBranch(promptId: string, createdById: string) {
  const existingDefault = await prisma.promptBranch.findFirst({
    where: { promptId, isDefault: true },
  })

  if (existingDefault) {
    return existingDefault
  }

  // 获取第一个版本作为源版本
  const firstVersion = await prisma.promptVersion.findFirst({
    where: { promptId },
    orderBy: { version: 'asc' },
  })

  if (!firstVersion) {
    throw new Error('提示词没有任何版本')
  }

  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
  })

  if (!prompt) {
    throw new Error('提示词不存在')
  }

  // 创建默认分支并关联所有现有版本
  return prisma.$transaction(async (tx) => {
    const mainBranch = await tx.promptBranch.create({
      data: {
        promptId,
        name: 'main',
        description: '默认主分支',
        sourceVersionId: firstVersion.id,
        currentVersion: prompt.currentVersion || 1,
        isDefault: true,
        status: 'ACTIVE',
        createdById,
      },
    })

    // 将所有现有版本关联到 main 分支
    await tx.promptVersion.updateMany({
      where: { promptId, branchId: null },
      data: { branchId: mainBranch.id },
    })

    return mainBranch
  })
}
