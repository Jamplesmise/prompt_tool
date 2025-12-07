import { describe, it, expect, beforeEach } from 'vitest'
import { useGuidanceStore, TIP_IDS } from '../guidanceStore'

describe('guidanceStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useGuidanceStore.setState({
      dismissedTips: [],
      permanentlyDismissedTips: [],
      activeTips: [],
    })
  })

  describe('TIP_IDS', () => {
    it('应该包含提示词相关的提示 ID', () => {
      expect(TIP_IDS.PROMPT_SAVED).toBe('prompt-saved-test-suggestion')
      expect(TIP_IDS.PROMPT_VERSION_PUBLISHED).toBe('prompt-version-published')
    })

    it('应该包含数据集相关的提示 ID', () => {
      expect(TIP_IDS.DATASET_UPLOADED).toBe('dataset-uploaded-task-suggestion')
      expect(TIP_IDS.DATASET_EMPTY).toBe('dataset-empty-warning')
    })

    it('应该包含模型相关的提示 ID', () => {
      expect(TIP_IDS.MODEL_CONFIGURED).toBe('model-configured-usage-suggestion')
      expect(TIP_IDS.MODEL_TEST_FAILED).toBe('model-test-failed')
    })

    it('应该包含任务相关的提示 ID', () => {
      expect(TIP_IDS.TASK_COMPLETED).toBe('task-completed-analysis')
      expect(TIP_IDS.TASK_FAILED).toBe('task-failed-suggestion')
    })
  })

  describe('初始状态', () => {
    it('应该默认 dismissedTips 为空数组', () => {
      const { dismissedTips } = useGuidanceStore.getState()
      expect(dismissedTips).toEqual([])
    })

    it('应该默认 permanentlyDismissedTips 为空数组', () => {
      const { permanentlyDismissedTips } = useGuidanceStore.getState()
      expect(permanentlyDismissedTips).toEqual([])
    })

    it('应该默认 activeTips 为空数组', () => {
      const { activeTips } = useGuidanceStore.getState()
      expect(activeTips).toEqual([])
    })
  })

  describe('showTip', () => {
    it('应该将提示添加到 activeTips', () => {
      const { showTip } = useGuidanceStore.getState()
      showTip(TIP_IDS.PROMPT_SAVED)

      const { activeTips } = useGuidanceStore.getState()
      expect(activeTips).toContain(TIP_IDS.PROMPT_SAVED)
    })

    it('不应该重复添加同一个提示', () => {
      const { showTip } = useGuidanceStore.getState()
      showTip(TIP_IDS.PROMPT_SAVED)
      showTip(TIP_IDS.PROMPT_SAVED)

      const { activeTips } = useGuidanceStore.getState()
      expect(activeTips.filter((t) => t === TIP_IDS.PROMPT_SAVED)).toHaveLength(1)
    })

    it('应该能添加多个不同的提示', () => {
      const { showTip } = useGuidanceStore.getState()
      showTip(TIP_IDS.PROMPT_SAVED)
      showTip(TIP_IDS.DATASET_UPLOADED)

      const { activeTips } = useGuidanceStore.getState()
      expect(activeTips).toContain(TIP_IDS.PROMPT_SAVED)
      expect(activeTips).toContain(TIP_IDS.DATASET_UPLOADED)
    })
  })

  describe('dismissTip', () => {
    it('应该将提示添加到 dismissedTips', () => {
      useGuidanceStore.setState({ activeTips: [TIP_IDS.PROMPT_SAVED] })

      const { dismissTip } = useGuidanceStore.getState()
      dismissTip(TIP_IDS.PROMPT_SAVED)

      const { dismissedTips } = useGuidanceStore.getState()
      expect(dismissedTips).toContain(TIP_IDS.PROMPT_SAVED)
    })

    it('应该从 activeTips 中移除提示', () => {
      useGuidanceStore.setState({ activeTips: [TIP_IDS.PROMPT_SAVED, TIP_IDS.DATASET_UPLOADED] })

      const { dismissTip } = useGuidanceStore.getState()
      dismissTip(TIP_IDS.PROMPT_SAVED)

      const { activeTips } = useGuidanceStore.getState()
      expect(activeTips).not.toContain(TIP_IDS.PROMPT_SAVED)
      expect(activeTips).toContain(TIP_IDS.DATASET_UPLOADED)
    })

    it('不应该重复添加到 dismissedTips', () => {
      const { dismissTip } = useGuidanceStore.getState()
      dismissTip(TIP_IDS.PROMPT_SAVED)
      dismissTip(TIP_IDS.PROMPT_SAVED)

      const { dismissedTips } = useGuidanceStore.getState()
      expect(dismissedTips.filter((t) => t === TIP_IDS.PROMPT_SAVED)).toHaveLength(1)
    })
  })

  describe('dismissTipPermanently', () => {
    it('应该将提示添加到 permanentlyDismissedTips', () => {
      useGuidanceStore.setState({ activeTips: [TIP_IDS.PROMPT_SAVED] })

      const { dismissTipPermanently } = useGuidanceStore.getState()
      dismissTipPermanently(TIP_IDS.PROMPT_SAVED)

      const { permanentlyDismissedTips } = useGuidanceStore.getState()
      expect(permanentlyDismissedTips).toContain(TIP_IDS.PROMPT_SAVED)
    })

    it('应该从 activeTips 中移除提示', () => {
      useGuidanceStore.setState({ activeTips: [TIP_IDS.PROMPT_SAVED] })

      const { dismissTipPermanently } = useGuidanceStore.getState()
      dismissTipPermanently(TIP_IDS.PROMPT_SAVED)

      const { activeTips } = useGuidanceStore.getState()
      expect(activeTips).not.toContain(TIP_IDS.PROMPT_SAVED)
    })

    it('应该从 dismissedTips 中移除（如果存在）', () => {
      useGuidanceStore.setState({
        dismissedTips: [TIP_IDS.PROMPT_SAVED],
        activeTips: [],
      })

      const { dismissTipPermanently } = useGuidanceStore.getState()
      dismissTipPermanently(TIP_IDS.PROMPT_SAVED)

      const { dismissedTips } = useGuidanceStore.getState()
      expect(dismissedTips).not.toContain(TIP_IDS.PROMPT_SAVED)
    })
  })

  describe('shouldShowTip', () => {
    it('应该返回 true 如果提示未被关闭', () => {
      const { shouldShowTip } = useGuidanceStore.getState()
      expect(shouldShowTip(TIP_IDS.PROMPT_SAVED)).toBe(true)
    })

    it('应该返回 false 如果提示已被临时关闭', () => {
      useGuidanceStore.setState({ dismissedTips: [TIP_IDS.PROMPT_SAVED] })

      const { shouldShowTip } = useGuidanceStore.getState()
      expect(shouldShowTip(TIP_IDS.PROMPT_SAVED)).toBe(false)
    })

    it('应该返回 false 如果提示已被永久关闭', () => {
      useGuidanceStore.setState({ permanentlyDismissedTips: [TIP_IDS.PROMPT_SAVED] })

      const { shouldShowTip } = useGuidanceStore.getState()
      expect(shouldShowTip(TIP_IDS.PROMPT_SAVED)).toBe(false)
    })
  })

  describe('clearSessionDismissed', () => {
    it('应该清空 dismissedTips', () => {
      useGuidanceStore.setState({
        dismissedTips: [TIP_IDS.PROMPT_SAVED, TIP_IDS.DATASET_UPLOADED],
      })

      const { clearSessionDismissed } = useGuidanceStore.getState()
      clearSessionDismissed()

      const { dismissedTips } = useGuidanceStore.getState()
      expect(dismissedTips).toEqual([])
    })

    it('应该清空 activeTips', () => {
      useGuidanceStore.setState({
        activeTips: [TIP_IDS.PROMPT_SAVED],
      })

      const { clearSessionDismissed } = useGuidanceStore.getState()
      clearSessionDismissed()

      const { activeTips } = useGuidanceStore.getState()
      expect(activeTips).toEqual([])
    })

    it('不应该清空 permanentlyDismissedTips', () => {
      useGuidanceStore.setState({
        dismissedTips: [TIP_IDS.PROMPT_SAVED],
        permanentlyDismissedTips: [TIP_IDS.MODEL_CONFIGURED],
      })

      const { clearSessionDismissed } = useGuidanceStore.getState()
      clearSessionDismissed()

      const { permanentlyDismissedTips } = useGuidanceStore.getState()
      expect(permanentlyDismissedTips).toContain(TIP_IDS.MODEL_CONFIGURED)
    })
  })

  describe('resetTips', () => {
    it('应该清空所有关闭记录', () => {
      useGuidanceStore.setState({
        dismissedTips: [TIP_IDS.PROMPT_SAVED],
        permanentlyDismissedTips: [TIP_IDS.MODEL_CONFIGURED],
        activeTips: [TIP_IDS.DATASET_UPLOADED],
      })

      const { resetTips } = useGuidanceStore.getState()
      resetTips()

      const state = useGuidanceStore.getState()
      expect(state.dismissedTips).toEqual([])
      expect(state.permanentlyDismissedTips).toEqual([])
      expect(state.activeTips).toEqual([])
    })
  })
})
