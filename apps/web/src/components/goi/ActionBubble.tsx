'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'

type BubblePosition = 'top' | 'bottom' | 'left' | 'right' | 'auto'

type ActionBubbleProps = {
  /** CSS 选择器定位目标元素 */
  targetSelector?: string
  /** 直接传入目标元素 */
  targetElement?: HTMLElement | null
  /** 显示的消息 */
  message: string
  /** 图标 */
  icon?: string
  /** 气泡位置 */
  position?: BubblePosition
  /** 是否可见 */
  isVisible: boolean
  /** 自动隐藏时间（ms），-1 表示不自动隐藏 */
  autoHide?: number
  /** 隐藏回调 */
  onHide?: () => void
  /** 气泡主题 */
  theme?: 'dark' | 'light'
}

/**
 * 操作说明气泡 - 显示 AI 正在执行的操作说明
 *
 * 在目标元素附近显示一个气泡，告诉用户 AI 正在做什么
 */
export function ActionBubble({
  targetSelector,
  targetElement,
  message,
  icon = '🤖',
  position = 'auto',
  isVisible,
  autoHide,
  onHide,
  theme = 'dark',
}: ActionBubbleProps) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [actualPosition, setActualPosition] = useState<Exclude<BubblePosition, 'auto'>>('top')

  // 客户端挂载检测
  useEffect(() => {
    setMounted(true)
  }, [])

  // 计算最佳位置
  const calculateBestPosition = useCallback(
    (rect: DOMRect): Exclude<BubblePosition, 'auto'> => {
      if (position !== 'auto') return position

      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth
      const padding = 100 // 气泡预估宽度

      // 优先顺序：top > bottom > right > left
      if (rect.top > padding) return 'top'
      if (viewportHeight - rect.bottom > padding) return 'bottom'
      if (viewportWidth - rect.right > padding) return 'right'
      if (rect.left > padding) return 'left'
      return 'top'
    },
    [position]
  )

  // 计算气泡坐标
  const updateCoords = useCallback(() => {
    if (!isVisible) {
      setVisible(false)
      return
    }

    const target =
      targetElement ||
      (targetSelector ? document.querySelector(targetSelector) : null)

    if (!target) {
      setVisible(false)
      return
    }

    const rect = (target as HTMLElement).getBoundingClientRect()
    const bestPosition = calculateBestPosition(rect)
    setActualPosition(bestPosition)

    const gap = 12

    let x: number
    let y: number

    switch (bestPosition) {
      case 'top':
        x = rect.left + rect.width / 2
        y = rect.top - gap
        break
      case 'bottom':
        x = rect.left + rect.width / 2
        y = rect.bottom + gap
        break
      case 'left':
        x = rect.left - gap
        y = rect.top + rect.height / 2
        break
      case 'right':
        x = rect.right + gap
        y = rect.top + rect.height / 2
        break
    }

    setCoords({ x, y })
    setVisible(true)
  }, [targetSelector, targetElement, isVisible, calculateBestPosition])

  // 监听位置变化
  useEffect(() => {
    updateCoords()

    if (isVisible) {
      window.addEventListener('scroll', updateCoords, true)
      window.addEventListener('resize', updateCoords)

      return () => {
        window.removeEventListener('scroll', updateCoords, true)
        window.removeEventListener('resize', updateCoords)
      }
    }
  }, [isVisible, updateCoords])

  // 自动隐藏
  useEffect(() => {
    if (!visible || !autoHide || autoHide < 0) return

    const timer = setTimeout(() => {
      setVisible(false)
      onHide?.()
    }, autoHide)

    return () => clearTimeout(timer)
  }, [visible, autoHide, onHide])

  // 主题样式
  const themeStyles = useMemo(() => {
    if (theme === 'dark') {
      return {
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: 'white',
        arrowColor: '#334155',
        arrowColorAlt: '#1e293b',
      }
    }
    return {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      color: '#1e293b',
      arrowColor: '#f8fafc',
      arrowColorAlt: '#ffffff',
    }
  }, [theme])

  // SSR 安全检查
  if (!mounted || !visible || !coords) return null

  // 气泡基础样式
  const bubbleStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10001,
    padding: '8px 12px',
    borderRadius: '8px',
    background: themeStyles.background,
    color: themeStyles.color,
    fontSize: '14px',
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap',
    maxWidth: '300px',
    animation: `goi-bubble-appear-${actualPosition} 0.2s ease-out`,
    ...(actualPosition === 'top' && {
      left: coords.x,
      top: coords.y,
      transform: 'translate(-50%, -100%)',
    }),
    ...(actualPosition === 'bottom' && {
      left: coords.x,
      top: coords.y,
      transform: 'translate(-50%, 0)',
    }),
    ...(actualPosition === 'left' && {
      left: coords.x,
      top: coords.y,
      transform: 'translate(-100%, -50%)',
    }),
    ...(actualPosition === 'right' && {
      left: coords.x,
      top: coords.y,
      transform: 'translate(0, -50%)',
    }),
  }

  // 箭头样式
  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    border: '6px solid transparent',
    ...(actualPosition === 'top' && {
      bottom: '-12px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderTopColor: themeStyles.arrowColor,
    }),
    ...(actualPosition === 'bottom' && {
      top: '-12px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderBottomColor: themeStyles.arrowColorAlt,
    }),
    ...(actualPosition === 'left' && {
      right: '-12px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderLeftColor: themeStyles.arrowColor,
    }),
    ...(actualPosition === 'right' && {
      left: '-12px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderRightColor: themeStyles.arrowColorAlt,
    }),
  }

  // 动画关键帧
  const keyframes = `
    @keyframes goi-bubble-appear-top {
      from { opacity: 0; transform: translate(-50%, -90%) scale(0.9); }
      to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
    }
    @keyframes goi-bubble-appear-bottom {
      from { opacity: 0; transform: translate(-50%, -10%) scale(0.9); }
      to { opacity: 1; transform: translate(-50%, 0) scale(1); }
    }
    @keyframes goi-bubble-appear-left {
      from { opacity: 0; transform: translate(-90%, -50%) scale(0.9); }
      to { opacity: 1; transform: translate(-100%, -50%) scale(1); }
    }
    @keyframes goi-bubble-appear-right {
      from { opacity: 0; transform: translate(-10%, -50%) scale(0.9); }
      to { opacity: 1; transform: translate(0, -50%) scale(1); }
    }
  `

  return createPortal(
    <>
      <style>{keyframes}</style>
      <div style={bubbleStyle}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {message}
        </span>
        <div style={arrowStyle} />
      </div>
    </>,
    document.body
  )
}

/**
 * 预设图标
 */
export const BUBBLE_ICONS = {
  robot: '🤖',
  loading: '⏳',
  success: '✓',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  click: '👆',
  type: '⌨️',
  navigate: '🧭',
  select: '📋',
  create: '➕',
  edit: '✏️',
  delete: '🗑️',
} as const

export type BubbleIconType = keyof typeof BUBBLE_ICONS
