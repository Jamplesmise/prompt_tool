/**
 * 偏离检测器
 *
 * 检测用户操作是否偏离原计划：
 * - 资源不匹配检测
 * - 跳过步骤检测
 * - 计划外操作检测
 * - 执行顺序偏离检测
 *
 * 返回偏离程度和建议
 */

import type {
  TrackedAction,
  ReconciledPlan,
  ReconciledStep,
  Deviation,
  DeviationIssue,
  DeviationType,
} from './types'

// ============================================
// 偏离检测器类
// ============================================

export class DeviationDetector {
  /**
   * 检测偏离
   */
  detect(plan: ReconciledPlan, userActions: TrackedAction[]): Deviation {
    const issues: DeviationIssue[] = []

    // 1. 检查资源不匹配
    issues.push(...this.checkResourceMismatch(plan, userActions))

    // 2. 检查跳过的步骤
    issues.push(...this.checkSkippedSteps(plan, userActions))

    // 3. 检查计划外操作
    issues.push(...this.checkUnexpectedActions(plan, userActions))

    // 4. 检查执行顺序偏离
    issues.push(...this.checkOrderDeviation(plan, userActions))

    // 分类偏离程度
    const type = this.categorize(issues)

    return {
      type,
      isBlocking: type === 'incompatible',
      issues,
      suggestions: this.generateSuggestions(issues, type),
    }
  }

  /**
   * 检查资源不匹配
   */
  private checkResourceMismatch(
    plan: ReconciledPlan,
    actions: TrackedAction[]
  ): DeviationIssue[] {
    const issues: DeviationIssue[] = []

    for (const step of plan.steps) {
      // 只检查需要特定资源的步骤
      if (!step.params?.resourceId) continue

      // 查找相关操作
      const relatedActions = actions.filter(
        a => a.target.resourceType === step.params?.resourceType
      )

      for (const action of relatedActions) {
        // 如果选择了不同的资源
        if (
          action.target.resourceId &&
          action.target.resourceId !== step.params.resourceId
        ) {
          issues.push({
            severity: 'warning',
            message: `选择了不同的${this.getResourceTypeName(step.params.resourceType as string)}：计划选择 ${step.params.resourceId}，实际选择 ${action.target.resourceId}`,
            step,
            action,
          })
        }
      }
    }

    return issues
  }

  /**
   * 检查跳过的步骤
   */
  private checkSkippedSteps(
    plan: ReconciledPlan,
    actions: TrackedAction[]
  ): DeviationIssue[] {
    const issues: DeviationIssue[] = []

    // 找到第一个用户完成的步骤索引
    let firstUserStepIndex = -1
    for (let i = 0; i < plan.steps.length; i++) {
      if (plan.steps[i].completedBy === 'user') {
        firstUserStepIndex = i
        break
      }
    }

    if (firstUserStepIndex <= 0) return issues

    // 检查之前的步骤是否被跳过
    for (let i = 0; i < firstUserStepIndex; i++) {
      const step = plan.steps[i]
      if (step.status === 'pending') {
        issues.push({
          severity: step.required ? 'error' : 'info',
          message: `跳过了${step.required ? '必要' : ''}步骤：${step.description}`,
          step,
        })
      }
    }

    return issues
  }

  /**
   * 检查计划外操作
   */
  private checkUnexpectedActions(
    plan: ReconciledPlan,
    actions: TrackedAction[]
  ): DeviationIssue[] {
    const issues: DeviationIssue[] = []

    for (const action of actions) {
      // 跳过没有资源类型的操作
      if (!action.target.resourceType) continue

      // 检查是否匹配任何步骤
      const matchesAnyStep = plan.steps.some(step => {
        // 已完成且匹配的步骤
        if (step.matchedAction?.id === action.id) return true

        // 检查资源类型和 ID 匹配
        if (step.params?.resourceType === action.target.resourceType) {
          if (step.params?.resourceId) {
            return step.params.resourceId === action.target.resourceId
          }
          return true
        }

        return false
      })

      if (!matchesAnyStep) {
        issues.push({
          severity: 'info',
          message: `计划外操作：${this.getActionTypeName(action.type)} ${action.target.label || action.target.resourceType}`,
          action,
        })
      }
    }

    return issues
  }

  /**
   * 检查执行顺序偏离
   */
  private checkOrderDeviation(
    plan: ReconciledPlan,
    actions: TrackedAction[]
  ): DeviationIssue[] {
    const issues: DeviationIssue[] = []

    // 获取用户完成的步骤顺序
    const userCompletedSteps = plan.steps.filter(s => s.completedBy === 'user')
    if (userCompletedSteps.length < 2) return issues

    // 检查是否按顺序完成
    let lastIndex = -1
    for (const step of userCompletedSteps) {
      const currentIndex = plan.steps.findIndex(s => s.id === step.id)
      if (currentIndex < lastIndex) {
        issues.push({
          severity: 'info',
          message: `步骤执行顺序与计划不同：「${step.description}」先于预期执行`,
          step,
        })
      }
      lastIndex = currentIndex
    }

    return issues
  }

  /**
   * 分类偏离程度
   */
  private categorize(issues: DeviationIssue[]): DeviationType {
    const errorCount = issues.filter(i => i.severity === 'error').length
    const warningCount = issues.filter(i => i.severity === 'warning').length

    if (errorCount > 0) return 'incompatible'
    if (warningCount >= 3) return 'major'
    if (warningCount >= 1) return 'minor'
    return 'none'
  }

  /**
   * 生成建议
   */
  private generateSuggestions(
    issues: DeviationIssue[],
    type: DeviationType
  ): string[] {
    const suggestions: string[] = []

    // 根据偏离程度给出总体建议
    switch (type) {
      case 'incompatible':
        suggestions.push('存在不兼容的操作，建议重新规划或调整步骤')
        break
      case 'major':
        suggestions.push('检测到较大偏离，建议确认后再继续')
        break
      case 'minor':
        suggestions.push('检测到轻微偏离，可以继续执行')
        break
    }

    // 根据具体问题给出建议
    for (const issue of issues) {
      if (issue.severity === 'error' && issue.step) {
        suggestions.push(`请先完成：${issue.step.description}`)
      }
    }

    // 去重
    return [...new Set(suggestions)]
  }

  /**
   * 获取资源类型名称
   */
  private getResourceTypeName(type: string): string {
    const names: Record<string, string> = {
      prompt: '提示词',
      dataset: '数据集',
      model: '模型',
      evaluator: '评估器',
      task: '任务',
      scheduled_task: '定时任务',
      alert_rule: '告警规则',
    }
    return names[type] || type
  }

  /**
   * 获取操作类型名称
   */
  private getActionTypeName(type: string): string {
    const names: Record<string, string> = {
      navigate: '导航到',
      click: '点击',
      input: '输入',
      select: '选择',
      submit: '提交',
      toggle: '切换',
      upload: '上传',
      delete: '删除',
      drag: '拖拽',
    }
    return names[type] || type
  }

  /**
   * 检查是否可以继续执行
   */
  canContinue(deviation: Deviation): boolean {
    return !deviation.isBlocking
  }

  /**
   * 获取偏离摘要
   */
  getSummary(deviation: Deviation): string {
    if (deviation.type === 'none') {
      return '操作与计划一致，可以顺利继续'
    }

    const issueCount = deviation.issues.length
    const typeNames: Record<DeviationType, string> = {
      none: '无偏离',
      minor: '轻微偏离',
      major: '较大偏离',
      incompatible: '不兼容',
    }

    return `检测到${typeNames[deviation.type]}：${issueCount} 个问题`
  }

  /**
   * 获取用于显示的偏离信息
   */
  getDisplayInfo(deviation: Deviation): {
    type: 'success' | 'info' | 'warning' | 'error'
    title: string
    description: string
  } {
    switch (deviation.type) {
      case 'none':
        return {
          type: 'success',
          title: '操作与计划一致',
          description: '您的操作完全符合计划，可以顺利继续执行',
        }
      case 'minor':
        return {
          type: 'info',
          title: '检测到轻微偏离',
          description: '存在一些小的差异，但不影响继续执行',
        }
      case 'major':
        return {
          type: 'warning',
          title: '检测到较大偏离',
          description: '您的操作与原计划有较大差异，建议确认后再继续',
        }
      case 'incompatible':
        return {
          type: 'error',
          title: '检测到不兼容的操作',
          description: '必要步骤被跳过或存在冲突，需要调整后才能继续',
        }
    }
  }
}

// ============================================
// 单例导出
// ============================================

let deviationDetectorInstance: DeviationDetector | null = null

export function getDeviationDetector(): DeviationDetector {
  if (!deviationDetectorInstance) {
    deviationDetectorInstance = new DeviationDetector()
  }
  return deviationDetectorInstance
}

export function resetDeviationDetector(): void {
  deviationDetectorInstance = null
}
