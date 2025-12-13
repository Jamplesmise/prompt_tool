/**
 * GOI Execution Module
 *
 * 提供可视化执行能力，包括：
 * - 执行速度控制
 * - 执行进度同步
 * - 可视化执行器
 */

// 速度控制
export {
  speedController,
  SpeedController,
  SPEED_CONFIG,
  SPEED_ICONS,
  getSpeedOptions,
  type ExecutionSpeed,
  type SpeedConfig,
  type SpeedControllerEvents,
} from './speedControl'

// 进度同步
export {
  useExecutionStore,
  useCurrentStep,
  useProgress,
  useExecutionStatus,
  useIsExecuting,
  useVisualization,
  type ExecutionState,
  type ExecutionActions,
  type ExecutionStatus,
  type ProgressInfo,
} from './progressSync'

// 可视化执行器
export {
  VisualExecutor,
  executeWithVisualization,
  type VisualExecutorConfig,
  type ExecutionCallbacks,
} from './visualExecutor'

// 暂停控制器 (Phase 4)
export {
  usePauseStore,
  checkPausePoint,
  confirmPaused,
  isPaused,
  isPausing,
  usePauseState,
  usePauseActions,
  type PauseState,
  type PauseActions,
  type PauseReason,
} from './pauseController'

// 控制权转移 (Phase 4)
export {
  useControlStore,
  takeoverControl,
  handbackControl,
  isUserInControl,
  isAIInControl,
  recordClick,
  recordInput,
  recordSelect,
  recordNavigate,
  useControlState,
  useControlActions,
  useManualActions,
  type ControlMode,
  type ControlHolder,
  type ControlState,
  type ControlActions,
  type ManualAction,
  type ManualActionType,
} from './controlTransfer'

// 任务取消 (Phase 4)
export {
  cancelTask,
  abortTask,
  canCancel,
  hasRollbackSnapshot,
  useTaskCancel,
  type CancelResult,
  type CancelOptions,
} from './taskCancel'
