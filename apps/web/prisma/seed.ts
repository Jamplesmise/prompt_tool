import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { config } from 'dotenv'
import { resolve } from 'path'

// 加载环境变量
config({ path: resolve(__dirname, '../.env') })

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

  // 7. 创建测试提示词（用于定时任务）
  const testPrompt = await prisma.prompt.upsert({
    where: { id: 'test-prompt-for-scheduled-task' },
    update: {},
    create: {
      id: 'test-prompt-for-scheduled-task',
      name: '测试提示词',
      description: '用于定时任务测试的提示词',
      content: '你好，{{name}}！今天是 {{date}}。',
      variables: ['name', 'date'],
      createdById: admin.id,
      teamId: defaultTeam.id,
    },
  })
  console.log('✅ 创建测试提示词:', testPrompt.name)

  // 8. 创建测试数据集（用于任务）
  const testDataset = await prisma.dataset.upsert({
    where: { id: 'test-dataset-for-scheduled-task' },
    update: {},
    create: {
      id: 'test-dataset-for-scheduled-task',
      name: '测试数据集',
      description: '用于定时任务测试的数据集',
      schema: {
        type: 'QA',
        columns: ['input', 'expected'],
      },
      rowCount: 2,
      createdById: admin.id,
      teamId: defaultTeam.id,
    },
  })
  console.log('✅ 创建测试数据集:', testDataset.name)

  // 9. 创建测试 Provider 和 Model
  const testProvider = await prisma.provider.upsert({
    where: { id: 'test-provider' },
    update: {},
    create: {
      id: 'test-provider',
      name: 'OpenAI',
      type: 'OPENAI',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key',
      teamId: defaultTeam.id,
    },
  })
  console.log('✅ 创建测试 Provider:', testProvider.name)

  const testModel = await prisma.model.upsert({
    where: { id: 'test-model' },
    update: {},
    create: {
      id: 'test-model',
      name: 'GPT-3.5 Turbo',
      modelId: 'gpt-3.5-turbo',
      providerId: testProvider.id,
      config: {
        maxTokens: 2000,
        temperature: 0.7,
      },
      pricing: {
        inputTokenPrice: 0.0015,
        outputTokenPrice: 0.002,
      },
    },
  })
  console.log('✅ 创建测试 Model:', testModel.name)

  // 10. 创建测试任务（作为定时任务模板）
  const testTask = await prisma.task.upsert({
    where: { id: 'test-task-template' },
    update: {},
    create: {
      id: 'test-task-template',
      name: '定时监控任务模板',
      description: '用于定时监控的任务模板',
      type: 'PROMPT',
      status: 'COMPLETED',
      config: {
        batchSize: 10,
        retryCount: 3,
        timeout: 30000,
      },
      datasetId: testDataset.id,
      createdById: admin.id,
      teamId: defaultTeam.id,
    },
  })
  console.log('✅ 创建测试任务模板:', testTask.name)

  // 11. 创建定时任务
  const scheduledTask = await prisma.scheduledTask.upsert({
    where: { id: 'scheduled-task-daily-monitoring' },
    update: {},
    create: {
      id: 'scheduled-task-daily-monitoring',
      name: '每日质量监控',
      description: '每天早上 9 点执行提示词质量检查',
      taskTemplateId: testTask.id,
      cronExpression: '0 9 * * *',
      timezone: 'Asia/Shanghai',
      isActive: true,
      nextRunAt: new Date('2025-12-05T09:00:00+08:00'),
      createdById: admin.id,
      teamId: defaultTeam.id,
    },
  })
  console.log('✅ 创建定时任务:', scheduledTask.name)

  // 12. 创建通知渠道
  const emailChannel = await prisma.notifyChannel.upsert({
    where: { id: 'notify-channel-email' },
    update: {},
    create: {
      id: 'notify-channel-email',
      name: '邮件通知',
      type: 'EMAIL',
      config: {
        recipients: ['admin@example.com', 'dev@example.com'],
        subject: '【告警】AI 模型测试平台',
      },
      isActive: true,
      createdById: admin.id,
      teamId: defaultTeam.id,
    },
  })
  console.log('✅ 创建邮件通知渠道:', emailChannel.name)

  const webhookChannel = await prisma.notifyChannel.upsert({
    where: { id: 'notify-channel-webhook' },
    update: {},
    create: {
      id: 'notify-channel-webhook',
      name: 'Webhook 通知',
      type: 'WEBHOOK',
      config: {
        url: 'https://hooks.example.com/alert',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        method: 'POST',
      },
      isActive: true,
      createdById: admin.id,
      teamId: defaultTeam.id,
    },
  })
  console.log('✅ 创建 Webhook 通知渠道:', webhookChannel.name)

  // 13. 创建告警规则
  const passRateAlertRule = await prisma.alertRule.upsert({
    where: { id: 'alert-rule-low-pass-rate' },
    update: {},
    create: {
      id: 'alert-rule-low-pass-rate',
      name: '通过率过低告警',
      description: '当测试通过率低于 80% 持续 30 分钟时触发',
      metric: 'PASS_RATE',
      condition: 'LT',
      threshold: 0.8,
      duration: 30,
      severity: 'WARNING',
      silencePeriod: 60,
      notifyChannels: [emailChannel.id, webhookChannel.id],
      scope: {
        taskIds: [testTask.id],
      },
      isActive: true,
      createdById: admin.id,
      teamId: defaultTeam.id,
    },
  })
  console.log('✅ 创建告警规则:', passRateAlertRule.name)

  const latencyAlertRule = await prisma.alertRule.upsert({
    where: { id: 'alert-rule-high-latency' },
    update: {},
    create: {
      id: 'alert-rule-high-latency',
      name: '响应时间过长告警',
      description: '当平均响应时间超过 5000ms 持续 15 分钟时触发',
      metric: 'AVG_LATENCY',
      condition: 'GT',
      threshold: 5000,
      duration: 15,
      severity: 'CRITICAL',
      silencePeriod: 30,
      notifyChannels: [emailChannel.id],
      isActive: true,
      createdById: admin.id,
      teamId: defaultTeam.id,
    },
  })
  console.log('✅ 创建告警规则:', latencyAlertRule.name)

  // 14. 创建告警记录
  const triggeredAlert = await prisma.alert.upsert({
    where: { id: 'alert-triggered-pass-rate' },
    update: {},
    create: {
      id: 'alert-triggered-pass-rate',
      ruleId: passRateAlertRule.id,
      value: 0.65,
      status: 'TRIGGERED',
    },
  })
  console.log('✅ 创建告警记录 (TRIGGERED):', triggeredAlert.id)

  const acknowledgedAlert = await prisma.alert.upsert({
    where: { id: 'alert-acknowledged-latency' },
    update: {},
    create: {
      id: 'alert-acknowledged-latency',
      ruleId: latencyAlertRule.id,
      value: 5500,
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
      acknowledgedById: admin.id,
    },
  })
  console.log('✅ 创建告警记录 (ACKNOWLEDGED):', acknowledgedAlert.id)

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
