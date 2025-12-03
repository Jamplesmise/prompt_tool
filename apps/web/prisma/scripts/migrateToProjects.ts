/**
 * 数据迁移脚本：将现有数据关联到默认项目
 *
 * 运行方式：
 * cd apps/web && npx tsx prisma/scripts/migrateToProjects.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('开始数据迁移...')

  // 1. 查找第一个管理员用户作为默认项目的所有者
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
  })

  if (!adminUser) {
    console.log('未找到管理员用户，跳过迁移')
    return
  }

  console.log(`使用管理员 ${adminUser.name} (${adminUser.email}) 作为默认项目所有者`)

  // 2. 检查是否已有项目
  const existingProjectCount = await prisma.project.count()
  if (existingProjectCount > 0) {
    console.log(`已存在 ${existingProjectCount} 个项目，跳过创建默认项目`)
    return
  }

  // 3. 创建默认项目
  const defaultProject = await prisma.project.create({
    data: {
      name: 'Default Project',
      description: '默认项目 - 系统自动创建',
      ownerId: adminUser.id,
    },
  })
  console.log(`创建默认项目: ${defaultProject.id}`)

  // 4. 将所有用户添加为项目成员
  const users = await prisma.user.findMany()
  for (const user of users) {
    const role = user.id === adminUser.id ? 'OWNER' : user.role === 'ADMIN' ? 'ADMIN' : 'MEMBER'
    await prisma.projectMember.create({
      data: {
        projectId: defaultProject.id,
        userId: user.id,
        role,
      },
    })
    console.log(`添加成员: ${user.name} (${role})`)
  }

  // 5. 更新所有资源关联到默认项目
  const tables = [
    { name: 'prompt', model: prisma.prompt },
    { name: 'dataset', model: prisma.dataset },
    { name: 'provider', model: prisma.provider },
    { name: 'evaluator', model: prisma.evaluator },
    { name: 'task', model: prisma.task },
    { name: 'scheduledTask', model: prisma.scheduledTask },
    { name: 'alertRule', model: prisma.alertRule },
    { name: 'notifyChannel', model: prisma.notifyChannel },
  ] as const

  for (const table of tables) {
    const result = await (table.model as any).updateMany({
      where: { projectId: null },
      data: { projectId: defaultProject.id },
    })
    console.log(`更新 ${table.name}: ${result.count} 条记录`)
  }

  console.log('数据迁移完成!')
}

main()
  .catch((e) => {
    console.error('迁移失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
