/**
 * GOI 协作系统导出
 */

// 同步管理器
export {
  SyncManager,
  getSyncManager,
  resetSyncManager,
} from './syncManager'
export type { SyncManagerConfig } from './syncManager'

// 控制权转移管理器
export {
  ControlTransferManager,
  getControlTransferManager,
  resetControlTransferManager,
} from './controlTransfer'
export type { ControlTransferConfig } from './controlTransfer'

// 人工操作感知类型
export type {
  TrackableAction,
  TrackedAction,
  ActionTarget,
  ActionData,
  ActionContext,
  DetectedResource,
  StateDiff,
  StateSnapshot,
  ReconciledStep,
  ReconciledPlan,
  ContinuationSuggestion,
  Deviation,
  DeviationType,
  DeviationIssue,
  DeviationSeverity,
  HandbackDialogData,
} from './types'

// 操作追踪器
export {
  ActionTracker,
  getActionTracker,
  resetActionTracker,
} from './actionTracker'

// 资源检测器
export {
  ResourceDetector,
  getResourceDetector,
  resetResourceDetector,
} from './resourceDetector'

// 状态同步器
export {
  StateSync,
  getStateSync,
  resetStateSync,
} from './stateSync'

// 偏离检测器
export {
  DeviationDetector,
  getDeviationDetector,
  resetDeviationDetector,
} from './deviationDetector'
