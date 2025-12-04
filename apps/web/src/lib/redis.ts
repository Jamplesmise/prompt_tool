import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined
}

// 构建时返回 mock 对象，运行时返回真实 Redis
export const redis =
  process.env.NEXT_PHASE === 'phase-production-build'
    ? // @ts-ignore - 构建时的假对象
      ({
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
      } as Redis)
    : globalForRedis.redis ??
      new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: null, // BullMQ 要求此值为 null
        lazyConnect: true,
      })

if (process.env.NODE_ENV !== 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
  globalForRedis.redis = redis
}
