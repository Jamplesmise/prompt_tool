/**
 * GOI 组件导出
 */

// Copilot 面板
export { CopilotPanel, default as CopilotPanelDefault } from './CopilotPanel'
export type { CopilotPanelProps } from './CopilotPanel'

// 子组件
export { CurrentUnderstanding } from './CopilotPanel/CurrentUnderstanding'
export { TodoListView } from './CopilotPanel/TodoListView'
export { CheckpointSection } from './CopilotPanel/CheckpointSection'
export { ContextIndicator } from './CopilotPanel/ContextIndicator'
export { ModeSelector } from './CopilotPanel/ModeSelector'
export { CommandInput } from './CopilotPanel/CommandInput'

// 可视化组件 (Phase 2)
export { OperationHighlight, HIGHLIGHT_COLORS, type HighlightType } from './OperationHighlight'
export { ActionBubble, BUBBLE_ICONS, type BubbleIconType } from './ActionBubble'
export { SpeedSelector, StepConfirmButton } from './SpeedSelector'
export { ExecutionOverlay, ExecutionProgressPanel } from './ExecutionOverlay'

// 暂停与接管组件 (Phase 4)
export { PauseStatusPanel } from './PauseStatusPanel'
export type { PauseStatusPanelProps } from './PauseStatusPanel'
export { ExecutionControls } from './ExecutionControls'
export type { ExecutionControlsProps } from './ExecutionControls'

// 人工操作感知组件 (Phase 5)
export { HandbackDialog } from './CopilotPanel/HandbackDialog'

// Hooks
export { useCopilot, useCopilotStore, useGoiEvents } from './hooks'
