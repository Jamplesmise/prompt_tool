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

  // 2. 创建预置评估器
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
