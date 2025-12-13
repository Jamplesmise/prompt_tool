/**
 * ActionTracker 单元测试
 *
 * 测试操作追踪器的核心功能：
 * - 追踪开始/停止
 * - 点击事件记录
 * - 输入事件记录
 * - 导航事件记录
 * - GOI 面板过滤
 * - 资源类型识别
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ActionTracker } from '../collaboration/actionTracker'

describe('ActionTracker', () => {
  let tracker: ActionTracker

  beforeEach(() => {
    tracker = new ActionTracker()
    // 清理 DOM
    document.body.innerHTML = ''
  })

  afterEach(() => {
    tracker.stopTracking()
  })

  describe('基本功能', () => {
    it('should start and stop tracking', () => {
      tracker.startTracking('test-session')
      expect(tracker.isActive()).toBe(true)

      const actions = tracker.stopTracking()
      expect(tracker.isActive()).toBe(false)
      expect(actions).toEqual([])
    })

    it('should not start tracking twice', () => {
      tracker.startTracking('test-session-1')
      tracker.startTracking('test-session-2')
      expect(tracker.isActive()).toBe(true)
    })

    it('should return empty array when stopping without starting', () => {
      const actions = tracker.stopTracking()
      expect(actions).toEqual([])
    })

    it('should clear actions', () => {
      tracker.startTracking('test-session')

      // 模拟添加一个操作
      const button = document.createElement('button')
      button.innerText = 'Test Button'
      document.body.appendChild(button)
      button.click()

      expect(tracker.getActions().length).toBeGreaterThan(0)

      tracker.clearActions()
      expect(tracker.getActions()).toEqual([])
    })

    it('should reset tracker completely', () => {
      tracker.startTracking('test-session')
      tracker.reset()

      expect(tracker.isActive()).toBe(false)
      expect(tracker.getActions()).toEqual([])
    })
  })

  describe('点击事件追踪', () => {
    it('should record button click events', () => {
      tracker.startTracking('test-session')

      const button = document.createElement('button')
      button.innerText = 'Test Button'
      document.body.appendChild(button)

      button.click()

      const actions = tracker.getActions()
      expect(actions.length).toBe(1)
      expect(actions[0].type).toBe('click')
      expect(actions[0].target.label).toBe('Test Button')
    })

    it('should record link click events', () => {
      tracker.startTracking('test-session')

      const link = document.createElement('a')
      link.href = '#'
      link.innerText = 'Test Link'
      document.body.appendChild(link)

      link.click()

      const actions = tracker.getActions()
      expect(actions.length).toBe(1)
      expect(actions[0].type).toBe('click')
    })

    it('should find clickable parent element', () => {
      tracker.startTracking('test-session')

      const button = document.createElement('button')
      const span = document.createElement('span')
      span.innerText = 'Inner Text'
      button.appendChild(span)
      document.body.appendChild(button)

      span.click()

      const actions = tracker.getActions()
      expect(actions.length).toBe(1)
      expect(actions[0].type).toBe('click')
    })

    it('should record aria-label as label', () => {
      tracker.startTracking('test-session')

      const button = document.createElement('button')
      button.setAttribute('aria-label', 'Accessible Button')
      document.body.appendChild(button)

      button.click()

      const actions = tracker.getActions()
      expect(actions[0].target.label).toBe('Accessible Button')
    })
  })

  describe('GOI 面板过滤', () => {
    it('should not track GOI panel clicks', () => {
      tracker.startTracking('test-session')

      const panel = document.createElement('div')
      panel.dataset.goiPanel = 'true'
      const button = document.createElement('button')
      button.innerText = 'GOI Button'
      panel.appendChild(button)
      document.body.appendChild(panel)

      button.click()

      const actions = tracker.getActions()
      expect(actions.length).toBe(0)
    })

    it('should track clicks outside GOI panel', () => {
      tracker.startTracking('test-session')

      // GOI 面板内的按钮
      const panel = document.createElement('div')
      panel.dataset.goiPanel = 'true'
      const goiButton = document.createElement('button')
      panel.appendChild(goiButton)
      document.body.appendChild(panel)

      // 面板外的按钮
      const normalButton = document.createElement('button')
      normalButton.innerText = 'Normal Button'
      document.body.appendChild(normalButton)

      goiButton.click()
      normalButton.click()

      const actions = tracker.getActions()
      expect(actions.length).toBe(1)
      expect(actions[0].target.label).toBe('Normal Button')
    })
  })

  describe('资源类型识别', () => {
    it('should detect resource type from data attribute', () => {
      tracker.startTracking('test-session')

      const div = document.createElement('div')
      div.dataset.resourceType = 'prompt'
      div.dataset.resourceId = 'prompt-123'
      div.setAttribute('role', 'button')
      div.innerText = 'Prompt Item'
      document.body.appendChild(div)

      div.click()

      const actions = tracker.getActions()
      expect(actions[0].target.resourceType).toBe('prompt')
      expect(actions[0].target.resourceId).toBe('prompt-123')
    })

    it('should detect resource type from parent element', () => {
      tracker.startTracking('test-session')

      const container = document.createElement('div')
      container.dataset.resourceType = 'dataset'
      container.dataset.resourceId = 'dataset-456'

      const button = document.createElement('button')
      button.innerText = 'Select'
      container.appendChild(button)
      document.body.appendChild(container)

      button.click()

      const actions = tracker.getActions()
      expect(actions[0].target.resourceType).toBe('dataset')
      expect(actions[0].target.resourceId).toBe('dataset-456')
    })

    it('should use testid as selector when available', () => {
      tracker.startTracking('test-session')

      const button = document.createElement('button')
      button.dataset.testid = 'submit-button'
      button.innerText = 'Submit'
      document.body.appendChild(button)

      button.click()

      const actions = tracker.getActions()
      expect(actions[0].target.element).toBe('[data-testid="submit-button"]')
    })

    it('should use id as selector', () => {
      tracker.startTracking('test-session')

      const button = document.createElement('button')
      button.id = 'my-button'
      button.innerText = 'My Button'
      document.body.appendChild(button)

      button.click()

      const actions = tracker.getActions()
      expect(actions[0].target.element).toBe('#my-button')
    })
  })

  describe('输入事件追踪', () => {
    it('should record input events', () => {
      tracker.startTracking('test-session')

      const input = document.createElement('input')
      input.type = 'text'
      input.name = 'username'
      document.body.appendChild(input)

      input.value = 'test-user'
      input.dispatchEvent(new Event('input', { bubbles: true }))

      const actions = tracker.getActions()
      expect(actions.length).toBe(1)
      expect(actions[0].type).toBe('input')
      expect(actions[0].data?.value).toBe('test-user')
    })

    it('should mask password input values', () => {
      tracker.startTracking('test-session')

      const input = document.createElement('input')
      input.type = 'password'
      input.name = 'password'
      document.body.appendChild(input)

      input.value = 'secret123'
      input.dispatchEvent(new Event('input', { bubbles: true }))

      const actions = tracker.getActions()
      expect(actions[0].data?.value).toBe('***')
    })

    it('should record textarea input', () => {
      tracker.startTracking('test-session')

      const textarea = document.createElement('textarea')
      textarea.name = 'description'
      document.body.appendChild(textarea)

      textarea.value = 'Test description'
      textarea.dispatchEvent(new Event('input', { bubbles: true }))

      const actions = tracker.getActions()
      expect(actions[0].type).toBe('input')
      expect(actions[0].data?.value).toBe('Test description')
    })
  })

  describe('选择事件追踪', () => {
    it('should record select change events', () => {
      tracker.startTracking('test-session')

      const select = document.createElement('select')
      const option1 = document.createElement('option')
      option1.value = 'opt1'
      option1.text = 'Option 1'
      const option2 = document.createElement('option')
      option2.value = 'opt2'
      option2.text = 'Option 2'
      select.appendChild(option1)
      select.appendChild(option2)
      document.body.appendChild(select)

      select.value = 'opt2'
      select.dispatchEvent(new Event('change', { bubbles: true }))

      const actions = tracker.getActions()
      expect(actions[0].type).toBe('select')
      expect(actions[0].data?.value).toBe('opt2')
      expect(actions[0].data?.metadata?.selectedText).toBe('Option 2')
    })

    it('should record checkbox toggle', () => {
      tracker.startTracking('test-session')

      const checkbox = document.createElement('input')
      checkbox.type = 'checkbox'
      checkbox.name = 'agree'
      document.body.appendChild(checkbox)

      checkbox.checked = true
      checkbox.dispatchEvent(new Event('change', { bubbles: true }))

      const actions = tracker.getActions()
      expect(actions[0].type).toBe('toggle')
      expect(actions[0].data?.value).toBe(true)
    })
  })

  describe('表单提交追踪', () => {
    it('should record form submit events', () => {
      tracker.startTracking('test-session')

      const form = document.createElement('form')
      form.addEventListener('submit', (e) => e.preventDefault())
      document.body.appendChild(form)

      form.dispatchEvent(new Event('submit', { bubbles: true }))

      const actions = tracker.getActions()
      expect(actions[0].type).toBe('submit')
    })
  })

  describe('事件监听', () => {
    it('should emit action events', () => {
      const callback = vi.fn()
      tracker.on('action', callback)
      tracker.startTracking('test-session')

      const button = document.createElement('button')
      button.innerText = 'Test'
      document.body.appendChild(button)

      button.click()

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'click',
      }))
    })

    it('should emit start and stop events', () => {
      const startCallback = vi.fn()
      const stopCallback = vi.fn()

      tracker.on('start', startCallback)
      tracker.on('stop', stopCallback)

      tracker.startTracking('test-session')
      expect(startCallback).toHaveBeenCalledTimes(1)

      tracker.stopTracking()
      expect(stopCallback).toHaveBeenCalledTimes(1)
    })

    it('should remove event listeners', () => {
      const callback = vi.fn()
      tracker.on('action', callback)
      tracker.off('action', callback)
      tracker.startTracking('test-session')

      const button = document.createElement('button')
      button.innerText = 'Test'
      document.body.appendChild(button)

      button.click()

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('上下文信息', () => {
    it('should include context with each action', () => {
      tracker.startTracking('test-session-123')

      const button = document.createElement('button')
      button.innerText = 'Test'
      document.body.appendChild(button)

      button.click()

      const actions = tracker.getActions()
      expect(actions[0].context.sessionId).toBe('test-session-123')
      expect(actions[0].context.url).toBeDefined()
    })

    it('should generate unique action IDs', () => {
      tracker.startTracking('test-session')

      const button = document.createElement('button')
      button.innerText = 'Test'
      document.body.appendChild(button)

      button.click()
      button.click()

      const actions = tracker.getActions()
      expect(actions[0].id).not.toBe(actions[1].id)
    })
  })
})
