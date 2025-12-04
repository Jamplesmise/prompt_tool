/**
 * 检查数据库结构和数据
 */

process.env.DATABASE_URL = "postgresql://postgres:REDACTED_PG_PASSWORD@REDACTED_DB_HOST:REDACTED_PG_PORT/ai_eval_platform?directConnection=true"

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkDatabase() {
  console.log('\n📊 数据库状态检查\n')
  console.log('=' .repeat(50))

  try {
    // 核心表统计
    const stats = {
      '用户': await prisma.user.count(),
      '团队': await prisma.team.count(),
      '提示词': await prisma.prompt.count(),
      '数据集': await prisma.dataset.count(),
      '模型供应商': await prisma.provider.count(),
      '模型': await prisma.model.count(),
      '评估器': await prisma.evaluator.count(),
      '任务': await prisma.task.count(),
      '定时任务': await prisma.scheduledTask.count(),
      '告警规则': await prisma.alertRule.count(),
    }

    console.log('\n📋 核心数据统计:')
    for (const [table, count] of Object.entries(stats)) {
      console.log(`  ${table}: ${count} 条`)
    }

    // 检查是否有初始用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      take: 5,
    })

    if (users.length > 0) {
      console.log('\n👥 用户列表:')
      users.forEach(u => {
        console.log(`  - ${u.name} (${u.email}) [${u.role}]`)
      })
    }

    // 检查表是否都存在
    console.log('\n✅ 数据库表结构正常')
    await prisma.$disconnect()
  } catch (error) {
    console.error('\n❌ 数据库检查失败:', error.message)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkDatabase()
