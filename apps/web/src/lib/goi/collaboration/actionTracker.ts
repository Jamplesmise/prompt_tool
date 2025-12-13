/**
 * 操作追踪器
 *
 * 追踪用户在接管期间的手动操作：
 * - 点击、输入、选择等 DOM 事件
 * - 页面导航
 * - 表单提交
 *
 * 特点：
 * - 使用捕获阶段监听，确保在事件被阻止前捕获
 * - 过滤 GOI 面板内的操作
 * - 自动识别资源类型和 ID
 */

import type {
  TrackedAction,
  TrackableAction,
  ActionTarget,
  ActionTrackerCallback,
} from './types'
import type { ResourceType } from '@platform/shared'

// ============================================
// 操作追踪器类
// ============================================

export class ActionTracker {
  private actions: TrackedAction[] = []
  private isTracking = false
  private sessionId = ''
  private abortController: AbortController | null = null

  // 事件监听器
  private eventListeners = new Map<string, Set<ActionTrackerCallback>>()

  /**
   * 开始追踪
   */
  startTracking(sessionId: string): void {
    if (this.isTracking) return

    this.isTracking = true
    this.sessionId = sessionId
    this.actions = []
    this.setupListeners()

    this.emit('start', null as unknown as TrackedAction)
  }

  /**
   * 停止追踪
   */
  stopTracking(): TrackedAction[] {
    if (!this.isTracking) return []

    this.isTracking = false
    this.abortController?.abort()
    this.abortController = null

    this.emit('stop', null as unknown as TrackedAction)

    return [...this.actions]
  }

  /**
   * 获取所有追踪的操作
   */
  getActions(): TrackedAction[] {
    return [...this.actions]
  }

  /**
   * 清空操作记录
   */
  clearActions(): void {
    this.actions = []
  }

  /**
   * 检查是否正在追踪
   */
  isActive(): boolean {
    return this.isTracking
  }

  // ============================================
  // 事件监听设置
  // ============================================

  private setupListeners(): void {
    this.abortController = new AbortController()
    const { signal } = this.abortController

    // 点击事件
    document.addEventListener('click', this.handleClick, {
      signal,
      capture: true,
    })

    // 输入事件（使用 input 事件获取实时输入）
    document.addEventListener('input', this.handleInput, {
      signal,
      capture: true,
    })

    // 表单提交事件
    document.addEventListener('submit', this.handleSubmit, {
      signal,
      capture: true,
    })

    // 选择变化事件
    document.addEventListener('change', this.handleChange, {
      signal,
      capture: true,
    })

    // 页面导航事件
    window.addEventListener('popstate', this.handleNavigation, { signal })

    // 使用 MutationObserver 监听 URL 变化（SPA 路由）
    this.setupUrlObserver(signal)
  }

  /**
   * 设置 URL 变化监听（用于 SPA 路由）
   */
  private setupUrlObserver(signal: AbortSignal): void {
    let lastUrl = window.location.href

    const checkUrlChange = (): void => {
      if (window.location.href !== lastUrl) {
        const previousUrl = lastUrl
        lastUrl = window.location.href
        this.recordNavigation(previousUrl)
      }
    }

    // 定期检查 URL 变化
    const intervalId = setInterval(checkUrlChange, 100)

    signal.addEventListener('abort', () => {
      clearInterval(intervalId)
    })
  }

  // ============================================
  // 事件处理器
  // ============================================

  private handleClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement
    if (!this.shouldTrack(target)) return

    // 检查是否为可点击元素
    const clickable = this.findClickableElement(target)
    if (!clickable) return

    this.recordAction('click', clickable)
  }

  private handleInput = (e: Event): void => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement
    if (!this.shouldTrack(target)) return

    // 对于密码输入，不记录值
    const isPassword = target.type === 'password'

    this.recordAction('input', target, {
      value: isPassword ? '***' : target.value,
    })
  }

  private handleSubmit = (e: SubmitEvent): void => {
    const form = e.target as HTMLFormElement
    if (!this.shouldTrack(form)) return

    this.recordAction('submit', form)
  }

  private handleChange = (e: Event): void => {
    const target = e.target as HTMLElement
    if (!this.shouldTrack(target)) return

    // 处理 select 元素
    if (target.tagName === 'SELECT') {
      const select = target as HTMLSelectElement
      this.recordAction('select', select, {
        value: select.value,
        metadata: {
          selectedText: select.options[select.selectedIndex]?.text,
        },
      })
      return
    }

    // 处理 checkbox 和 radio
    if (target.tagName === 'INPUT') {
      const input = target as HTMLInputElement
      if (input.type === 'checkbox' || input.type === 'radio') {
        this.recordAction('toggle', input, {
          value: input.checked,
        })
      }
    }
  }

  private handleNavigation = (): void => {
    this.recordNavigation()
  }

  // ============================================
  // 操作记录
  // ============================================

  /**
   * 记录操作
   */
  private recordAction(
    type: TrackableAction,
    element: HTMLElement,
    data?: Record<string, unknown>
  ): void {
    const action: TrackedAction = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date(),
      target: this.identifyTarget(element),
      data,
      context: {
        url: window.location.href,
        pageTitle: document.title,
        sessionId: this.sessionId,
      },
    }

    this.actions.push(action)
    this.emit('action', action)
  }

  /**
   * 记录导航操作
   */
  private recordNavigation(previousUrl?: string): void {
    const action: TrackedAction = {
      id: crypto.randomUUID(),
      type: 'navigate',
      timestamp: new Date(),
      target: {
        element: 'window',
        label: document.title,
      },
      data: {
        previousValue: previousUrl,
        value: window.location.href,
      },
      context: {
        url: window.location.href,
        pageTitle: document.title,
        sessionId: this.sessionId,
      },
    }

    this.actions.push(action)
    this.emit('action', action)
  }

  // ============================================
  // 目标识别
  // ============================================

  /**
   * 识别操作目标
   */
  private identifyTarget(element: HTMLElement): ActionTarget {
    return {
      element: this.getSelector(element),
      resourceType: this.detectResourceType(element),
      resourceId: this.detectResourceId(element),
      label: this.getLabel(element),
    }
  }

  /**
   * 获取元素选择器
   */
  private getSelector(element: HTMLElement): string {
    // 优先使用 data-testid
    if (element.dataset.testid) {
      return `[data-testid="${element.dataset.testid}"]`
    }

    // 使用 id
    if (element.id) {
      return `#${element.id}`
    }

    // 使用 data-resource-type + data-resource-id
    if (element.dataset.resourceType && element.dataset.resourceId) {
      return `[data-resource-type="${element.dataset.resourceType}"][data-resource-id="${element.dataset.resourceId}"]`
    }

    // 使用 name 属性
    if ((element as HTMLInputElement).name) {
      const name = (element as HTMLInputElement).name
      return `[name="${name}"]`
    }

    // 生成路径选择器
    return this.generatePathSelector(element)
  }

  /**
   * 生成路径选择器
   */
  private generatePathSelector(element: HTMLElement): string {
    const path: string[] = []
    let current: HTMLElement | null = element

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase()

      if (current.id) {
        selector = `#${current.id}`
        path.unshift(selector)
        break
      }

      if (current.className && typeof current.className === 'string') {
        const classes = current.className
          .split(' ')
          .filter(c => c && !c.startsWith('ant-') && !c.includes('__'))
          .slice(0, 2)
        if (classes.length > 0) {
          selector += `.${classes.join('.')}`
        }
      }

      path.unshift(selector)
      current = current.parentElement

      // 限制路径长度
      if (path.length >= 4) break
    }

    return path.join(' > ')
  }

  /**
   * 获取元素标签
   */
  private getLabel(element: HTMLElement): string {
    // 优先使用 aria-label
    const ariaLabel = element.getAttribute('aria-label')
    if (ariaLabel) return ariaLabel

    // 使用 title 属性
    const title = element.getAttribute('title')
    if (title) return title

    // 使用内部文本（限制长度）
    const text = element.innerText?.trim()
    if (text) return text.slice(0, 50)

    // 使用 placeholder
    const placeholder = (element as HTMLInputElement).placeholder
    if (placeholder) return placeholder

    return ''
  }

  /**
   * 检测资源类型
   */
  private detectResourceType(element: HTMLElement): ResourceType | undefined {
    // 从元素直接属性获取
    const directType = element.dataset.resourceType
    if (directType) return directType as ResourceType

    // 从父元素获取
    const parent = element.closest('[data-resource-type]') as HTMLElement
    if (parent) {
      return parent.dataset.resourceType as ResourceType
    }

    // 从 URL 推断
    return this.inferResourceTypeFromUrl(window.location.pathname)
  }

  /**
   * 检测资源 ID
   */
  private detectResourceId(element: HTMLElement): string | undefined {
    // 从元素直接属性获取
    const directId = element.dataset.resourceId
    if (directId) return directId

    // 从父元素获取
    const parent = element.closest('[data-resource-id]') as HTMLElement
    if (parent) {
      return parent.dataset.resourceId
    }

    // 从 URL 推断
    return this.inferResourceIdFromUrl(window.location.pathname)
  }

  /**
   * 从 URL 推断资源类型
   */
  private inferResourceTypeFromUrl(url: string): ResourceType | undefined {
    const patterns: Array<{ regex: RegExp; type: ResourceType }> = [
      { regex: /\/prompts\//, type: 'prompt' },
      { regex: /\/datasets\//, type: 'dataset' },
      { regex: /\/tasks\//, type: 'task' },
      { regex: /\/models\//, type: 'model' },
      { regex: /\/evaluators\//, type: 'evaluator' },
      { regex: /\/scheduled\//, type: 'scheduled_task' },
      { regex: /\/monitor\/alerts\//, type: 'alert_rule' },
    ]

    for (const { regex, type } of patterns) {
      if (regex.test(url)) {
        return type
      }
    }

    return undefined
  }

  /**
   * 从 URL 推断资源 ID
   */
  private inferResourceIdFromUrl(url: string): string | undefined {
    // 匹配 UUID 格式的 ID
    const uuidPattern = /\/([a-f0-9-]{36})/
    const match = url.match(uuidPattern)
    return match?.[1]
  }

  // ============================================
  // 辅助方法
  // ============================================

  /**
   * 判断是否应该追踪该元素
   */
  private shouldTrack(element: HTMLElement): boolean {
    // 忽略 GOI 面板内的操作
    if (element.closest('[data-goi-panel]')) return false

    // 忽略 Ant Design 弹出层（除非是重要的 Modal）
    const popover = element.closest('.ant-popover, .ant-dropdown')
    if (popover && !element.closest('.ant-modal')) return false

    return true
  }

  /**
   * 查找可点击元素
   */
  private findClickableElement(element: HTMLElement): HTMLElement | null {
    // 可交互元素列表
    const interactableTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']

    // 如果本身是可交互元素
    if (interactableTags.includes(element.tagName)) {
      return element
    }

    // 检查 role 属性
    if (element.getAttribute('role') === 'button') {
      return element
    }

    // 检查 onclick 属性
    if (element.onclick !== null) {
      return element
    }

    // 向上查找可点击的父元素
    const clickableParent = element.closest(
      'button, a, [role="button"], [data-resource-type]'
    ) as HTMLElement

    return clickableParent
  }

  // ============================================
  // 事件发射
  // ============================================

  /**
   * 注册事件监听器
   */
  on(event: string, callback: ActionTrackerCallback): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback: ActionTrackerCallback): void {
    this.eventListeners.get(event)?.delete(callback)
  }

  /**
   * 发射事件
   */
  private emit(event: string, data: TrackedAction): void {
    this.eventListeners.get(event)?.forEach(cb => {
      try {
        cb(data)
      } catch (error) {
        console.error('ActionTracker event callback error:', error)
      }
    })
  }

  /**
   * 重置追踪器
   */
  reset(): void {
    this.stopTracking()
    this.actions = []
    this.sessionId = ''
    this.eventListeners.clear()
  }
}

// ============================================
// 单例导出
// ============================================

let actionTrackerInstance: ActionTracker | null = null

export function getActionTracker(): ActionTracker {
  if (!actionTrackerInstance) {
    actionTrackerInstance = new ActionTracker()
  }
  return actionTrackerInstance
}

export function resetActionTracker(): void {
  if (actionTrackerInstance) {
    actionTrackerInstance.reset()
  }
  actionTrackerInstance = null
}
