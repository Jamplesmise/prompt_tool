/**
 * GOI 依赖关系图
 *
 * 管理计划步骤之间的依赖关系，支持智能调度
 */

import type { PlanStep, TaskPlan, StepStatus } from '@platform/shared'

// ============================================
// 依赖关系图
// ============================================

/**
 * 依赖关系图
 */
export class DependencyGraph {
  /** 步骤映射 */
  private steps: Map<string, PlanStep>
  /** 依赖关系：stepId -> 依赖的 stepIds */
  private dependencies: Map<string, Set<string>>
  /** 被依赖关系：stepId -> 被哪些 step 依赖 */
  private dependents: Map<string, Set<string>>

  constructor(steps: PlanStep[]) {
    this.steps = new Map(steps.map(s => [s.id, { ...s }]))
    this.dependencies = new Map()
    this.dependents = new Map()

    // 构建依赖图
    for (const step of steps) {
      this.dependencies.set(step.id, new Set(step.dependencies))

      // 构建被依赖关系
      for (const dep of step.dependencies) {
        if (!this.dependents.has(dep)) {
          this.dependents.set(dep, new Set())
        }
        this.dependents.get(dep)!.add(step.id)
      }
    }
  }

  /**
   * 从 TaskPlan 创建依赖图
   */
  static fromPlan(plan: TaskPlan): DependencyGraph {
    return new DependencyGraph(plan.steps)
  }

  // ============================================
  // 查询方法
  // ============================================

  /**
   * 获取步骤
   */
  getStep(stepId: string): PlanStep | undefined {
    return this.steps.get(stepId)
  }

  /**
   * 获取所有步骤
   */
  getAllSteps(): PlanStep[] {
    return Array.from(this.steps.values())
  }

  /**
   * 获取步骤的依赖
   */
  getDependencies(stepId: string): string[] {
    return Array.from(this.dependencies.get(stepId) || [])
  }

  /**
   * 获取依赖某步骤的步骤
   */
  getDependents(stepId: string): string[] {
    return Array.from(this.dependents.get(stepId) || [])
  }

  /**
   * 获取可执行的步骤（所有依赖已完成）
   */
  getExecutableSteps(completedIds: Set<string>): PlanStep[] {
    const executable: PlanStep[] = []

    for (const [stepId, step] of this.steps) {
      if (step.status !== 'pending' && step.status !== 'ready') continue

      const deps = this.dependencies.get(stepId) || new Set()
      const allDepsCompleted = [...deps].every(dep => completedIds.has(dep))

      if (allDepsCompleted) {
        executable.push(step)
      }
    }

    return executable
  }

  /**
   * 获取下一个要执行的步骤
   */
  getNextStep(completedIds: Set<string>): PlanStep | null {
    const executable = this.getExecutableSteps(completedIds)
    if (executable.length === 0) return null

    // 按 order 排序，返回第一个
    return executable.sort((a, b) => a.order - b.order)[0]
  }

  /**
   * 获取受某步骤失败影响的步骤
   */
  getAffectedSteps(failedStepId: string): Set<string> {
    const affected = new Set<string>()
    const queue = [failedStepId]

    while (queue.length > 0) {
      const current = queue.shift()!
      const dependents = this.dependents.get(current) || new Set()

      for (const dep of dependents) {
        if (!affected.has(dep)) {
          affected.add(dep)
          queue.push(dep)
        }
      }
    }

    return affected
  }

  /**
   * 检查是否可以跳过某步骤
   */
  canSkipStep(stepId: string): boolean {
    const step = this.steps.get(stepId)
    if (!step) return false

    // 如果不是可选步骤，不能跳过
    if (!step.isOptional) return false

    // 检查是否有依赖此步骤的必要步骤
    const dependents = this.dependents.get(stepId) || new Set()
    for (const depId of dependents) {
      const dep = this.steps.get(depId)
      if (dep && !dep.isOptional) {
        return false // 有必要步骤依赖它，不能跳过
      }
    }

    return true
  }

  /**
   * 检查依赖是否已满足
   */
  areDependenciesSatisfied(stepId: string, completedIds: Set<string>): boolean {
    const deps = this.dependencies.get(stepId) || new Set()
    return [...deps].every(dep => completedIds.has(dep))
  }

  // ============================================
  // 状态更新方法
  // ============================================

  /**
   * 更新步骤状态
   */
  updateStepStatus(stepId: string, status: StepStatus): void {
    const step = this.steps.get(stepId)
    if (step) {
      step.status = status
      if (status === 'executing') {
        step.startedAt = new Date()
      } else if (status === 'completed' || status === 'failed' || status === 'skipped') {
        step.completedAt = new Date()
      }
    }
  }

  /**
   * 标记步骤为完成
   */
  markCompleted(stepId: string, resultData?: Record<string, unknown>): void {
    const step = this.steps.get(stepId)
    if (step) {
      step.status = 'completed'
      step.completedAt = new Date()
      if (resultData) {
        step.resultData = resultData
      }
    }
  }

  /**
   * 标记步骤为失败，并阻塞依赖步骤
   */
  markFailed(stepId: string, error?: string): Set<string> {
    const step = this.steps.get(stepId)
    if (step) {
      step.status = 'failed'
      step.completedAt = new Date()
      step.error = error
    }

    // 阻塞所有依赖此步骤的步骤
    const affected = this.getAffectedSteps(stepId)
    for (const affectedId of affected) {
      const affectedStep = this.steps.get(affectedId)
      if (affectedStep && affectedStep.status === 'pending') {
        affectedStep.status = 'blocked'
        affectedStep.blockedBy = stepId
      }
    }

    return affected
  }

  /**
   * 标记步骤为跳过
   */
  markSkipped(stepId: string): void {
    const step = this.steps.get(stepId)
    if (step) {
      step.status = 'skipped'
      step.completedAt = new Date()
    }
  }

  /**
   * 重置步骤状态（用于重试）
   */
  resetStep(stepId: string): void {
    const step = this.steps.get(stepId)
    if (step) {
      step.status = 'pending'
      step.startedAt = undefined
      step.completedAt = undefined
      step.error = undefined
      step.blockedBy = undefined
    }
  }

  /**
   * 解除阻塞（当阻塞步骤被重试成功后）
   */
  unblockSteps(blockedBy: string): void {
    for (const step of this.steps.values()) {
      if (step.blockedBy === blockedBy) {
        step.status = 'pending'
        step.blockedBy = undefined
      }
    }
  }

  // ============================================
  // 分析方法
  // ============================================

  /**
   * 拓扑排序（获取执行顺序）
   */
  topologicalSort(): PlanStep[] {
    const sorted: PlanStep[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return
      if (visiting.has(stepId)) throw new Error('Circular dependency detected')

      visiting.add(stepId)
      const deps = this.dependencies.get(stepId) || new Set()
      for (const dep of deps) {
        visit(dep)
      }
      visiting.delete(stepId)
      visited.add(stepId)

      const step = this.steps.get(stepId)
      if (step) sorted.push(step)
    }

    for (const stepId of this.steps.keys()) {
      visit(stepId)
    }

    return sorted
  }

  /**
   * 检查是否有循环依赖
   */
  hasCyclicDependency(): boolean {
    try {
      this.topologicalSort()
      return false
    } catch {
      return true
    }
  }

  /**
   * 获取关键路径（最长执行路径）
   */
  getCriticalPath(): PlanStep[] {
    const sorted = this.topologicalSort()
    const distances = new Map<string, number>()
    const predecessors = new Map<string, string | null>()

    // 初始化
    for (const step of sorted) {
      distances.set(step.id, 0)
      predecessors.set(step.id, null)
    }

    // 计算最长路径
    for (const step of sorted) {
      const currentDist = distances.get(step.id)!
      const dependents = this.dependents.get(step.id) || new Set()

      for (const depId of dependents) {
        const depStep = this.steps.get(depId)
        if (depStep) {
          const newDist = currentDist + step.estimatedSeconds
          if (newDist > distances.get(depId)!) {
            distances.set(depId, newDist)
            predecessors.set(depId, step.id)
          }
        }
      }
    }

    // 找到最长路径的终点
    let maxDist = 0
    let endStepId: string | null = null
    for (const [stepId, dist] of distances) {
      if (dist > maxDist) {
        maxDist = dist
        endStepId = stepId
      }
    }

    // 回溯关键路径
    const path: PlanStep[] = []
    let current = endStepId
    while (current) {
      const step = this.steps.get(current)
      if (step) path.unshift(step)
      current = predecessors.get(current) || null
    }

    return path
  }

  /**
   * 获取并行执行组（可同时执行的步骤）
   */
  getParallelGroups(completedIds: Set<string>): PlanStep[][] {
    const groups: PlanStep[][] = []
    const processed = new Set<string>(completedIds)

    while (processed.size < this.steps.size) {
      const executable = this.getExecutableSteps(processed)
        .filter(s => !processed.has(s.id))

      if (executable.length === 0) break

      groups.push(executable)
      for (const step of executable) {
        processed.add(step.id)
      }
    }

    return groups
  }

  // ============================================
  // 统计方法
  // ============================================

  /**
   * 获取执行统计
   */
  getStats(): {
    total: number
    pending: number
    ready: number
    executing: number
    completed: number
    skipped: number
    failed: number
    blocked: number
  } {
    const stats = {
      total: 0,
      pending: 0,
      ready: 0,
      executing: 0,
      completed: 0,
      skipped: 0,
      failed: 0,
      blocked: 0,
    }

    for (const step of this.steps.values()) {
      stats.total++
      switch (step.status) {
        case 'pending':
          stats.pending++
          break
        case 'ready':
          stats.ready++
          break
        case 'executing':
          stats.executing++
          break
        case 'completed':
          stats.completed++
          break
        case 'skipped':
          stats.skipped++
          break
        case 'failed':
          stats.failed++
          break
        case 'blocked':
          stats.blocked++
          break
      }
    }

    return stats
  }

  /**
   * 计算完成百分比
   */
  getProgressPercent(): number {
    const stats = this.getStats()
    if (stats.total === 0) return 100
    return Math.round(((stats.completed + stats.skipped) / stats.total) * 100)
  }

  /**
   * 估算剩余时间（秒）
   */
  estimateRemainingTime(): number {
    let remaining = 0
    for (const step of this.steps.values()) {
      if (step.status === 'pending' || step.status === 'ready' || step.status === 'executing') {
        remaining += step.estimatedSeconds
      }
    }
    return remaining
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 创建依赖图
 */
export function createDependencyGraph(steps: PlanStep[]): DependencyGraph {
  return new DependencyGraph(steps)
}

/**
 * 从计划创建依赖图
 */
export function createDependencyGraphFromPlan(plan: TaskPlan): DependencyGraph {
  return DependencyGraph.fromPlan(plan)
}

/**
 * 验证依赖关系
 */
export function validateDependencies(steps: PlanStep[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const stepIds = new Set(steps.map(s => s.id))

  // 检查依赖是否存在
  for (const step of steps) {
    for (const dep of step.dependencies) {
      if (!stepIds.has(dep)) {
        errors.push(`步骤 ${step.id} 依赖不存在的步骤 ${dep}`)
      }
    }
  }

  // 检查循环依赖
  const graph = new DependencyGraph(steps)
  if (graph.hasCyclicDependency()) {
    errors.push('存在循环依赖')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
