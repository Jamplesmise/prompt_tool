/**
 * GOI Access Handler - 资源访问声明处理器
 *
 * 处理 Access 类型的 GOI 操作，负责：
 * 1. 解析目标资源的 URL
 * 2. 验证资源是否存在
 * 3. 生成导航指令
 * 4. 发布 RESOURCE_ACCESSED 事件
 */

import type {
  AccessOperation,
  AccessAction,
  AccessExecutionResult,
  GoiExecutionResult,
  ResourceType,
} from '@platform/shared'
import { publishResourceAccessed } from '../../events'
import { prisma } from '../../prisma'
import { normalizeResourceType, systemPageTypes } from './shared'
import { getCreateDialogId, getSelectorDialogId, getTestDialogId } from '../dialogIds'
import { getFormIdForResource } from '../formStore'

/**
 * 资源类型到 URL 路径的映射
 */
const routeMap: Record<ResourceType, (id?: string, action?: AccessAction) => string> = {
  prompt: (id, action) => {
    if (action === 'create') return '/prompts/new'
    if (!id) return '/prompts'
    if (action === 'edit') return `/prompts/${id}/edit`
    return `/prompts/${id}`
  },
  prompt_version: (id) => (id ? `/prompts/versions/${id}` : '/prompts'),
  prompt_branch: (id) => (id ? `/prompts/branches/${id}` : '/prompts'),
  dataset: (id, action) => {
    if (action === 'create') return '/datasets' // 数据集在列表页创建
    if (!id) return '/datasets'
    if (action === 'edit') return `/datasets/${id}/edit`
    return `/datasets/${id}`
  },
  dataset_version: (id) => (id ? `/datasets/versions/${id}` : '/datasets'),
  model: (id, action) => {
    if (action === 'create') return '/models' // 模型在列表页通过弹窗创建
    if (!id) return '/models'
    if (action === 'edit') return `/models?edit=${id}`
    return `/models?view=${id}`
  },
  provider: (id, action) => {
    if (action === 'create') return '/models' // 供应商在模型页通过弹窗创建
    if (!id) return '/models'
    if (action === 'edit') return `/models?editProvider=${id}`
    return `/models?provider=${id}`
  },
  evaluator: (id, action) => {
    if (action === 'create') return '/evaluators/new'
    if (!id) return '/evaluators'
    if (action === 'edit') return `/evaluators/${id}/edit`
    return `/evaluators/${id}`
  },
  task: (id, action) => {
    if (action === 'create') return '/tasks/new'
    if (!id) return '/tasks'
    if (action === 'view') return `/tasks/${id}/results`
    return `/tasks/${id}`
  },
  task_result: (id) => (id ? `/tasks/results/${id}` : '/tasks'),
  evaluation_schema: (id) => (id ? `/evaluators/schemas/${id}` : '/evaluators'),
  input_schema: (id, action) => {
    if (action === 'create') return '/schemas/input/new'
    return id ? `/schemas/input/${id}` : '/schemas'
  },
  output_schema: (id, action) => {
    if (action === 'create') return '/schemas/output/new'
    return id ? `/schemas/output/${id}` : '/schemas'
  },
  scheduled_task: (id) => (id ? `/scheduled?id=${id}` : '/scheduled'),
  alert_rule: (id) => (id ? `/monitor/alerts?id=${id}` : '/monitor/alerts'),
  notify_channel: (id) => (id ? `/monitor/alerts?channel=${id}` : '/monitor/alerts'),
  // 系统页面
  settings: () => '/settings',
  dashboard: () => '/',
  monitor: (id, action) => {
    if (action === 'view' && id) return `/monitor?tab=${id}`
    return '/monitor'
  },
  schema: (id, action) => {
    if (action === 'create') return '/schemas/new'
    if (!id) return '/schemas'
    if (action === 'edit') return `/schemas/${id}/edit`
    return `/schemas/${id}`
  },
  comparison: (id, action) => {
    if (!id) return '/comparison'
    return `/comparison?task=${id}`
  },
}

/**
 * 资源类型到数据库表的映射
 */
const resourceTableMap: Partial<Record<ResourceType, string>> = {
  prompt: 'prompt',
  dataset: 'dataset',
  model: 'model',
  evaluator: 'evaluator',
  task: 'task',
  scheduled_task: 'scheduledTask',
  alert_rule: 'alertRule',
  notify_channel: 'notifyChannel',
}

// ============================================
// Access Handler 类
// ============================================

export type AccessHandlerContext = {
  sessionId: string
  userId?: string
  teamId?: string
}

/**
 * Access Handler - 处理资源访问声明
 */
export class AccessHandler {
  private context: AccessHandlerContext

  constructor(context: AccessHandlerContext) {
    this.context = context
  }

  /**
   * 执行 Access 操作
   */
  async execute(operation: AccessOperation): Promise<GoiExecutionResult<'access'>> {
    const startTime = Date.now()
    const events: Array<{ type: string; payload: unknown }> = []

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

      // 2. 检查资源是否存在（如果指定了 resourceId）
      let resourceFound = true
      let resourceName: string | undefined

      if (operation.target.resourceId) {
        const resourceCheck = await this.checkResourceExists(
          operation.target.resourceType,
          operation.target.resourceId
        )
        resourceFound = resourceCheck.exists
        resourceName = resourceCheck.name

        if (!resourceFound) {
          return {
            success: false,
            status: 'failed',
            error: `Resource not found: ${operation.target.resourceType}/${operation.target.resourceId}`,
            errorCode: 'RESOURCE_NOT_FOUND',
            duration: Date.now() - startTime,
            events,
          }
        }
      }

      // 3. 解析目标 URL/Dialog
      const result = this.resolveTarget(operation)

      // 4. 发布事件
      if (operation.target.resourceId) {
        await publishResourceAccessed(
          this.context.sessionId,
          operation.target.resourceType,
          operation.target.resourceId,
          resourceName,
          'ai'
        )
        events.push({
          type: 'RESOURCE_ACCESSED',
          payload: {
            resourceType: operation.target.resourceType,
            resourceId: operation.target.resourceId,
            resourceName,
          },
        })
      }

      return {
        success: true,
        status: 'success',
        result: {
          ...result,
          resourceFound,
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
  private validateOperation(operation: AccessOperation): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 检查资源类型是否支持
    if (!routeMap[operation.target.resourceType]) {
      errors.push(`Unsupported resource type: ${operation.target.resourceType}`)
    }

    // 系统页面资源类型（不需要 resourceId）
    const isSystemPage = systemPageTypes.includes(operation.target.resourceType)

    // 对于 view/edit 操作，如果没有 resourceId，将导航到列表页让用户选择
    // 不再强制要求 resourceId，提供更好的用户体验
    // 注意：这允许用户说"帮我查看提示词"而不需要指定具体哪个

    return { valid: errors.length === 0, errors }
  }

  /**
   * 检查资源是否存在
   */
  private async checkResourceExists(
    resourceType: ResourceType,
    resourceId: string
  ): Promise<{ exists: boolean; name?: string }> {
    const tableName = resourceTableMap[resourceType]

    if (!tableName) {
      // 对于没有直接映射的资源类型，假设存在
      return { exists: true }
    }

    try {
      // 根据资源类型查询
      let resource: { id: string; name?: string } | null = null

      switch (tableName) {
        case 'prompt':
          resource = await prisma.prompt.findUnique({
            where: { id: resourceId },
            select: { id: true, name: true },
          })
          break
        case 'dataset':
          resource = await prisma.dataset.findUnique({
            where: { id: resourceId },
            select: { id: true, name: true },
          })
          break
        case 'model':
          resource = await prisma.model.findUnique({
            where: { id: resourceId },
            select: { id: true, name: true },
          })
          break
        case 'evaluator':
          resource = await prisma.evaluator.findUnique({
            where: { id: resourceId },
            select: { id: true, name: true },
          })
          break
        case 'task':
          resource = await prisma.task.findUnique({
            where: { id: resourceId },
            select: { id: true, name: true },
          })
          break
        default:
          // 未知类型假设存在
          return { exists: true }
      }

      return {
        exists: !!resource,
        name: resource?.name,
      }
    } catch (error) {
      console.error(`[AccessHandler] Error checking resource existence:`, error)
      // 查询失败时假设存在，避免阻塞操作
      return { exists: true }
    }
  }

  /**
   * 解析目标 URL/Dialog
   */
  private resolveTarget(operation: AccessOperation): Omit<AccessExecutionResult, 'resourceFound'> {
    const { target, action, context } = operation
    const result: Omit<AccessExecutionResult, 'resourceFound'> = {}

    switch (action) {
      case 'view':
      case 'navigate': {
        // 生成 URL
        const routeGenerator = routeMap[target.resourceType]
        let url = routeGenerator(target.resourceId, action)

        // 添加上下文查询参数
        if (context?.query) {
          const params = new URLSearchParams(context.query)
          url += (url.includes('?') ? '&' : '?') + params.toString()
        }

        // 添加 tab 参数
        if (context?.tab) {
          url += (url.includes('?') ? '&' : '?') + `tab=${context.tab}`
        }

        result.navigatedTo = url
        break
      }

      case 'edit': {
        // 如果有 dialog: 'create' 上下文，当作 create 处理
        if (context?.dialog === 'create' && !target.resourceId) {
          result.openedDialog = getCreateDialogId(target.resourceType)
          // 同时导航到列表页
          const routeGenerator = routeMap[target.resourceType]
          result.navigatedTo = routeGenerator(undefined, 'navigate')
        } else {
          // 正常的 edit 操作
          const routeGenerator = routeMap[target.resourceType]
          let url = routeGenerator(target.resourceId, action)
          if (context?.query) {
            const params = new URLSearchParams(context.query)
            url += (url.includes('?') ? '&' : '?') + params.toString()
          }
          result.navigatedTo = url
        }
        break
      }

      case 'create': {
        // 获取创建页面/弹窗的路由
        const routeGenerator = routeMap[target.resourceType]
        const createUrl = routeGenerator(undefined, 'create')
        const listUrl = routeGenerator(undefined, 'navigate')

        // 如果 create 返回的是独立页面（如 /prompts/new），直接导航
        // 如果返回的是列表页，说明需要通过弹窗创建
        if (createUrl !== listUrl) {
          // 独立创建页面，直接导航
          result.navigatedTo = createUrl
        } else {
          // 弹窗创建，导航到列表页并打开弹窗
          result.openedDialog = context?.dialog || getCreateDialogId(target.resourceType)
          result.navigatedTo = listUrl
        }
        break
      }

      case 'select': {
        // 打开选择器弹窗（使用集中管理的弹窗 ID）
        result.openedDialog = context?.dialog || getSelectorDialogId(target.resourceType)

        // 同时提供导航 URL（用于预选）
        if (target.resourceId) {
          const routeGenerator = routeMap[target.resourceType]
          result.navigatedTo = routeGenerator(target.resourceId, 'view')
        }
        break
      }

      case 'test': {
        // 测试操作：只有 model 和 notify_channel 支持
        const testDialogId = getTestDialogId(target.resourceType)
        if (!testDialogId) {
          // 不支持测试的资源类型
          throw new Error(`Resource type "${target.resourceType}" does not support test action`)
        }
        result.openedDialog = context?.dialog || testDialogId
        // 导航到资源所在页面
        const routeGenerator = routeMap[target.resourceType]
        result.navigatedTo = routeGenerator(target.resourceId, 'view')
        break
      }
    }

    // 如果有表单预填数据，添加到结果中
    if (context?.formData && Object.keys(context.formData).length > 0) {
      result.formPrefill = {
        formId: getFormIdForResource(target.resourceType),
        resourceType: target.resourceType,
        data: context.formData,
        autoSubmit: context.autoSubmit,
      }
    }

    return result
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 执行 Access 操作
 */
export async function executeAccess(
  operation: AccessOperation,
  context: AccessHandlerContext
): Promise<GoiExecutionResult<'access'>> {
  const handler = new AccessHandler(context)
  return handler.execute(operation)
}

/**
 * 解析目标 URL（不执行完整操作）
 */
export function resolveTargetUrl(
  resourceType: ResourceType,
  resourceId?: string,
  action: AccessAction = 'view'
): string {
  const routeGenerator = routeMap[resourceType]
  if (!routeGenerator) {
    throw new Error(`Unsupported resource type: ${resourceType}`)
  }
  return routeGenerator(resourceId, action)
}
