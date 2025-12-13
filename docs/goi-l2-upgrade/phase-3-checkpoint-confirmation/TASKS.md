# Phase 3: 检查点确认机制 - 任务清单

## 任务概览

| 任务 | 优先级 | 预估 | 状态 |
|------|-------|------|------|
| 3.1 定义检查点数据结构 | P0 | 1h | ✅ 已完成 |
| 3.2 实现检查点规则引擎 | P0 | 2h | ✅ 已完成 |
| 3.3 实现检查点对话框 | P0 | 3h | ✅ 已完成 |
| 3.4 集成到执行流程 | P0 | 2h | ✅ 已完成 |
| 3.5 实现规则配置 UI | P1 | 2h | ✅ 已完成 |

---

## 3.1 定义检查点数据结构

**文件**: `packages/shared/src/types/goi/checkpoint.ts`（新建）

### 任务描述

定义检查点相关的类型。

### 具体步骤

- [ ] 创建类型文件：

```typescript
import type { ResourceType } from './index'

/**
 * 检查点类型
 */
export type CheckpointType =
  | 'resource_selection'
  | 'irreversible_action'
  | 'cost_incurring'
  | 'first_time'
  | 'user_defined'
  | 'low_confidence'

/**
 * 检查点响应动作
 */
export type CheckpointAction = 'confirm' | 'change' | 'skip' | 'cancel'

/**
 * AI 的选择
 */
export type AIChoice = {
  value: string
  label: string
  reason: string
  confidence: number
}

/**
 * 候选选项
 */
export type CheckpointOption = {
  value: string
  label: string
  description?: string
  isRecommended?: boolean
}

/**
 * 用户响应
 */
export type CheckpointResponse = {
  action: CheckpointAction
  selectedValue?: string
  comment?: string
  timestamp: Date
}

/**
 * 检查点
 */
export type Checkpoint = {
  id: string
  stepId: string
  type: CheckpointType
  // 内容
  title: string
  description: string
  resourceType?: ResourceType
  // AI 选择
  aiChoice: AIChoice
  // 候选
  alternatives: CheckpointOption[]
  allowSkip: boolean
  allowCancel: boolean
  // 响应
  response?: CheckpointResponse
  // 时间
  createdAt: Date
  respondedAt?: Date
  timeoutSeconds?: number
}

/**
 * 检查点规则
 */
export type CheckpointRule = {
  id: string
  name: string
  description: string
  trigger: CheckpointTrigger
  enabled: boolean
  priority: number
}

/**
 * 触发条件
 */
export type CheckpointTrigger = {
  resourceTypes?: ResourceType[]
  actionTypes?: string[]
  confidenceThreshold?: number
  custom?: string              // 自定义条件表达式
}
```

- [ ] 导出类型

---

## 3.2 实现检查点规则引擎

**文件**: `apps/web/src/lib/goi/checkpoint/ruleEngine.ts`（新建）

### 任务描述

实现检查点规则匹配和评估逻辑。

### 具体步骤

- [ ] 创建规则引擎：

```typescript
import type { PlanStep, CheckpointRule, CheckpointTrigger, Checkpoint, CheckpointType } from '@platform/shared'

/**
 * 默认检查点规则
 */
export const DEFAULT_RULES: CheckpointRule[] = [
  {
    id: 'select-prompt',
    name: '选择提示词',
    description: '选择 Prompt 时暂停确认',
    trigger: { resourceTypes: ['prompt'], actionTypes: ['select'] },
    enabled: true,
    priority: 100,
  },
  {
    id: 'select-dataset',
    name: '选择数据集',
    description: '选择 Dataset 时暂停确认',
    trigger: { resourceTypes: ['dataset'], actionTypes: ['select'] },
    enabled: true,
    priority: 100,
  },
  {
    id: 'select-model',
    name: '选择模型',
    description: '选择 Model 时暂停确认',
    trigger: { resourceTypes: ['model'], actionTypes: ['select'] },
    enabled: true,
    priority: 100,
  },
  {
    id: 'delete-resource',
    name: '删除资源',
    description: '删除任何资源前确认',
    trigger: { actionTypes: ['delete'] },
    enabled: true,
    priority: 200,
  },
  {
    id: 'low-confidence',
    name: '低置信度',
    description: 'AI 置信度 < 80% 时确认',
    trigger: { confidenceThreshold: 0.8 },
    enabled: true,
    priority: 50,
  },
]

/**
 * 检查点规则引擎
 */
export class CheckpointRuleEngine {
  private rules: CheckpointRule[]

  constructor(customRules?: CheckpointRule[]) {
    this.rules = [...DEFAULT_RULES, ...(customRules || [])]
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority)
  }

  /**
   * 评估步骤是否需要检查点
   */
  evaluate(step: PlanStep, context?: { confidence?: number }): CheckpointType | null {
    for (const rule of this.rules) {
      if (this.matchTrigger(step, rule.trigger, context)) {
        return this.getCheckpointType(rule)
      }
    }
    return null
  }

  /**
   * 匹配触发条件
   */
  private matchTrigger(
    step: PlanStep,
    trigger: CheckpointTrigger,
    context?: { confidence?: number }
  ): boolean {
    // 检查资源类型
    if (trigger.resourceTypes && trigger.resourceTypes.length > 0) {
      const resourceType = this.getResourceType(step)
      if (!resourceType || !trigger.resourceTypes.includes(resourceType)) {
        return false
      }
    }

    // 检查操作类型
    if (trigger.actionTypes && trigger.actionTypes.length > 0) {
      const actionType = this.getActionType(step)
      if (!actionType || !trigger.actionTypes.includes(actionType)) {
        return false
      }
    }

    // 检查置信度
    if (trigger.confidenceThreshold !== undefined && context?.confidence !== undefined) {
      if (context.confidence >= trigger.confidenceThreshold) {
        return false
      }
    }

    return true
  }

  /**
   * 获取步骤的资源类型
   */
  private getResourceType(step: PlanStep): string | null {
    if (step.operation.type === 'access' || step.operation.type === 'state') {
      return step.operation.target.resourceType
    }
    return null
  }

  /**
   * 获取步骤的操作类型
   */
  private getActionType(step: PlanStep): string | null {
    return step.operation.action || null
  }

  /**
   * 根据规则获取检查点类型
   */
  private getCheckpointType(rule: CheckpointRule): CheckpointType {
    if (rule.trigger.actionTypes?.includes('delete')) return 'irreversible_action'
    if (rule.trigger.confidenceThreshold) return 'low_confidence'
    if (rule.trigger.resourceTypes) return 'resource_selection'
    return 'user_defined'
  }

  /**
   * 添加规则
   */
  addRule(rule: CheckpointRule): void {
    this.rules.push(rule)
    this.rules.sort((a, b) => b.priority - a.priority)
  }

  /**
   * 移除规则
   */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId)
  }

  /**
   * 获取所有规则
   */
  getRules(): CheckpointRule[] {
    return [...this.rules]
  }
}

// 全局实例
export const checkpointRuleEngine = new CheckpointRuleEngine()
```

---

## 3.3 实现检查点对话框

**文件**: `apps/web/src/components/goi/CheckpointDialog.tsx`（新建）

### 任务描述

创建检查点确认对话框组件。

### 具体步骤

- [ ] 创建对话框组件：

```tsx
'use client'

import { useState } from 'react'
import { Modal, Radio, Button, Space, Typography, Alert, Card } from 'antd'
import { CheckCircleOutlined, SwapOutlined, FastForwardOutlined, CloseOutlined } from '@ant-design/icons'
import type { Checkpoint, CheckpointAction, CheckpointOption } from '@platform/shared'

const { Text, Paragraph } = Typography

type CheckpointDialogProps = {
  checkpoint: Checkpoint
  open: boolean
  onRespond: (action: CheckpointAction, selectedValue?: string) => void
  onCancel?: () => void
}

export function CheckpointDialog({
  checkpoint,
  open,
  onRespond,
  onCancel,
}: CheckpointDialogProps) {
  const [selectedValue, setSelectedValue] = useState(checkpoint.aiChoice.value)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onRespond('confirm', selectedValue)
    setLoading(false)
  }

  const handleChange = async () => {
    if (selectedValue !== checkpoint.aiChoice.value) {
      setLoading(true)
      await onRespond('change', selectedValue)
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    setLoading(true)
    await onRespond('skip')
    setLoading(false)
  }

  const handleCancel = () => {
    onCancel?.()
    onRespond('cancel')
  }

  return (
    <Modal
      title={
        <Space>
          <span>⏸️</span>
          <span>{checkpoint.title}</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={500}
      centered
    >
      <div style={{ padding: '16px 0' }}>
        {/* 描述 */}
        <Paragraph type="secondary">{checkpoint.description}</Paragraph>

        {/* AI 选择 */}
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          <Radio.Group
            value={selectedValue}
            onChange={e => setSelectedValue(e.target.value)}
            style={{ width: '100%' }}
          >
            {/* AI 推荐选项 */}
            <div style={{ marginBottom: 12 }}>
              <Radio value={checkpoint.aiChoice.value}>
                <Space direction="vertical" size={0}>
                  <Text strong>{checkpoint.aiChoice.label}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    💡 AI 选择原因：{checkpoint.aiChoice.reason}
                  </Text>
                </Space>
              </Radio>
            </div>

            {/* 其他候选 */}
            {checkpoint.alternatives.length > 0 && (
              <>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  其他候选：
                </Text>
                {checkpoint.alternatives.map(alt => (
                  <div key={alt.value} style={{ marginBottom: 8 }}>
                    <Radio value={alt.value}>
                      <Space direction="vertical" size={0}>
                        <Text>{alt.label}</Text>
                        {alt.description && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {alt.description}
                          </Text>
                        )}
                      </Space>
                    </Radio>
                  </div>
                ))}
              </>
            )}
          </Radio.Group>
        </Card>

        {/* 操作按钮 */}
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          {checkpoint.allowCancel && (
            <Button
              icon={<CloseOutlined />}
              onClick={handleCancel}
            >
              取消任务
            </Button>
          )}
          {checkpoint.allowSkip && (
            <Button
              icon={<FastForwardOutlined />}
              onClick={handleSkip}
              loading={loading}
            >
              跳过此步
            </Button>
          )}
          {selectedValue !== checkpoint.aiChoice.value ? (
            <Button
              type="primary"
              icon={<SwapOutlined />}
              onClick={handleChange}
              loading={loading}
            >
              使用选中项
            </Button>
          ) : (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleConfirm}
              loading={loading}
            >
              确认
            </Button>
          )}
        </Space>

        {/* 提示 */}
        <Alert
          type="info"
          message="确认后，AI 将继续执行下一步操作"
          style={{ marginTop: 16 }}
          showIcon
        />
      </div>
    </Modal>
  )
}
```

---

## 3.4 集成到执行流程

**文件**: `apps/web/src/lib/goi/execution/checkpointHandler.ts`（新建）

### 任务描述

将检查点机制集成到执行流程中。

### 具体步骤

- [ ] 创建检查点处理器：

```typescript
import type { PlanStep, Checkpoint, CheckpointResponse, CheckpointType } from '@platform/shared'
import { checkpointRuleEngine } from '../checkpoint/ruleEngine'
import { useExecutionStore } from './progressSync'
import { fuzzySearchResources } from '../intent/fuzzyMatcher'

/**
 * 检查点处理器
 */
export class CheckpointHandler {
  private pendingCheckpoint: Checkpoint | null = null
  private resolveCheckpoint: ((response: CheckpointResponse) => void) | null = null

  /**
   * 检查步骤是否需要检查点
   */
  needsCheckpoint(step: PlanStep, context?: { confidence?: number }): boolean {
    return step.isCheckpoint || checkpointRuleEngine.evaluate(step, context) !== null
  }

  /**
   * 创建检查点
   */
  async createCheckpoint(step: PlanStep): Promise<Checkpoint> {
    const checkpointType = step.checkpointType ||
      checkpointRuleEngine.evaluate(step) ||
      'resource_selection'

    // 获取候选项
    const alternatives = await this.getAlternatives(step)

    const checkpoint: Checkpoint = {
      id: `cp-${Date.now()}`,
      stepId: step.id,
      type: checkpointType,
      title: this.getTitle(checkpointType, step),
      description: this.getDescription(checkpointType, step),
      resourceType: this.getResourceType(step),
      aiChoice: {
        value: this.getAIChoiceValue(step),
        label: this.getAIChoiceLabel(step),
        reason: step.checkpointReason || '名称最匹配您的输入',
        confidence: 0.85,
      },
      alternatives,
      allowSkip: step.isOptional,
      allowCancel: true,
      createdAt: new Date(),
    }

    this.pendingCheckpoint = checkpoint
    useExecutionStore.getState().setStatus('checkpoint')

    return checkpoint
  }

  /**
   * 等待检查点响应
   */
  async waitForResponse(): Promise<CheckpointResponse> {
    return new Promise(resolve => {
      this.resolveCheckpoint = resolve
    })
  }

  /**
   * 响应检查点
   */
  respond(response: CheckpointResponse): void {
    if (this.pendingCheckpoint) {
      this.pendingCheckpoint.response = response
      this.pendingCheckpoint.respondedAt = new Date()
    }

    if (this.resolveCheckpoint) {
      this.resolveCheckpoint(response)
      this.resolveCheckpoint = null
    }

    this.pendingCheckpoint = null
  }

  /**
   * 获取当前检查点
   */
  getCurrentCheckpoint(): Checkpoint | null {
    return this.pendingCheckpoint
  }

  // 辅助方法
  private getTitle(type: CheckpointType, step: PlanStep): string {
    switch (type) {
      case 'resource_selection':
        return '请确认选择'
      case 'irreversible_action':
        return '⚠️ 不可逆操作'
      case 'cost_incurring':
        return '💰 此操作将产生费用'
      case 'low_confidence':
        return '🤔 请帮我确认'
      default:
        return '请确认'
    }
  }

  private getDescription(type: CheckpointType, step: PlanStep): string {
    switch (type) {
      case 'resource_selection':
        return `即将${step.userLabel}，请确认是否正确`
      case 'irreversible_action':
        return '此操作不可撤销，请谨慎确认'
      case 'low_confidence':
        return '我对这个选择不太确定，请帮我确认一下'
      default:
        return step.hint || ''
    }
  }

  private getResourceType(step: PlanStep): string | undefined {
    if (step.operation.type === 'access' || step.operation.type === 'state') {
      return step.operation.target.resourceType
    }
    return undefined
  }

  private getAIChoiceValue(step: PlanStep): string {
    if (step.operation.type === 'access') {
      return step.operation.target.resourceId || ''
    }
    return ''
  }

  private getAIChoiceLabel(step: PlanStep): string {
    // 从 userLabel 中提取名称
    const match = step.userLabel.match(/→\s*(.+)$/)
    return match ? match[1] : step.userLabel
  }

  private async getAlternatives(step: PlanStep): Promise<Array<{ value: string; label: string; description?: string }>> {
    const resourceType = this.getResourceType(step)
    if (!resourceType) return []

    // 搜索同类型的其他资源
    try {
      const results = await fuzzySearchResources(resourceType as any, '', 5)
      const aiChoice = this.getAIChoiceValue(step)

      return results
        .filter(r => r.id !== aiChoice)
        .slice(0, 3)
        .map(r => ({
          value: r.id,
          label: r.name,
        }))
    } catch {
      return []
    }
  }
}

// 全局实例
export const checkpointHandler = new CheckpointHandler()
```

- [ ] 更新执行器集成检查点：

```typescript
// 在 VisualExecutor 的 executeStep 方法中添加
private async executeStep(step: PlanStep): Promise<void> {
  const store = useExecutionStore.getState()

  // 检查是否需要检查点
  if (checkpointHandler.needsCheckpoint(step)) {
    const checkpoint = await checkpointHandler.createCheckpoint(step)

    // 等待用户响应
    const response = await checkpointHandler.waitForResponse()

    if (response.action === 'cancel') {
      throw new Error('User cancelled')
    }

    if (response.action === 'skip') {
      store.completeStep(step.id)
      return
    }

    if (response.action === 'change' && response.selectedValue) {
      // 更新步骤的目标资源
      this.updateStepTarget(step, response.selectedValue)
    }
  }

  // 继续正常执行...
}
```

---

## 3.5 实现规则配置 UI

**文件**: `apps/web/src/components/goi/CheckpointRulesConfig.tsx`（新建）

### 任务描述

让用户可以配置检查点规则。

### 具体步骤

- [ ] 创建规则配置组件：

```tsx
'use client'

import { useState } from 'react'
import { Card, Switch, List, Typography, Space, Tooltip, Slider } from 'antd'
import { QuestionCircleOutlined } from '@ant-design/icons'
import type { CheckpointRule } from '@platform/shared'
import { DEFAULT_RULES, checkpointRuleEngine } from '@/lib/goi/checkpoint/ruleEngine'

const { Text, Title } = Typography

export function CheckpointRulesConfig() {
  const [rules, setRules] = useState<CheckpointRule[]>(checkpointRuleEngine.getRules())
  const [sensitivity, setSensitivity] = useState(50)

  const handleToggle = (ruleId: string, enabled: boolean) => {
    const updated = rules.map(r =>
      r.id === ruleId ? { ...r, enabled } : r
    )
    setRules(updated)
    // 更新规则引擎
    if (enabled) {
      checkpointRuleEngine.addRule(updated.find(r => r.id === ruleId)!)
    } else {
      checkpointRuleEngine.removeRule(ruleId)
    }
  }

  const sensitivityMarks = {
    0: '最少确认',
    50: '平衡',
    100: '每步确认',
  }

  return (
    <Card title="检查点设置" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 敏感度滑块 */}
        <div>
          <Space>
            <Text>确认敏感度</Text>
            <Tooltip title="控制需要确认的操作数量">
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
          <Slider
            marks={sensitivityMarks}
            value={sensitivity}
            onChange={setSensitivity}
            style={{ marginTop: 8 }}
          />
        </div>

        {/* 规则列表 */}
        <div>
          <Text type="secondary">检查点规则</Text>
          <List
            size="small"
            dataSource={rules}
            renderItem={rule => (
              <List.Item
                extra={
                  <Switch
                    size="small"
                    checked={rule.enabled}
                    onChange={checked => handleToggle(rule.id, checked)}
                  />
                }
              >
                <List.Item.Meta
                  title={rule.name}
                  description={rule.description}
                />
              </List.Item>
            )}
          />
        </div>
      </Space>
    </Card>
  )
}
```

---

## 开发日志

| 日期 | 任务 | 完成情况 | 备注 |
|------|------|---------|------|
| 2025-12-13 | 3.1 定义检查点数据结构 | ✅ 已完成 | 类型已在 `packages/shared/src/types/goi/checkpoint.ts` 中完整定义 |
| 2025-12-13 | 3.2 实现检查点规则引擎 | ✅ 已完成 | 已在 `apps/web/src/lib/goi/checkpoint/rules.ts` 中实现，包含默认规则、智能判断、模式切换 |
| 2025-12-13 | 3.3 实现检查点对话框 | ✅ 已完成 | 增强 `CheckpointSection.tsx`：添加 AI 推荐展示、候选项 Radio 选择、选择变更处理 |
| 2025-12-13 | 3.4 集成到执行流程 | ✅ 已完成 | 已在 `controller.ts` 中实现 `CheckpointController`，与 `visualExecutor.ts` 集成 |
| 2025-12-13 | 3.5 实现规则配置 UI | ✅ 已完成 | 新建 `CheckpointRulesConfig.tsx`：敏感度滑块、规则列表、启用/禁用开关 |
