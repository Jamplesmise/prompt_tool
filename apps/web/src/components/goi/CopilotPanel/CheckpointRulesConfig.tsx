'use client'

/**
 * 检查点规则配置组件
 *
 * 让用户可以配置检查点规则：
 * - 查看当前启用的规则
 * - 启用/禁用规则
 * - 调整确认敏感度
 */

import React, { useState, useEffect } from 'react'
import { Card, Switch, List, Typography, Space, Tooltip, Slider, Divider, Tag } from 'antd'
import {
  QuestionCircleOutlined,
  SettingOutlined,
  DeleteOutlined,
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import type { CheckpointRule, RiskLevel } from '@platform/shared'
import {
  getCheckpointRuleEngine,
  DEFAULT_CHECKPOINT_RULES,
} from '@/lib/goi/checkpoint/rules'
import styles from './styles.module.css'

const { Text, Title } = Typography

/**
 * 敏感度等级
 */
type SensitivityLevel = 'low' | 'medium' | 'high'

const sensitivityMarks: Record<number, string> = {
  0: '自动模式',
  50: '智能模式',
  100: '逐步模式',
}

const sensitivityToMode: Record<number, 'auto' | 'smart' | 'step'> = {
  0: 'auto',
  50: 'smart',
  100: 'step',
}

/**
 * 获取规则动作的标签颜色
 */
function getActionTagColor(action: string): string {
  switch (action) {
    case 'require':
      return 'orange'
    case 'skip':
      return 'green'
    case 'smart':
      return 'blue'
    default:
      return 'default'
  }
}

/**
 * 获取规则动作的标签文本
 */
function getActionTagText(action: string): string {
  switch (action) {
    case 'require':
      return '需确认'
    case 'skip':
      return '自动通过'
    case 'smart':
      return '智能判断'
    default:
      return action
  }
}

/**
 * 获取风险等级的颜色
 */
function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'critical':
      return 'red'
    case 'high':
      return 'orange'
    case 'medium':
      return 'gold'
    case 'low':
      return 'green'
    default:
      return 'default'
  }
}

export type CheckpointRulesConfigProps = {
  /** 是否显示高级选项 */
  showAdvanced?: boolean
  /** 规则变更回调 */
  onRulesChange?: (rules: CheckpointRule[]) => void
  /** 模式变更回调 */
  onModeChange?: (mode: 'auto' | 'smart' | 'step') => void
}

export function CheckpointRulesConfig({
  showAdvanced = false,
  onRulesChange,
  onModeChange,
}: CheckpointRulesConfigProps) {
  const ruleEngine = getCheckpointRuleEngine()
  const [rules, setRules] = useState<CheckpointRule[]>([])
  const [sensitivity, setSensitivity] = useState(50)
  const [expanded, setExpanded] = useState(false)

  // 初始化规则列表
  useEffect(() => {
    setRules(ruleEngine.getRules())
  }, [])

  /**
   * 切换规则启用状态
   */
  const handleToggle = (ruleId: string, enabled: boolean) => {
    const currentRules = ruleEngine.getRules()
    const updated = currentRules.map((r) =>
      r.id === ruleId ? { ...r, enabled } : r
    )

    // 更新规则引擎
    ruleEngine.addUserRules(updated.filter((r) => r.enabled))
    setRules(ruleEngine.getRules())

    onRulesChange?.(updated)
  }

  /**
   * 处理敏感度变更
   */
  const handleSensitivityChange = (value: number) => {
    setSensitivity(value)

    // 根据敏感度切换模式
    let mode: 'auto' | 'smart' | 'step' = 'smart'
    if (value <= 25) {
      mode = 'auto'
    } else if (value >= 75) {
      mode = 'step'
    }

    ruleEngine.switchModeRules(mode)
    setRules(ruleEngine.getRules())

    onModeChange?.(mode)
  }

  /**
   * 获取当前模式描述
   */
  const getModeDescription = (): string => {
    if (sensitivity <= 25) {
      return '自动模式：仅在删除等高风险操作时确认'
    } else if (sensitivity >= 75) {
      return '逐步模式：每个操作都需要确认'
    }
    return '智能模式：根据操作类型和上下文智能判断'
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <SettingOutlined />
          <span>检查点设置</span>
        </Space>
      }
      extra={
        showAdvanced && (
          <Switch
            size="small"
            checked={expanded}
            onChange={setExpanded}
            checkedChildren="详细"
            unCheckedChildren="简洁"
          />
        )
      }
      className={styles.checkpointRulesCard}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 敏感度滑块 */}
        <div>
          <Space style={{ marginBottom: 8 }}>
            <Text strong>确认敏感度</Text>
            <Tooltip title="控制需要确认的操作数量。自动模式仅确认高风险操作，逐步模式确认所有操作">
              <QuestionCircleOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
          <Slider
            marks={sensitivityMarks}
            step={25}
            value={sensitivity}
            onChange={handleSensitivityChange}
            tooltip={{ formatter: (value) => sensitivityMarks[value || 50] }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getModeDescription()}
          </Text>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* 规则列表 */}
        <div>
          <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
            检查点规则
          </Text>
          <List
            size="small"
            dataSource={rules.slice(0, expanded ? rules.length : 5)}
            renderItem={(rule) => (
              <List.Item
                style={{ padding: '8px 0' }}
                extra={
                  <Switch
                    size="small"
                    checked={rule.enabled}
                    onChange={(checked) => handleToggle(rule.id, checked)}
                  />
                }
              >
                <List.Item.Meta
                  title={
                    <Space size="small">
                      <Text style={{ fontSize: 13 }}>{rule.name}</Text>
                      <Tag color={getActionTagColor(rule.action)} style={{ fontSize: 10 }}>
                        {getActionTagText(rule.action)}
                      </Tag>
                    </Space>
                  }
                  description={
                    expanded && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {rule.description}
                      </Text>
                    )
                  }
                />
              </List.Item>
            )}
          />
          {!expanded && rules.length > 5 && (
            <Text
              type="secondary"
              style={{ fontSize: 12, cursor: 'pointer' }}
              onClick={() => setExpanded(true)}
            >
              还有 {rules.length - 5} 条规则...
            </Text>
          )}
        </div>
      </Space>
    </Card>
  )
}

export default CheckpointRulesConfig
