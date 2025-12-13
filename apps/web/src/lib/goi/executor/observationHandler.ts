/**
 * GOI Observation Handler - 观察声明处理器
 *
 * 处理 Observation 类型的 GOI 操作，负责：
 * 1. 解析查询请求
 * 2. 批量查询优化
 * 3. 字段选择
 * 4. 结果缓存
 * 5. 返回结构化数据
 */

import type {
  ObservationOperation,
  ObservationQuery,
  ObservationExecutionResult,
  GoiExecutionResult,
  ResourceType,
} from '@platform/shared'
import { prisma } from '../../prisma'
import { normalizeResourceType } from './shared'

// ============================================
// 缓存配置
// ============================================

/**
 * 简单的内存缓存
 */
class SimpleCache {
  private cache: Map<string, { value: unknown; expireAt: number }> = new Map()
  private defaultTTL: number = 30000 // 30 秒

  set(key: string, value: unknown, ttl?: number): void {
    const expireAt = Date.now() + (ttl || this.defaultTTL)
    this.cache.set(key, { value, expireAt })
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expireAt) {
      this.cache.delete(key)
      return undefined
    }
    return entry.value as T
  }

  clear(): void {
    this.cache.clear()
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expireAt) {
        this.cache.delete(key)
      }
    }
  }
}

// 会话级缓存（按 sessionId 隔离）
const sessionCaches: Map<string, SimpleCache> = new Map()

function getSessionCache(sessionId: string): SimpleCache {
  let cache = sessionCaches.get(sessionId)
  if (!cache) {
    cache = new SimpleCache()
    sessionCaches.set(sessionId, cache)
  }
  return cache
}

// ============================================
// 资源查询映射
// ============================================

/**
 * 资源类型到 Prisma 模型的映射
 */
const resourceModelMap: Partial<Record<ResourceType, string>> = {
  // 核心资源
  prompt: 'prompt',
  dataset: 'dataset',
  model: 'model',
  evaluator: 'evaluator',
  task: 'task',
  task_result: 'taskResult',
  // 衍生资源
  provider: 'provider',
  prompt_version: 'promptVersion',
  prompt_branch: 'promptBranch',
  dataset_version: 'datasetVersion',
  // 系统资源
  scheduled_task: 'scheduledTask',
  alert_rule: 'alertRule',
  notify_channel: 'notifyChannel',
  // Schema 资源
  input_schema: 'inputSchema',
  output_schema: 'outputSchema',
}

/**
 * 字段映射（前端字段名 -> 数据库字段名）
 */
const fieldMappings: Record<string, Record<string, string>> = {
  task: {
    progress: 'progress',
    status: 'status',
    totalItems: 'totalItems',
    completedItems: 'completedItems',
    failedItems: 'failedItems',
    passedItems: 'passedItems',
  },
  dataset: {
    rowCount: 'rowCount',
    columns: 'columns',
    fileSize: 'fileSize',
  },
  prompt: {
    versionCount: 'versionCount',
    latestVersion: 'latestVersion',
  },
}

/**
 * 可计算字段（需要特殊处理）
 */
const computedFields: Record<string, string[]> = {
  task: ['successRate', 'avgLatency', 'estimatedTimeRemaining'],
  prompt: ['totalUsage', 'activeVersionCount'],
  dataset: ['validRowCount'],
}

// ============================================
// Observation Handler 类
// ============================================

export type ObservationHandlerContext = {
  sessionId: string
  userId?: string
  teamId?: string
}

/**
 * Observation Handler - 处理信息查询声明
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

      // 2. 检查缓存
      const cache = getSessionCache(this.context.sessionId)
      const cacheKey = this.buildCacheKey(operation)

      if (operation.useCache !== false) {
        const cached = cache.get<ObservationExecutionResult>(cacheKey)
        if (cached) {
          return {
            success: true,
            status: 'success',
            result: { ...cached, fromCache: true },
            duration: Date.now() - startTime,
            events,
          }
        }
      }

      // 3. 执行查询
      const results = await this.executeQueries(operation.queries)

      // 4. 缓存结果
      const result: ObservationExecutionResult = {
        results,
        fromCache: false,
      }

      if (operation.useCache !== false) {
        cache.set(cacheKey, result, operation.cacheTTL)
      }

      return {
        success: true,
        status: 'success',
        result,
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
   * 验证操作（并自动填充缺失字段）
   */
  private validateOperation(operation: ObservationOperation): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!operation.queries || operation.queries.length === 0) {
      errors.push('At least one query is required')
    }

    for (let i = 0; i < operation.queries.length; i++) {
      const query = operation.queries[i]

      // 规范化资源类型（处理 LLM 生成的别名）
      query.resourceType = normalizeResourceType(query.resourceType)

      if (!resourceModelMap[query.resourceType]) {
        errors.push(`Query ${i}: Unsupported resource type: ${query.resourceType}`)
      }

      // 如果缺少 fields，添加默认字段
      if (!query.fields || query.fields.length === 0) {
        query.fields = this.getDefaultFields(query.resourceType)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * 获取资源类型的默认查询字段
   */
  private getDefaultFields(resourceType: string): string[] {
    const defaultFieldsMap: Record<string, string[]> = {
      // 核心资源
      prompt: ['id', 'name', 'description', 'content', 'currentVersion', 'createdAt', 'updatedAt'],
      dataset: ['id', 'name', 'description', 'rowCount', 'currentVersion', 'createdAt'],
      model: ['id', 'name', 'providerId', 'modelId', 'isActive', 'createdAt'],
      evaluator: ['id', 'name', 'type', 'description', 'isActive', 'createdAt'],
      task: ['id', 'name', 'type', 'status', 'progress', 'createdAt', 'completedAt'],
      task_result: ['id', 'status', 'output', 'latencyMs', 'createdAt'],
      // 衍生资源
      provider: ['id', 'name', 'type', 'baseUrl', 'isActive', 'createdAt'],
      prompt_version: ['id', 'promptId', 'version', 'content', 'changeLog', 'createdAt'],
      prompt_branch: ['id', 'promptId', 'name', 'isDefault', 'status', 'currentVersion', 'createdAt'],
      dataset_version: ['id', 'datasetId', 'version', 'rowCount', 'changeLog', 'createdAt'],
      // 系统资源
      scheduled_task: ['id', 'name', 'cronExpression', 'isActive', 'lastRunAt', 'nextRunAt'],
      alert_rule: ['id', 'name', 'metric', 'condition', 'threshold', 'isActive'],
      notify_channel: ['id', 'name', 'type', 'isActive', 'createdAt'],
      // Schema 资源
      input_schema: ['id', 'name', 'description', 'variables', 'createdAt'],
      output_schema: ['id', 'name', 'description', 'fields', 'parseMode', 'createdAt'],
    }
    return defaultFieldsMap[resourceType] || ['id', 'name', 'createdAt']
  }

  /**
   * 构建缓存键
   */
  private buildCacheKey(operation: ObservationOperation): string {
    return `obs:${this.context.sessionId}:${JSON.stringify(operation.queries)}`
  }

  /**
   * 执行查询列表
   */
  private async executeQueries(
    queries: ObservationQuery[]
  ): Promise<Array<Record<string, unknown> | null>> {
    // 并行执行所有查询
    const results = await Promise.all(
      queries.map((query) => this.executeSingleQuery(query))
    )
    return results
  }

  /**
   * 执行单个查询
   */
  private async executeSingleQuery(
    query: ObservationQuery
  ): Promise<Record<string, unknown> | null> {
    const modelName = resourceModelMap[query.resourceType]

    if (!modelName) {
      return null
    }

    try {
      // 判断是查询单个资源还是列表
      if (query.resourceId) {
        return this.querySingleResource(query, modelName)
      } else {
        return this.queryResourceList(query, modelName)
      }
    } catch (error) {
      console.error(`[ObservationHandler] Query failed:`, error)
      return null
    }
  }

  /**
   * 查询单个资源
   */
  private async querySingleResource(
    query: ObservationQuery,
    modelName: string
  ): Promise<Record<string, unknown> | null> {
    // 构建 select 对象
    const select = this.buildSelect(query.resourceType, query.fields)
    const resourceId = query.resourceId!

    // 根据模型名称查询
    let resource: Record<string, unknown> | null = null

    try {
      switch (modelName) {
        // 核心资源
        case 'prompt':
          resource = await prisma.prompt.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break
        case 'dataset':
          resource = await prisma.dataset.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break
        case 'model':
          resource = await prisma.model.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break
        case 'evaluator':
          resource = await prisma.evaluator.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break
        case 'task':
          resource = await prisma.task.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break
        case 'taskResult':
          resource = await prisma.taskResult.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break

        // 衍生资源
        case 'provider':
          resource = await prisma.provider.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break
        case 'promptVersion':
          resource = await prisma.promptVersion.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break
        case 'promptBranch':
          resource = await prisma.promptBranch.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break
        case 'datasetVersion':
          resource = await prisma.datasetVersion.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break

        // 系统资源
        case 'scheduledTask':
          resource = await prisma.scheduledTask.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break
        case 'alertRule':
          resource = await prisma.alertRule.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break
        case 'notifyChannel':
          resource = await prisma.notifyChannel.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break

        // Schema 资源
        case 'inputSchema':
          resource = await prisma.inputSchema.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break
        case 'outputSchema':
          resource = await prisma.outputSchema.findUnique({
            where: { id: resourceId },
            ...(Object.keys(select).length > 0 && { select }),
          }) as Record<string, unknown> | null
          break

        default:
          return null
      }
    } catch (error) {
      console.error(`[ObservationHandler] Query error:`, error)
      return null
    }

    if (!resource) {
      return null
    }

    // 处理计算字段
    return this.processResult(query.resourceType, resource, query.fields)
  }

  /**
   * 查询资源列表
   */
  private async queryResourceList(
    query: ObservationQuery,
    modelName: string
  ): Promise<Record<string, unknown>> {
    // 构建查询条件
    const where = this.buildWhere(query.filters)

    // 构建 select 对象
    const select = this.buildSelect(query.resourceType, query.fields)

    // 构建排序
    const orderBy = query.orderBy
      ? { [query.orderBy.field]: query.orderBy.direction as 'asc' | 'desc' }
      : undefined

    // 构建分页
    const pagination = query.pagination || { page: 1, pageSize: 20 }
    const skip = (pagination.page - 1) * pagination.pageSize
    const take = pagination.pageSize

    const queryArgs = {
      where,
      ...(Object.keys(select).length > 0 && { select }),
      orderBy,
      skip,
      take,
    }

    let items: Array<Record<string, unknown>> = []
    let total = 0

    try {
      switch (modelName) {
        // 核心资源
        case 'prompt':
          [items, total] = await Promise.all([
            prisma.prompt.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.prompt.count({ where }),
          ])
          break
        case 'dataset':
          [items, total] = await Promise.all([
            prisma.dataset.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.dataset.count({ where }),
          ])
          break
        case 'model':
          [items, total] = await Promise.all([
            prisma.model.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.model.count({ where }),
          ])
          break
        case 'evaluator':
          [items, total] = await Promise.all([
            prisma.evaluator.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.evaluator.count({ where }),
          ])
          break
        case 'task':
          [items, total] = await Promise.all([
            prisma.task.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.task.count({ where }),
          ])
          break
        case 'taskResult':
          [items, total] = await Promise.all([
            prisma.taskResult.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.taskResult.count({ where }),
          ])
          break

        // 衍生资源
        case 'provider':
          [items, total] = await Promise.all([
            prisma.provider.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.provider.count({ where }),
          ])
          break
        case 'promptVersion':
          [items, total] = await Promise.all([
            prisma.promptVersion.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.promptVersion.count({ where }),
          ])
          break
        case 'promptBranch':
          [items, total] = await Promise.all([
            prisma.promptBranch.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.promptBranch.count({ where }),
          ])
          break
        case 'datasetVersion':
          [items, total] = await Promise.all([
            prisma.datasetVersion.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.datasetVersion.count({ where }),
          ])
          break

        // 系统资源
        case 'scheduledTask':
          [items, total] = await Promise.all([
            prisma.scheduledTask.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.scheduledTask.count({ where }),
          ])
          break
        case 'alertRule':
          [items, total] = await Promise.all([
            prisma.alertRule.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.alertRule.count({ where }),
          ])
          break
        case 'notifyChannel':
          [items, total] = await Promise.all([
            prisma.notifyChannel.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.notifyChannel.count({ where }),
          ])
          break

        // Schema 资源
        case 'inputSchema':
          [items, total] = await Promise.all([
            prisma.inputSchema.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.inputSchema.count({ where }),
          ])
          break
        case 'outputSchema':
          [items, total] = await Promise.all([
            prisma.outputSchema.findMany(queryArgs) as Promise<Array<Record<string, unknown>>>,
            prisma.outputSchema.count({ where }),
          ])
          break

        default:
          return { items: [], total: 0 }
      }
    } catch (error) {
      console.error(`[ObservationHandler] Query list error:`, error)
      return { items: [], total: 0 }
    }

    // 处理计算字段
    const processedItems = items.map((item) =>
      this.processResult(query.resourceType, item, query.fields)
    )

    return {
      items: processedItems,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    }
  }

  /**
   * 构建 select 对象
   */
  private buildSelect(
    resourceType: ResourceType,
    fields: string[]
  ): Record<string, boolean> {
    const select: Record<string, boolean> = {}
    const mappings = fieldMappings[resourceType] || {}
    const computed = computedFields[resourceType] || []

    for (const field of fields) {
      // 跳过计算字段（稍后处理）
      if (computed.includes(field)) {
        continue
      }

      // 使用字段映射
      const dbField = mappings[field] || field
      select[dbField] = true
    }

    // 始终选择 id
    select.id = true

    return select
  }

  /**
   * 构建 where 条件
   */
  private buildWhere(filters?: Record<string, unknown>): Record<string, unknown> {
    if (!filters) return {}

    const where: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(filters)) {
      if (value === undefined || value === null) continue

      // 处理特殊操作符
      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>

        if ('contains' in obj) {
          where[key] = { contains: obj.contains, mode: 'insensitive' }
        } else if ('in' in obj) {
          where[key] = { in: obj.in }
        } else if ('gte' in obj || 'lte' in obj) {
          where[key] = value
        } else {
          where[key] = value
        }
      } else {
        where[key] = value
      }
    }

    return where
  }

  /**
   * 处理查询结果，添加计算字段
   */
  private processResult(
    resourceType: ResourceType,
    resource: Record<string, unknown>,
    fields: string[]
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...resource }
    const computed = computedFields[resourceType] || []

    for (const field of fields) {
      if (computed.includes(field)) {
        result[field] = this.computeField(resourceType, field, resource)
      }
    }

    return result
  }

  /**
   * 计算特殊字段
   */
  private computeField(
    resourceType: ResourceType,
    field: string,
    resource: Record<string, unknown>
  ): unknown {
    switch (resourceType) {
      case 'task':
        switch (field) {
          case 'successRate': {
            const completed = (resource.completedItems as number) || 0
            const passed = (resource.passedItems as number) || 0
            return completed > 0 ? (passed / completed) * 100 : 0
          }
          case 'avgLatency': {
            // 需要额外查询或从 results 中计算
            return resource.avgLatency || 0
          }
          case 'estimatedTimeRemaining': {
            const total = (resource.totalItems as number) || 0
            const completed = (resource.completedItems as number) || 0
            const avgTime = (resource.avgLatency as number) || 1000
            return (total - completed) * avgTime
          }
        }
        break

      case 'prompt':
        switch (field) {
          case 'totalUsage':
            return resource.usageCount || 0
          case 'activeVersionCount':
            return resource.activeVersionCount || 1
        }
        break

      case 'dataset':
        switch (field) {
          case 'validRowCount':
            return resource.validRowCount || resource.rowCount || 0
        }
        break
    }

    return null
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 执行 Observation 操作
 */
export async function executeObservation(
  operation: ObservationOperation,
  context: ObservationHandlerContext
): Promise<GoiExecutionResult<'observation'>> {
  const handler = new ObservationHandler(context)
  return handler.execute(operation)
}

/**
 * 执行单个查询
 */
export async function querySingle(
  resourceType: ResourceType,
  resourceId: string,
  fields: string[],
  context: ObservationHandlerContext
): Promise<Record<string, unknown> | null> {
  const result = await executeObservation(
    {
      type: 'observation',
      queries: [{ resourceType, resourceId, fields }],
    },
    context
  )

  if (result.success && result.result?.results[0]) {
    return result.result.results[0]
  }

  return null
}

/**
 * 清除会话缓存
 */
export function clearSessionCache(sessionId: string): void {
  const cache = sessionCaches.get(sessionId)
  if (cache) {
    cache.clear()
    sessionCaches.delete(sessionId)
  }
}

/**
 * 清理所有过期缓存
 */
export function cleanupAllCaches(): void {
  for (const cache of sessionCaches.values()) {
    cache.cleanup()
  }
}
