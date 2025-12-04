/**
 * 数据库和 Redis 连接测试脚本
 */

// 手动设置环境变量
process.env.DATABASE_URL = "postgresql://postgres:REDACTED_PG_PASSWORD@REDACTED_DB_HOST:REDACTED_PG_PORT/ai_eval_platform?directConnection=true"
process.env.REDIS_URL = "redis://default:REDACTED_REDIS_PASSWORD@REDACTED_DB_HOST:REDACTED_REDIS_PORT"

const { PrismaClient } = require('@prisma/client')
const Redis = require('ioredis')

async function testDatabaseConnection() {
  console.log('\n🔍 测试数据库连接...')
  const prisma = new PrismaClient()

  try {
    await prisma.$connect()
    console.log('✅ 数据库连接成功')

    // 测试查询
    const userCount = await prisma.user.count()
    console.log(`📊 当前用户数: ${userCount}`)

    await prisma.$disconnect()
    return true
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message)
    await prisma.$disconnect()
    return false
  }
}

async function testRedisConnection() {
  console.log('\n🔍 测试 Redis 连接...')
  const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null
      return Math.min(times * 100, 2000)
    }
  })

  try {
    await redis.ping()
    console.log('✅ Redis 连接成功')

    // 测试读写
    await redis.set('test_key', 'test_value', 'EX', 10)
    const value = await redis.get('test_key')
    console.log(`📊 测试读写: ${value === 'test_value' ? '成功' : '失败'}`)

    await redis.quit()
    return true
  } catch (error) {
    console.error('❌ Redis 连接失败:', error.message)
    redis.disconnect()
    return false
  }
}

async function main() {
  console.log('=' .repeat(50))
  console.log('🚀 AI 模型测试平台 - 连接测试')
  console.log('='.repeat(50))

  const dbOk = await testDatabaseConnection()
  const redisOk = await testRedisConnection()

  console.log('\n' + '='.repeat(50))
  console.log('📋 测试结果汇总:')
  console.log(`  数据库: ${dbOk ? '✅ 正常' : '❌ 异常'}`)
  console.log(`  Redis:  ${redisOk ? '✅ 正常' : '❌ 异常'}`)
  console.log('='.repeat(50) + '\n')

  process.exit(dbOk && redisOk ? 0 : 1)
}

main()
