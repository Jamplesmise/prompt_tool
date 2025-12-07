import { describe, it, expect, beforeEach, vi } from 'vitest'
import { eventBus } from '../eventBus'

describe('eventBus', () => {
  beforeEach(() => {
    // 每个测试前清除所有处理器
    eventBus.clear()
  })

  describe('on / emit', () => {
    it('应该正确订阅和触发事件', () => {
      const handler = vi.fn()
      eventBus.on('prompt:saved', handler)

      eventBus.emit('prompt:saved', { promptId: 'p1', promptName: 'Test' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ promptId: 'p1', promptName: 'Test' })
    })

    it('应该支持多个处理器', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      eventBus.on('task:completed', handler1)
      eventBus.on('task:completed', handler2)

      eventBus.emit('task:completed', { taskId: 't1', taskName: 'Task 1', passRate: 80 })

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('不同事件类型应该独立触发', () => {
      const promptHandler = vi.fn()
      const taskHandler = vi.fn()

      eventBus.on('prompt:saved', promptHandler)
      eventBus.on('task:created', taskHandler)

      eventBus.emit('prompt:saved', { promptId: 'p1', promptName: 'Test' })

      expect(promptHandler).toHaveBeenCalledTimes(1)
      expect(taskHandler).not.toHaveBeenCalled()
    })

    it('处理器抛出异常不应影响其他处理器', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error')
      })
      const normalHandler = vi.fn()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      eventBus.on('dataset:uploaded', errorHandler)
      eventBus.on('dataset:uploaded', normalHandler)

      eventBus.emit('dataset:uploaded', { datasetId: 'd1', datasetName: 'Dataset 1', rowCount: 100 })

      expect(errorHandler).toHaveBeenCalledTimes(1)
      expect(normalHandler).toHaveBeenCalledTimes(1)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('unsubscribe', () => {
    it('应该返回取消订阅函数', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('model:configured', handler)

      eventBus.emit('model:configured', { providerId: 'p1', providerName: 'OpenAI' })
      expect(handler).toHaveBeenCalledTimes(1)

      unsubscribe()

      eventBus.emit('model:configured', { providerId: 'p2', providerName: 'Claude' })
      expect(handler).toHaveBeenCalledTimes(1) // 仍然是 1，没有再次调用
    })

    it('取消订阅后不应再接收事件', () => {
      const handler = vi.fn()
      const unsubscribe = eventBus.on('task:failed', handler)

      unsubscribe()

      eventBus.emit('task:failed', { taskId: 't1', taskName: 'Task', error: 'Failed' })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('off', () => {
    it('应该移除特定事件的所有处理器', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      eventBus.on('prompt:published', handler1)
      eventBus.on('prompt:published', handler2)

      eventBus.off('prompt:published')

      eventBus.emit('prompt:published', { promptId: 'p1', version: 1 })

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })

    it('off 不应影响其他事件类型', () => {
      const promptHandler = vi.fn()
      const taskHandler = vi.fn()

      eventBus.on('prompt:saved', promptHandler)
      eventBus.on('task:created', taskHandler)

      eventBus.off('prompt:saved')

      eventBus.emit('task:created', { taskId: 't1', taskName: 'Task' })

      expect(taskHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('clear', () => {
    it('应该清除所有事件处理器', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      eventBus.on('prompt:saved', handler1)
      eventBus.on('task:completed', handler2)

      eventBus.clear()

      eventBus.emit('prompt:saved', { promptId: 'p1', promptName: 'Test' })
      eventBus.emit('task:completed', { taskId: 't1', taskName: 'Task', passRate: 90 })

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
    })
  })

  describe('事件类型', () => {
    it('应该正确处理 prompt:saved 事件', () => {
      const handler = vi.fn()
      eventBus.on('prompt:saved', handler)

      eventBus.emit('prompt:saved', { promptId: 'prompt-1', promptName: '测试提示词' })

      expect(handler).toHaveBeenCalledWith({
        promptId: 'prompt-1',
        promptName: '测试提示词',
      })
    })

    it('应该正确处理 dataset:uploaded 事件', () => {
      const handler = vi.fn()
      eventBus.on('dataset:uploaded', handler)

      eventBus.emit('dataset:uploaded', {
        datasetId: 'ds-1',
        datasetName: '测试数据集',
        rowCount: 50,
      })

      expect(handler).toHaveBeenCalledWith({
        datasetId: 'ds-1',
        datasetName: '测试数据集',
        rowCount: 50,
      })
    })

    it('应该正确处理 task:completed 事件', () => {
      const handler = vi.fn()
      eventBus.on('task:completed', handler)

      eventBus.emit('task:completed', {
        taskId: 'task-1',
        taskName: '测试任务',
        passRate: 85.5,
      })

      expect(handler).toHaveBeenCalledWith({
        taskId: 'task-1',
        taskName: '测试任务',
        passRate: 85.5,
      })
    })

    it('应该正确处理 model:tested 事件', () => {
      const handler = vi.fn()
      eventBus.on('model:tested', handler)

      eventBus.emit('model:tested', { modelId: 'm-1', success: true })

      expect(handler).toHaveBeenCalledWith({ modelId: 'm-1', success: true })
    })
  })
})
