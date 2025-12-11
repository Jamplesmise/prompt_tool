'use client'

import { Slider } from 'antd'
import { FontSizeOutlined } from '@ant-design/icons'
import { useSettingsStore } from '@/stores/settingsStore'
import styles from '../settings.module.css'

export function AppearancePanel() {
  const fontSize = useSettingsStore((state) => state.fontSize)
  const setFontSize = useSettingsStore((state) => state.setFontSize)

  return (
    <div className={styles.panelContent}>
      <div className={styles.appearanceItem}>
        <div className={styles.appearanceLabel}>
          <FontSizeOutlined style={{ marginRight: 8 }} />
          <span>字体大小</span>
        </div>
        <div className={styles.appearanceControl}>
          <span className={styles.fontSizeValue}>A</span>
          <Slider
            min={12}
            max={18}
            value={fontSize}
            onChange={setFontSize}
            style={{ width: '12em' }}
            tooltip={{ formatter: (v) => `${v}px` }}
          />
          <span className={styles.fontSizeValueLg}>A</span>
          <span className={styles.fontSizeNum}>{fontSize}px</span>
        </div>
      </div>
    </div>
  )
}
