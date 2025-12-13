/**
 * GOI (Guided Orchestration Intelligence) 模块导出
 *
 * GOI 是 AI Agent 与系统交互的声明式接口
 * - executor: GOI 操作执行器
 * - execution: 可视化执行（速度控制、进度同步）
 * - todo: TODO List 管理系统
 * - agent: Agent Loop 及其组件
 * - checkpoint: 检查点系统
 * - context: 上下文管理
 * - failure: 失败处理
 */

// 执行器模块
export * from './executor'

// 可视化执行模块 (Phase 2)
export * from './execution'

// TODO List 模块
export * from './todo'

// Agent 模块
export * from './agent'

// 检查点模块
export * from './checkpoint'

// 协作模块
export * from './collaboration'

// 上下文管理模块
export * from './context'

// 失败处理模块
export * from './failure'
