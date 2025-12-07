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
    separator?: string  // 键之间的分隔符，默认 '+'
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
        { keys: [modKey, 'K'], description: '打开命令面板' },
        { keys: [modKey, 'N'], description: '新建任务' },
        { keys: [modKey, ','], description: '打开设置' },
        { keys: ['?'], description: '显示快捷键帮助' },
      ],
    },
    {
      title: '导航 (按 G 后接字母)',
      shortcuts: [
        { keys: ['G', 'H'], description: '前往工作台', separator: ' ' },
        { keys: ['G', 'P'], description: '前往提示词管理', separator: ' ' },
        { keys: ['G', 'D'], description: '前往数据集', separator: ' ' },
        { keys: ['G', 'M'], description: '前往模型配置', separator: ' ' },
        { keys: ['G', 'E'], description: '前往评估器', separator: ' ' },
        { keys: ['G', 'T'], description: '前往测试任务', separator: ' ' },
        { keys: ['G', 'S'], description: '前往设置', separator: ' ' },
        { keys: ['G', 'C'], description: '前往对比分析', separator: ' ' },
        { keys: ['G', 'O'], description: '前往监控中心', separator: ' ' },
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
      title: '列表',
      shortcuts: [
        { keys: ['↑', '↓'], description: '上下移动选择', separator: ' / ' },
        { keys: ['Enter'], description: '确认选择' },
        { keys: ['Tab'], description: '下一个字段' },
        { keys: ['Shift', 'Tab'], description: '上一个字段' },
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
      width={520}
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
                          <span className={styles.separator}>
                            {shortcut.separator ?? '+'}
                          </span>
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

        <div className={styles.tip}>
          提示：序列快捷键 (如 G H) 需要在 800ms 内连续按下
        </div>
      </div>
    </Modal>
  )
}
