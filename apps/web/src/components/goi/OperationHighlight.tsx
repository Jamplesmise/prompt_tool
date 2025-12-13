'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

type HighlightProps = {
  /** CSS 选择器定位目标元素 */
  targetSelector?: string
  /** 直接传入目标元素 */
  targetElement?: HTMLElement | null
  /** 是否激活高亮 */
  isActive: boolean
  /** 光圈颜色 */
  pulseColor?: string
  /** 是否显示点击效果 */
  showClickEffect?: boolean
  /** 点击效果结束回调 */
  onClickEffectEnd?: () => void
}

/**
 * 操作高亮组件 - 在目标元素周围显示呼吸光圈效果
 *
 * 用于 GOI 可视化执行时，高亮显示 AI 正在操作的元素
 */
export function OperationHighlight({
  targetSelector,
  targetElement,
  isActive,
  pulseColor = '#3b82f6',
  showClickEffect = false,
  onClickEffectEnd,
}: HighlightProps) {
  const [position, setPosition] = useState<DOMRect | null>(null)
  const [showClick, setShowClick] = useState(false)
  const [mounted, setMounted] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  // 客户端挂载检测
  useEffect(() => {
    setMounted(true)
  }, [])

  // 获取目标元素并更新位置
  const updatePosition = useCallback(() => {
    if (!isActive) {
      setPosition(null)
      return
    }

    const target =
      targetElement ||
      (targetSelector ? document.querySelector(targetSelector) : null)

    if (!target) {
      setPosition(null)
      return
    }

    const rect = (target as HTMLElement).getBoundingClientRect()
    setPosition(rect)
  }, [targetSelector, targetElement, isActive])

  // 监听位置变化
  useEffect(() => {
    if (!isActive) {
      setPosition(null)
      return
    }

    updatePosition()

    // 监听滚动和 resize
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    // 使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver(updatePosition)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
      observer.disconnect()
    }
  }, [targetSelector, targetElement, isActive, updatePosition])

  // 点击效果
  useEffect(() => {
    if (showClickEffect && position) {
      setShowClick(true)
      const timer = setTimeout(() => {
        setShowClick(false)
        onClickEffectEnd?.()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [showClickEffect, position, onClickEffectEnd])

  // SSR 安全检查
  if (!mounted || !isActive || !position) return null

  const highlightStyle: React.CSSProperties = {
    position: 'fixed',
    top: position.top - 4,
    left: position.left - 4,
    width: position.width + 8,
    height: position.height + 8,
    borderRadius: '6px',
    pointerEvents: 'none',
    zIndex: 10000,
    animation: 'goi-breathe 1.5s ease-in-out infinite',
  }

  const clickEffectStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '20px',
    height: '20px',
    marginTop: '-10px',
    marginLeft: '-10px',
    borderRadius: '50%',
    background: `${pulseColor}80`,
    animation: 'goi-click-ripple 0.5s ease-out forwards',
  }

  // 背景遮罩样式
  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    pointerEvents: 'none',
    background: 'transparent',
  }

  // 生成 CSS 关键帧动画
  const keyframes = `
    @keyframes goi-breathe {
      0%, 100% {
        box-shadow:
          0 0 0 2px ${pulseColor}80,
          0 0 0 4px ${pulseColor}50,
          0 0 0 8px ${pulseColor}20;
      }
      50% {
        box-shadow:
          0 0 0 4px ${pulseColor}90,
          0 0 0 8px ${pulseColor}60,
          0 0 0 12px ${pulseColor}30;
      }
    }
    @keyframes goi-click-ripple {
      0% { transform: scale(0); opacity: 0.6; }
      100% { transform: scale(3); opacity: 0; }
    }
  `

  return createPortal(
    <div ref={overlayRef} style={overlayStyle}>
      <style>{keyframes}</style>
      <div style={highlightStyle}>
        {showClick && <div style={clickEffectStyle} />}
      </div>
    </div>,
    document.body
  )
}

/**
 * 高亮效果类型
 */
export type HighlightType = 'pulse' | 'static' | 'success' | 'error'

/**
 * 预设高亮颜色
 */
export const HIGHLIGHT_COLORS: Record<HighlightType, string> = {
  pulse: '#3b82f6',   // 蓝色 - 正在操作
  static: '#6b7280', // 灰色 - 静态标记
  success: '#22c55e', // 绿色 - 成功
  error: '#ef4444',   // 红色 - 失败
}
