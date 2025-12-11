/**
 * 统一日志工具
 *
 * - 开发环境：输出所有日志
 * - 生产环境：仅输出 warn 和 error
 * - 可通过 LOG_LEVEL 环境变量控制
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

function getLogLevel(): number {
  const envLevel = process.env.LOG_LEVEL as LogLevel | undefined
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return LOG_LEVELS[envLevel]
  }
  // 生产环境默认 warn，开发环境默认 debug
  return process.env.NODE_ENV === 'production' ? LOG_LEVELS.warn : LOG_LEVELS.debug
}

const currentLevel = getLogLevel()

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLevel
}

function formatMessage(prefix: string, ...args: unknown[]): unknown[] {
  const timestamp = new Date().toISOString()
  return [`[${timestamp}] ${prefix}`, ...args]
}

export const logger = {
  debug(prefix: string, ...args: unknown[]) {
    if (shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.log(...formatMessage(prefix, ...args))
    }
  },

  info(prefix: string, ...args: unknown[]) {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info(...formatMessage(prefix, ...args))
    }
  },

  warn(prefix: string, ...args: unknown[]) {
    if (shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(...formatMessage(prefix, ...args))
    }
  },

  error(prefix: string, ...args: unknown[]) {
    if (shouldLog('error')) {
      // eslint-disable-next-line no-console
      console.error(...formatMessage(prefix, ...args))
    }
  },
}

export default logger
