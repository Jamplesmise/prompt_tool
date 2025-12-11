import { redis, REDIS_KEY_PREFIX } from './redis'
import { NextResponse } from 'next/server'

/**
 * 速率限制配置
 */
export type RateLimitConfig = {
  /** 时间窗口（秒） */
  windowSeconds: number
  /** 窗口内最大请求数 */
  maxRequests: number
}

/**
 * 预设的速率限制配置
 */
export const RATE_LIMIT_PRESETS = {
  /** 登录接口：每分钟 5 次 */
  login: { windowSeconds: 60, maxRequests: 5 },
  /** 注册接口：每分钟 3 次 */
  register: { windowSeconds: 60, maxRequests: 3 },
  /** 普通 API：每分钟 60 次 */
  standard: { windowSeconds: 60, maxRequests: 60 },
  /** 高频 API：每分钟 120 次 */
  high: { windowSeconds: 60, maxRequests: 120 },
  /** 敏感操作：每分钟 10 次 */
  sensitive: { windowSeconds: 60, maxRequests: 10 },
} as const

/**
 * 速率限制检查结果
 */
export type RateLimitResult = {
  /** 是否被限制 */
  limited: boolean
  /** 剩余请求数 */
  remaining: number
  /** 重置时间（Unix 时间戳） */
  resetAt: number
  /** 总限制数 */
  limit: number
}

/**
 * 从请求中获取客户端标识
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  // 优先使用用户 ID
  if (userId) {
    return `user:${userId}`
  }

  // 获取真实 IP（考虑代理）
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

  return `ip:${ip}`
}

/**
 * 检查速率限制（使用 Redis 滑动窗口算法）
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${REDIS_KEY_PREFIX}ratelimit:${endpoint}:${identifier}`
  const now = Date.now()
  const windowStart = now - config.windowSeconds * 1000

  try {
    // 使用 Redis pipeline 原子操作
    const pipeline = redis.pipeline()

    // 移除过期的请求记录
    pipeline.zremrangebyscore(key, 0, windowStart)

    // 获取当前窗口内的请求数
    pipeline.zcard(key)

    // 添加当前请求
    pipeline.zadd(key, now, `${now}:${Math.random()}`)

    // 设置 key 过期时间
    pipeline.expire(key, config.windowSeconds)

    const results = await pipeline.exec()

    // zcard 结果在第二个命令
    const currentCount = (results?.[1]?.[1] as number) || 0

    const resetAt = Math.ceil((now + config.windowSeconds * 1000) / 1000)
    const remaining = Math.max(0, config.maxRequests - currentCount - 1)
    const limited = currentCount >= config.maxRequests

    return {
      limited,
      remaining,
      resetAt,
      limit: config.maxRequests,
    }
  } catch (error) {
    // Redis 错误时，默认放行（降级策略）
    console.error('[RateLimit] Redis error:', error)
    return {
      limited: false,
      remaining: config.maxRequests,
      resetAt: Math.ceil(Date.now() / 1000) + config.windowSeconds,
      limit: config.maxRequests,
    }
  }
}

/**
 * 生成速率限制响应头
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toString(),
  }
}

/**
 * 速率限制错误响应
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = result.resetAt - Math.ceil(Date.now() / 1000)

  return NextResponse.json(
    {
      code: 429,
      message: '请求过于频繁，请稍后再试',
      data: {
        retryAfter,
        resetAt: result.resetAt,
      },
    },
    {
      status: 429,
      headers: {
        ...getRateLimitHeaders(result),
        'Retry-After': retryAfter.toString(),
      },
    }
  )
}

/**
 * 速率限制中间件工厂
 *
 * @example
 * // 在 API 路由中使用
 * export async function POST(request: Request) {
 *   const rateLimitResult = await withRateLimit(request, 'login', RATE_LIMIT_PRESETS.login)
 *   if (rateLimitResult) return rateLimitResult
 *
 *   // 正常处理逻辑
 * }
 */
export async function withRateLimit(
  request: Request,
  endpoint: string,
  config: RateLimitConfig,
  userId?: string
): Promise<NextResponse | null> {
  const identifier = getClientIdentifier(request, userId)
  const result = await checkRateLimit(identifier, endpoint, config)

  if (result.limited) {
    return rateLimitResponse(result)
  }

  return null
}
