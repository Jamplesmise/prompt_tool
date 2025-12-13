/**
 * 资源检测器
 *
 * 准确识别用户操作涉及的资源类型和 ID：
 * - 从 DOM 元素属性检测
 * - 从 URL 推断
 * - 从页面上下文检测
 *
 * 返回检测结果和置信度
 */

import type { ResourceType } from '@platform/shared'
import type { DetectedResource } from './types'

// ============================================
// 资源检测器类
// ============================================

export class ResourceDetector {
  /**
   * 从元素检测资源
   */
  detectFromElement(element: HTMLElement): DetectedResource | null {
    // 1. 直接从元素属性检测
    if (element.dataset.resourceType && element.dataset.resourceId) {
      return {
        type: element.dataset.resourceType as ResourceType,
        id: element.dataset.resourceId,
        name: element.dataset.resourceName,
        confidence: 1,
      }
    }

    // 2. 从父元素属性检测
    const parent = element.closest(
      '[data-resource-type][data-resource-id]'
    ) as HTMLElement
    if (parent) {
      return {
        type: parent.dataset.resourceType as ResourceType,
        id: parent.dataset.resourceId!,
        name: parent.dataset.resourceName,
        confidence: 0.9,
      }
    }

    // 3. 从 href 属性推断（针对链接）
    if (element.tagName === 'A') {
      const href = (element as HTMLAnchorElement).href
      const result = this.detectFromUrl(href)
      if (result) {
        return {
          ...result,
          confidence: result.confidence * 0.9,
        }
      }
    }

    // 4. 从当前 URL 推断
    return this.detectFromUrl(window.location.pathname)
  }

  /**
   * 从 URL 检测资源
   */
  detectFromUrl(url: string): DetectedResource | null {
    const patterns: Array<{
      regex: RegExp
      type: ResourceType
      idGroup: number
    }> = [
      // /prompts/xxx
      { regex: /\/prompts\/([a-f0-9-]{36})/, type: 'prompt', idGroup: 1 },
      // /prompts/xxx/versions/yyy
      {
        regex: /\/prompts\/[a-f0-9-]{36}\/versions\/([a-f0-9-]{36})/,
        type: 'prompt_version',
        idGroup: 1,
      },
      // /prompts/xxx/branches/yyy
      {
        regex: /\/prompts\/[a-f0-9-]{36}\/branches\/([a-f0-9-]{36})/,
        type: 'prompt_branch',
        idGroup: 1,
      },
      // /datasets/xxx
      { regex: /\/datasets\/([a-f0-9-]{36})/, type: 'dataset', idGroup: 1 },
      // /datasets/xxx/versions/yyy
      {
        regex: /\/datasets\/[a-f0-9-]{36}\/versions\/([a-f0-9-]{36})/,
        type: 'dataset_version',
        idGroup: 1,
      },
      // /tasks/xxx
      { regex: /\/tasks\/([a-f0-9-]{36})/, type: 'task', idGroup: 1 },
      // /models/xxx
      { regex: /\/models\/([a-f0-9-]{36})/, type: 'model', idGroup: 1 },
      // /evaluators/xxx
      {
        regex: /\/evaluators\/([a-f0-9-]{36})/,
        type: 'evaluator',
        idGroup: 1,
      },
      // /scheduled/xxx
      {
        regex: /\/scheduled\/([a-f0-9-]{36})/,
        type: 'scheduled_task',
        idGroup: 1,
      },
      // /monitor/alerts/xxx
      {
        regex: /\/monitor\/alerts\/([a-f0-9-]{36})/,
        type: 'alert_rule',
        idGroup: 1,
      },
      // /schemas/xxx
      {
        regex: /\/schemas\/([a-f0-9-]{36})/,
        type: 'evaluation_schema',
        idGroup: 1,
      },
    ]

    for (const { regex, type, idGroup } of patterns) {
      const match = url.match(regex)
      if (match) {
        return {
          type,
          id: match[idGroup],
          confidence: 0.8,
        }
      }
    }

    // 检测页面类型（没有具体 ID 的情况）
    const pagePatterns: Array<{ regex: RegExp; type: ResourceType }> = [
      { regex: /\/prompts\/?$/, type: 'prompt' },
      { regex: /\/datasets\/?$/, type: 'dataset' },
      { regex: /\/tasks\/?$/, type: 'task' },
      { regex: /\/models\/?$/, type: 'model' },
      { regex: /\/evaluators\/?$/, type: 'evaluator' },
      { regex: /\/scheduled\/?$/, type: 'scheduled_task' },
      { regex: /\/monitor\/alerts\/?$/, type: 'alert_rule' },
      { regex: /\/monitor\/?$/, type: 'monitor' },
      { regex: /\/settings\/?/, type: 'settings' },
      { regex: /^\/?$/, type: 'dashboard' },
    ]

    for (const { regex, type } of pagePatterns) {
      if (regex.test(url)) {
        return {
          type,
          id: '',
          confidence: 0.5,
        }
      }
    }

    return null
  }

  /**
   * 从页面上下文检测资源
   */
  detectFromContext(): DetectedResource[] {
    const resources: DetectedResource[] = []

    // 1. 检查当前选中项
    const selectedItems = document.querySelectorAll(
      '[aria-selected="true"][data-resource-type]'
    )
    selectedItems.forEach(el => {
      const element = el as HTMLElement
      if (element.dataset.resourceType && element.dataset.resourceId) {
        resources.push({
          type: element.dataset.resourceType as ResourceType,
          id: element.dataset.resourceId,
          name: element.dataset.resourceName,
          confidence: 0.95,
        })
      }
    })

    // 2. 检查当前活跃的 Tab
    const activeTab = document.querySelector(
      '.ant-tabs-tab-active[data-resource-type]'
    ) as HTMLElement
    if (activeTab && activeTab.dataset.resourceType) {
      resources.push({
        type: activeTab.dataset.resourceType as ResourceType,
        id: activeTab.dataset.resourceId || '',
        confidence: 0.85,
      })
    }

    // 3. 检查打开的 Modal
    const modal = document.querySelector('.ant-modal:not([style*="display: none"])') as HTMLElement
    if (modal && modal.dataset.resourceType) {
      resources.push({
        type: modal.dataset.resourceType as ResourceType,
        id: modal.dataset.resourceId || '',
        confidence: 0.9,
      })
    }

    // 4. 检查面包屑
    const breadcrumbItems = document.querySelectorAll(
      '[data-breadcrumb] [data-resource-type]'
    )
    breadcrumbItems.forEach(el => {
      const element = el as HTMLElement
      if (element.dataset.resourceType && element.dataset.resourceId) {
        resources.push({
          type: element.dataset.resourceType as ResourceType,
          id: element.dataset.resourceId,
          name: element.innerText,
          confidence: 0.75,
        })
      }
    })

    // 5. 从 URL 推断并添加
    const urlResource = this.detectFromUrl(window.location.pathname)
    if (urlResource && urlResource.id) {
      // 检查是否已存在
      const exists = resources.some(
        r => r.type === urlResource.type && r.id === urlResource.id
      )
      if (!exists) {
        resources.push(urlResource)
      }
    }

    // 按置信度排序
    return resources.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * 检测表单中引用的资源
   */
  detectFromForm(form: HTMLFormElement): DetectedResource[] {
    const resources: DetectedResource[] = []

    // 检查隐藏的资源 ID 字段
    const hiddenInputs = form.querySelectorAll(
      'input[type="hidden"][name*="Id"], input[type="hidden"][name*="_id"]'
    )
    hiddenInputs.forEach(input => {
      const el = input as HTMLInputElement
      const name = el.name.toLowerCase()
      let type: ResourceType | undefined

      if (name.includes('prompt')) type = 'prompt'
      else if (name.includes('dataset')) type = 'dataset'
      else if (name.includes('model')) type = 'model'
      else if (name.includes('evaluator')) type = 'evaluator'
      else if (name.includes('task')) type = 'task'

      if (type && el.value) {
        resources.push({
          type,
          id: el.value,
          confidence: 0.85,
        })
      }
    })

    // 检查 Select 组件选中的资源
    const selects = form.querySelectorAll('[data-resource-type]')
    selects.forEach(el => {
      const element = el as HTMLElement
      if (element.dataset.resourceType && element.dataset.resourceId) {
        resources.push({
          type: element.dataset.resourceType as ResourceType,
          id: element.dataset.resourceId,
          confidence: 0.9,
        })
      }
    })

    return resources
  }

  /**
   * 获取页面上所有可见的资源引用
   */
  getAllVisibleResources(): DetectedResource[] {
    const resources: DetectedResource[] = []
    const seen = new Set<string>()

    // 查找所有带有资源标记的元素
    const elements = document.querySelectorAll(
      '[data-resource-type][data-resource-id]'
    )

    elements.forEach(el => {
      const element = el as HTMLElement
      const type = element.dataset.resourceType as ResourceType
      const id = element.dataset.resourceId!
      const key = `${type}:${id}`

      // 跳过重复的
      if (seen.has(key)) return
      seen.add(key)

      // 检查元素是否可见
      const rect = element.getBoundingClientRect()
      const isVisible =
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth

      resources.push({
        type,
        id,
        name: element.dataset.resourceName,
        confidence: isVisible ? 0.9 : 0.6,
      })
    })

    return resources.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * 匹配资源
   */
  matchResource(
    query: { type?: ResourceType; name?: string; id?: string },
    resources: DetectedResource[]
  ): DetectedResource | null {
    // 精确 ID 匹配
    if (query.id) {
      const exact = resources.find(r => r.id === query.id)
      if (exact) return exact
    }

    // 类型 + 名称匹配
    if (query.type && query.name) {
      const matches = resources.filter(r => {
        if (r.type !== query.type) return false
        if (!r.name) return false
        return r.name.toLowerCase().includes(query.name!.toLowerCase())
      })

      if (matches.length === 1) return matches[0]
      if (matches.length > 1) {
        // 返回置信度最高的
        return matches.sort((a, b) => b.confidence - a.confidence)[0]
      }
    }

    // 仅类型匹配
    if (query.type) {
      const typeMatches = resources.filter(r => r.type === query.type)
      if (typeMatches.length === 1) return typeMatches[0]
      if (typeMatches.length > 1) {
        return typeMatches.sort((a, b) => b.confidence - a.confidence)[0]
      }
    }

    return null
  }
}

// ============================================
// 单例导出
// ============================================

let resourceDetectorInstance: ResourceDetector | null = null

export function getResourceDetector(): ResourceDetector {
  if (!resourceDetectorInstance) {
    resourceDetectorInstance = new ResourceDetector()
  }
  return resourceDetectorInstance
}

export function resetResourceDetector(): void {
  resourceDetectorInstance = null
}
