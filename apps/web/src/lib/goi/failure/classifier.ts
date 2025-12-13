/**
 * 失败分类器
 *
 * 根据错误信息自动分类失败类型
 */

import type {
  FailureType,
  FailureSeverity,
  FailureInfo,
  FailedOperation,
  RetryStrategy,
  GoiErrorCode,
} from '@platform/shared'
import {
  GOI_ERROR_CODES,
  DEFAULT_RETRY_STRATEGIES,
} from '@platform/shared'

// ============================================
// 错误模式定义
// ============================================

/**
 * 错误模式匹配规则
 */
type ErrorPattern = {
  /** 匹配模式（正则或字符串） */
  pattern: RegExp | string
  /** 失败类型 */
  type: FailureType
  /** 错误代码 */
  code: GoiErrorCode
  /** 严重程度 */
  severity: FailureSeverity
}

/**
 * HTTP 状态码映射
 */
const HTTP_STATUS_MAP: Record<number, { type: FailureType; severity: FailureSeverity }> = {
  400: { type: 'data', severity: 'medium' },
  401: { type: 'permission', severity: 'high' },
  403: { type: 'permission', severity: 'high' },
  404: { type: 'data', severity: 'medium' },
  409: { type: 'logic', severity: 'medium' },
  422: { type: 'data', severity: 'medium' },
  429: { type: 'temporary', severity: 'low' },
  500: { type: 'system', severity: 'high' },
  502: { type: 'temporary', severity: 'medium' },
  503: { type: 'temporary', severity: 'medium' },
  504: { type: 'temporary', severity: 'medium' },
}

/**
 * 错误消息模式
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // 临时性错误
  {
    pattern: /timeout|timed?\s*out/i,
    type: 'temporary',
    code: GOI_ERROR_CODES.NETWORK_TIMEOUT,
    severity: 'low',
  },
  {
    pattern: /network|connection|ECONNREFUSED|ENOTFOUND/i,
    type: 'temporary',
    code: GOI_ERROR_CODES.CONNECTION_FAILED,
    severity: 'low',
  },
  {
    pattern: /rate\s*limit|too\s*many\s*requests|throttl/i,
    type: 'temporary',
    code: GOI_ERROR_CODES.RATE_LIMITED,
    severity: 'low',
  },
  {
    pattern: /service\s*unavailable|temporarily\s*unavailable/i,
    type: 'temporary',
    code: GOI_ERROR_CODES.SERVICE_UNAVAILABLE,
    severity: 'medium',
  },

  // 数据性错误
  {
    pattern: /not\s*found|does\s*not\s*exist|no\s*such/i,
    type: 'data',
    code: GOI_ERROR_CODES.RESOURCE_NOT_FOUND,
    severity: 'medium',
  },
  {
    pattern: /validation|invalid|malformed|format/i,
    type: 'data',
    code: GOI_ERROR_CODES.VALIDATION_FAILED,
    severity: 'medium',
  },
  {
    pattern: /conflict|already\s*exists|duplicate/i,
    type: 'data',
    code: GOI_ERROR_CODES.DATA_CONFLICT,
    severity: 'medium',
  },
  {
    pattern: /invalid\s*state|illegal\s*state/i,
    type: 'data',
    code: GOI_ERROR_CODES.INVALID_STATE,
    severity: 'medium',
  },

  // 逻辑性错误
  {
    pattern: /precondition|prerequisite|depends\s*on/i,
    type: 'logic',
    code: GOI_ERROR_CODES.PRECONDITION_FAILED,
    severity: 'medium',
  },
  {
    pattern: /dependency|required\s*.*\s*missing/i,
    type: 'logic',
    code: GOI_ERROR_CODES.DEPENDENCY_NOT_MET,
    severity: 'medium',
  },
  {
    pattern: /invalid\s*operation|cannot\s*.*\s*in\s*this\s*state/i,
    type: 'logic',
    code: GOI_ERROR_CODES.INVALID_OPERATION,
    severity: 'medium',
  },

  // 权限性错误
  {
    pattern: /permission|forbidden|access\s*denied|unauthorized/i,
    type: 'permission',
    code: GOI_ERROR_CODES.PERMISSION_DENIED,
    severity: 'high',
  },
  {
    pattern: /authentication|auth|login\s*required/i,
    type: 'permission',
    code: GOI_ERROR_CODES.AUTH_REQUIRED,
    severity: 'high',
  },
  {
    pattern: /quota|limit\s*exceeded|subscription/i,
    type: 'permission',
    code: GOI_ERROR_CODES.QUOTA_EXCEEDED,
    severity: 'high',
  },

  // 系统性错误
  {
    pattern: /internal\s*error|server\s*error/i,
    type: 'system',
    code: GOI_ERROR_CODES.INTERNAL_ERROR,
    severity: 'high',
  },
  {
    pattern: /database|db\s*error|prisma/i,
    type: 'system',
    code: GOI_ERROR_CODES.DATABASE_ERROR,
    severity: 'critical',
  },
]

// ============================================
// 失败分类器类
// ============================================

/**
 * 失败分类器
 */
export class FailureClassifier {
  /**
   * 分类错误
   */
  classify(
    error: Error,
    context?: {
      httpStatus?: number
      operation?: FailedOperation
    }
  ): { type: FailureType; code: GoiErrorCode; severity: FailureSeverity } {
    // 1. 先检查 HTTP 状态码
    if (context?.httpStatus && HTTP_STATUS_MAP[context.httpStatus]) {
      const { type, severity } = HTTP_STATUS_MAP[context.httpStatus]
      return {
        type,
        code: this.getCodeFromType(type),
        severity,
      }
    }

    // 2. 检查是否是 HttpError
    if (this.isHttpError(error)) {
      const status = (error as HttpError).status
      if (HTTP_STATUS_MAP[status]) {
        const { type, severity } = HTTP_STATUS_MAP[status]
        return {
          type,
          code: this.getCodeFromType(type),
          severity,
        }
      }
    }

    // 3. 模式匹配错误消息
    const message = error.message || ''
    for (const pattern of ERROR_PATTERNS) {
      const regex =
        typeof pattern.pattern === 'string'
          ? new RegExp(pattern.pattern, 'i')
          : pattern.pattern

      if (regex.test(message)) {
        return {
          type: pattern.type,
          code: pattern.code,
          severity: pattern.severity,
        }
      }
    }

    // 4. 检查错误名称
    if (error.name === 'TypeError' || error.name === 'SyntaxError') {
      return {
        type: 'system',
        code: GOI_ERROR_CODES.INTERNAL_ERROR,
        severity: 'high',
      }
    }

    // 5. 默认为系统错误
    return {
      type: 'system',
      code: GOI_ERROR_CODES.INTERNAL_ERROR,
      severity: 'medium',
    }
  }

  /**
   * 判断是否可重试
   */
  isRetryable(failureInfo: FailureInfo): boolean {
    // 已达到最大重试次数
    if (failureInfo.retryCount >= failureInfo.maxRetries) {
      return false
    }

    // 根据失败类型判断
    switch (failureInfo.type) {
      case 'temporary':
        return true
      case 'system':
        return failureInfo.retryCount < 2 // 系统错误最多重试2次
      case 'logic':
        return failureInfo.retryCount < 1 // 逻辑错误最多重试1次
      case 'data':
      case 'permission':
        return false // 这两种不重试
      default:
        return false
    }
  }

  /**
   * 获取重试策略
   */
  getRetryStrategy(failureType: FailureType): RetryStrategy {
    return DEFAULT_RETRY_STRATEGIES[failureType]
  }

  /**
   * 计算下次重试延迟（毫秒）
   */
  calculateRetryDelay(failureInfo: FailureInfo): number {
    const strategy = this.getRetryStrategy(failureInfo.type)

    if (strategy.type === 'immediate') {
      return strategy.initialDelay
    }

    let delay: number
    if (strategy.type === 'exponential') {
      const multiplier = strategy.multiplier || 2
      delay = strategy.initialDelay * Math.pow(multiplier, failureInfo.retryCount)
    } else {
      // linear
      delay = strategy.initialDelay * (failureInfo.retryCount + 1)
    }

    // 应用最大延迟限制
    delay = Math.min(delay, strategy.maxDelay)

    // 添加随机抖动
    if (strategy.jitter) {
      const jitter = delay * 0.2 * Math.random()
      delay = delay + jitter - delay * 0.1
    }

    return Math.round(delay)
  }

  /**
   * 获取重试建议
   */
  getRetrySuggestion(failureInfo: FailureInfo): {
    shouldRetry: boolean
    delay?: number
    reason: string
  } {
    if (!this.isRetryable(failureInfo)) {
      return {
        shouldRetry: false,
        reason: this.getNoRetryReason(failureInfo),
      }
    }

    const delay = this.calculateRetryDelay(failureInfo)
    return {
      shouldRetry: true,
      delay,
      reason: `将在 ${delay}ms 后进行第 ${failureInfo.retryCount + 1} 次重试`,
    }
  }

  /**
   * 创建失败信息
   */
  createFailureInfo(
    error: Error,
    context: {
      sessionId: string
      todoItemId: string
      todoItemTitle: string
      operation: FailedOperation
      httpStatus?: number
    }
  ): FailureInfo {
    const classification = this.classify(error, {
      httpStatus: context.httpStatus,
      operation: context.operation,
    })

    const retryStrategy = this.getRetryStrategy(classification.type)

    return {
      id: `failure-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sessionId: context.sessionId,
      type: classification.type,
      severity: classification.severity,
      code: classification.code,
      message: error.message,
      todoItemId: context.todoItemId,
      todoItemTitle: context.todoItemTitle,
      operation: context.operation,
      originalError: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      timestamp: new Date(),
      retryable: classification.type === 'temporary' || classification.type === 'system',
      retryCount: 0,
      maxRetries: retryStrategy.maxRetries,
      status: 'detected',
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 检查是否是 HttpError
   */
  private isHttpError(error: Error): error is HttpError {
    return 'status' in error && typeof (error as HttpError).status === 'number'
  }

  /**
   * 根据类型获取默认错误代码
   */
  private getCodeFromType(type: FailureType): GoiErrorCode {
    const typeCodeMap: Record<FailureType, GoiErrorCode> = {
      temporary: GOI_ERROR_CODES.SERVICE_UNAVAILABLE,
      data: GOI_ERROR_CODES.RESOURCE_NOT_FOUND,
      logic: GOI_ERROR_CODES.PRECONDITION_FAILED,
      permission: GOI_ERROR_CODES.PERMISSION_DENIED,
      system: GOI_ERROR_CODES.INTERNAL_ERROR,
    }
    return typeCodeMap[type]
  }

  /**
   * 获取不可重试的原因
   */
  private getNoRetryReason(failureInfo: FailureInfo): string {
    if (failureInfo.retryCount >= failureInfo.maxRetries) {
      return `已达到最大重试次数 (${failureInfo.maxRetries})`
    }

    switch (failureInfo.type) {
      case 'data':
        return '数据错误通常需要修改参数，不建议自动重试'
      case 'permission':
        return '权限错误需要手动处理，不建议自动重试'
      case 'logic':
        return '逻辑错误可能需要重新规划'
      default:
        return '该类型错误不支持自动重试'
    }
  }
}

// ============================================
// 类型补充
// ============================================

/**
 * HTTP 错误类型（简化定义）
 */
type HttpError = Error & {
  status: number
  statusText?: string
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建失败分类器
 */
export function createClassifier(): FailureClassifier {
  return new FailureClassifier()
}

// ============================================
// 单例导出
// ============================================

/** 全局失败分类器实例 */
export const classifier = new FailureClassifier()
