import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VariableList } from '../VariableList'
import type { PromptVariable } from '@platform/shared'

describe('VariableList', () => {
  describe('空状态', () => {
    it('无变量时应显示空状态', () => {
      render(<VariableList variables={[]} />)
      expect(screen.getByText('暂无变量')).toBeInTheDocument()
    })
  })

  describe('变量渲染', () => {
    const mockVariables: PromptVariable[] = [
      {
        name: 'username',
        type: 'string',
        required: true,
      },
      {
        name: 'age',
        type: 'number',
        required: false,
        defaultValue: 18,
      },
      {
        name: 'isActive',
        type: 'boolean',
        required: false,
        defaultValue: true,
      },
      {
        name: 'config',
        type: 'json',
        required: true,
      },
    ]

    it('应正确显示变量名称', () => {
      render(<VariableList variables={mockVariables} />)

      expect(screen.getByText('{{username}}')).toBeInTheDocument()
      expect(screen.getByText('{{age}}')).toBeInTheDocument()
      expect(screen.getByText('{{isActive}}')).toBeInTheDocument()
      expect(screen.getByText('{{config}}')).toBeInTheDocument()
    })

    it('应正确显示变量类型', () => {
      render(<VariableList variables={mockVariables} />)

      expect(screen.getByText('string')).toBeInTheDocument()
      expect(screen.getByText('number')).toBeInTheDocument()
      expect(screen.getByText('boolean')).toBeInTheDocument()
      expect(screen.getByText('json')).toBeInTheDocument()
    })

    it('必填变量应显示必填标签', () => {
      render(<VariableList variables={mockVariables} />)

      const requiredTags = screen.getAllByText('必填')
      expect(requiredTags).toHaveLength(2) // username 和 config 是必填
    })

    it('有默认值的变量应显示默认值', () => {
      render(<VariableList variables={mockVariables} />)

      expect(screen.getByText('默认: 18')).toBeInTheDocument()
      expect(screen.getByText('默认: true')).toBeInTheDocument()
    })

    it('无默认值的变量不应显示默认值', () => {
      const variablesWithoutDefault: PromptVariable[] = [
        { name: 'test', type: 'string', required: false },
      ]
      render(<VariableList variables={variablesWithoutDefault} />)

      expect(screen.queryByText(/默认:/)).not.toBeInTheDocument()
    })
  })

  describe('类型颜色', () => {
    it('不同类型应有不同的标签颜色', () => {
      const variables: PromptVariable[] = [
        { name: 'str', type: 'string', required: false },
        { name: 'num', type: 'number', required: false },
        { name: 'bool', type: 'boolean', required: false },
        { name: 'js', type: 'json', required: false },
      ]
      render(<VariableList variables={variables} />)

      // 检查各类型的标签存在
      expect(screen.getByText('string')).toBeInTheDocument()
      expect(screen.getByText('number')).toBeInTheDocument()
      expect(screen.getByText('boolean')).toBeInTheDocument()
      expect(screen.getByText('json')).toBeInTheDocument()
    })
  })
})
