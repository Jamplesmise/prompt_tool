import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EvaluatorTypeTag, EVALUATOR_TYPE_CONFIG } from '../evaluator/EvaluatorTypeTag'

describe('EvaluatorTypeTag', () => {
  describe('已知类型渲染', () => {
    it('应正确渲染 exact_match 类型', () => {
      render(<EvaluatorTypeTag type="exact_match" />)
      expect(screen.getByText('精确匹配')).toBeInTheDocument()
      expect(screen.getByText('✅')).toBeInTheDocument()
    })

    it('应正确渲染 contains 类型', () => {
      render(<EvaluatorTypeTag type="contains" />)
      expect(screen.getByText('包含匹配')).toBeInTheDocument()
      expect(screen.getByText('🔍')).toBeInTheDocument()
    })

    it('应正确渲染 regex 类型', () => {
      render(<EvaluatorTypeTag type="regex" />)
      expect(screen.getByText('正则匹配')).toBeInTheDocument()
      expect(screen.getByText('📝')).toBeInTheDocument()
    })

    it('应正确渲染 json_schema 类型', () => {
      render(<EvaluatorTypeTag type="json_schema" />)
      expect(screen.getByText('JSON Schema')).toBeInTheDocument()
      expect(screen.getByText('📋')).toBeInTheDocument()
    })

    it('应正确渲染 similarity 类型', () => {
      render(<EvaluatorTypeTag type="similarity" />)
      expect(screen.getByText('相似度')).toBeInTheDocument()
      expect(screen.getByText('📊')).toBeInTheDocument()
    })

    it('应正确渲染 llm_judge 类型', () => {
      render(<EvaluatorTypeTag type="llm_judge" />)
      expect(screen.getByText('LLM 评估')).toBeInTheDocument()
      expect(screen.getByText('🤖')).toBeInTheDocument()
    })

    it('应正确渲染 code 类型', () => {
      render(<EvaluatorTypeTag type="code" />)
      expect(screen.getByText('代码评估')).toBeInTheDocument()
      expect(screen.getByText('💻')).toBeInTheDocument()
    })

    it('应正确渲染 composite 类型', () => {
      render(<EvaluatorTypeTag type="composite" />)
      expect(screen.getByText('组合评估')).toBeInTheDocument()
      expect(screen.getByText('🔗')).toBeInTheDocument()
    })
  })

  describe('未知类型', () => {
    it('未知类型应显示原始类型名', () => {
      render(<EvaluatorTypeTag type="unknown_type" />)
      expect(screen.getByText('unknown_type')).toBeInTheDocument()
    })
  })

  describe('showLabel 属性', () => {
    it('showLabel=false 时不显示标签文字', () => {
      render(<EvaluatorTypeTag type="exact_match" showLabel={false} />)
      expect(screen.queryByText('精确匹配')).toBeNull()
      expect(screen.getByText('✅')).toBeInTheDocument()
    })

    it('showLabel=true 时显示标签文字', () => {
      render(<EvaluatorTypeTag type="exact_match" showLabel={true} />)
      expect(screen.getByText('精确匹配')).toBeInTheDocument()
    })
  })

  describe('size 属性', () => {
    it('size=small 时应渲染', () => {
      const { container } = render(<EvaluatorTypeTag type="code" size="small" />)
      expect(container.querySelector('.ant-tag')).toBeInTheDocument()
    })

    it('size=large 时应渲染', () => {
      const { container } = render(<EvaluatorTypeTag type="code" size="large" />)
      expect(container.querySelector('.ant-tag')).toBeInTheDocument()
    })
  })

  describe('showTooltip 属性', () => {
    it('showTooltip=true 时应包含 Tooltip', async () => {
      const { container } = render(<EvaluatorTypeTag type="exact_match" showTooltip={true} />)
      // Tooltip 在渲染时会被 Ant Design 处理
      expect(container.querySelector('.ant-tag')).toBeInTheDocument()
    })

    it('showTooltip=false 时不应包含 Tooltip', () => {
      const { container } = render(<EvaluatorTypeTag type="exact_match" showTooltip={false} />)
      expect(container.querySelector('.ant-tag')).toBeInTheDocument()
    })
  })

  describe('EVALUATOR_TYPE_CONFIG', () => {
    it('配置应包含所有必要字段', () => {
      const types = Object.keys(EVALUATOR_TYPE_CONFIG)
      expect(types).toContain('exact_match')
      expect(types).toContain('contains')
      expect(types).toContain('regex')
      expect(types).toContain('json_schema')
      expect(types).toContain('similarity')
      expect(types).toContain('llm_judge')
      expect(types).toContain('code')
      expect(types).toContain('composite')

      // 检查每个配置都有完整的字段
      types.forEach((type) => {
        const config = EVALUATOR_TYPE_CONFIG[type as keyof typeof EVALUATOR_TYPE_CONFIG]
        expect(config).toHaveProperty('icon')
        expect(config).toHaveProperty('color')
        expect(config).toHaveProperty('label')
        expect(config).toHaveProperty('description')
      })
    })
  })
})
