'use client'

/**
 * 命令输入组件
 *
 * 用于向 AI 发送指令
 * 支持：
 * - 输入命令后显示确认提示
 * - Enter 确认执行
 * - Escape/Ctrl+C 取消
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Input, Button, Alert, message, Card, Typography, Space, Tag } from 'antd'
import {
  SendOutlined,
  LoadingOutlined,
  CheckOutlined,
  CloseOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { useCopilot } from '../hooks/useCopilot'
import styles from './styles.module.css'

const { Text, Paragraph } = Typography

type InputState = 'input' | 'planning' | 'confirm'

export const CommandInput: React.FC = () => {
  const [command, setCommand] = useState('')
  const [inputState, setInputState] = useState<InputState>('input')
  const [pendingGoal, setPendingGoal] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLDivElement>(null)

  const {
    sendCommand,
    executeStep,
    runExecution,
    isLoading,
    error,
    clearError,
    complexModelId,
    todoList,
    mode,
  } = useCopilot()

  // 显示错误消息
  useEffect(() => {
    if (error) {
      message.error(error)
      setInputState('input')
    }
  }, [error])

  // 当 todoList 生成后，进入确认状态
  useEffect(() => {
    console.log('[CommandInput] State check:', {
      inputState,
      hasTodoList: !!todoList,
      todoListStatus: todoList?.status,
      itemCount: todoList?.items.length,
    })
    if (inputState === 'planning' && todoList && todoList.items.length > 0) {
      console.log('[CommandInput] Transitioning to confirm state')
      setInputState('confirm')
      // 聚焦到确认区域以接收键盘事件，同时移除输入框焦点
      setTimeout(() => {
        // 先移除任何输入框的焦点
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
        confirmRef.current?.focus()
      }, 50)
    }
  }, [todoList, inputState])

  const handleSend = async () => {
    if (!command.trim()) return

    clearError()
    setPendingGoal(command)
    setInputState('planning')
    setCommand('')

    await sendCommand(command)
  }

  const handleConfirmExecute = useCallback(async () => {
    setInputState('input')
    setPendingGoal('')

    // 根据模式决定执行方式
    if (mode === 'manual') {
      // 手动模式：执行一步
      await executeStep()
      message.success('已执行第一步，点击"下一步"继续')
    } else {
      // assisted/auto 模式：启动自动执行
      await runExecution()
      message.success('开始自动执行任务')
    }
  }, [mode, executeStep, runExecution])

  const handleCancelExecute = useCallback(() => {
    setInputState('input')
    setPendingGoal('')
    message.info('已取消执行')
  }, [])

  // 处理全局键盘事件 - 在 confirm 状态时监听 Enter/Esc/Ctrl+C
  useEffect(() => {
    if (inputState !== 'confirm') return

    console.log('[CommandInput] Setting up keyboard listeners for confirm state')

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 忽略在输入框中的按键（除了 Escape 和 Ctrl+C）
      const target = e.target as HTMLElement
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      if (e.key === 'Enter' && !isInInput) {
        e.preventDefault()
        e.stopPropagation()
        console.log('[CommandInput] Enter pressed - executing')
        handleConfirmExecute()
      } else if (e.key === 'Escape' || (e.ctrlKey && e.key === 'c')) {
        e.preventDefault()
        e.stopPropagation()
        console.log('[CommandInput] Escape/Ctrl+C pressed - canceling')
        handleCancelExecute()
      }
    }

    // 使用 capture 阶段确保最先捕获事件
    window.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => {
      console.log('[CommandInput] Removing keyboard listeners')
      window.removeEventListener('keydown', handleGlobalKeyDown, true)
    }
  }, [inputState, handleConfirmExecute, handleCancelExecute])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 提示用户选择模型
  const placeholder = complexModelId
    ? '输入目标，例如：帮我创建一个测试任务...'
    : '请先展开"模型配置"选择模型'

  // 处理确认卡片上的键盘事件
  const handleConfirmKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirmExecute()
    } else if (e.key === 'Escape' || (e.ctrlKey && e.key === 'c')) {
      e.preventDefault()
      handleCancelExecute()
    }
  }

  // 确认执行的提示卡片
  if (inputState === 'confirm' && todoList) {
    return (
      <div
        className={styles.commandInput}
        ref={confirmRef}
        tabIndex={0}
        onKeyDown={handleConfirmKeyDown}
        style={{ outline: 'none' }}
      >
        <Card
          size="small"
          style={{
            background: '#f6ffed',
            borderColor: '#52c41a',
            borderWidth: 2,
            animation: 'pulse 2s infinite',
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RobotOutlined style={{ color: '#52c41a', fontSize: 18 }} />
              <Text strong style={{ fontSize: 14 }}>计划已生成，等待确认</Text>
              <Tag color="green">{todoList.items.length} 个步骤</Tag>
            </div>
            <Paragraph
              style={{ margin: 0, fontSize: 12, color: '#666' }}
              ellipsis={{ rows: 1 }}
            >
              目标：{pendingGoal}
            </Paragraph>
            {/* 显示计划步骤 */}
            <div style={{
              background: '#fff',
              borderRadius: 4,
              padding: '8px 12px',
              maxHeight: 120,
              overflowY: 'auto',
              border: '1px solid #d9f7be'
            }}>
              <Text type="secondary" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
                将要执行：
              </Text>
              {todoList.items.map((item, index) => (
                <div key={item.id || index} style={{
                  fontSize: 12,
                  padding: '2px 0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6
                }}>
                  <span style={{ color: '#8c8c8c', minWidth: 16 }}>{index + 1}.</span>
                  <span>{item.title}</span>
                </div>
              ))}
            </div>
            {/* 键盘快捷键提示 - 更醒目 */}
            <div style={{
              background: '#e6f4ff',
              padding: '8px 12px',
              borderRadius: 4,
              border: '1px solid #91caff',
              textAlign: 'center'
            }}>
              <Text style={{ fontSize: 13 }}>
                按 <Tag color="green" style={{ margin: '0 4px', fontWeight: 'bold' }}>Enter</Tag> 开始执行
                &nbsp;&nbsp;|&nbsp;&nbsp;
                按 <Tag color="red" style={{ margin: '0 4px', fontWeight: 'bold' }}>Esc</Tag> 或 <Tag color="red" style={{ margin: '0 4px', fontWeight: 'bold' }}>Ctrl+C</Tag> 取消
              </Text>
            </div>
            {/* 备用按钮 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={handleCancelExecute}
              >
                取消 (Esc)
              </Button>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={handleConfirmExecute}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                执行 (Enter)
              </Button>
            </div>
          </Space>
        </Card>
        <style jsx global>{`
          @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.4); }
            70% { box-shadow: 0 0 0 6px rgba(82, 196, 26, 0); }
            100% { box-shadow: 0 0 0 0 rgba(82, 196, 26, 0); }
          }
        `}</style>
      </div>
    )
  }

  // 规划中状态
  if (inputState === 'planning') {
    return (
      <div className={styles.commandInput}>
        <Card size="small" style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
          <Space>
            <LoadingOutlined spin style={{ color: '#1890ff' }} />
            <Text>正在分析目标并生成执行计划...</Text>
          </Space>
        </Card>
      </div>
    )
  }

  // 正常输入状态
  return (
    <div className={styles.commandInput}>
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={clearError}
          style={{ marginBottom: 8 }}
        />
      )}
      <Input
        ref={inputRef as any}
        placeholder={placeholder}
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        data-testid="goal-input"
        suffix={
          <Button
            type="text"
            size="small"
            icon={isLoading ? <LoadingOutlined /> : <SendOutlined />}
            onClick={handleSend}
            disabled={isLoading || !command.trim()}
            data-testid="start-button"
          />
        }
      />
    </div>
  )
}

export default CommandInput
