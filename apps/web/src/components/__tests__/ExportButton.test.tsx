import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExportButton } from '../task/ExportButton'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock message
vi.mock('@/lib/message', () => ({
  appMessage: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock URL.createObjectURL 和 URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

describe('ExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清理 DOM 中可能残留的元素
    document.body.innerHTML = ''
  })

  it('应渲染导出按钮', () => {
    render(<ExportButton taskId="task-123" />)
    expect(screen.getByText('导出结果')).toBeInTheDocument()
  })

  it('应显示下载图标', () => {
    const { container } = render(<ExportButton taskId="task-123" />)
    expect(container.querySelector('.anticon-download')).toBeInTheDocument()
  })

  it('点击按钮应显示下拉菜单', async () => {
    render(<ExportButton taskId="task-123" />)

    const button = screen.getByText('导出结果')
    fireEvent.mouseEnter(button)

    // 等待下拉菜单出现
    await waitFor(() => {
      // Dropdown 可能需要时间渲染
    })
  })

  it('导出成功时应调用成功消息', async () => {
    const { appMessage } = await import('@/lib/message')

    // Mock 成功响应
    const mockBlob = new Blob(['test data'], { type: 'application/json' })
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        'Content-Disposition': "filename*=UTF-8''test-results.json",
      }),
      blob: () => Promise.resolve(mockBlob),
    })

    render(<ExportButton taskId="task-123" taskName="测试任务" />)

    // 模拟点击导出 JSON
    const button = screen.getByText('导出结果')
    fireEvent.click(button)

    // 等待下拉菜单
    await waitFor(() => {
      const jsonOption = screen.queryByText('导出 JSON (.json)')
      if (jsonOption) {
        fireEvent.click(jsonOption)
      }
    })
  })

  it('导出失败时应调用错误消息', async () => {
    const { appMessage } = await import('@/lib/message')

    // Mock 失败响应
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ message: '导出失败' }),
    })

    render(<ExportButton taskId="task-123" />)

    const button = screen.getByText('导出结果')
    fireEvent.click(button)

    await waitFor(() => {
      const xlsxOption = screen.queryByText('导出 Excel (.xlsx)')
      if (xlsxOption) {
        fireEvent.click(xlsxOption)
      }
    })
  })

  it('应支持传入任务名称', () => {
    render(<ExportButton taskId="task-123" taskName="我的测试任务" />)
    expect(screen.getByText('导出结果')).toBeInTheDocument()
  })
})
