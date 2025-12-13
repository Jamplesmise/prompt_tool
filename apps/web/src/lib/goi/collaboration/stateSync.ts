/**
 * 状态同步器
 *
 * 检测和同步页面状态变化：
 * - 采集页面状态快照
 * - 比较快照差异
 * - 生成变化摘要
 */

import type { ResourceType } from '@platform/shared'
import type { StateDiff, StateSnapshot } from './types'

// ============================================
// 状态同步器类
// ============================================

export class StateSync {
  private previousSnapshot: StateSnapshot | null = null
  private sessionId = ''

  /**
   * 初始化状态同步器
   */
  initialize(sessionId: string): void {
    this.sessionId = sessionId
    this.previousSnapshot = this.captureSnapshot()
  }

  /**
   * 采集当前状态快照
   */
  captureSnapshot(): StateSnapshot {
    const snapshot: StateSnapshot = {
      url: window.location.pathname + window.location.search,
      forms: this.captureFormStates(),
      selectedItems: this.captureSelectedItems(),
      inputs: this.captureInputValues(),
      capturedAt: new Date(),
    }

    return snapshot
  }

  /**
   * 检测变化
   */
  detectChanges(): StateDiff[] {
    const currentSnapshot = this.captureSnapshot()

    if (!this.previousSnapshot) {
      this.previousSnapshot = currentSnapshot
      return []
    }

    const diffs = this.compareSnapshots(this.previousSnapshot, currentSnapshot)
    this.previousSnapshot = currentSnapshot

    return diffs
  }

  /**
   * 获取变化摘要
   */
  getChangeSummary(): string[] {
    const diffs = this.detectChanges()
    return this.summarize(diffs)
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.previousSnapshot = null
    this.sessionId = ''
  }

  // ============================================
  // 状态采集
  // ============================================

  /**
   * 采集表单状态
   */
  private captureFormStates(): Record<string, Record<string, unknown>> {
    const forms: Record<string, Record<string, unknown>> = {}

    document.querySelectorAll('form').forEach((form, index) => {
      const formId = form.id || form.name || `form_${index}`
      const formData: Record<string, unknown> = {}

      // 使用 FormData API 获取表单数据
      try {
        const data = new FormData(form)
        data.forEach((value, key) => {
          // 不记录密码字段
          const input = form.querySelector(`[name="${key}"]`) as HTMLInputElement
          if (input?.type === 'password') {
            formData[key] = '***'
          } else {
            formData[key] = value
          }
        })
      } catch {
        // FormData 构造失败时，手动遍历
        form.querySelectorAll('input, select, textarea').forEach(el => {
          const input = el as HTMLInputElement
          const name = input.name || input.id
          if (name) {
            if (input.type === 'password') {
              formData[name] = '***'
            } else if (input.type === 'checkbox' || input.type === 'radio') {
              formData[name] = input.checked
            } else {
              formData[name] = input.value
            }
          }
        })
      }

      if (Object.keys(formData).length > 0) {
        forms[formId] = formData
      }
    })

    return forms
  }

  /**
   * 采集选中项
   */
  private captureSelectedItems(): Array<{
    type?: ResourceType
    id?: string
  }> {
    const items: Array<{ type?: ResourceType; id?: string }> = []

    // 查找所有选中的元素
    document
      .querySelectorAll(
        '[aria-selected="true"], [data-selected="true"], .ant-table-row-selected'
      )
      .forEach(el => {
        const element = el as HTMLElement
        items.push({
          type: element.dataset.resourceType as ResourceType | undefined,
          id: element.dataset.resourceId,
        })
      })

    // 查找 Ant Design 选中的 Tab
    document.querySelectorAll('.ant-tabs-tab-active').forEach(el => {
      const element = el as HTMLElement
      if (element.dataset.resourceType || element.dataset.resourceId) {
        items.push({
          type: element.dataset.resourceType as ResourceType | undefined,
          id: element.dataset.resourceId,
        })
      }
    })

    // 查找选中的列表项
    document.querySelectorAll('.ant-list-item-active, .ant-menu-item-selected').forEach(el => {
      const element = el as HTMLElement
      if (element.dataset.resourceType || element.dataset.resourceId) {
        items.push({
          type: element.dataset.resourceType as ResourceType | undefined,
          id: element.dataset.resourceId,
        })
      }
    })

    return items
  }

  /**
   * 采集输入值
   */
  private captureInputValues(): Record<string, unknown> {
    const inputs: Record<string, unknown> = {}

    document
      .querySelectorAll('input, textarea, select')
      .forEach(el => {
        const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        const key = input.name || input.id

        if (!key) return

        // 跳过表单内的输入（已在表单状态中处理）
        if (input.form) return

        // 跳过隐藏的输入
        if (input.type === 'hidden') return

        // 跳过密码
        if (input.type === 'password') {
          inputs[key] = '***'
          return
        }

        // 处理不同类型
        if (input.type === 'checkbox' || input.type === 'radio') {
          inputs[key] = (input as HTMLInputElement).checked
        } else {
          inputs[key] = input.value
        }
      })

    return inputs
  }

  // ============================================
  // 快照比较
  // ============================================

  /**
   * 比较两个快照
   */
  private compareSnapshots(
    previous: StateSnapshot,
    current: StateSnapshot
  ): StateDiff[] {
    const diffs: StateDiff[] = []

    // 比较 URL
    if (previous.url !== current.url) {
      diffs.push({
        path: ['url'],
        type: 'change',
        oldValue: previous.url,
        newValue: current.url,
      })
    }

    // 比较表单状态
    diffs.push(
      ...this.compareObjects(previous.forms, current.forms, ['forms'])
    )

    // 比较选中项
    if (JSON.stringify(previous.selectedItems) !== JSON.stringify(current.selectedItems)) {
      diffs.push({
        path: ['selectedItems'],
        type: 'change',
        oldValue: previous.selectedItems,
        newValue: current.selectedItems,
      })
    }

    // 比较输入值
    diffs.push(
      ...this.compareObjects(previous.inputs, current.inputs, ['inputs'])
    )

    return diffs
  }

  /**
   * 递归比较对象
   */
  private compareObjects(
    previous: Record<string, unknown>,
    current: Record<string, unknown>,
    path: string[] = []
  ): StateDiff[] {
    const diffs: StateDiff[] = []

    // 检查新增和变化
    for (const key of Object.keys(current)) {
      const currentPath = [...path, key]
      const prevValue = previous[key]
      const currValue = current[key]

      if (prevValue === undefined) {
        diffs.push({
          path: currentPath,
          type: 'add',
          newValue: currValue,
        })
      } else if (this.isObject(currValue) && this.isObject(prevValue)) {
        diffs.push(
          ...this.compareObjects(
            prevValue as Record<string, unknown>,
            currValue as Record<string, unknown>,
            currentPath
          )
        )
      } else if (!this.isEqual(prevValue, currValue)) {
        diffs.push({
          path: currentPath,
          type: 'change',
          oldValue: prevValue,
          newValue: currValue,
        })
      }
    }

    // 检查删除
    for (const key of Object.keys(previous)) {
      if (current[key] === undefined) {
        diffs.push({
          path: [...path, key],
          type: 'remove',
          oldValue: previous[key],
        })
      }
    }

    return diffs
  }

  /**
   * 判断是否为对象
   */
  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  /**
   * 判断两个值是否相等
   */
  private isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (typeof a !== typeof b) return false
    if (Array.isArray(a) && Array.isArray(b)) {
      return JSON.stringify(a) === JSON.stringify(b)
    }
    if (this.isObject(a) && this.isObject(b)) {
      return JSON.stringify(a) === JSON.stringify(b)
    }
    return false
  }

  // ============================================
  // 变化摘要
  // ============================================

  /**
   * 生成变化摘要
   */
  summarize(diffs: StateDiff[]): string[] {
    return diffs.map(diff => {
      const pathStr = diff.path.join('.')

      switch (diff.type) {
        case 'add':
          return `新增 ${pathStr}: ${this.formatValue(diff.newValue)}`
        case 'remove':
          return `删除 ${pathStr}`
        case 'change':
          return `修改 ${pathStr}: ${this.formatValue(diff.oldValue)} → ${this.formatValue(diff.newValue)}`
      }
    })
  }

  /**
   * 格式化值用于显示
   */
  private formatValue(value: unknown): string {
    if (value === undefined || value === null) return '空'
    if (typeof value === 'string') {
      if (value.length > 30) {
        return `"${value.slice(0, 27)}..."`
      }
      return `"${value}"`
    }
    if (typeof value === 'boolean') return value ? '是' : '否'
    if (typeof value === 'number') return String(value)
    if (Array.isArray(value)) return `[${value.length} 项]`
    if (typeof value === 'object') return '{...}'
    return String(value)
  }

  /**
   * 获取人类可读的变化描述
   */
  getHumanReadableChanges(diffs: StateDiff[]): string[] {
    const descriptions: string[] = []

    for (const diff of diffs) {
      const pathStr = diff.path.join('.')

      // URL 变化
      if (pathStr === 'url') {
        descriptions.push(`导航到 ${diff.newValue}`)
        continue
      }

      // 选中项变化
      if (pathStr === 'selectedItems') {
        const newItems = diff.newValue as Array<{ type?: string; id?: string }>
        if (newItems.length > 0) {
          const types = [...new Set(newItems.map(i => i.type).filter(Boolean))]
          descriptions.push(`选择了 ${types.join('、')}`)
        }
        continue
      }

      // 表单字段变化
      if (pathStr.startsWith('forms.')) {
        const fieldName = diff.path[diff.path.length - 1]
        if (diff.type === 'change') {
          descriptions.push(`修改了表单字段 ${fieldName}`)
        } else if (diff.type === 'add') {
          descriptions.push(`填写了表单字段 ${fieldName}`)
        }
        continue
      }

      // 输入字段变化
      if (pathStr.startsWith('inputs.')) {
        const fieldName = diff.path[diff.path.length - 1]
        descriptions.push(`输入了 ${fieldName}`)
        continue
      }

      // 其他变化
      descriptions.push(this.summarize([diff])[0])
    }

    return descriptions
  }
}

// ============================================
// 单例导出
// ============================================

let stateSyncInstance: StateSync | null = null

export function getStateSync(): StateSync {
  if (!stateSyncInstance) {
    stateSyncInstance = new StateSync()
  }
  return stateSyncInstance
}

export function resetStateSync(): void {
  if (stateSyncInstance) {
    stateSyncInstance.reset()
  }
  stateSyncInstance = null
}
