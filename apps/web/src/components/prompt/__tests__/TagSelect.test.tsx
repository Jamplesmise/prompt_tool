import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TagSelect, TAG_COLORS } from '../TagSelect'

describe('TagSelect', () => {
  const defaultOptions = ['生产', '测试', '开发', '归档']

  describe('基本渲染', () => {
    it('应正确渲染多选模式', () => {
      render(<TagSelect options={defaultOptions} />)
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('应显示占位符文本', () => {
      render(<TagSelect options={defaultOptions} placeholder="请选择标签" />)
      expect(screen.getByText('请选择标签')).toBeInTheDocument()
    })

    it('应正确渲染单选模式', () => {
      render(<TagSelect options={defaultOptions} mode="single" />)
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  })

  describe('多选模式', () => {
    it('应显示已选中的标签', () => {
      render(<TagSelect options={defaultOptions} value={['生产', '测试']} />)
      expect(screen.getByText('生产')).toBeInTheDocument()
      expect(screen.getByText('测试')).toBeInTheDocument()
    })

    it('应在选择时触发 onChange', async () => {
      const handleChange = vi.fn()
      render(
        <TagSelect options={defaultOptions} value={[]} onChange={handleChange} />
      )

      const combobox = screen.getByRole('combobox')
      fireEvent.mouseDown(combobox)

      // 等待下拉菜单出现，使用 title 属性查找选项
      await waitFor(() => {
        expect(screen.getByTitle('生产')).toBeInTheDocument()
      })

      const option = screen.getByTitle('生产')
      fireEvent.click(option)

      expect(handleChange).toHaveBeenCalled()
    })
  })

  describe('单选模式', () => {
    it('应显示已选中的值', () => {
      render(
        <TagSelect options={defaultOptions} mode="single" value={['生产']} />
      )
      expect(screen.getByText('生产')).toBeInTheDocument()
    })

    it('单选模式下选择应触发 onChange', async () => {
      const handleChange = vi.fn()
      render(
        <TagSelect
          options={defaultOptions}
          mode="single"
          value={[]}
          onChange={handleChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      fireEvent.mouseDown(combobox)

      // 等待下拉菜单出现
      await waitFor(() => {
        expect(screen.getByTitle('测试')).toBeInTheDocument()
      })

      const option = screen.getByTitle('测试')
      fireEvent.click(option)

      expect(handleChange).toHaveBeenCalled()
    })
  })

  describe('TAG_COLORS', () => {
    it('应导出正确的标签颜色', () => {
      expect(TAG_COLORS['生产']).toBe('#52C41A')
      expect(TAG_COLORS['测试']).toBe('#FAAD14')
      expect(TAG_COLORS['开发']).toBe('#EF4444')
      expect(TAG_COLORS['归档']).toBe('#8c8c8c')
      expect(TAG_COLORS['default']).toBe('#EF4444')
    })
  })

  describe('样式', () => {
    it('应应用自定义样式', () => {
      const { container } = render(
        <TagSelect options={defaultOptions} style={{ width: 200 }} />
      )
      const select = container.querySelector('.ant-select')
      expect(select).toBeInTheDocument()
    })
  })
})
