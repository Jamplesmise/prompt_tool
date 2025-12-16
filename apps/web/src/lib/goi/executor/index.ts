/**
 * GOI Executor - GOI 操作执行器
 *
 * 整合 Access/State/Observation 三个 Handler，提供统一的执行入口
 *
 * 功能：
 * - 操作分发（根据类型选择对应 Handler）
 * - 执行前校验
 * - 执行后验证
 * - 日志记录
 */

import type {
  GoiOperation,
  GoiOperationType,
  GoiExecutionResult,
  OperationValidationResult,
  isAccessOperation,
  isStateOperation,
  isObservationOperation,
} from '@platform/shared'
import { AccessHandler, executeAccess } from './accessHandler'
import { StateHandler, executeState } from './stateHandler'
import { ObservationHandler, executeObservation } from './observationHandler'
import {
  resolveVariables,
  createStepResults,
  addStepResult,
  type VariableStepResults,
  type VariableResolverContext,
} from './variableResolver'

// 重新导出所有 Handler
export { AccessHandler, executeAccess, resolveTargetUrl } from './accessHandler'
export { StateHandler, executeState, getCurrentState } from './stateHandler'
export { ObservationHandler, executeObservation, querySingle, clearSessionCache } from './observationHandler'

// 重新导出变量解析器
export {
  resolveVariables,
  resolveStringVariables,
  resolveVariable,
  getNestedValue,
  hasVariableReference,
  extractVariableReferences,
  getReferencedStepIds,
  createStepResults,
  addStepResult,
  clearStepResults,
  type VariableStepResults,
  type VariableStepResult,
  type VariableResolverContext,
} from './variableResolver'

// 重新导出类型
export type { GoiExecutionResult } from '@platform/shared'

// ============================================
// Executor 上下文
// ============================================

/**
 * GOI Executor 上下文
 */
export type GoiExecutorContext = {
  /** 会话 ID */
  sessionId: string
  /** 用户 ID */
  userId?: string
  /** 团队 ID */
  teamId?: string
  /** 是否记录日志 */
  enableLogging?: boolean
  /** 是否执行前验证 */
  enablePreValidation?: boolean
  /** 是否执行后验证 */
  enablePostValidation?: boolean
}

/**
 * 执行选项
 */
export type ExecuteOptions = {
  /** 是否跳过前置检查 */
  skipPreCheck?: boolean
  /** 是否跳过后置验证 */
  skipPostValidation?: boolean
  /** 超时时间（毫秒） */
  timeout?: number
}

// ============================================
// GOI Executor 类
// ============================================

/**
 * GOI Executor - 统一的操作执行器
 */
export class GoiExecutor {
  private context: GoiExecutorContext
  private accessHandler: AccessHandler
  private stateHandler: StateHandler
  private observationHandler: ObservationHandler
  /** 步骤执行结果存储（用于变量引用解析） */
  private stepResults: VariableStepResults

  constructor(context: GoiExecutorContext) {
    this.context = {
      enableLogging: true,
      enablePreValidation: true,
      enablePostValidation: true,
      ...context,
    }

    // 初始化各个 Handler
    this.accessHandler = new AccessHandler({
      sessionId: context.sessionId,
      userId: context.userId,
      teamId: context.teamId,
    })

    this.stateHandler = new StateHandler({
      sessionId: context.sessionId,
      userId: context.userId,
      teamId: context.teamId,
    })

    this.observationHandler = new ObservationHandler({
      sessionId: context.sessionId,
      userId: context.userId,
      teamId: context.teamId,
    })

    // 初始化步骤结果存储
    this.stepResults = createStepResults()
  }

  /**
   * 重置步骤结果（用于新的 TODO List 执行）
   */
  resetStepResults(): void {
    this.stepResults.clear()
  }

  /**
   * 获取步骤结果存储（用于调试和测试）
   */
  getStepResults(): VariableStepResults {
    return this.stepResults
  }

  /**
   * 执行 GOI 操作（支持变量解析）
   *
   * @param operation - GOI 操作
   * @param options - 执行选项
   * @param stepContext - 步骤上下文（用于变量解析）
   */
  async execute<T extends GoiOperationType>(
    operation: GoiOperation,
    options: ExecuteOptions = {},
    stepContext?: { stepId: string; stepIndex: number; stepIdOrder?: string[] }
  ): Promise<GoiExecutionResult<T>> {
    const startTime = Date.now()

    // 1. 如果有步骤上下文，先解析变量引用
    let resolvedOperation = operation
    if (stepContext && this.stepResults.size > 0) {
      const variableContext: VariableResolverContext = {
        currentStepIndex: stepContext.stepIndex,
        currentStepId: stepContext.stepId,
        stepIdOrder: stepContext.stepIdOrder,
      }
      resolvedOperation = resolveVariables(operation, this.stepResults, variableContext) as GoiOperation

      if (this.context.enableLogging) {
        console.log(`[GoiExecutor] Resolved variables for step ${stepContext.stepId}`, {
          original: this.sanitizeForLog(operation),
          resolved: this.sanitizeForLog(resolvedOperation),
        })
      }
    }

    // 日志记录
    if (this.context.enableLogging) {
      console.log(`[GoiExecutor] Executing ${resolvedOperation.type} operation`, {
        sessionId: this.context.sessionId,
        operation: this.sanitizeForLog(resolvedOperation),
      })
    }

    // 2. 执行前校验
    if (this.context.enablePreValidation && !options.skipPreCheck) {
      const validation = this.validateOperation(resolvedOperation)
      if (!validation.valid) {
        return {
          success: false,
          status: 'failed',
          error: validation.errors.map((e) => e.message).join('; '),
          errorCode: 'VALIDATION_ERROR',
          duration: Date.now() - startTime,
          events: [],
        } as GoiExecutionResult<T>
      }
    }

    // 3. 执行操作（带超时）
    let result: GoiExecutionResult<T>

    try {
      const executePromise = this.dispatchOperation(resolvedOperation) as Promise<GoiExecutionResult<T>>

      if (options.timeout) {
        result = await Promise.race([
          executePromise,
          this.createTimeoutPromise<T>(options.timeout, startTime),
        ])
      } else {
        result = await executePromise
      }
    } catch (error) {
      result = {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'EXECUTION_ERROR',
        duration: Date.now() - startTime,
        events: [],
      } as GoiExecutionResult<T>
    }

    // 4. 执行后验证
    if (
      this.context.enablePostValidation &&
      !options.skipPostValidation &&
      result.success
    ) {
      const postValidation = await this.postValidate(resolvedOperation, result)
      if (!postValidation.valid) {
        // 后置验证失败，标记为部分成功
        result.status = 'partial'
        result.error = postValidation.message
      }
    }

    // 5. 存储步骤结果（用于后续步骤的变量引用）
    if (stepContext) {
      addStepResult(
        this.stepResults,
        stepContext.stepId,
        result.result,
        result.success ? 'success' : 'failed'
      )
    }

    // 6. 日志记录
    if (this.context.enableLogging) {
      console.log(`[GoiExecutor] Completed ${resolvedOperation.type} operation`, {
        sessionId: this.context.sessionId,
        success: result.success,
        duration: result.duration,
        errorCode: result.errorCode,
      })
    }

    return result
  }

  /**
   * 分发操作到对应的 Handler
   */
  private async dispatchOperation(
    operation: GoiOperation
  ): Promise<GoiExecutionResult> {
    switch (operation.type) {
      case 'access':
        return this.accessHandler.execute(operation)
      case 'state':
        return this.stateHandler.execute(operation)
      case 'observation':
        return this.observationHandler.execute(operation)
      default:
        throw new Error(`Unknown operation type: ${(operation as GoiOperation).type}`)
    }
  }

  /**
   * 验证操作
   */
  validateOperation(operation: GoiOperation): OperationValidationResult {
    const errors: OperationValidationResult['errors'] = []
    const warnings: OperationValidationResult['warnings'] = []

    // 基础验证
    if (!operation.type) {
      errors.push({
        field: 'type',
        message: 'Operation type is required',
        code: 'REQUIRED_FIELD',
      })
    }

    // 类型特定验证
    switch (operation.type) {
      case 'access':
        if (!operation.target?.resourceType) {
          errors.push({
            field: 'target.resourceType',
            message: 'Resource type is required for access operation',
            code: 'REQUIRED_FIELD',
          })
        }
        if (!operation.action) {
          errors.push({
            field: 'action',
            message: 'Action is required for access operation',
            code: 'REQUIRED_FIELD',
          })
        }
        break

      case 'state':
        if (!operation.target?.resourceType) {
          errors.push({
            field: 'target.resourceType',
            message: 'Resource type is required for state operation',
            code: 'REQUIRED_FIELD',
          })
        }
        if (!operation.action) {
          errors.push({
            field: 'action',
            message: 'Action is required for state operation',
            code: 'REQUIRED_FIELD',
          })
        }
        if (operation.action !== 'delete' && !operation.expectedState) {
          errors.push({
            field: 'expectedState',
            message: 'Expected state is required for create/update operation',
            code: 'REQUIRED_FIELD',
          })
        }
        break

      case 'observation':
        if (!operation.queries || operation.queries.length === 0) {
          errors.push({
            field: 'queries',
            message: 'At least one query is required for observation operation',
            code: 'REQUIRED_FIELD',
          })
        }
        break
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 执行后验证
   */
  private async postValidate(
    operation: GoiOperation,
    result: GoiExecutionResult
  ): Promise<{ valid: boolean; message?: string }> {
    // 对于 State 操作，验证状态是否正确变更
    if (operation.type === 'state' && result.success) {
      const stateResult = result.result as { currentState?: Record<string, unknown> }

      if (operation.action !== 'delete' && stateResult?.currentState) {
        // 简单验证：检查关键字段是否匹配
        for (const [key, value] of Object.entries(operation.expectedState || {})) {
          if (stateResult.currentState[key] !== value) {
            // 允许一些字段差异（如时间戳、自动生成的字段）
            const allowedDiffFields = ['updatedAt', 'createdAt', 'version']
            if (!allowedDiffFields.includes(key)) {
              return {
                valid: false,
                message: `Field ${key} mismatch: expected ${value}, got ${stateResult.currentState[key]}`,
              }
            }
          }
        }
      }
    }

    return { valid: true }
  }

  /**
   * 创建超时 Promise
   */
  private createTimeoutPromise<T extends GoiOperationType>(
    timeout: number,
    startTime: number
  ): Promise<GoiExecutionResult<T>> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`))
      }, timeout)
    })
  }

  /**
   * 清理敏感信息用于日志
   */
  private sanitizeForLog(operation: GoiOperation): Record<string, unknown> {
    const sanitized = { ...operation } as Record<string, unknown>

    // 移除可能包含敏感信息的字段
    if (operation.type === 'state' && 'expectedState' in sanitized) {
      const expectedState = sanitized.expectedState as Record<string, unknown>
      sanitized.expectedState = {
        ...expectedState,
        // 脱敏密码等字段
        password: expectedState.password ? '***' : undefined,
        apiKey: expectedState.apiKey ? '***' : undefined,
        secret: expectedState.secret ? '***' : undefined,
      }
    }

    return sanitized
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 执行 GOI 操作（简化接口）
 */
export async function execute(
  operation: GoiOperation,
  context: GoiExecutorContext,
  options?: ExecuteOptions
): Promise<GoiExecutionResult> {
  const executor = new GoiExecutor(context)
  return executor.execute(operation, options)
}

/**
 * 批量执行 GOI 操作
 */
export async function executeBatch(
  operations: GoiOperation[],
  context: GoiExecutorContext,
  options?: ExecuteOptions & { stopOnError?: boolean }
): Promise<GoiExecutionResult[]> {
  const executor = new GoiExecutor(context)
  const results: GoiExecutionResult[] = []

  for (const operation of operations) {
    const result = await executor.execute(operation, options)
    results.push(result)

    if (options?.stopOnError && !result.success) {
      break
    }
  }

  return results
}

/**
 * 并行执行 GOI 操作
 */
export async function executeParallel(
  operations: GoiOperation[],
  context: GoiExecutorContext,
  options?: ExecuteOptions
): Promise<GoiExecutionResult[]> {
  const executor = new GoiExecutor(context)
  return Promise.all(operations.map((op) => executor.execute(op, options)))
}
