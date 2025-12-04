import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 开始初始化数据...')

  // 1. 创建默认管理员账号
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      name: '管理员',
      role: 'ADMIN',
      settings: {},
    },
  })
  console.log('✅ 创建管理员账号:', admin.email)

  // 2. 创建默认团队
  const defaultTeam = await prisma.team.upsert({
    where: { id: 'default-team' },
    update: {},
    create: {
      id: 'default-team',
      name: '默认团队',
      description: '系统默认团队，所有用户都可以访问',
      ownerId: admin.id,
    },
  })
  console.log('✅ 创建默认团队:', defaultTeam.name)

  // 3. 将管理员添加为团队所有者
  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: defaultTeam.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      teamId: defaultTeam.id,
      userId: admin.id,
      role: 'OWNER',
    },
  })
  console.log('✅ 添加管理员为团队所有者')

  // 4. 将现有无团队的资源关联到默认团队
  const updatePrompts = await prisma.prompt.updateMany({
    where: { teamId: null },
    data: { teamId: defaultTeam.id },
  })
  if (updatePrompts.count > 0) {
    console.log(`✅ 关联 ${updatePrompts.count} 个提示词到默认团队`)
  }

  const updateDatasets = await prisma.dataset.updateMany({
    where: { teamId: null },
    data: { teamId: defaultTeam.id },
  })
  if (updateDatasets.count > 0) {
    console.log(`✅ 关联 ${updateDatasets.count} 个数据集到默认团队`)
  }

  const updateTasks = await prisma.task.updateMany({
    where: { teamId: null },
    data: { teamId: defaultTeam.id },
  })
  if (updateTasks.count > 0) {
    console.log(`✅ 关联 ${updateTasks.count} 个任务到默认团队`)
  }

  // 5. 将所有现有用户添加为默认团队成员
  const existingUsers = await prisma.user.findMany({
    where: {
      id: { not: admin.id },
    },
  })

  for (const user of existingUsers) {
    await prisma.teamMember.upsert({
      where: {
        teamId_userId: {
          teamId: defaultTeam.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        teamId: defaultTeam.id,
        userId: user.id,
        role: 'MEMBER',
        invitedById: admin.id,
      },
    })
  }
  if (existingUsers.length > 0) {
    console.log(`✅ 添加 ${existingUsers.length} 个现有用户为团队成员`)
  }

  // 6. 创建预置评估器
  const presetEvaluators = [
    {
      id: 'preset-exact-match',
      name: '精确匹配',
      description: '检查输出是否与预期完全一致',
      type: 'PRESET' as const,
      config: { presetType: 'exact_match', caseSensitive: true },
      isPreset: true,
    },
    {
      id: 'preset-contains',
      name: '包含匹配',
      description: '检查输出是否包含预期内容',
      type: 'PRESET' as const,
      config: { presetType: 'contains', caseSensitive: false },
      isPreset: true,
    },
    {
      id: 'preset-regex',
      name: '正则匹配',
      description: '使用正则表达式匹配输出',
      type: 'PRESET' as const,
      config: { presetType: 'regex', pattern: '' },
      isPreset: true,
    },
    {
      id: 'preset-json-schema',
      name: 'JSON Schema',
      description: '验证输出是否符合 JSON Schema',
      type: 'PRESET' as const,
      config: { presetType: 'json_schema', schema: {} },
      isPreset: true,
    },
    {
      id: 'preset-similarity',
      name: '相似度匹配',
      description: '计算输出与预期的相似度分数',
      type: 'PRESET' as const,
      config: { presetType: 'similarity', threshold: 0.8 },
      isPreset: true,
    },
  ]

  for (const evaluator of presetEvaluators) {
    await prisma.evaluator.upsert({
      where: { id: evaluator.id },
      update: evaluator,
      create: evaluator,
    })
    console.log('✅ 创建预置评估器:', evaluator.name)
  }

  console.log('🎉 数据初始化完成!')
}

main()
  .catch((e) => {
    console.error('❌ 数据初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
