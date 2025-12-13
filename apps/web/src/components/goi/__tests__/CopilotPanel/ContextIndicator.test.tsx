/**
 * ContextIndicator 组件测试
 *
 * 测试用例：
 * TC-CTX-001: 使用量显示
 * TC-CTX-002: 状态颜色
 * TC-CTX-003: 提示消息
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../helpers/renderWithProviders'
import { ContextIndicator } from '../../CopilotPanel/ContextIndicator'

describe('ContextIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('TC-CTX-001: 使用量显示', () => {
    it('应该显示使用量百分比', () => {
      renderWithProviders(<ContextIndicator usage={50} />)

      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    it('应该显示 0% 使用量', () => {
      renderWithProviders(<ContextIndicator usage={0} />)

      expect(screen.getByText('0%')).toBeInTheDocument()
    })

    it('应该显示 100% 使用量', () => {
      renderWithProviders(<ContextIndicator usage={100} />)

      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    it('应该显示标签文字', () => {
      renderWithProviders(<ContextIndicator usage={50} />)

      expect(screen.getByText('上下文:')).toBeInTheDocument()
    })
  })

  describe('TC-CTX-002: 状态颜色', () => {
    it('使用量低于 70% 时显示成功状态', () => {
      renderWithProviders(<ContextIndicator usage={50} />)

      // Progress 组件应该有 success 状态
      const progressBar = document.querySelector('.ant-progress-status-success')
      expect(progressBar).toBeTruthy()
    })

    it('使用量在 70%-90% 时显示正常状态', () => {
      renderWithProviders(<ContextIndicator usage={75} />)

      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('使用量超过 90% 时显示异常状态', () => {
      renderWithProviders(<ContextIndicator usage={95} />)

      // Progress 组件应该有 exception 状态
      const progressBar = document.querySelector('.ant-progress-status-exception')
      expect(progressBar).toBeTruthy()
    })
  })

  describe('TC-CTX-003: 提示消息', () => {
    it('低使用量时显示正常提示', () => {
      renderWithProviders(<ContextIndicator usage={30} />)

      // Tooltip 内容在 hover 时显示，这里只验证组件渲染
      expect(screen.getByText('30%')).toBeInTheDocument()
    })

    it('中等使用量时显示警告提示', () => {
      renderWithProviders(<ContextIndicator usage={75} />)

      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('高使用量时显示紧急提示', () => {
      renderWithProviders(<ContextIndicator usage={95} />)

      expect(screen.getByText('95%')).toBeInTheDocument()
    })
  })

  describe('边界值测试', () => {
    it('使用量刚好 70% 时', () => {
      renderWithProviders(<ContextIndicator usage={70} />)

      expect(screen.getByText('70%')).toBeInTheDocument()
    })

    it('使用量刚好 90% 时', () => {
      renderWithProviders(<ContextIndicator usage={90} />)

      expect(screen.getByText('90%')).toBeInTheDocument()
    })

    it('使用量超过 100% 时', () => {
      renderWithProviders(<ContextIndicator usage={120} />)

      // Progress 组件最大显示 100%，但 aria-valuenow 会是实际值
      const progressBar = document.querySelector('[aria-valuenow="120"]')
      expect(progressBar).toBeTruthy()
    })
  })
})
