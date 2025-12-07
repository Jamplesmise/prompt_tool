'use client'

import { useRef, useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { Tooltip } from 'antd'
import styles from './TextEllipsis.module.css'

export type TextEllipsisProps = {
  children: ReactNode
  lines?: 1 | 2 | 3 | 4 | 5
  tooltip?: boolean
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
  style?: CSSProperties
}

export function TextEllipsis({
  children,
  lines = 1,
  tooltip = true,
  tooltipPlacement = 'top',
  className = '',
  style,
}: TextEllipsisProps) {
  const textRef = useRef<HTMLSpanElement>(null)
  const [isOverflow, setIsOverflow] = useState(false)

  useEffect(() => {
    const el = textRef.current
    if (!el) return

    const checkOverflow = () => {
      if (lines === 1) {
        setIsOverflow(el.scrollWidth > el.clientWidth)
      } else {
        setIsOverflow(el.scrollHeight > el.clientHeight)
      }
    }

    checkOverflow()

    const resizeObserver = new ResizeObserver(checkOverflow)
    resizeObserver.observe(el)

    return () => resizeObserver.disconnect()
  }, [children, lines])

  const textClassName = [
    styles.text,
    lines === 1 ? styles.singleLine : styles.multiLine,
    lines > 1 ? styles[`lines-${lines}`] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <span className={styles.wrapper} style={style}>
      <span ref={textRef} className={textClassName}>
        {children}
      </span>
    </span>
  )

  if (tooltip && isOverflow) {
    return (
      <Tooltip title={children} placement={tooltipPlacement}>
        {content}
      </Tooltip>
    )
  }

  return content
}
