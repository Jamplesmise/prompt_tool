/**
 * GOI State Handler - 状态变更声明处理器
 *
 * 处理 State 类型的 GOI 操作，负责：
 * 1. 获取当前资源状态
 * 2. 创建快照（用于回滚）
 * 3. 计算并应用变更
 * 4. 验证变更结果
 * 5. 发布资源变更事件
 */

import type {
  StateOperation,
  StateExecutionResult,
  GoiExecutionResult,
  ResourceType,
} from '@platform/shared'
import { publishResourceCreated, publishResourceUpdated, publishResourceDeleted } from '../../events'
import { snapshotManager } from '../../snapshot'
import { prisma } from '../../prisma'
import { enqueueTask } from '../../queue'
import { normalizeResourceType } from './shared'

// ============================================
// 资源服务映射
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
 * 只读字段（不允许通过 State 操作修改）
 */
const readOnlyFields: Record<string, string[]> = {
  // 核心资源
  prompt: ['id', 'createdAt', 'createdBy'],
  dataset: ['id', 'createdAt', 'createdBy'],
  model: ['id', 'createdAt'],
  evaluator: ['id', 'createdAt', 'createdBy'],
  task: ['id', 'createdAt', 'createdBy', 'startedAt', 'completedAt'],
  // 衍生资源
  provider: ['id', 'createdAt'],
  prompt_version: ['id', 'createdAt', 'createdBy', 'promptId', 'version'],
  prompt_branch: ['id', 'createdAt', 'createdBy', 'promptId', 'mergedAt', 'mergedBy'],
  dataset_version: ['id', 'createdAt', 'createdBy', 'datasetId', 'version'],
  // 系统资源
  scheduled_task: ['id', 'createdAt', 'createdBy', 'lastRunAt', 'nextRunAt'],
  alert_rule: ['id', 'createdAt', 'createdBy'],
  notify_channel: ['id', 'createdAt', 'createdBy'],
  // Schema 资源
  input_schema: ['id', 'createdAt', 'createdBy'],
  output_schema: ['id', 'createdAt', 'createdBy'],
}

/**
 * 必填字段（创建时必须提供）
 */
const requiredFields: Record<string, string[]> = {
  // 核心资源
  prompt: ['name', 'content'],
  dataset: ['name'],
  model: ['name', 'providerId'],
  evaluator: ['name', 'type'],
  task: ['name', 'datasetId'],
  // 衍生资源
  provider: ['name', 'type', 'baseUrl'],
  prompt_version: ['promptId', 'content'],
  prompt_branch: ['promptId', 'name', 'sourceVersionId'],
  dataset_version: ['datasetId', 'version'],
  // 系统资源
  scheduled_task: ['name', 'taskTemplateId', 'cronExpression'],
  alert_rule: ['name', 'metric', 'condition', 'threshold'],
  notify_channel: ['name', 'type', 'config'],
  // Schema 资源
  input_schema: ['name', 'variables'],
  output_schema: ['name', 'fields'],
}

// ============================================
// State Handler 类
// ============================================

export type StateHandlerContext = {
  sessionId: string
  userId?: string
  teamId?: string
}

/**
 * State Handler - 处理资源状态变更声明
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
    let snapshotId: string | undefined

    try {
      // 0. 规范化资源类型（处理 LLM 生成的别名）
      operation.target.resourceType = normalizeResourceType(operation.target.resourceType)

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

      // 2. 创建快照（用于回滚）
      const snapshot = await snapshotManager.createSnapshot(
        this.context.sessionId,
        'state_change'
      )
      snapshotId = snapshot.id

      // 3. 执行操作
      let result: StateExecutionResult

      switch (operation.action) {
        case 'create':
          result = await this.handleCreate(operation, events)
          break
        case 'update':
          result = await this.handleUpdate(operation, events)
          break
        case 'delete':
          result = await this.handleDelete(operation, events)
          break
        default:
          throw new Error(`Unknown action: ${operation.action}`)
      }

      return {
        success: true,
        status: 'success',
        result,
        duration: Date.now() - startTime,
        events,
        snapshotId,
      }
    } catch (error) {
      // 4. 失败时回滚
      if (snapshotId) {
        try {
          await snapshotManager.restoreSnapshot(snapshotId)
        } catch (rollbackError) {
          console.error('[StateHandler] Rollback failed:', rollbackError)
        }
      }

      return {
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'EXECUTION_ERROR',
        duration: Date.now() - startTime,
        events,
        snapshotId,
      }
    }
  }

  /**
   * 验证操作
   */
  private validateOperation(operation: StateOperation): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const { target, action, expectedState } = operation

    // 检查资源类型是否支持
    if (!resourceModelMap[target.resourceType]) {
      errors.push(`Unsupported resource type: ${target.resourceType}`)
    }

    // 检查 update/delete 操作需要 resourceId
    if ((action === 'update' || action === 'delete') && !target.resourceId) {
      errors.push(`resourceId is required for action: ${action}`)
    }

    // 检查创建操作的必填字段
    if (action === 'create') {
      const required = requiredFields[target.resourceType] || []
      for (const field of required) {
        if (!(field in expectedState)) {
          errors.push(`Missing required field for create: ${field}`)
        }
      }
    }

    // 检查是否尝试修改只读字段
    const readonly = readOnlyFields[target.resourceType] || []
    for (const field of readonly) {
      if (field in expectedState) {
        errors.push(`Cannot modify read-only field: ${field}`)
      }
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * 处理创建操作
   */
  private async handleCreate(
    operation: StateOperation,
    events: Array<{ type: string; payload: unknown }>
  ): Promise<StateExecutionResult> {
    const { target, expectedState } = operation
    const modelName = resourceModelMap[target.resourceType]

    if (!modelName) {
      throw new Error(`Unsupported resource type: ${target.resourceType}`)
    }

    // 准备创建数据
    const createData = {
      ...expectedState,
      // 添加默认字段
      ...(this.context.userId && { createdBy: this.context.userId }),
      ...(this.context.teamId && { teamId: this.context.teamId }),
    }

    // 根据模型类型执行创建
    let created: { id: string; [key: string]: unknown }

    switch (modelName) {
      // 核心资源
      case 'prompt':
        created = await prisma.prompt.create({ data: createData as Parameters<typeof prisma.prompt.create>[0]['data'] })
        break
      case 'dataset':
        created = await prisma.dataset.create({ data: createData as Parameters<typeof prisma.dataset.create>[0]['data'] })
        break
      case 'model':
        created = await prisma.model.create({ data: createData as Parameters<typeof prisma.model.create>[0]['data'] })
        break
      case 'evaluator':
        created = await prisma.evaluator.create({ data: createData as Parameters<typeof prisma.evaluator.create>[0]['data'] })
        break
      case 'task':
        created = await prisma.task.create({ data: createData as Parameters<typeof prisma.task.create>[0]['data'] })
        // 任务创建后自动入队执行
        try {
          await enqueueTask(created.id)
        } catch (enqueueError) {
          console.error('[StateHandler] Failed to enqueue task:', enqueueError)
          // 入队失败不影响创建成功
        }
        break

      // 衍生资源
      case 'provider':
        created = await prisma.provider.create({ data: createData as Parameters<typeof prisma.provider.create>[0]['data'] })
        break
      case 'promptVersion': {
        // 提示词版本需要计算版本号
        const prompt = await prisma.prompt.findUnique({ where: { id: expectedState.promptId as string } })
        if (!prompt) throw new Error(`Prompt not found: ${expectedState.promptId}`)
        const nextVersion = prompt.currentVersion + 1
        created = await prisma.promptVersion.create({
          data: {
            ...createData,
            version: nextVersion,
          } as Parameters<typeof prisma.promptVersion.create>[0]['data'],
        })
        // 更新提示词的当前版本号
        await prisma.prompt.update({
          where: { id: expectedState.promptId as string },
          data: { currentVersion: nextVersion },
        })
        break
      }
      case 'promptBranch':
        created = await prisma.promptBranch.create({ data: createData as Parameters<typeof prisma.promptBranch.create>[0]['data'] })
        break
      case 'datasetVersion': {
        // 数据集版本需要计算版本号和快照数据
        const dataset = await prisma.dataset.findUnique({ where: { id: expectedState.datasetId as string } })
        if (!dataset) throw new Error(`Dataset not found: ${expectedState.datasetId}`)
        const nextDatasetVersion = dataset.currentVersion + 1
        created = await prisma.datasetVersion.create({
          data: {
            ...createData,
            version: nextDatasetVersion,
            rowCount: dataset.rowCount,
            columns: expectedState.columns || [],
            rowHashes: expectedState.rowHashes || [],
          } as Parameters<typeof prisma.datasetVersion.create>[0]['data'],
        })
        // 更新数据集的当前版本号
        await prisma.dataset.update({
          where: { id: expectedState.datasetId as string },
          data: { currentVersion: nextDatasetVersion },
        })
        break
      }

      // 系统资源
      case 'scheduledTask':
        created = await prisma.scheduledTask.create({ data: createData as Parameters<typeof prisma.scheduledTask.create>[0]['data'] })
        break
      case 'alertRule':
        created = await prisma.alertRule.create({ data: createData as Parameters<typeof prisma.alertRule.create>[0]['data'] })
        break
      case 'notifyChannel':
        created = await prisma.notifyChannel.create({ data: createData as Parameters<typeof prisma.notifyChannel.create>[0]['data'] })
        break

      // Schema 资源
      case 'inputSchema':
        created = await prisma.inputSchema.create({ data: createData as Parameters<typeof prisma.inputSchema.create>[0]['data'] })
        break
      case 'outputSchema':
        created = await prisma.outputSchema.create({ data: createData as Parameters<typeof prisma.outputSchema.create>[0]['data'] })
        break

      default:
        throw new Error(`Unsupported model: ${modelName}`)
    }

    // 记录资源创建（用于快照回滚）
    snapshotManager.recordResourceCreated(this.context.sessionId, {
      type: target.resourceType,
      id: created.id,
      data: createData,
    })

    // 发布事件
    await publishResourceCreated(
      this.context.sessionId,
      target.resourceType,
      created.id,
      createData,
      expectedState.name as string | undefined,
      'ai'
    )

    events.push({
      type: 'RESOURCE_CREATED',
      payload: {
        resourceType: target.resourceType,
        resourceId: created.id,
        data: createData,
      },
    })

    return {
      resourceId: created.id,
      currentState: created as Record<string, unknown>,
      changedFields: Object.keys(expectedState),
    }
  }

  /**
   * 处理更新操作
   */
  private async handleUpdate(
    operation: StateOperation,
    events: Array<{ type: string; payload: unknown }>
  ): Promise<StateExecutionResult> {
    const { target, expectedState, version } = operation
    const modelName = resourceModelMap[target.resourceType]
    const resourceId = target.resourceId!

    if (!modelName) {
      throw new Error(`Unsupported resource type: ${target.resourceType}`)
    }

    // 获取当前状态
    let current: Record<string, unknown> | null = null

    switch (modelName) {
      // 核心资源
      case 'prompt':
        current = await prisma.prompt.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'dataset':
        current = await prisma.dataset.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'model':
        current = await prisma.model.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'evaluator':
        current = await prisma.evaluator.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'task':
        current = await prisma.task.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      // 衍生资源
      case 'provider':
        current = await prisma.provider.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'promptVersion':
        current = await prisma.promptVersion.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'promptBranch':
        current = await prisma.promptBranch.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'datasetVersion':
        current = await prisma.datasetVersion.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      // 系统资源
      case 'scheduledTask':
        current = await prisma.scheduledTask.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'alertRule':
        current = await prisma.alertRule.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'notifyChannel':
        current = await prisma.notifyChannel.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      // Schema 资源
      case 'inputSchema':
        current = await prisma.inputSchema.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'outputSchema':
        current = await prisma.outputSchema.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      default:
        throw new Error(`Unsupported model: ${modelName}`)
    }

    if (!current) {
      throw new Error(`Resource not found: ${target.resourceType}/${resourceId}`)
    }

    // 版本检查（乐观锁）
    if (version !== undefined && current.version !== version) {
      throw new Error(`Version mismatch: expected ${version}, got ${current.version}`)
    }

    // 计算变更
    const changes = this.computeChanges(current, expectedState)

    if (changes.length === 0) {
      // 没有变更
      return {
        previousState: current,
        currentState: current,
        resourceId,
        changedFields: [],
      }
    }

    // 记录修改前状态（用于快照回滚）
    const beforeData: Record<string, unknown> = {}
    for (const change of changes) {
      beforeData[change.field] = change.oldValue
    }

    snapshotManager.recordResourceModified(this.context.sessionId, {
      type: target.resourceType,
      id: resourceId,
      beforeData,
      changes,
    })

    // 执行更新
    const updateData = {
      ...expectedState,
      updatedAt: new Date(),
    }

    let updated: Record<string, unknown>

    switch (modelName) {
      // 核心资源
      case 'prompt':
        updated = await prisma.prompt.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.prompt.update>[0]['data'],
        }) as Record<string, unknown>
        break
      case 'dataset':
        updated = await prisma.dataset.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.dataset.update>[0]['data'],
        }) as Record<string, unknown>
        break
      case 'model':
        updated = await prisma.model.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.model.update>[0]['data'],
        }) as Record<string, unknown>
        break
      case 'evaluator':
        updated = await prisma.evaluator.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.evaluator.update>[0]['data'],
        }) as Record<string, unknown>
        break
      case 'task':
        updated = await prisma.task.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.task.update>[0]['data'],
        }) as Record<string, unknown>
        break

      // 衍生资源
      case 'provider':
        updated = await prisma.provider.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.provider.update>[0]['data'],
        }) as Record<string, unknown>
        break
      case 'promptVersion':
        updated = await prisma.promptVersion.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.promptVersion.update>[0]['data'],
        }) as Record<string, unknown>
        break
      case 'promptBranch':
        updated = await prisma.promptBranch.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.promptBranch.update>[0]['data'],
        }) as Record<string, unknown>
        break
      case 'datasetVersion':
        updated = await prisma.datasetVersion.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.datasetVersion.update>[0]['data'],
        }) as Record<string, unknown>
        break

      // 系统资源
      case 'scheduledTask':
        updated = await prisma.scheduledTask.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.scheduledTask.update>[0]['data'],
        }) as Record<string, unknown>
        break
      case 'alertRule':
        updated = await prisma.alertRule.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.alertRule.update>[0]['data'],
        }) as Record<string, unknown>
        break
      case 'notifyChannel':
        updated = await prisma.notifyChannel.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.notifyChannel.update>[0]['data'],
        }) as Record<string, unknown>
        break

      // Schema 资源
      case 'inputSchema':
        updated = await prisma.inputSchema.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.inputSchema.update>[0]['data'],
        }) as Record<string, unknown>
        break
      case 'outputSchema':
        updated = await prisma.outputSchema.update({
          where: { id: resourceId },
          data: updateData as Parameters<typeof prisma.outputSchema.update>[0]['data'],
        }) as Record<string, unknown>
        break

      default:
        throw new Error(`Unsupported model: ${modelName}`)
    }

    // 发布事件
    await publishResourceUpdated(
      this.context.sessionId,
      target.resourceType,
      resourceId,
      changes,
      current.name as string | undefined,
      'ai'
    )

    events.push({
      type: 'RESOURCE_UPDATED',
      payload: {
        resourceType: target.resourceType,
        resourceId,
        changes,
      },
    })

    return {
      previousState: current,
      currentState: updated,
      resourceId,
      changedFields: changes.map((c) => c.field),
    }
  }

  /**
   * 处理删除操作
   */
  private async handleDelete(
    operation: StateOperation,
    events: Array<{ type: string; payload: unknown }>
  ): Promise<StateExecutionResult> {
    const { target } = operation
    const modelName = resourceModelMap[target.resourceType]
    const resourceId = target.resourceId!

    if (!modelName) {
      throw new Error(`Unsupported resource type: ${target.resourceType}`)
    }

    // 获取当前状态（用于恢复）
    let current: Record<string, unknown> | null = null

    switch (modelName) {
      // 核心资源
      case 'prompt':
        current = await prisma.prompt.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'dataset':
        current = await prisma.dataset.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'model':
        current = await prisma.model.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'evaluator':
        current = await prisma.evaluator.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'task':
        current = await prisma.task.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      // 衍生资源
      case 'provider':
        current = await prisma.provider.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'promptVersion':
        current = await prisma.promptVersion.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'promptBranch':
        current = await prisma.promptBranch.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'datasetVersion':
        current = await prisma.datasetVersion.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      // 系统资源
      case 'scheduledTask':
        current = await prisma.scheduledTask.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'alertRule':
        current = await prisma.alertRule.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'notifyChannel':
        current = await prisma.notifyChannel.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      // Schema 资源
      case 'inputSchema':
        current = await prisma.inputSchema.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      case 'outputSchema':
        current = await prisma.outputSchema.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
        break
      default:
        throw new Error(`Unsupported model: ${modelName}`)
    }

    if (!current) {
      throw new Error(`Resource not found: ${target.resourceType}/${resourceId}`)
    }

    // 记录删除前状态（用于快照回滚）
    snapshotManager.recordResourceDeleted(this.context.sessionId, {
      type: target.resourceType,
      id: resourceId,
      data: current,
    })

    // 执行删除
    switch (modelName) {
      // 核心资源
      case 'prompt':
        await prisma.prompt.delete({ where: { id: resourceId } })
        break
      case 'dataset':
        await prisma.dataset.delete({ where: { id: resourceId } })
        break
      case 'model':
        await prisma.model.delete({ where: { id: resourceId } })
        break
      case 'evaluator':
        await prisma.evaluator.delete({ where: { id: resourceId } })
        break
      case 'task':
        await prisma.task.delete({ where: { id: resourceId } })
        break
      // 衍生资源
      case 'provider':
        await prisma.provider.delete({ where: { id: resourceId } })
        break
      case 'promptVersion':
        await prisma.promptVersion.delete({ where: { id: resourceId } })
        break
      case 'promptBranch':
        await prisma.promptBranch.delete({ where: { id: resourceId } })
        break
      case 'datasetVersion':
        await prisma.datasetVersion.delete({ where: { id: resourceId } })
        break
      // 系统资源
      case 'scheduledTask':
        await prisma.scheduledTask.delete({ where: { id: resourceId } })
        break
      case 'alertRule':
        await prisma.alertRule.delete({ where: { id: resourceId } })
        break
      case 'notifyChannel':
        await prisma.notifyChannel.delete({ where: { id: resourceId } })
        break
      // Schema 资源
      case 'inputSchema':
        await prisma.inputSchema.delete({ where: { id: resourceId } })
        break
      case 'outputSchema':
        await prisma.outputSchema.delete({ where: { id: resourceId } })
        break
      default:
        throw new Error(`Unsupported model: ${modelName}`)
    }

    // 发布事件
    await publishResourceDeleted(
      this.context.sessionId,
      target.resourceType,
      resourceId,
      current.name as string | undefined,
      current,
      'ai'
    )

    events.push({
      type: 'RESOURCE_DELETED',
      payload: {
        resourceType: target.resourceType,
        resourceId,
        data: current,
      },
    })

    return {
      previousState: current,
      resourceId,
      changedFields: [],
    }
  }

  /**
   * 计算状态变更
   */
  private computeChanges(
    current: Record<string, unknown>,
    expected: Record<string, unknown>
  ): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
    const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = []

    for (const [field, newValue] of Object.entries(expected)) {
      const oldValue = current[field]

      // 深度比较（简化版本）
      if (!this.deepEqual(oldValue, newValue)) {
        changes.push({ field, oldValue, newValue })
      }
    }

    return changes
  }

  /**
   * 深度比较两个值
   */
  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true

    if (typeof a !== typeof b) return false

    if (a === null || b === null) return a === b

    if (typeof a !== 'object') return a === b

    if (Array.isArray(a) !== Array.isArray(b)) return false

    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>

    const keysA = Object.keys(aObj)
    const keysB = Object.keys(bObj)

    if (keysA.length !== keysB.length) return false

    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (!this.deepEqual(aObj[key], bObj[key])) return false
    }

    return true
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 执行 State 操作
 */
export async function executeState(
  operation: StateOperation,
  context: StateHandlerContext
): Promise<GoiExecutionResult<'state'>> {
  const handler = new StateHandler(context)
  return handler.execute(operation)
}

/**
 * 获取资源当前状态
 */
export async function getCurrentState(
  resourceType: ResourceType,
  resourceId: string
): Promise<Record<string, unknown> | null> {
  const modelName = resourceModelMap[resourceType]

  if (!modelName) {
    throw new Error(`Unsupported resource type: ${resourceType}`)
  }

  let result: Record<string, unknown> | null = null

  switch (modelName) {
    // 核心资源
    case 'prompt':
      result = await prisma.prompt.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    case 'dataset':
      result = await prisma.dataset.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    case 'model':
      result = await prisma.model.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    case 'evaluator':
      result = await prisma.evaluator.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    case 'task':
      result = await prisma.task.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    // 衍生资源
    case 'provider':
      result = await prisma.provider.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    case 'promptVersion':
      result = await prisma.promptVersion.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    case 'promptBranch':
      result = await prisma.promptBranch.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    case 'datasetVersion':
      result = await prisma.datasetVersion.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    // 系统资源
    case 'scheduledTask':
      result = await prisma.scheduledTask.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    case 'alertRule':
      result = await prisma.alertRule.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    case 'notifyChannel':
      result = await prisma.notifyChannel.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    // Schema 资源
    case 'inputSchema':
      result = await prisma.inputSchema.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    case 'outputSchema':
      result = await prisma.outputSchema.findUnique({ where: { id: resourceId } }) as Record<string, unknown> | null
      break
    default:
      throw new Error(`Unsupported model: ${modelName}`)
  }

  return result
}
