/**
 * GOI 任务规划模块
 *
 * 负责将用户目标拆解为可执行的步骤序列
 */

// 任务模板
export {
  matchTemplate,
  getAllTemplates,
  getTemplateById,
  generatePlanFromTemplate,
  extractResourceNames,
  TASK_TEMPLATES,
  type TaskTemplate,
  type TemplateInput,
  type TemplateStep,
  type TemplateStepType,
} from './templates'

// LLM 规划器
export {
  generatePlanWithLLM,
  validateLLMPlan,
  type PlanningContext,
  type LLMPlannerConfig,
} from './llmPlanner'

// 依赖关系图
export {
  DependencyGraph,
  createDependencyGraph,
  createDependencyGraphFromPlan,
  validateDependencies,
} from './dependencyGraph'

// 资源解析
export {
  resolveResource,
  resolveResources,
  updatePlanWithResolvedResources,
  getAvailableResourceStats,
  getRecentResources,
  getDefaultModel,
  type ResourceCandidate,
  type ResolvedResource,
  type ResolverConfig,
} from './resourceResolver'

// 重新导出计划类型
export type {
  TaskPlan,
  PlanStep,
  PlanGroup,
  StepStatus,
  PlanCheckpointType,
  ResourceRequirement,
  StepResult,
  PlanExecutionStats,
} from '@platform/shared'

export {
  calculatePlanStats,
  getNextExecutableStep,
  isPlanCompleted,
  isPlanSuccessful,
} from '@platform/shared'
