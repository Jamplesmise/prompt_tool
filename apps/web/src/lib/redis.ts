import Redis from 'ioredis'

// Redis key 前缀，用于多项目隔离
export const REDIS_KEY_PREFIX = 'prompt-tool:'

// Pub/Sub 频道前缀（keyPrefix 对 Pub/Sub 不生效，需手动处理）
export const PUBSUB_PREFIX = 'prompt-tool:'

// BullMQ 队列前缀（BullMQ 内部会加 bull: 前缀）
export const BULLMQ_PREFIX = 'prompt-tool'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
  redisSub: Redis | undefined
}

/**
 * 主连接（用于 BullMQ 队列）
 * 注意：不使用 keyPrefix，因为 BullMQ 有自己的前缀机制
 * BullMQ 会生成: {prefix}:queue-name:* 格式的 key
 */
export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,  // BullMQ 要求此值为 null
    keepAlive: 30000,            // 30秒发送心跳，防止长时间空闲断连
    lazyConnect: true,
  })

/**
 * 订阅专用连接（Redis 的 Pub/Sub 需要独立连接）
 */
export const getSubscriberConnection = (): Redis => {
  if (!globalForRedis.redisSub) {
    globalForRedis.redisSub = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      keepAlive: 30000,
      lazyConnect: true,
    })
  }
  return globalForRedis.redisSub
}

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}
