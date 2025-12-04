'use client'

import type { ReactNode } from 'react'
import styles from './SettingsCard.module.css'

type SettingsCardProps = {
  title: string
  description?: string
  children: ReactNode
  extra?: ReactNode
}

export function SettingsCard({ title, description, children, extra }: SettingsCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleWrapper}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {extra && <div className={styles.extra}>{extra}</div>}
      </div>
      <div className={styles.divider} />
      <div className={styles.content}>{children}</div>
    </div>
  )
}
