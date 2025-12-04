'use client'

import { Modal, Typography } from 'antd'
import { useMemo } from 'react'
import { getModifierKey } from '@/hooks/useHotkeys'
import styles from './KeyboardShortcutsHelp.module.css'

const { Title } = Typography

// 快捷键分组
type ShortcutGroup = {
  title: string
  shortcuts: {
    keys: string[]
    description: string
  }[]
}

type KeyboardShortcutsHelpProps = {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcutsHelp({ open, onClose }: KeyboardShortcutsHelpProps) {
  const modKey = getModifierKey()

  // 快捷键分组数据
  const shortcutGroups: ShortcutGroup[] = useMemo(() => [
    {
      title: '全局',
      shortcuts: [
        { keys: [modKey, 'K'], description: '打开全局搜索' },
        { keys: [modKey, 'N'], description: '新建任务' },
        { keys: [modKey, ','], description: '打开设置' },
        { keys: ['?'], description: '显示快捷键帮助' },
      ],
    },
    {
      title: '编辑',
      shortcuts: [
        { keys: [modKey, 'S'], description: '保存当前编辑' },
        { keys: ['Esc'], description: '关闭弹窗/取消' },
      ],
    },
    {
      title: '导航',
      shortcuts: [
        { keys: ['↑', '↓'], description: '上下移动选择' },
        { keys: ['Enter'], description: '确认选择' },
        { keys: ['Tab'], description: '下一个字段' },
        { keys: ['Shift', 'Tab'], description: '上一个字段' },
      ],
    },
    {
      title: '搜索框',
      shortcuts: [
        { keys: ['>'], description: '进入命令模式' },
        { keys: ['Backspace'], description: '退出命令模式' },
      ],
    },
  ], [modKey])

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <div className={styles.modalTitle}>
          <span className={styles.titleIcon}>⌨️</span>
          快捷键帮助
        </div>
      }
      width={500}
      centered
    >
      <div className={styles.container}>
        {shortcutGroups.map(group => (
          <div key={group.title} className={styles.group}>
            <Title level={5} className={styles.groupTitle}>
              {group.title}
            </Title>
            <div className={styles.shortcuts}>
              {group.shortcuts.map((shortcut, index) => (
                <div key={index} className={styles.shortcutItem}>
                  <div className={styles.keys}>
                    {shortcut.keys.map((key, keyIndex) => (
                      <span key={keyIndex}>
                        <kbd className={styles.key}>{key}</kbd>
                        {keyIndex < shortcut.keys.length - 1 && (
                          <span className={styles.plus}>+</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className={styles.description}>
                    {shortcut.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
