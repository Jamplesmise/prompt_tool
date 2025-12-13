/**
 * GOI 快照系统导出
 */

export { snapshotStore, GoiSnapshotStore } from './snapshotStore'
export { snapshotManager, GoiSnapshotManager } from './snapshotManager'
export type { SnapshotManagerConfig, SessionStateCollector, TodoStateCollector, ContextStateCollector } from './snapshotManager'

// 自动快照触发
export {
  initializeAutoSnapshot,
  stopAutoSnapshot,
  updateAutoSnapshotConfig,
  getAutoSnapshotConfig,
  triggerManualSnapshot,
  clearThrottle,
} from './autoSnapshot'
export type { AutoSnapshotConfig } from './autoSnapshot'
