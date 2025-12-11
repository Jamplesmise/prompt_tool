// 队列模块导出

export {
  TASK_QUEUE_NAME,
  DEAD_LETTER_QUEUE_NAME,
  getTaskQueue,
  getTaskQueueEvents,
  enqueueTask,
  getQueuedTaskStatus,
  removeFromQueue,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  clearQueue,
  // 死信队列
  getDeadLetterQueue,
  moveToDeadLetterQueue,
  getDeadLetterJobs,
  retryFromDeadLetterQueue,
  clearDeadLetterQueue,
  getDeadLetterStats,
  type TaskJobData,
  type TaskJobResult,
  type DeadLetterJobData,
} from './taskQueue'

export {
  createTaskWorker,
  getTaskWorker,
  closeTaskWorker,
  requestStop,
} from './taskWorker'

export {
  saveProgress,
  getProgress,
  deleteProgress,
  addCompletedItem,
  addFailedItem,
  initProgress,
  saveCheckpoint,
  getCheckpoint,
  deleteCheckpoint,
  createCheckpointFromProgress,
  getPendingItems,
  isItemCompleted,
  type Checkpoint,
  type ExecutionProgress,
} from './progressStore'
