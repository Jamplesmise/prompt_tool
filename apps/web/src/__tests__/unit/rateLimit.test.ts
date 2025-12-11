import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMIT_PRESETS,
  type RateLimitConfig,
} from '@/lib/rateLimit'

// Mock Redis
vi.mock('@/lib/redis', () => {
  const mockPipeline = {
    zremrangebyscore: vi.fn().mockReturnThis(),
    zcard: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    exec: vi.fn(),
  }

  return {
    redis: {
      pipeline: () => mockPipeline,
    },
    REDIS_KEY_PREFIX: 'test:',
    __mockPipeline: mockPipeline,
  }
})

describe('RateLimit', () => {
  describe('getClientIdentifier', () => {
    test('优先使用 userId', () => {
      const request = new Request('https://example.com/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1' },
      })
      const identifier = getClientIdentifier(request, 'user-123')
      expect(identifier).toBe('user:user-123')
    })

    test('使用 x-forwarded-for 头', () => {
      const request = new Request('https://example.com/api/test', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      })
      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('ip:192.168.1.1')
    })

    test('使用 x-real-ip 头', () => {
      const request = new Request('https://example.com/api/test', {
        headers: { 'x-real-ip': '172.16.0.1' },
      })
      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('ip:172.16.0.1')
    })

    test('无 IP 时返回 unknown', () => {
      const request = new Request('https://example.com/api/test')
      const identifier = getClientIdentifier(request)
      expect(identifier).toBe('ip:unknown')
    })
  })

  describe('checkRateLimit', () => {
    let mockPipeline: ReturnType<typeof vi.fn>

    beforeEach(async () => {
      const redis = await import('@/lib/redis')
      mockPipeline = (redis as unknown as { __mockPipeline: typeof mockPipeline }).__mockPipeline
      vi.clearAllMocks()
    })

    test('未超限时返回 limited: false', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 0], // zremrangebyscore
        [null, 3], // zcard - 当前 3 个请求
        [null, 1], // zadd
        [null, 1], // expire
      ])

      const config: RateLimitConfig = { windowSeconds: 60, maxRequests: 10 }
      const result = await checkRateLimit('user:123', 'test', config)

      expect(result.limited).toBe(false)
      expect(result.remaining).toBe(6) // 10 - 3 - 1
      expect(result.limit).toBe(10)
    })

    test('超限时返回 limited: true', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 0],
        [null, 10], // 已达到限制
        [null, 1],
        [null, 1],
      ])

      const config: RateLimitConfig = { windowSeconds: 60, maxRequests: 10 }
      const result = await checkRateLimit('user:123', 'test', config)

      expect(result.limited).toBe(true)
      expect(result.remaining).toBe(0)
    })

    test('Redis 错误时降级放行', async () => {
      mockPipeline.exec.mockRejectedValue(new Error('Redis connection error'))

      const config: RateLimitConfig = { windowSeconds: 60, maxRequests: 10 }
      const result = await checkRateLimit('user:123', 'test', config)

      expect(result.limited).toBe(false)
      expect(result.remaining).toBe(10)
    })
  })

  describe('RATE_LIMIT_PRESETS', () => {
    test('login 预设配置正确', () => {
      expect(RATE_LIMIT_PRESETS.login).toEqual({
        windowSeconds: 60,
        maxRequests: 5,
      })
    })

    test('standard 预设配置正确', () => {
      expect(RATE_LIMIT_PRESETS.standard).toEqual({
        windowSeconds: 60,
        maxRequests: 60,
      })
    })

    test('sensitive 预设配置正确', () => {
      expect(RATE_LIMIT_PRESETS.sensitive).toEqual({
        windowSeconds: 60,
        maxRequests: 10,
      })
    })
  })
})
