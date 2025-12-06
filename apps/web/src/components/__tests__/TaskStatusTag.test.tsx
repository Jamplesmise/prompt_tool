import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskStatusTag, ResultStatusTag, EvaluationTag } from '../task/TaskStatusTag'

describe('TaskStatusTag', () => {
  describe('任务状态标签', () => {
    it('应正确渲染 PENDING 状态', () => {
      render(<TaskStatusTag status="PENDING" />)
      expect(screen.getByText('待执行')).toBeInTheDocument()
    })

    it('应正确渲染 RUNNING 状态', () => {
      render(<TaskStatusTag status="RUNNING" />)
      expect(screen.getByText('执行中')).toBeInTheDocument()
    })

    it('应正确渲染 COMPLETED 状态', () => {
      render(<TaskStatusTag status="COMPLETED" />)
      expect(screen.getByText('已完成')).toBeInTheDocument()
    })

    it('应正确渲染 FAILED 状态', () => {
      render(<TaskStatusTag status="FAILED" />)
      expect(screen.getByText('失败')).toBeInTheDocument()
    })

    it('应正确渲染 STOPPED 状态', () => {
      render(<TaskStatusTag status="STOPPED" />)
      expect(screen.getByText('已终止')).toBeInTheDocument()
    })

    it('应正确渲染 PAUSED 状态', () => {
      render(<TaskStatusTag status="PAUSED" />)
      expect(screen.getByText('已暂停')).toBeInTheDocument()
    })

    it('showIcon=false 时不显示图标', () => {
      const { container } = render(<TaskStatusTag status="RUNNING" showIcon={false} />)
      // 检查没有 anticon 类
      expect(container.querySelector('.anticon')).toBeNull()
    })

    it('默认显示图标', () => {
      const { container } = render(<TaskStatusTag status="RUNNING" />)
      // 检查有 anticon 类
      expect(container.querySelector('.anticon')).toBeInTheDocument()
    })
  })
})

describe('ResultStatusTag', () => {
  it('应正确渲染 SUCCESS 状态', () => {
    render(<ResultStatusTag status="SUCCESS" />)
    expect(screen.getByText('成功')).toBeInTheDocument()
  })

  it('应正确渲染 FAILED 状态', () => {
    render(<ResultStatusTag status="FAILED" />)
    expect(screen.getByText('失败')).toBeInTheDocument()
  })

  it('应正确渲染 TIMEOUT 状态', () => {
    render(<ResultStatusTag status="TIMEOUT" />)
    expect(screen.getByText('超时')).toBeInTheDocument()
  })

  it('应正确渲染 ERROR 状态', () => {
    render(<ResultStatusTag status="ERROR" />)
    expect(screen.getByText('错误')).toBeInTheDocument()
  })

  it('应正确渲染 PENDING 状态', () => {
    render(<ResultStatusTag status="PENDING" />)
    expect(screen.getByText('待执行')).toBeInTheDocument()
  })

  it('未知状态应回退到 PENDING', () => {
    render(<ResultStatusTag status="UNKNOWN" />)
    expect(screen.getByText('待执行')).toBeInTheDocument()
  })
})

describe('EvaluationTag', () => {
  it('通过时应显示绿色通过标签', () => {
    render(<EvaluationTag passed={true} />)
    expect(screen.getByText('通过')).toBeInTheDocument()
  })

  it('未通过时应显示红色未通过标签', () => {
    render(<EvaluationTag passed={false} />)
    expect(screen.getByText('未通过')).toBeInTheDocument()
  })

  it('通过时有分数应显示百分比', () => {
    render(<EvaluationTag passed={true} score={0.85} />)
    expect(screen.getByText('通过 (85%)')).toBeInTheDocument()
  })

  it('未通过时有分数应显示百分比', () => {
    render(<EvaluationTag passed={false} score={0.45} />)
    expect(screen.getByText('未通过 (45%)')).toBeInTheDocument()
  })

  it('分数为 0 时应显示 0%', () => {
    render(<EvaluationTag passed={false} score={0} />)
    expect(screen.getByText('未通过 (0%)')).toBeInTheDocument()
  })

  it('分数为 1 时应显示 100%', () => {
    render(<EvaluationTag passed={true} score={1} />)
    expect(screen.getByText('通过 (100%)')).toBeInTheDocument()
  })

  it('分数为 null 时不显示百分比', () => {
    render(<EvaluationTag passed={true} score={null} />)
    expect(screen.getByText('通过')).toBeInTheDocument()
    expect(screen.queryByText(/\d+%/)).toBeNull()
  })

  it('分数为 undefined 时不显示百分比', () => {
    render(<EvaluationTag passed={false} />)
    expect(screen.getByText('未通过')).toBeInTheDocument()
    expect(screen.queryByText(/\d+%/)).toBeNull()
  })
})
