/**
 * 失败处理模块导出
 */

// 失败分类器
export {
  FailureClassifier,
  createClassifier,
  classifier,
} from './classifier'

// 回滚执行器
export {
  RollbackExecutor,
  createRollbackExecutor,
  createMockSnapshotStore,
  createMockResourceOperations,
  type ResourceOperations,
  type SnapshotStore,
  type EventPublisher,
} from './rollback'

// 失败报告生成器
export {
  FailureReporter,
  createReporter,
  reporter,
} from './reporter'

// 重试策略
export {
  RetryExecutor,
  retryExecutor,
  withRetry,
  createRetryStrategy,
  createExponentialBackoff,
  createLinearBackoff,
  createImmediateRetry,
  type RetryCallback,
  type RetryEventListener,
  type RetryEvent,
  type RetryOptions,
} from './retryStrategy'
