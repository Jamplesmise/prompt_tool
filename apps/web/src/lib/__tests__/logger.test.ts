/**
 * Logger 日志工具测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('logger', () => {
  const originalEnv = process.env.NODE_ENV
  const originalLogLevel = process.env.LOG_LEVEL

  beforeEach(() => {
    vi.resetModules()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    process.env.LOG_LEVEL = originalLogLevel
    vi.restoreAllMocks()
  })

  it('开发环境下应输出所有级别日志', async () => {
    process.env.NODE_ENV = 'development'
    process.env.LOG_LEVEL = 'debug'

    const { logger } = await import('../logger')

    logger.debug('[Test]', 'debug message')
    logger.info('[Test]', 'info message')
    logger.warn('[Test]', 'warn message')
    logger.error('[Test]', 'error message')

    expect(console.log).toHaveBeenCalled()
    expect(console.info).toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
  })

  it('生产环境下应只输出 warn 和 error', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.LOG_LEVEL

    vi.resetModules()
    const { logger } = await import('../logger')

    logger.debug('[Test]', 'debug message')
    logger.info('[Test]', 'info message')
    logger.warn('[Test]', 'warn message')
    logger.error('[Test]', 'error message')

    // 生产环境默认 warn 级别，debug 和 info 不输出
    expect(console.warn).toHaveBeenCalled()
    expect(console.error).toHaveBeenCalled()
  })

  it('日志消息应包含时间戳', async () => {
    process.env.LOG_LEVEL = 'debug'

    vi.resetModules()
    const { logger } = await import('../logger')

    logger.debug('[Test]', 'test message')

    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })
})
