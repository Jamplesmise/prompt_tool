/**
 * 失败报告生成器
 *
 * 生成用户可读的失败报告和恢复建议
 */

import type {
  FailureInfo,
  FailureReport,
  FailureLocation,
  FailureReason,
  RollbackInfo,
  RecoveryOption,
  RecoveryAction,
  RollbackResult,
  FailureType,
} from '@platform/shared'

// ============================================
// 常量定义
// ============================================

/**
 * 失败类型到中文描述的映射
 */
const FAILURE_TYPE_LABELS: Record<FailureType, string> = {
  temporary: '临时性失败',
  data: '数据性失败',
  logic: '逻辑性失败',
  permission: '权限性失败',
  system: '系统性失败',
}

/**
 * 默认的可能原因模板
 */
const DEFAULT_CAUSES: Record<FailureType, string[]> = {
  temporary: [
    '网络连接不稳定',
    '服务暂时不可用',
    '请求超时',
    '触发了速率限制',
  ],
  data: [
    '资源名称拼写错误',
    '资源已被删除',
    '数据格式不正确',
    '关联的资源不存在',
  ],
  logic: [
    '操作前置条件不满足',
    '依赖的步骤未完成',
    '当前状态不允许此操作',
    '操作顺序不正确',
  ],
  permission: [
    '当前用户无权限执行此操作',
    '登录状态已过期',
    '访问的资源不属于当前用户',
    '账户配额已用尽',
  ],
  system: [
    '服务内部错误',
    '数据库连接异常',
    '第三方服务故障',
    '系统配置错误',
  ],
}

// ============================================
// 失败报告生成器类
// ============================================

/**
 * 失败报告生成器
 */
export class FailureReporter {
  /**
   * 生成失败报告
   */
  generateReport(
    failure: FailureInfo,
    rollback?: RollbackResult,
    options?: {
      todoListTotal?: number
      phaseName?: string
    }
  ): FailureReport {
    return {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      failureId: failure.id,
      location: this.buildLocation(failure, options),
      reason: this.buildReason(failure),
      rollback: this.buildRollbackInfo(rollback),
      suggestions: this.suggestRecoveryOptions(failure),
      generatedAt: new Date(),
    }
  }

  /**
   * 分析可能原因
   */
  analyzePossibleCauses(failure: FailureInfo): string[] {
    const causes: string[] = []

    // 从默认原因中选择
    const defaultCauses = DEFAULT_CAUSES[failure.type]
    causes.push(...defaultCauses.slice(0, 3))

    // 根据错误消息添加特定原因
    const specificCauses = this.extractSpecificCauses(failure.message)
    causes.push(...specificCauses)

    // 去重并限制数量
    return [...new Set(causes)].slice(0, 5)
  }

  /**
   * 建议恢复选项
   */
  suggestRecoveryOptions(failure: FailureInfo): RecoveryOption[] {
    const options: RecoveryOption[] = []

    // 根据失败类型生成选项
    switch (failure.type) {
      case 'temporary':
        options.push(
          this.createOption('retry', '重新尝试', '使用相同参数重新执行', true),
          this.createOption('takeover', '手动完成', '我来手动完成此步骤')
        )
        break

      case 'data':
        options.push(
          this.createOption('modify', '修改参数', '修改搜索条件后重试', true, true, '请输入新的参数'),
          this.createOption('takeover', '手动选择', '我来手动选择资源')
        )
        break

      case 'logic':
        options.push(
          this.createOption('replan', '重新规划', '让 AI 重新分析并规划任务', true),
          this.createOption('skip', '跳过此步', '暂时跳过，稍后处理'),
          this.createOption('takeover', '手动处理', '我来手动处理此问题')
        )
        break

      case 'permission':
        options.push(
          this.createOption('takeover', '手动处理', '我来处理权限问题', true),
          this.createOption('abort', '放弃任务', '取消本次任务')
        )
        break

      case 'system':
        if (failure.retryable) {
          options.push(
            this.createOption('retry', '稍后重试', `等待后重新尝试`, true)
          )
        }
        options.push(
          this.createOption('takeover', '手动处理', '我来处理此问题'),
          this.createOption('abort', '放弃任务', '取消本次任务')
        )
        break
    }

    // 始终添加跳过和放弃选项（如果还没有）
    if (!options.find((o) => o.action === 'skip') && failure.type !== 'permission') {
      options.push(this.createOption('skip', '跳过此步', '跳过并继续后续任务'))
    }
    if (!options.find((o) => o.action === 'abort')) {
      options.push(this.createOption('abort', '放弃任务', '取消整个任务'))
    }

    return options
  }

  /**
   * 格式化失败报告为文本
   */
  formatReportAsText(report: FailureReport): string {
    const lines: string[] = [
      '┌─────────────────────────────────────────────────────────────────┐',
      '│ ⚠️ 任务执行失败                                                  │',
      '├─────────────────────────────────────────────────────────────────┤',
      '│                                                                 │',
      `│ 📍 失败位置                                                      │`,
      `│    TODO项: "${report.location.todoItem}"`,
      `│    阶段: ${report.location.phase} (${report.location.progress})`,
      '│                                                                 │',
      `│ ❌ 失败原因                                                      │`,
      `│    ${report.reason.summary}`,
      '│    可能的原因：',
      ...report.reason.possibleCauses.map((c) => `│    • ${c}`),
      '│                                                                 │',
    ]

    if (report.rollback.executed) {
      lines.push(
        `│ 🔄 已执行的回滚                                                  │`,
        ...report.rollback.actions.map((a) => `│    • ${a}`),
        `│    状态已恢复到"${report.rollback.restoredTo}"`,
        '│                                                                 │'
      )
    }

    lines.push(
      `│ 💡 建议操作                                                      │`,
      ...report.suggestions.map(
        (s) => `│    [${s.label}] ${s.description}${s.recommended ? ' (推荐)' : ''}`
      ),
      '│                                                                 │',
      '└─────────────────────────────────────────────────────────────────┘'
    )

    return lines.join('\n')
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 构建失败位置
   */
  private buildLocation(
    failure: FailureInfo,
    options?: { todoListTotal?: number; phaseName?: string }
  ): FailureLocation {
    const total = options?.todoListTotal || 10
    const current = Math.min(parseInt(failure.todoItemId.slice(-2)) || 1, total)

    return {
      todoItem: failure.todoItemTitle,
      phase: options?.phaseName || this.inferPhase(failure.todoItemTitle),
      progress: `第${current}项，共${total}项`,
      page: failure.operation.targetResource
        ? `/${failure.operation.targetResource.type}s`
        : undefined,
    }
  }

  /**
   * 构建失败原因
   */
  private buildReason(failure: FailureInfo): FailureReason {
    return {
      summary: this.buildSummary(failure),
      possibleCauses: this.analyzePossibleCauses(failure),
      technicalDetails: `[${failure.code}] ${failure.originalError.message}`,
    }
  }

  /**
   * 构建回滚信息
   */
  private buildRollbackInfo(rollback?: RollbackResult): RollbackInfo {
    if (!rollback) {
      return {
        executed: false,
        actions: [],
        restoredTo: '未执行回滚',
      }
    }

    return {
      executed: true,
      actions: rollback.rollbackActions
        .filter((a) => a.success)
        .map((a) => a.description),
      restoredTo: `${this.formatDate(rollback.restoredTo)}的状态`,
      snapshotId: rollback.snapshotId,
    }
  }

  /**
   * 创建恢复选项
   */
  private createOption(
    action: RecoveryAction,
    label: string,
    description: string,
    recommended?: boolean,
    requiresInput?: boolean,
    inputPrompt?: string
  ): RecoveryOption {
    return {
      id: `option-${action}-${Date.now()}`,
      label,
      description,
      action,
      recommended,
      requiresInput,
      inputPrompt,
    }
  }

  /**
   * 构建摘要
   */
  private buildSummary(failure: FailureInfo): string {
    const typeLabel = FAILURE_TYPE_LABELS[failure.type]

    // 根据操作类型生成摘要
    if (failure.operation.targetResource) {
      const { type, name } = failure.operation.targetResource
      if (failure.type === 'data' && failure.message.includes('not found')) {
        return `搜索 "${name || type}" 未找到匹配的${this.getResourceLabel(type)}`
      }
      return `对 ${this.getResourceLabel(type)} "${name || ''}" 的操作失败`
    }

    return `${typeLabel}: ${failure.message.slice(0, 50)}`
  }

  /**
   * 从错误消息提取特定原因
   */
  private extractSpecificCauses(message: string): string[] {
    const causes: string[] = []

    if (message.includes('timeout')) {
      causes.push('请求处理时间过长')
    }
    if (message.includes('not found') || message.includes('不存在')) {
      causes.push('目标资源可能已被删除或移动')
    }
    if (message.includes('duplicate') || message.includes('已存在')) {
      causes.push('资源已经存在，可能是重复操作')
    }
    if (message.includes('invalid') || message.includes('无效')) {
      causes.push('输入的数据格式或内容不正确')
    }

    return causes
  }

  /**
   * 推断阶段名称
   */
  private inferPhase(todoItemTitle: string): string {
    const title = todoItemTitle.toLowerCase()

    if (title.includes('搜索') || title.includes('选择') || title.includes('定位')) {
      return '资源定位'
    }
    if (title.includes('配置') || title.includes('设置') || title.includes('映射')) {
      return '参数配置'
    }
    if (title.includes('创建') || title.includes('保存') || title.includes('提交')) {
      return '资源创建'
    }
    if (title.includes('验证') || title.includes('检查') || title.includes('确认')) {
      return '结果验证'
    }

    return '任务执行'
  }

  /**
   * 获取资源类型的中文标签
   */
  private getResourceLabel(type: string): string {
    const labels: Record<string, string> = {
      prompt: '提示词',
      dataset: '数据集',
      model: '模型',
      evaluator: '评估器',
      task: '任务',
    }
    return labels[type] || type
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建失败报告生成器
 */
export function createReporter(): FailureReporter {
  return new FailureReporter()
}

// ============================================
// 单例导出
// ============================================

/** 全局失败报告生成器实例 */
export const reporter = new FailureReporter()
