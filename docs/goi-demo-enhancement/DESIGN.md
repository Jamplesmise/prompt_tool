# GOI Demo 增强 - 详细技术设计

> 本文档包含实现所需的全部技术细节

---

## 一、State Handler 详细设计

### 1.1 类型定义

```typescript
// packages/shared/types/goi.ts 中补充

/**
 * State 操作定义
 */
export type StateOperation = {
  type: 'state'
  target: {
    resourceType: ResourceType
    resourceId?: string  // create 时不需要，update/delete 时必须
  }
  action: 'create' | 'update' | 'delete'
  /**
   * 期望的资源状态
   * - create: 新资源的完整数据
   * - update: 要更新的字段（部分更新）
   * - delete: 不需要
   */
  expectedState?: Record<string, unknown>
}

/**
 * State 执行结果
 */
export type StateExecutionResult = {
  /** 操作是否成功 */
  success: boolean
  /** 操作类型 */
  action: 'create' | 'update' | 'delete'
  /** 资源类型 */
  resourceType: ResourceType
  /** 资源ID（create 后返回新ID） */
  resourceId?: string
  /** 操作后的资源数据（delete 时为 null） */
  data?: Record<string, unknown>
  /** 错误信息（失败时） */
  error?: string
}
```

### 1.2 API 端点映射

```typescript
// apps/web/src/lib/goi/executor/stateHandler.ts

/**
 * 资源类型到 API 端点的映射
 */
const API_ENDPOINTS: Record<ResourceType, {
  create: string
  update: (id: string) => string
  delete: (id: string) => string
  method: {
    create: 'POST'
    update: 'PUT' | 'PATCH'
    delete: 'DELETE'
  }
}> = {
  prompt: {
    create: '/api/prompts',
    update: (id) => `/api/prompts/${id}`,
    delete: (id) => `/api/prompts/${id}`,
    method: { create: 'POST', update: 'PUT', delete: 'DELETE' }
  },
  dataset: {
    create: '/api/datasets',
    update: (id) => `/api/datasets/${id}`,
    delete: (id) => `/api/datasets/${id}`,
    method: { create: 'POST', update: 'PUT', delete: 'DELETE' }
  },
  task: {
    create: '/api/tasks',
    update: (id) => `/api/tasks/${id}`,
    delete: (id) => `/api/tasks/${id}`,
    method: { create: 'POST', update: 'PUT', delete: 'DELETE' }
  },
  model: {
    create: '/api/models',
    update: (id) => `/api/models/${id}`,
    delete: (id) => `/api/models/${id}`,
    method: { create: 'POST', update: 'PUT', delete: 'DELETE' }
  },
  provider: {
    create: '/api/providers',
    update: (id) => `/api/providers/${id}`,
    delete: (id) => `/api/providers/${id}`,
    method: { create: 'POST', update: 'PUT', delete: 'DELETE' }
  },
  evaluator: {
    create: '/api/evaluators',
    update: (id) => `/api/evaluators/${id}`,
    delete: (id) => `/api/evaluators/${id}`,
    method: { create: 'POST', update: 'PUT', delete: 'DELETE' }
  },
  // 以下资源暂不支持 State 操作
  prompt_version: null,
  prompt_branch: null,
  dataset_version: null,
  task_result: null,
  scheduled_task: {
    create: '/api/scheduled-tasks',
    update: (id) => `/api/scheduled-tasks/${id}`,
    delete: (id) => `/api/scheduled-tasks/${id}`,
    method: { create: 'POST', update: 'PUT', delete: 'DELETE' }
  },
  alert_rule: {
    create: '/api/alert-rules',
    update: (id) => `/api/alert-rules/${id}`,
    delete: (id) => `/api/alert-rules/${id}`,
    method: { create: 'POST', update: 'PUT', delete: 'DELETE' }
  },
  notify_channel: {
    create: '/api/notify-channels',
    update: (id) => `/api/notify-channels/${id}`,
    delete: (id) => `/api/notify-channels/${id}`,
    method: { create: 'POST', update: 'PUT', delete: 'DELETE' }
  },
}
```

### 1.3 State Handler 完整实现

```typescript
// apps/web/src/lib/goi/executor/stateHandler.ts

import type {
  StateOperation,
  StateExecutionResult,
  GoiExecutionResult,
  ResourceType,
} from '@platform/shared'
import { publishResourceCreated, publishResourceUpdated, publishResourceDeleted } from '../../events'

export type StateHandlerContext = {
  sessionId: string
  userId?: string
  teamId?: string
}

/**
 * State Handler - 处理资源状态变更
 */
export class StateHandler {
  private context: StateHandlerContext

  constructor(context: StateHandlerContext) {
    this.context = context
  }

  /**
   * 执行 State 操作
   */
  async execute(operation: StateOperation): Promise<GoiExecutionResult<'state'>> {
    const startTime = Date.now()
    const events: Array<{ type: string; payload: unknown }> = []

    try {
      // 1. 验证操作
      const validation = this.validateOperation(operation)
      if (!validation.valid) {
        return {
          success: false,
          status: 'failed',
          error: validation.errors.join('; '),
          errorCode: 'INVALID_OPERATION',
          duration: Date.now() - startTime,
          events,
        }
      }

      // 2. 获取 API 配置
      const apiConfig = API_ENDPOINTS[operation.target.resourceType]
      if (!apiConfig) {
        return {
          success: false,
          status: 'failed',
          error: `Resource type "${operation.target.resourceType}" does not support state operations`,
          errorCode: 'UNSUPPORTED_RESOURCE',
          duration: Date.now() - startTime,
          events,
        }
      }

      // 3. 构建请求
      const { url, method, body } = this.buildRequest(operation, apiConfig)

      // 4. 执行 API 调用
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      // 5. 处理响应
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          status: 'failed',
          error: errorData.message || `API request failed with status ${response.status}`,
          errorCode: 'API_ERROR',
          duration: Date.now() - startTime,
          events,
        }
      }

      const responseData = await response.json()
      const resultData = responseData.data || responseData

      // 6. 发布事件
      await this.publishEvent(operation, resultData)
      events.push({
        type: this.getEventType(operation.action),
        payload: {
          resourceType: operation.target.resourceType,
          resourceId: resultData?.id || operation.target.resourceId,
          data: resultData,
        },
      })

      // 7. 返回结果
      return {
        success: true,
        status: 'success',
        result: {
          action: operation.action,
          resourceType: operation.target.resourceType,
          resourceId: resultData?.id || operation.target.resourceId,
          data: resultData,
        },
        duration: Date.now() - startTime,
        events,
      }
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'EXECUTION_ERROR',
        duration: Date.now() - startTime,
        events,
      }
    }
  }

  /**
   * 验证操作
   */
  private validateOperation(operation: StateOperation): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 检查 action
    if (!['create', 'update', 'delete'].includes(operation.action)) {
      errors.push(`Invalid action: ${operation.action}`)
    }

    // update/delete 需要 resourceId
    if ((operation.action === 'update' || operation.action === 'delete') && !operation.target.resourceId) {
      errors.push(`${operation.action} action requires resourceId`)
    }

    // create/update 需要 expectedState
    if ((operation.action === 'create' || operation.action === 'update') && !operation.expectedState) {
      errors.push(`${operation.action} action requires expectedState`)
    }

    // create 时检查必填字段
    if (operation.action === 'create') {
      const requiredFields = this.getRequiredFields(operation.target.resourceType)
      for (const field of requiredFields) {
        if (!operation.expectedState?.[field]) {
          errors.push(`Missing required field for create: ${field}`)
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * 获取资源类型的必填字段
   */
  private getRequiredFields(resourceType: ResourceType): string[] {
    const requiredFieldsMap: Partial<Record<ResourceType, string[]>> = {
      prompt: ['name', 'content'],
      dataset: ['name'],
      task: ['name', 'promptId', 'datasetId'],
      model: ['name', 'providerId', 'modelId'],
      provider: ['name', 'type', 'baseUrl'],
      evaluator: ['name', 'type'],
    }
    return requiredFieldsMap[resourceType] || []
  }

  /**
   * 构建 API 请求
   */
  private buildRequest(
    operation: StateOperation,
    apiConfig: typeof API_ENDPOINTS[ResourceType]
  ): { url: string; method: string; body?: Record<string, unknown> } {
    switch (operation.action) {
      case 'create':
        return {
          url: apiConfig.create,
          method: apiConfig.method.create,
          body: operation.expectedState,
        }
      case 'update':
        return {
          url: apiConfig.update(operation.target.resourceId!),
          method: apiConfig.method.update,
          body: operation.expectedState,
        }
      case 'delete':
        return {
          url: apiConfig.delete(operation.target.resourceId!),
          method: apiConfig.method.delete,
        }
    }
  }

  /**
   * 发布资源变更事件
   */
  private async publishEvent(operation: StateOperation, data: unknown): Promise<void> {
    const resourceId = (data as any)?.id || operation.target.resourceId
    const resourceName = (data as any)?.name

    switch (operation.action) {
      case 'create':
        await publishResourceCreated(
          this.context.sessionId,
          operation.target.resourceType,
          resourceId,
          resourceName,
          'ai'
        )
        break
      case 'update':
        await publishResourceUpdated(
          this.context.sessionId,
          operation.target.resourceType,
          resourceId,
          resourceName,
          'ai'
        )
        break
      case 'delete':
        await publishResourceDeleted(
          this.context.sessionId,
          operation.target.resourceType,
          resourceId,
          resourceName,
          'ai'
        )
        break
    }
  }

  /**
   * 获取事件类型
   */
  private getEventType(action: StateOperation['action']): string {
    switch (action) {
      case 'create':
        return 'RESOURCE_CREATED'
      case 'update':
        return 'RESOURCE_UPDATED'
      case 'delete':
        return 'RESOURCE_DELETED'
    }
  }
}

/**
 * 便捷函数
 */
export async function executeState(
  operation: StateOperation,
  context: StateHandlerContext
): Promise<GoiExecutionResult<'state'>> {
  const handler = new StateHandler(context)
  return handler.execute(operation)
}
```

---

## 二、Observation Handler 详细设计

### 2.1 类型定义

```typescript
// packages/shared/types/goi.ts 中补充

/**
 * Observation 查询定义
 */
export type ObservationQuery = {
  /** 资源类型 */
  resourceType: ResourceType
  /** 资源ID（查询单个时使用） */
  resourceId?: string
  /** 要返回的字段 */
  fields?: string[]
  /** 过滤条件 */
  filters?: {
    name?: { contains?: string; equals?: string }
    status?: string
    createdAt?: { gte?: string; lte?: string }
    [key: string]: unknown
  }
  /** 排序 */
  orderBy?: { field: string; direction: 'asc' | 'desc' }
  /** 分页 */
  pagination?: { page: number; pageSize: number }
}

/**
 * Observation 操作定义
 */
export type ObservationOperation = {
  type: 'observation'
  queries: ObservationQuery[]
}

/**
 * Observation 查询结果
 */
export type ObservationQueryResult = {
  resourceType: ResourceType
  /** 查询单个时返回对象，查询多个时返回数组 */
  data: Record<string, unknown> | Array<Record<string, unknown>>
  /** 总数（分页时使用） */
  total?: number
}

/**
 * Observation 执行结果
 */
export type ObservationExecutionResult = {
  results: ObservationQueryResult[]
}
```

### 2.2 API 查询端点映射

```typescript
// apps/web/src/lib/goi/executor/observationHandler.ts

/**
 * 资源类型到查询 API 的映射
 */
const QUERY_ENDPOINTS: Record<ResourceType, {
  list: string
  get: (id: string) => string
}> = {
  prompt: {
    list: '/api/prompts',
    get: (id) => `/api/prompts/${id}`,
  },
  dataset: {
    list: '/api/datasets',
    get: (id) => `/api/datasets/${id}`,
  },
  task: {
    list: '/api/tasks',
    get: (id) => `/api/tasks/${id}`,
  },
  model: {
    list: '/api/models',
    get: (id) => `/api/models/${id}`,
  },
  provider: {
    list: '/api/providers',
    get: (id) => `/api/providers/${id}`,
  },
  evaluator: {
    list: '/api/evaluators',
    get: (id) => `/api/evaluators/${id}`,
  },
  task_result: {
    list: '/api/task-results',
    get: (id) => `/api/task-results/${id}`,
  },
  // ... 其他资源类型
}

/**
 * 字段白名单（控制返回数据量，避免上下文爆炸）
 */
const FIELD_WHITELIST: Partial<Record<ResourceType, string[]>> = {
  prompt: ['id', 'name', 'description', 'content', 'createdAt', 'updatedAt'],
  dataset: ['id', 'name', 'description', 'itemCount', 'createdAt'],
  task: ['id', 'name', 'status', 'progress', 'passRate', 'createdAt', 'completedAt'],
  model: ['id', 'name', 'providerId', 'modelId', 'isActive'],
  provider: ['id', 'name', 'type', 'baseUrl'],
  evaluator: ['id', 'name', 'type', 'description'],
  task_result: ['id', 'taskId', 'status', 'score', 'output', 'error'],
}
```

### 2.3 Observation Handler 完整实现

```typescript
// apps/web/src/lib/goi/executor/observationHandler.ts

import type {
  ObservationOperation,
  ObservationQuery,
  ObservationQueryResult,
  ObservationExecutionResult,
  GoiExecutionResult,
  ResourceType,
} from '@platform/shared'

export type ObservationHandlerContext = {
  sessionId: string
  userId?: string
  teamId?: string
}

/**
 * Observation Handler - 处理信息查询
 */
export class ObservationHandler {
  private context: ObservationHandlerContext

  constructor(context: ObservationHandlerContext) {
    this.context = context
  }

  /**
   * 执行 Observation 操作
   */
  async execute(operation: ObservationOperation): Promise<GoiExecutionResult<'observation'>> {
    const startTime = Date.now()
    const events: Array<{ type: string; payload: unknown }> = []

    try {
      // 并行执行所有查询
      const results = await Promise.all(
        operation.queries.map(query => this.executeQuery(query))
      )

      return {
        success: true,
        status: 'success',
        result: { results },
        duration: Date.now() - startTime,
        events,
      }
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'QUERY_ERROR',
        duration: Date.now() - startTime,
        events,
      }
    }
  }

  /**
   * 执行单个查询
   */
  private async executeQuery(query: ObservationQuery): Promise<ObservationQueryResult> {
    const endpoint = QUERY_ENDPOINTS[query.resourceType]
    if (!endpoint) {
      throw new Error(`Unsupported resource type for observation: ${query.resourceType}`)
    }

    let url: string
    let isSingleQuery = false

    // 查询单个资源
    if (query.resourceId) {
      url = endpoint.get(query.resourceId)
      isSingleQuery = true
    } else {
      // 查询列表
      url = this.buildListUrl(endpoint.list, query)
    }

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Query failed with status ${response.status}`)
    }

    const responseData = await response.json()
    const data = responseData.data || responseData

    // 过滤字段
    const filteredData = this.filterFields(
      isSingleQuery ? data : (Array.isArray(data) ? data : data.items || data.list || []),
      query.resourceType,
      query.fields
    )

    return {
      resourceType: query.resourceType,
      data: filteredData,
      total: data.total || (Array.isArray(filteredData) ? filteredData.length : 1),
    }
  }

  /**
   * 构建列表查询 URL
   */
  private buildListUrl(baseUrl: string, query: ObservationQuery): string {
    const params = new URLSearchParams()

    // 过滤条件
    if (query.filters) {
      for (const [key, value] of Object.entries(query.filters)) {
        if (value !== undefined && value !== null) {
          if (typeof value === 'object') {
            // 处理复杂过滤条件
            if ('contains' in value) {
              params.append(`${key}_contains`, value.contains as string)
            }
            if ('equals' in value) {
              params.append(key, value.equals as string)
            }
            if ('gte' in value) {
              params.append(`${key}_gte`, value.gte as string)
            }
            if ('lte' in value) {
              params.append(`${key}_lte`, value.lte as string)
            }
          } else {
            params.append(key, String(value))
          }
        }
      }
    }

    // 排序
    if (query.orderBy) {
      params.append('orderBy', query.orderBy.field)
      params.append('order', query.orderBy.direction)
    }

    // 分页
    if (query.pagination) {
      params.append('page', String(query.pagination.page))
      params.append('pageSize', String(query.pagination.pageSize))
    } else {
      // 默认限制返回数量，避免数据量过大
      params.append('pageSize', '10')
    }

    const queryString = params.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }

  /**
   * 过滤返回字段
   */
  private filterFields(
    data: Record<string, unknown> | Array<Record<string, unknown>>,
    resourceType: ResourceType,
    requestedFields?: string[]
  ): Record<string, unknown> | Array<Record<string, unknown>> {
    // 确定要返回的字段
    const whitelist = FIELD_WHITELIST[resourceType] || []
    const fields = requestedFields?.length
      ? requestedFields.filter(f => whitelist.includes(f) || whitelist.length === 0)
      : whitelist

    if (fields.length === 0) {
      return data
    }

    const filterObject = (obj: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {}
      for (const field of fields) {
        if (field in obj) {
          result[field] = obj[field]
        }
      }
      return result
    }

    if (Array.isArray(data)) {
      return data.map(filterObject)
    } else {
      return filterObject(data)
    }
  }
}

/**
 * 便捷函数
 */
export async function executeObservation(
  operation: ObservationOperation,
  context: ObservationHandlerContext
): Promise<GoiExecutionResult<'observation'>> {
  const handler = new ObservationHandler(context)
  return handler.execute(operation)
}
```

---

## 三、TODO 执行引擎完善

### 3.1 结果引用机制

TODO List 中后续步骤需要引用前序步骤的结果。设计一个变量引用语法：

```typescript
/**
 * 变量引用语法：
 * - $1.result.id         - 引用步骤1的结果中的id字段
 * - $2.result[0].name    - 引用步骤2结果数组的第一个元素的name字段
 * - $prev.result.id      - 引用上一步的结果中的id字段
 */

// 示例 TODO List
const todoList = [
  {
    id: "1",
    title: "创建提示词",
    goiOperation: {
      type: "state",
      action: "create",
      target: { resourceType: "prompt" },
      expectedState: {
        name: "情感分析提示词",
        content: "你是一个情感分析助手..."
      }
    }
  },
  {
    id: "2",
    title: "查找数据集",
    goiOperation: {
      type: "observation",
      queries: [{
        resourceType: "dataset",
        filters: { name: { contains: "测试" } }
      }]
    }
  },
  {
    id: "3",
    title: "创建测试任务",
    goiOperation: {
      type: "state",
      action: "create",
      target: { resourceType: "task" },
      expectedState: {
        name: "情感分析测试",
        promptId: "$1.result.id",        // ← 引用步骤1创建的提示词ID
        datasetId: "$2.result[0].id"     // ← 引用步骤2查询的第一个数据集ID
      }
    }
  }
]
```

### 3.2 变量解析器实现

```typescript
// apps/web/src/lib/goi/executor/variableResolver.ts

/**
 * 步骤执行结果存储
 */
export type StepResults = Map<string, {
  result: unknown
  status: 'success' | 'failed'
}>

/**
 * 变量引用模式
 * 匹配: $1.result.id, $2.result[0].name, $prev.result.data
 */
const VARIABLE_PATTERN = /\$(\d+|prev)\.result(\.[a-zA-Z_][\w]*|\[\d+\])*/g

/**
 * 解析变量引用
 */
export function resolveVariables(
  data: unknown,
  stepResults: StepResults,
  currentStepIndex: number
): unknown {
  if (typeof data === 'string') {
    return resolveStringVariables(data, stepResults, currentStepIndex)
  }

  if (Array.isArray(data)) {
    return data.map(item => resolveVariables(item, stepResults, currentStepIndex))
  }

  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      result[key] = resolveVariables(value, stepResults, currentStepIndex)
    }
    return result
  }

  return data
}

/**
 * 解析字符串中的变量引用
 */
function resolveStringVariables(
  str: string,
  stepResults: StepResults,
  currentStepIndex: number
): unknown {
  // 如果整个字符串就是一个变量引用，返回原始值（可能是对象/数组）
  const fullMatch = str.match(/^\$(\d+|prev)\.result(\.[a-zA-Z_][\w]*|\[\d+\])*$/)
  if (fullMatch) {
    return resolveVariable(str, stepResults, currentStepIndex)
  }

  // 如果包含多个变量或混合文本，替换为字符串值
  return str.replace(VARIABLE_PATTERN, (match) => {
    const resolved = resolveVariable(match, stepResults, currentStepIndex)
    return String(resolved ?? '')
  })
}

/**
 * 解析单个变量引用
 */
function resolveVariable(
  variable: string,
  stepResults: StepResults,
  currentStepIndex: number
): unknown {
  // 解析变量路径
  const pathMatch = variable.match(/^\$(\d+|prev)\.result(.*)$/)
  if (!pathMatch) {
    return undefined
  }

  const [, stepRef, path] = pathMatch

  // 确定步骤ID
  let stepId: string
  if (stepRef === 'prev') {
    stepId = String(currentStepIndex)  // 上一步的索引（从1开始）
  } else {
    stepId = stepRef
  }

  // 获取步骤结果
  const stepResult = stepResults.get(stepId)
  if (!stepResult || stepResult.status !== 'success') {
    console.warn(`[VariableResolver] Step ${stepId} result not found or failed`)
    return undefined
  }

  // 解析路径
  if (!path) {
    return stepResult.result
  }

  return getNestedValue(stepResult.result, path)
}

/**
 * 获取嵌套值
 * 路径格式: .field, [0], .field[0].nested
 */
function getNestedValue(obj: unknown, path: string): unknown {
  const segments = path.match(/\.([a-zA-Z_][\w]*)|\[(\d+)\]/g)
  if (!segments) {
    return obj
  }

  let current: unknown = obj
  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (segment.startsWith('.')) {
      const key = segment.slice(1)
      current = (current as Record<string, unknown>)[key]
    } else if (segment.startsWith('[')) {
      const index = parseInt(segment.slice(1, -1), 10)
      current = (current as unknown[])[index]
    }
  }

  return current
}
```

### 3.3 执行引擎集成

```typescript
// apps/web/src/lib/goi/executor/index.ts 修改

import { executeAccess } from './accessHandler'
import { executeState } from './stateHandler'
import { executeObservation } from './observationHandler'
import { resolveVariables, StepResults } from './variableResolver'

export class GoiExecutor {
  private context: ExecutorContext
  private stepResults: StepResults = new Map()

  constructor(context: ExecutorContext) {
    this.context = context
  }

  /**
   * 执行单个 TODO 项
   */
  async executeItem(item: TodoItem, itemIndex: number): Promise<GoiExecutionResult> {
    // 1. 解析变量引用
    const resolvedOperation = resolveVariables(
      item.goiOperation,
      this.stepResults,
      itemIndex
    ) as GoiOperation

    // 2. 执行操作
    let result: GoiExecutionResult

    switch (resolvedOperation.type) {
      case 'access':
        result = await executeAccess(resolvedOperation, this.context)
        break
      case 'state':
        result = await executeState(resolvedOperation, this.context)
        break
      case 'observation':
        result = await executeObservation(resolvedOperation, this.context)
        break
      default:
        throw new Error(`Unknown operation type: ${(resolvedOperation as any).type}`)
    }

    // 3. 存储结果（用于后续步骤引用）
    this.stepResults.set(item.id, {
      result: result.result,
      status: result.success ? 'success' : 'failed',
    })

    return result
  }

  /**
   * 执行整个 TODO List
   */
  async executeTodoList(
    todoList: TodoList,
    options: {
      onItemStart?: (item: TodoItem) => void
      onItemComplete?: (item: TodoItem, result: GoiExecutionResult) => void
      onCheckpoint?: (item: TodoItem) => Promise<'approve' | 'reject' | 'modify'>
    }
  ): Promise<void> {
    for (let i = 0; i < todoList.items.length; i++) {
      const item = todoList.items[i]

      // 跳过已完成的项
      if (item.status === 'completed' || item.status === 'skipped') {
        continue
      }

      // 检查依赖是否满足
      if (!this.areDependenciesMet(item, todoList)) {
        console.log(`[Executor] Skipping ${item.id}, dependencies not met`)
        continue
      }

      // 通知开始执行
      options.onItemStart?.(item)

      // 检查是否需要 checkpoint
      if (item.checkpoint?.required) {
        const decision = await options.onCheckpoint?.(item)
        if (decision === 'reject') {
          item.status = 'skipped'
          continue
        }
        // modify 的情况由外部处理
      }

      // 执行
      const result = await this.executeItem(item, i + 1)

      // 更新状态
      item.status = result.success ? 'completed' : 'failed'
      item.result = result

      // 通知完成
      options.onItemComplete?.(item, result)

      // 如果失败，停止执行
      if (!result.success) {
        console.error(`[Executor] Item ${item.id} failed:`, result.error)
        break
      }
    }
  }

  /**
   * 检查依赖是否满足
   */
  private areDependenciesMet(item: TodoItem, todoList: TodoList): boolean {
    for (const depId of item.dependsOn || []) {
      const depItem = todoList.items.find(i => i.id === depId)
      if (!depItem || depItem.status !== 'completed') {
        return false
      }
    }
    return true
  }
}
```

---

## 四、Prompt 优化

### 4.1 更新 planPrompt.ts

需要在现有的 PLAN_SYSTEM_PROMPT 中添加 State 和 Observation 操作的详细说明和示例：

```typescript
// 在 PLAN_SYSTEM_PROMPT 中添加

/**
 * 补充 State 操作示例
 */
const STATE_EXAMPLES = `
### State 操作示例

#### 创建提示词
\`\`\`json
{
  "id": "1",
  "title": "创建情感分析提示词",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "prompt" },
    "action": "create",
    "expectedState": {
      "name": "情感分析提示词",
      "content": "你是一个情感分析助手，请分析以下文本的情感倾向（正面/负面/中性）：\\n\\n{{input}}",
      "description": "用于分析文本情感倾向的提示词"
    }
  },
  "checkpoint": { "required": false },
  "dependsOn": []
}
\`\`\`

#### 创建测试任务（引用前序步骤结果）
\`\`\`json
{
  "id": "3",
  "title": "创建测试任务",
  "category": "state",
  "goiOperation": {
    "type": "state",
    "target": { "resourceType": "task" },
    "action": "create",
    "expectedState": {
      "name": "情感分析测试",
      "promptId": "$1.result.id",
      "datasetId": "$2.result[0].id",
      "modelId": "$prev.result[0].id"
    }
  },
  "checkpoint": { "required": true, "type": "confirmation", "message": "确认创建并执行此测试任务？" },
  "dependsOn": ["1", "2"]
}
\`\`\`
`

/**
 * 补充 Observation 操作示例
 */
const OBSERVATION_EXAMPLES = `
### Observation 操作示例

#### 查找数据集
\`\`\`json
{
  "id": "2",
  "title": "查找测试数据集",
  "category": "observation",
  "goiOperation": {
    "type": "observation",
    "queries": [{
      "resourceType": "dataset",
      "filters": { "name": { "contains": "测试" } },
      "fields": ["id", "name", "itemCount"]
    }]
  },
  "checkpoint": { "required": true, "type": "review", "message": "请确认使用哪个数据集" },
  "dependsOn": ["1"]
}
\`\`\`

#### 查询可用模型
\`\`\`json
{
  "id": "4",
  "title": "获取可用模型",
  "category": "observation",
  "goiOperation": {
    "type": "observation",
    "queries": [{
      "resourceType": "model",
      "filters": { "isActive": true },
      "fields": ["id", "name", "modelId"]
    }]
  },
  "checkpoint": { "required": false },
  "dependsOn": []
}
\`\`\`

#### 查询任务执行结果
\`\`\`json
{
  "id": "6",
  "title": "获取执行结果",
  "category": "observation",
  "goiOperation": {
    "type": "observation",
    "queries": [{
      "resourceType": "task",
      "resourceId": "$5.result.id",
      "fields": ["id", "status", "progress", "passRate"]
    }]
  },
  "checkpoint": { "required": false },
  "dependsOn": ["5"]
}
\`\`\`
`

/**
 * 完整演示场景示例
 */
const FULL_SCENARIO_EXAMPLE = `
## 完整场景示例

用户输入："帮我创建一个情感分析提示词，用测试数据集跑一下"

期望输出：
\`\`\`json
{
  "goalAnalysis": "用户希望：1) 创建一个情感分析提示词 2) 使用名称包含'测试'的数据集 3) 执行测试任务。需要依次完成创建提示词、查找数据集、获取可用模型、创建任务、执行任务、查看结果。",
  "items": [
    {
      "id": "1",
      "title": "创建情感分析提示词",
      "description": "创建一个用于文本情感分析的提示词",
      "category": "state",
      "goiOperation": {
        "type": "state",
        "target": { "resourceType": "prompt" },
        "action": "create",
        "expectedState": {
          "name": "情感分析提示词",
          "content": "你是一个情感分析助手，请分析以下文本的情感倾向（正面/负面/中性）：\\n\\n{{input}}\\n\\n请输出 JSON 格式：{\"sentiment\": \"正面|负面|中性\", \"confidence\": 0.0-1.0}",
          "description": "自动创建的情感分析提示词"
        }
      },
      "dependsOn": [],
      "checkpoint": { "required": false }
    },
    {
      "id": "2",
      "title": "查找测试数据集",
      "description": "搜索名称包含'测试'的数据集",
      "category": "observation",
      "goiOperation": {
        "type": "observation",
        "queries": [{
          "resourceType": "dataset",
          "filters": { "name": { "contains": "测试" } },
          "fields": ["id", "name", "itemCount", "description"]
        }]
      },
      "dependsOn": ["1"],
      "checkpoint": { "required": true, "type": "review", "message": "找到以下数据集，请确认使用哪个：" }
    },
    {
      "id": "3",
      "title": "获取可用模型",
      "description": "查询已启用的模型",
      "category": "observation",
      "goiOperation": {
        "type": "observation",
        "queries": [{
          "resourceType": "model",
          "filters": { "isActive": true },
          "fields": ["id", "name", "modelId"]
        }]
      },
      "dependsOn": ["1"],
      "checkpoint": { "required": false }
    },
    {
      "id": "4",
      "title": "创建测试任务",
      "description": "使用选定的提示词、数据集和模型创建测试任务",
      "category": "state",
      "goiOperation": {
        "type": "state",
        "target": { "resourceType": "task" },
        "action": "create",
        "expectedState": {
          "name": "情感分析测试-自动创建",
          "promptId": "$1.result.id",
          "datasetId": "$2.result[0].id",
          "modelIds": ["$3.result[0].id"]
        }
      },
      "dependsOn": ["2", "3"],
      "checkpoint": { "required": true, "type": "confirmation", "message": "确认创建此测试任务？" }
    },
    {
      "id": "5",
      "title": "启动任务执行",
      "description": "开始执行测试任务",
      "category": "state",
      "goiOperation": {
        "type": "state",
        "target": { "resourceType": "task", "resourceId": "$4.result.id" },
        "action": "update",
        "expectedState": {
          "status": "running"
        }
      },
      "dependsOn": ["4"],
      "checkpoint": { "required": false }
    },
    {
      "id": "6",
      "title": "查看执行结果",
      "description": "获取任务执行结果摘要",
      "category": "observation",
      "goiOperation": {
        "type": "observation",
        "queries": [{
          "resourceType": "task",
          "resourceId": "$4.result.id",
          "fields": ["id", "name", "status", "progress", "passRate", "totalItems", "completedItems"]
        }]
      },
      "dependsOn": ["5"],
      "checkpoint": { "required": false }
    }
  ],
  "warnings": ["任务执行可能需要几分钟时间，结果查询可能需要等待"]
}
\`\`\`
`
```

---

## 五、事件发布函数补充

需要在 `apps/web/src/lib/events/index.ts` 中补充 CRUD 相关的事件发布函数：

```typescript
// apps/web/src/lib/events/index.ts 补充

/**
 * 发布资源创建事件
 */
export async function publishResourceCreated(
  sessionId: string,
  resourceType: string,
  resourceId: string,
  resourceName?: string,
  source: 'user' | 'ai' = 'user'
): Promise<void> {
  await publishEvent(sessionId, {
    type: 'RESOURCE_CREATED',
    payload: {
      resourceType,
      resourceId,
      resourceName,
      source,
      timestamp: Date.now(),
    },
  })
}

/**
 * 发布资源更新事件
 */
export async function publishResourceUpdated(
  sessionId: string,
  resourceType: string,
  resourceId: string,
  resourceName?: string,
  source: 'user' | 'ai' = 'user'
): Promise<void> {
  await publishEvent(sessionId, {
    type: 'RESOURCE_UPDATED',
    payload: {
      resourceType,
      resourceId,
      resourceName,
      source,
      timestamp: Date.now(),
    },
  })
}

/**
 * 发布资源删除事件
 */
export async function publishResourceDeleted(
  sessionId: string,
  resourceType: string,
  resourceId: string,
  resourceName?: string,
  source: 'user' | 'ai' = 'user'
): Promise<void> {
  await publishEvent(sessionId, {
    type: 'RESOURCE_DELETED',
    payload: {
      resourceType,
      resourceId,
      resourceName,
      source,
      timestamp: Date.now(),
    },
  })
}
```

---

## 六、API 调用认证处理

State Handler 调用 API 时需要处理认证：

```typescript
// apps/web/src/lib/goi/executor/apiClient.ts

/**
 * GOI 专用 API 客户端
 * 处理认证、错误重试等通用逻辑
 */
export class GoiApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  /**
   * 发送请求
   */
  async request<T>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
      body?: Record<string, unknown>
      retry?: number
    }
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const { method, body, retry = 1 } = options

    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            // 认证头由浏览器 cookie 自动携带
          },
          body: body ? JSON.stringify(body) : undefined,
          credentials: 'include', // 确保携带 cookie
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))

          // 可重试的错误
          if (response.status >= 500 && attempt < retry) {
            console.warn(`[GoiApiClient] Request failed, retrying... (${attempt + 1}/${retry})`)
            await this.delay(1000 * (attempt + 1)) // 指数退避
            continue
          }

          return {
            success: false,
            error: errorData.message || `Request failed with status ${response.status}`,
          }
        }

        const data = await response.json()
        return {
          success: true,
          data: data.data || data,
        }
      } catch (error) {
        if (attempt < retry) {
          console.warn(`[GoiApiClient] Request error, retrying...`, error)
          await this.delay(1000 * (attempt + 1))
          continue
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Network error',
        }
      }
    }

    return { success: false, error: 'Max retries exceeded' }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 单例
export const goiApiClient = new GoiApiClient()
```

---

## 七、前端状态同步

### 7.1 TODO List 实时状态更新

执行过程中需要实时更新前端的 TODO List 状态：

```typescript
// apps/web/src/lib/goi/execution/progressSync.ts 补充

/**
 * 更新单个 TODO 项状态并同步到前端
 */
export function updateTodoItemStatus(
  todoListId: string,
  itemId: string,
  status: TodoItemStatus,
  result?: unknown
): void {
  // 更新 Zustand store
  const store = useCopilotStore.getState()
  if (!store.todoList || store.todoList.id !== todoListId) {
    return
  }

  const updatedItems = store.todoList.items.map(item => {
    if (item.id === itemId) {
      return {
        ...item,
        status,
        result: result ?? item.result,
        completedAt: status === 'completed' ? new Date().toISOString() : item.completedAt,
      }
    }
    return item
  })

  // 重新计算进度
  const completedCount = updatedItems.filter(
    i => i.status === 'completed' || i.status === 'skipped'
  ).length

  useCopilotStore.setState({
    todoList: {
      ...store.todoList,
      items: updatedItems,
      completedItems: completedCount,
      currentItemIndex: updatedItems.findIndex(i => i.status === 'in_progress'),
    },
  })
}

/**
 * 设置当前执行项
 */
export function setCurrentExecutingItem(itemId: string): void {
  const store = useCopilotStore.getState()
  if (!store.todoList) return

  const itemIndex = store.todoList.items.findIndex(i => i.id === itemId)
  if (itemIndex === -1) return

  const updatedItems = store.todoList.items.map((item, index) => ({
    ...item,
    status: index === itemIndex ? 'in_progress' : item.status,
  }))

  useCopilotStore.setState({
    todoList: {
      ...store.todoList,
      items: updatedItems,
      currentItemIndex: itemIndex,
    },
  })
}
```

### 7.2 执行结果展示

在 TodoListView 中展示每步的执行结果：

```typescript
// 在 TodoItemView 组件中添加结果展示

const TodoItemView: React.FC<TodoItemViewProps> = ({ item, onClick }) => {
  const config = STATUS_CONFIG[item.status]

  // 格式化结果摘要
  const resultSummary = useMemo(() => {
    if (!item.result || item.status !== 'completed') return null

    const result = item.result as GoiExecutionResult
    if (!result.success) return null

    switch (item.category) {
      case 'state':
        const stateResult = result.result as StateExecutionResult
        if (stateResult.action === 'create') {
          return `已创建: ${stateResult.data?.name || stateResult.resourceId}`
        }
        if (stateResult.action === 'update') {
          return `已更新`
        }
        if (stateResult.action === 'delete') {
          return `已删除`
        }
        break

      case 'observation':
        const obsResult = result.result as ObservationExecutionResult
        const firstQuery = obsResult.results[0]
        if (Array.isArray(firstQuery?.data)) {
          return `找到 ${firstQuery.data.length} 条记录`
        }
        return `查询完成`

      case 'access':
        const accessResult = result.result as AccessExecutionResult
        if (accessResult.navigatedTo) {
          return `已导航`
        }
        break
    }
    return null
  }, [item.result, item.status, item.category])

  return (
    <div className={`${styles.todoItem} ${styles[`status_${item.status}`]}`}>
      {/* ... 现有内容 ... */}

      {/* 执行结果摘要 */}
      {resultSummary && (
        <span className={styles.resultSummary}>
          {resultSummary}
        </span>
      )}
    </div>
  )
}
```

---

## 八、测试用例

### 8.1 State Handler 测试

```typescript
// apps/web/src/lib/goi/executor/__tests__/stateHandler.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StateHandler } from '../stateHandler'

describe('StateHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should create a prompt', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: { id: 'prompt-123', name: '测试提示词' }
      })
    })

    const handler = new StateHandler({ sessionId: 'test-session' })
    const result = await handler.execute({
      type: 'state',
      target: { resourceType: 'prompt' },
      action: 'create',
      expectedState: {
        name: '测试提示词',
        content: '你是一个助手',
      }
    })

    expect(result.success).toBe(true)
    expect(result.result?.resourceId).toBe('prompt-123')
  })

  it('should fail without required fields', async () => {
    const handler = new StateHandler({ sessionId: 'test-session' })
    const result = await handler.execute({
      type: 'state',
      target: { resourceType: 'prompt' },
      action: 'create',
      expectedState: {
        name: '测试提示词',
        // 缺少 content
      }
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Missing required field')
  })
})
```

### 8.2 变量解析器测试

```typescript
// apps/web/src/lib/goi/executor/__tests__/variableResolver.test.ts

import { describe, it, expect } from 'vitest'
import { resolveVariables, StepResults } from '../variableResolver'

describe('VariableResolver', () => {
  const stepResults: StepResults = new Map([
    ['1', { result: { id: 'prompt-123', name: '测试提示词' }, status: 'success' }],
    ['2', { result: [{ id: 'dataset-456', name: '测试数据集' }], status: 'success' }],
  ])

  it('should resolve simple variable', () => {
    const result = resolveVariables('$1.result.id', stepResults, 3)
    expect(result).toBe('prompt-123')
  })

  it('should resolve array index', () => {
    const result = resolveVariables('$2.result[0].id', stepResults, 3)
    expect(result).toBe('dataset-456')
  })

  it('should resolve object with variables', () => {
    const input = {
      promptId: '$1.result.id',
      datasetId: '$2.result[0].id',
      name: 'test'
    }
    const result = resolveVariables(input, stepResults, 3)
    expect(result).toEqual({
      promptId: 'prompt-123',
      datasetId: 'dataset-456',
      name: 'test'
    })
  })

  it('should handle missing step result', () => {
    const result = resolveVariables('$99.result.id', stepResults, 3)
    expect(result).toBeUndefined()
  })
})
```

---

## 九、错误处理策略

### 9.1 错误分类

```typescript
// apps/web/src/lib/goi/executor/errors.ts

export enum GoiErrorCode {
  // 验证错误
  INVALID_OPERATION = 'INVALID_OPERATION',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  UNSUPPORTED_RESOURCE = 'UNSUPPORTED_RESOURCE',

  // API 错误
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',

  // 执行错误
  EXECUTION_ERROR = 'EXECUTION_ERROR',
  DEPENDENCY_FAILED = 'DEPENDENCY_FAILED',
  VARIABLE_RESOLVE_ERROR = 'VARIABLE_RESOLVE_ERROR',

  // 超时
  TIMEOUT = 'TIMEOUT',
}

export class GoiError extends Error {
  code: GoiErrorCode
  retryable: boolean
  details?: Record<string, unknown>

  constructor(code: GoiErrorCode, message: string, options?: {
    retryable?: boolean
    details?: Record<string, unknown>
  }) {
    super(message)
    this.code = code
    this.retryable = options?.retryable ?? false
    this.details = options?.details
  }
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof GoiError) {
    return error.retryable
  }
  // 网络错误默认可重试
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true
  }
  return false
}
```

### 9.2 用户友好的错误信息

```typescript
// apps/web/src/lib/goi/executor/errorMessages.ts

const ERROR_MESSAGES: Record<GoiErrorCode, string> = {
  [GoiErrorCode.INVALID_OPERATION]: '操作配置无效，请检查任务设置',
  [GoiErrorCode.MISSING_REQUIRED_FIELD]: '缺少必填字段',
  [GoiErrorCode.UNSUPPORTED_RESOURCE]: '不支持的资源类型',
  [GoiErrorCode.API_ERROR]: '服务器处理请求时出错',
  [GoiErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络',
  [GoiErrorCode.UNAUTHORIZED]: '没有权限执行此操作',
  [GoiErrorCode.NOT_FOUND]: '资源不存在或已被删除',
  [GoiErrorCode.EXECUTION_ERROR]: '执行过程中出错',
  [GoiErrorCode.DEPENDENCY_FAILED]: '前置步骤执行失败',
  [GoiErrorCode.VARIABLE_RESOLVE_ERROR]: '无法获取前置步骤的结果',
  [GoiErrorCode.TIMEOUT]: '操作超时，请稍后重试',
}

export function getErrorMessage(code: GoiErrorCode, details?: string): string {
  const baseMessage = ERROR_MESSAGES[code] || '未知错误'
  return details ? `${baseMessage}：${details}` : baseMessage
}
```
