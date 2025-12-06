import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatus } from '../model/ConnectionStatus'

describe('ConnectionStatus', () => {
  describe('状态渲染', () => {
    it('应正确渲染 connected 状态', () => {
      render(<ConnectionStatus status="connected" />)
      expect(screen.getByText('已连接')).toBeInTheDocument()
    })

    it('应正确渲染 slow 状态', () => {
      render(<ConnectionStatus status="slow" />)
      expect(screen.getByText('连接慢')).toBeInTheDocument()
    })

    it('应正确渲染 failed 状态', () => {
      render(<ConnectionStatus status="failed" />)
      expect(screen.getByText('连接失败')).toBeInTheDocument()
    })

    it('应正确渲染 unknown 状态', () => {
      render(<ConnectionStatus status="unknown" />)
      expect(screen.getByText('未测试')).toBeInTheDocument()
    })

    it('应正确渲染 testing 状态', () => {
      render(<ConnectionStatus status="testing" />)
      expect(screen.getByText('测试中')).toBeInTheDocument()
    })
  })

  describe('延迟显示', () => {
    it('connected 状态应显示毫秒延迟', () => {
      render(<ConnectionStatus status="connected" latency={150} />)
      expect(screen.getByText('已连接')).toBeInTheDocument()
      expect(screen.getByText('150ms')).toBeInTheDocument()
    })

    it('应将大于1000ms的延迟转换为秒', () => {
      render(<ConnectionStatus status="slow" latency={2500} />)
      expect(screen.getByText('连接慢')).toBeInTheDocument()
      expect(screen.getByText('2.5s')).toBeInTheDocument()
    })

    it('testing 状态不应显示延迟', () => {
      render(<ConnectionStatus status="testing" latency={100} />)
      expect(screen.queryByText('100ms')).toBeNull()
    })

    it('unknown 状态不应显示延迟', () => {
      render(<ConnectionStatus status="unknown" latency={100} />)
      expect(screen.queryByText('100ms')).toBeNull()
    })
  })

  describe('size 属性', () => {
    it('size=small 应渲染小号标签', () => {
      const { container } = render(<ConnectionStatus status="connected" size="small" />)
      expect(container.querySelector('.ant-tag')).toBeInTheDocument()
    })

    it('size=default 应渲染默认大小标签', () => {
      const { container } = render(<ConnectionStatus status="connected" size="default" />)
      expect(container.querySelector('.ant-tag')).toBeInTheDocument()
    })
  })

  describe('图标渲染', () => {
    it('connected 应有 CheckCircle 图标', () => {
      const { container } = render(<ConnectionStatus status="connected" />)
      expect(container.querySelector('.anticon-check-circle')).toBeInTheDocument()
    })

    it('slow 应有 Warning 图标', () => {
      const { container } = render(<ConnectionStatus status="slow" />)
      expect(container.querySelector('.anticon-warning')).toBeInTheDocument()
    })

    it('failed 应有 CloseCircle 图标', () => {
      const { container } = render(<ConnectionStatus status="failed" />)
      expect(container.querySelector('.anticon-close-circle')).toBeInTheDocument()
    })

    it('unknown 应有 QuestionCircle 图标', () => {
      const { container } = render(<ConnectionStatus status="unknown" />)
      expect(container.querySelector('.anticon-question-circle')).toBeInTheDocument()
    })

    it('testing 应有 Spin 加载指示器', () => {
      const { container } = render(<ConnectionStatus status="testing" />)
      expect(container.querySelector('.ant-spin')).toBeInTheDocument()
    })
  })

  describe('Tooltip 内容', () => {
    it('有错误信息时应能渲染', () => {
      render(<ConnectionStatus status="failed" error="Connection timeout" />)
      expect(screen.getByText('连接失败')).toBeInTheDocument()
    })

    it('有最后测试时间时应能渲染', () => {
      render(<ConnectionStatus status="connected" lastTestTime="2024-01-01 10:00" />)
      expect(screen.getByText('已连接')).toBeInTheDocument()
    })

    it('所有信息都有时应能渲染', () => {
      render(
        <ConnectionStatus
          status="slow"
          latency={800}
          error="High latency"
          lastTestTime="2024-01-01 10:00"
        />
      )
      expect(screen.getByText('连接慢')).toBeInTheDocument()
      expect(screen.getByText('800ms')).toBeInTheDocument()
    })
  })
})
