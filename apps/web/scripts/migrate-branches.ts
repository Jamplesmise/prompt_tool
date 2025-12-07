/**
 * Phase 10: 提示词分支迁移脚本
 *
 * 为现有提示词创建默认 main 分支，并将所有版本关联到 main 分支
 *
 * 运行方式：
 * npx tsx scripts/migrate-branches.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migratePromptBranches() {
  console.log('开始迁移提示词分支...')

  const prompts = await prisma.prompt.findMany({
    include: {
      versions: {
        orderBy: { version: 'asc' },
      },
      branches: true,
    },
  })

  console.log(`找到 ${prompts.length} 个提示词`)

  let migratedCount = 0
  let skippedCount = 0

  for (const prompt of prompts) {
    // 检查是否已有默认分支
    const existingDefault = prompt.branches.find((b) => b.isDefault)
    if (existingDefault) {
      console.log(`跳过提示词 "${prompt.name}" (ID: ${prompt.id}) - 已有默认分支`)
      skippedCount++
      continue
    }

    // 跳过没有版本的提示词
    if (prompt.versions.length === 0) {
      console.log(`跳过提示词 "${prompt.name}" (ID: ${prompt.id}) - 没有版本`)
      skippedCount++
      continue
    }

    const firstVersion = prompt.versions[0]

    try {
      // 创建默认 main 分支
      const mainBranch = await prisma.promptBranch.create({
        data: {
          promptId: prompt.id,
          name: 'main',
          description: '默认主分支',
          sourceVersionId: firstVersion.id,
          currentVersion: prompt.currentVersion || prompt.versions.length,
          isDefault: true,
          status: 'ACTIVE',
          createdById: prompt.createdById,
        },
      })

      // 更新所有版本关联到 main 分支
      await prisma.promptVersion.updateMany({
        where: { promptId: prompt.id },
        data: { branchId: mainBranch.id },
      })

      console.log(
        `✓ 迁移提示词 "${prompt.name}" (ID: ${prompt.id}) - 创建 main 分支，关联 ${prompt.versions.length} 个版本`
      )
      migratedCount++
    } catch (error) {
      console.error(`✗ 迁移提示词 "${prompt.name}" (ID: ${prompt.id}) 失败:`, error)
    }
  }

  console.log('\n迁移完成！')
  console.log(`- 迁移成功: ${migratedCount}`)
  console.log(`- 跳过: ${skippedCount}`)
}

async function main() {
  try {
    await migratePromptBranches()
  } catch (error) {
    console.error('迁移失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
