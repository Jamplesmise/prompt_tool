// 枚举常量

export const UserRoleEnum = {
  ADMIN: 'ADMIN',
  USER: 'USER',
} as const

export const ProviderTypeEnum = {
  OPENAI: 'OPENAI',
  ANTHROPIC: 'ANTHROPIC',
  AZURE: 'AZURE',
  CUSTOM: 'CUSTOM',
} as const

export const EvaluatorTypeEnum = {
  PRESET: 'PRESET',
  CODE: 'CODE',
  LLM: 'LLM',
  COMPOSITE: 'COMPOSITE',
} as const

export const PresetEvaluatorTypeEnum = {
  EXACT_MATCH: 'exact_match',
  CONTAINS: 'contains',
  REGEX: 'regex',
  JSON_SCHEMA: 'json_schema',
  SIMILARITY: 'similarity',
} as const

export const TaskTypeEnum = {
  PROMPT: 'PROMPT',
  AGENT: 'AGENT',
  API: 'API',
  AB_TEST: 'AB_TEST',
} as const

export const TaskStatusEnum = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  STOPPED: 'STOPPED',
} as const

export const ResultStatusEnum = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  TIMEOUT: 'TIMEOUT',
  ERROR: 'ERROR',
} as const

// 分页默认值
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

// 任务默认配置
export const TASK_DEFAULTS = {
  CONCURRENCY: 5,
  TIMEOUT: 30000,
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000,
} as const

// Phase 8: 定时任务执行状态
export const ScheduledExecutionStatusEnum = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const

// Phase 8: 告警指标
export const AlertMetricEnum = {
  PASS_RATE: 'PASS_RATE',
  AVG_LATENCY: 'AVG_LATENCY',
  ERROR_RATE: 'ERROR_RATE',
  COST: 'COST',
} as const

// Phase 8: 告警条件
export const AlertConditionEnum = {
  LT: 'LT',
  GT: 'GT',
  EQ: 'EQ',
  LTE: 'LTE',
  GTE: 'GTE',
} as const

// Phase 8: 告警级别
export const AlertSeverityEnum = {
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  URGENT: 'URGENT',
} as const

// Phase 8: 告警状态
export const AlertStatusEnum = {
  TRIGGERED: 'TRIGGERED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  RESOLVED: 'RESOLVED',
} as const

// Phase 8: 通知渠道类型
export const NotifyChannelTypeEnum = {
  EMAIL: 'EMAIL',
  WEBHOOK: 'WEBHOOK',
  INTERNAL: 'INTERNAL',
} as const

// Phase 8: 时间范围选项
export const TimeRangeEnum = {
  '24H': '24h',
  '7D': '7d',
  '30D': '30d',
  CUSTOM: 'custom',
} as const

// Phase 8: 告警默认配置
export const ALERT_DEFAULTS = {
  SILENCE_PERIOD: 30, // 分钟
  DURATION: 5, // 分钟
  CHECK_INTERVAL: 60, // 秒
} as const

// Phase 8: 定时任务默认配置
export const SCHEDULED_TASK_DEFAULTS = {
  TIMEZONE: 'Asia/Shanghai',
} as const

// Phase 9: 团队角色
export const TeamRoleEnum = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const

// Phase 9: API Token 权限范围
export const ApiTokenScopeEnum = {
  READ: 'read',
  WRITE: 'write',
  EXECUTE: 'execute',
  ADMIN: 'admin',
} as const

// Phase 9: 审计日志操作类型
export const AuditActionEnum = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  EXECUTE: 'execute',
  INVITE: 'invite',
  REMOVE: 'remove',
  TRANSFER: 'transfer',
} as const

// Phase 9: 审计日志资源类型
export const AuditResourceEnum = {
  USER: 'user',
  TEAM: 'team',
  MEMBER: 'member',
  PROMPT: 'prompt',
  DATASET: 'dataset',
  MODEL: 'model',
  PROVIDER: 'provider',
  EVALUATOR: 'evaluator',
  TASK: 'task',
  API_TOKEN: 'api_token',
  SCHEDULED_TASK: 'scheduled_task',
  ALERT_RULE: 'alert_rule',
  NOTIFY_CHANNEL: 'notify_channel',
} as const

// Phase 9: 权限操作类型
export const PermissionActionEnum = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  EXECUTE: 'execute',
  MANAGE: 'manage',
} as const

// Phase 9: 权限资源类型
export const PermissionResourceEnum = {
  PROMPT: 'prompt',
  DATASET: 'dataset',
  MODEL: 'model',
  EVALUATOR: 'evaluator',
  TASK: 'task',
  MEMBER: 'member',
  TEAM: 'team',
  SETTINGS: 'settings',
} as const
