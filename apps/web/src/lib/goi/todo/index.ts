/**
 * GOI TODO List 模块导出
 */

// 核心管理
export {
  TodoListManager,
  createTodoItem,
  createTodoList,
  createTodoListManager,
  wrapTodoList,
} from './todoList'

// 状态机
export {
  TodoItemStateMachine,
  TodoListStateMachine,
  todoItemStateMachine,
  todoListStateMachine,
  transitionTodoItem,
  canTransitionTodoItem,
  canTransitionTodoList,
  type TransitionContext,
  type TransitionResult,
  type TransitionHook,
} from './stateMachine'

// 持久化
export { TodoStore, todoStore } from './todoStore'

// 展示类型
export type {
  TodoPhase,
  DisplayTodoItem,
  TodoGroup,
  TodoDisplayData,
  LabelConversionResult,
  GroupDefinition,
} from './displayTypes'
export { PHASE_CONFIG, STATUS_ICONS } from './displayTypes'

// 标签转换
export {
  convertToUserLabel,
  isKeyStep,
  requiresConfirmation,
  estimateOperationTime,
} from './labelConverter'

// 分组生成
export {
  groupTodoItems,
  generateDisplayData,
  autoCollapseGroups,
  toggleGroupCollapse,
} from './groupGenerator'

// 进度计算
export {
  calculateProgress,
  updateProgressInDisplayData,
  formatTime,
  formatTimeShort,
  generateProgressBar,
  generateProgressText,
  calculateGroupProgress,
  isGroupCompleted,
  hasGroupInProgress,
  getCurrentGroup,
  countByStatus,
  hasFailedItems,
  getFailedItems,
} from './progress'
