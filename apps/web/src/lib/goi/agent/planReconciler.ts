/**
 * 计划协调器
 *
 * 根据用户操作更新执行计划：
 * - 识别用户完成的步骤
 * - 更新计划状态
 * - 生成续跑建议
 */

import type { TaskPlan, PlanStep } from '@platform/shared'
import type {
  TrackedAction,
  ReconciledPlan,
  ReconciledStep,
  ContinuationSuggestion,
} from '../collaboration/types'

// ============================================
// 计划协调器类
// ============================================

export class PlanReconciler {
  /**
   * 协调计划与用户操作
   */
  reconcile(plan: TaskPlan, userActions: TrackedAction[]): ReconciledPlan {
    // 转换步骤格式
    const reconciledSteps: ReconciledStep[] = plan.steps.map(step => {
      const matchingAction = this.findMatchingAction(step, userActions)

      const reconciledStep: ReconciledStep = {
        id: step.id,
        description: step.userLabel,
        action: step.operation.type,
        params: this.extractParams(step),
        status: step.status === 'completed' || step.status === 'skipped'
          ? step.status
          : matchingAction
            ? 'completed'
            : 'pending',
        required: !step.isOptional,
      }

      if (matchingAction) {
        reconciledStep.completedBy = 'user'
        reconciledStep.completedAt = matchingAction.timestamp
        reconciledStep.matchedAction = matchingAction
      } else if (step.status === 'completed') {
        reconciledStep.completedBy = 'ai'
        reconciledStep.completedAt = step.completedAt
      }

      return reconciledStep
    })

    // 计算统计
    const userCompletedCount = reconciledSteps.filter(
      s => s.completedBy === 'user'
    ).length
    const aiCompletedCount = reconciledSteps.filter(
      s => s.completedBy === 'ai'
    ).length
    const pendingCount = reconciledSteps.filter(
      s => s.status === 'pending'
    ).length
    const completedCount = userCompletedCount + aiCompletedCount
    const totalCount = reconciledSteps.length
    const progressPercent =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return {
      id: plan.id,
      goal: plan.goal,
      steps: reconciledSteps,
      userCompletedCount,
      aiCompletedCount,
      pendingCount,
      progressPercent,
    }
  }

  /**
   * 查找匹配的用户操作
   */
  private findMatchingAction(
    step: PlanStep,
    actions: TrackedAction[]
  ): TrackedAction | undefined {
    const operation = step.operation

    return actions.find(action => {
      // Access 操作匹配
      if (operation.type === 'access') {
        return this.matchAccessOperation(operation, action)
      }

      // State 操作匹配
      if (operation.type === 'state') {
        return this.matchStateOperation(operation, action)
      }

      // Observation 操作不需要用户操作
      return false
    })
  }

  /**
   * 匹配 Access 操作
   */
  private matchAccessOperation(
    operation: { type: 'access'; target: { resourceType: string; resourceId?: string }; action: string },
    userAction: TrackedAction
  ): boolean {
    // 导航操作匹配
    if (operation.action === 'navigate' || operation.action === 'view') {
      if (userAction.type === 'navigate' || userAction.type === 'click') {
        // 检查 URL 是否包含目标资源
        const url = userAction.context.url
        const resourceType = operation.target.resourceType
        const resourceId = operation.target.resourceId

        if (url.includes(`/${resourceType}s/`)) {
          if (resourceId) {
            return url.includes(resourceId)
          }
          return true
        }
      }
    }

    // 选择操作匹配
    if (operation.action === 'select') {
      if (userAction.type === 'click' || userAction.type === 'select') {
        // 检查资源类型匹配
        if (userAction.target.resourceType === operation.target.resourceType) {
          // 如果指定了具体 ID，需要精确匹配
          if (operation.target.resourceId) {
            return userAction.target.resourceId === operation.target.resourceId
          }
          // 否则任何该类型的选择都算匹配
          return true
        }
      }
    }

    // 创建操作匹配
    if (operation.action === 'create') {
      if (userAction.type === 'click') {
        // 检查是否点击了创建按钮
        const label = userAction.target.label?.toLowerCase() || ''
        return (
          label.includes('新建') ||
          label.includes('创建') ||
          label.includes('添加') ||
          label.includes('create') ||
          label.includes('add') ||
          label.includes('new')
        )
      }
    }

    // 编辑操作匹配
    if (operation.action === 'edit') {
      if (userAction.type === 'click') {
        const label = userAction.target.label?.toLowerCase() || ''
        return (
          label.includes('编辑') ||
          label.includes('修改') ||
          label.includes('edit') ||
          label.includes('modify')
        )
      }
    }

    return false
  }

  /**
   * 匹配 State 操作
   */
  private matchStateOperation(
    operation: { type: 'state'; target: { resourceType: string; resourceId?: string }; action: string; expectedState: Record<string, unknown> },
    userAction: TrackedAction
  ): boolean {
    // 创建操作
    if (operation.action === 'create') {
      if (userAction.type === 'submit') {
        return true
      }
    }

    // 更新操作
    if (operation.action === 'update') {
      if (userAction.type === 'input' || userAction.type === 'select') {
        // 检查修改的字段是否在期望状态中
        const expectedFields = Object.keys(operation.expectedState)
        const actionField = this.extractFieldFromAction(userAction)
        return actionField ? expectedFields.includes(actionField) : false
      }
      if (userAction.type === 'submit') {
        return true
      }
    }

    // 删除操作
    if (operation.action === 'delete') {
      if (userAction.type === 'click') {
        const label = userAction.target.label?.toLowerCase() || ''
        return (
          label.includes('删除') ||
          label.includes('移除') ||
          label.includes('delete') ||
          label.includes('remove')
        )
      }
    }

    return false
  }

  /**
   * 从用户操作中提取字段名
   */
  private extractFieldFromAction(action: TrackedAction): string | null {
    // 从元素选择器中提取
    const selector = action.target.element

    // 匹配 [name="xxx"] 模式
    const nameMatch = selector.match(/\[name="([^"]+)"\]/)
    if (nameMatch) return nameMatch[1]

    // 匹配 #xxx 模式
    const idMatch = selector.match(/#([a-zA-Z_][a-zA-Z0-9_]*)/)
    if (idMatch) return idMatch[1]

    // 从标签推断
    const label = action.target.label?.toLowerCase()
    if (label) {
      if (label.includes('名称') || label.includes('name')) return 'name'
      if (label.includes('描述') || label.includes('description')) return 'description'
      if (label.includes('内容') || label.includes('content')) return 'content'
    }

    return null
  }

  /**
   * 从步骤中提取参数
   */
  private extractParams(step: PlanStep): Record<string, unknown> {
    const operation = step.operation
    const params: Record<string, unknown> = {}

    if (operation.type === 'access') {
      params.resourceType = operation.target.resourceType
      params.resourceId = operation.target.resourceId
      params.action = operation.action
    } else if (operation.type === 'state') {
      params.resourceType = operation.target.resourceType
      params.resourceId = operation.target.resourceId
      params.action = operation.action
      params.expectedState = operation.expectedState
    }

    return params
  }

  /**
   * 获取下一个待执行步骤
   */
  getNextPendingStep(plan: ReconciledPlan): ReconciledStep | undefined {
    return plan.steps.find(step => step.status === 'pending')
  }

  /**
   * 生成续跑建议
   */
  generateSuggestion(plan: ReconciledPlan): ContinuationSuggestion {
    const nextStep = this.getNextPendingStep(plan)
    const userCompletedSteps = plan.steps.filter(s => s.completedBy === 'user')

    if (!nextStep) {
      return {
        canContinue: false,
        message: '所有步骤已完成',
        userCompletedSteps,
      }
    }

    if (userCompletedSteps.length === 0) {
      return {
        canContinue: true,
        nextStep,
        message: `可以从「${nextStep.description}」开始执行`,
        userCompletedSteps: [],
      }
    }

    return {
      canContinue: true,
      nextStep,
      message: `您完成了 ${userCompletedSteps.length} 个步骤，可以从「${nextStep.description}」继续`,
      userCompletedSteps,
    }
  }

  /**
   * 检查计划是否完成
   */
  isPlanCompleted(plan: ReconciledPlan): boolean {
    return plan.steps.every(
      step =>
        step.status === 'completed' ||
        step.status === 'skipped' ||
        step.status === 'failed'
    )
  }

  /**
   * 检查计划是否成功完成
   */
  isPlanSuccessful(plan: ReconciledPlan): boolean {
    const requiredSteps = plan.steps.filter(s => s.required)
    return requiredSteps.every(s => s.status === 'completed')
  }

  /**
   * 获取完成进度描述
   */
  getProgressDescription(plan: ReconciledPlan): string {
    const { userCompletedCount, aiCompletedCount, pendingCount } = plan
    const totalCompleted = userCompletedCount + aiCompletedCount
    const total = plan.steps.length

    const parts: string[] = []

    if (userCompletedCount > 0) {
      parts.push(`用户完成 ${userCompletedCount} 步`)
    }
    if (aiCompletedCount > 0) {
      parts.push(`AI 完成 ${aiCompletedCount} 步`)
    }
    if (pendingCount > 0) {
      parts.push(`待执行 ${pendingCount} 步`)
    }

    return `${parts.join('，')}（${totalCompleted}/${total}）`
  }
}

// ============================================
// 单例导出
// ============================================

let planReconcilerInstance: PlanReconciler | null = null

export function getPlanReconciler(): PlanReconciler {
  if (!planReconcilerInstance) {
    planReconcilerInstance = new PlanReconciler()
  }
  return planReconcilerInstance
}

export function resetPlanReconciler(): void {
  planReconcilerInstance = null
}
