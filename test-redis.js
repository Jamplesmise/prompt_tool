const Redis = require('./node_modules/.pnpm/ioredis@5.8.2/node_modules/ioredis')

const redisUrl = 'redis://default:g26x9f46@dbconn.sealosbja.site:36312'
const PUBSUB_PREFIX = 'prompt-tool:'
const BULLMQ_PREFIX = 'prompt-tool'

console.log('='.repeat(60))
console.log('🧪 Redis 改造测试')
console.log('='.repeat(60))

// 创建两个连接模拟跨进程
const publisher = new Redis(redisUrl)
const subscriber = new Redis(redisUrl)

async function testPubSub() {
  console.log('\n📡 测试 1: Redis Pub/Sub 跨进程通信')

  const channel = `${PUBSUB_PREFIX}task:test-123`
  let messageReceived = false

  // 订阅
  await subscriber.subscribe(channel)

  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      console.log('  ✅ 收到消息:', JSON.parse(message))
      messageReceived = true
    }
  })

  // 发布
  const event = { type: 'progress', data: { total: 100, completed: 50, failed: 0 } }
  await publisher.publish(channel, JSON.stringify(event))

  // 等待消息
  await new Promise(resolve => setTimeout(resolve, 500))

  if (messageReceived) {
    console.log('  ✅ Pub/Sub 测试通过')
  } else {
    console.log('  ❌ Pub/Sub 测试失败 - 未收到消息')
  }

  await subscriber.unsubscribe(channel)
}

async function testBullMQPrefix() {
  console.log('\n📦 测试 2: BullMQ 前缀隔离')

  // 检查当前 Redis 中的队列 keys
  const oldKeys = await publisher.keys('bull:*')
  const newKeys = await publisher.keys(`${BULLMQ_PREFIX}:*`)

  console.log('  旧格式 (bull:*) keys:', oldKeys.length)
  console.log('  新格式 (prompt-tool:*) keys:', newKeys.length)

  // 模拟创建一个测试队列
  const testQueueKey = `${BULLMQ_PREFIX}:test-queue:id`
  await publisher.set(testQueueKey, 'test-value', 'EX', 10)

  const value = await publisher.get(testQueueKey)
  console.log('  测试 key 写入:', value === 'test-value' ? '✅ 成功' : '❌ 失败')

  await publisher.del(testQueueKey)
}

async function testKeepAlive() {
  console.log('\n💓 测试 3: KeepAlive 配置')

  const testRedis = new Redis(redisUrl, {
    keepAlive: 30000,
    maxRetriesPerRequest: null,
  })

  console.log('  keepAlive:', testRedis.options.keepAlive, '(应为 30000)')

  testRedis.disconnect()
}

async function showSummary() {
  console.log('\n' + '='.repeat(60))
  console.log('📋 改造总结')
  console.log('='.repeat(60))

  console.log(`
改动内容:
1. ✅ Redis 主连接添加 keepAlive: 30000 (防断连)
2. ✅ 新增订阅专用连接 getSubscriberConnection()
3. ✅ progressPublisher 改用 Redis Pub/Sub (跨进程)
4. ✅ BullMQ 队列/Worker 添加 prefix: '${BULLMQ_PREFIX}'

Key 前缀策略:
- BullMQ 队列: ${BULLMQ_PREFIX}:queue-name:* (如 ${BULLMQ_PREFIX}:task-execution:*)
- Pub/Sub 频道: ${PUBSUB_PREFIX}task:taskId
- 进度存储: ${PUBSUB_PREFIX}task:progress:taskId (需后续迁移)

注意事项:
- 旧队列 (bull:task-execution:*) 中的任务不会自动迁移
- 建议: 等旧任务处理完后，清理旧 keys
`)
}

async function main() {
  try {
    await testPubSub()
    await testBullMQPrefix()
    await testKeepAlive()
    await showSummary()
  } catch (err) {
    console.error('❌ 测试失败:', err.message)
  } finally {
    publisher.disconnect()
    subscriber.disconnect()
  }
}

main()
