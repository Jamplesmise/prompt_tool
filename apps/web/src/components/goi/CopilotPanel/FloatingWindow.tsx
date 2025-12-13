'use client'

/**
 * 可拖拽可调整大小的悬浮窗口组件
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Button, Tooltip } from 'antd'
import {
  CloseOutlined,
  MinusOutlined,
  ExpandOutlined,
  CompressOutlined,
  PushpinOutlined,
  PushpinFilled,
} from '@ant-design/icons'
import styles from './styles.module.css'

type Position = { x: number; y: number }
type Size = { width: number; height: number }

export type FloatingWindowProps = {
  /** 窗口标题 */
  title: React.ReactNode
  /** 窗口图标 */
  icon?: React.ReactNode
  /** 是否显示 */
  visible: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 子元素 */
  children: React.ReactNode
  /** 默认位置 */
  defaultPosition?: Position
  /** 默认大小 */
  defaultSize?: Size
  /** 最小宽度 */
  minWidth?: number
  /** 最小高度 */
  minHeight?: number
  /** 最大宽度 */
  maxWidth?: number
  /** 最大高度 */
  maxHeight?: number
  /** 是否固定 */
  pinned?: boolean
  /** 固定状态改变 */
  onPinnedChange?: (pinned: boolean) => void
  /** 底部额外内容 */
  footer?: React.ReactNode
  /** 状态栏内容 */
  statusBar?: React.ReactNode
}

// 安全获取窗口宽度（SSR 兼容）
const getDefaultX = () => (typeof window !== 'undefined' ? window.innerWidth - 420 : 100)

export const FloatingWindow: React.FC<FloatingWindowProps> = ({
  title,
  icon,
  visible,
  onClose,
  children,
  defaultPosition,
  defaultSize = { width: 400, height: 600 },
  minWidth = 320,
  minHeight = 400,
  maxWidth = 800,
  maxHeight = 900,
  pinned = false,
  onPinnedChange,
  footer,
  statusBar,
}) => {
  // 延迟初始化位置以避免 SSR 问题
  const [position, setPosition] = useState<Position>(() =>
    defaultPosition || { x: getDefaultX(), y: 100 }
  )
  const [size, setSize] = useState<Size>(defaultSize)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeDirection, setResizeDirection] = useState<string>('')

  const windowRef = useRef<HTMLDivElement>(null)
  const dragStartPos = useRef<Position>({ x: 0, y: 0 })
  const dragStartWindowPos = useRef<Position>({ x: 0, y: 0 })
  const resizeStartSize = useRef<Size>({ width: 0, height: 0 })
  const resizeStartPos = useRef<Position>({ x: 0, y: 0 })
  const savedSize = useRef<Size>(defaultSize)
  const savedPosition = useRef<Position>(defaultPosition || { x: getDefaultX(), y: 100 })

  // 确保窗口在视口内
  const clampPosition = useCallback((pos: Position, windowSize: Size): Position => {
    if (typeof window === 'undefined') return pos
    const maxX = window.innerWidth - windowSize.width
    const maxY = window.innerHeight - windowSize.height
    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY)),
    }
  }, [])

  // 处理拖拽开始
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return
    e.preventDefault()
    setIsDragging(true)
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    dragStartWindowPos.current = { ...position }
  }, [isMaximized, position])

  // 处理调整大小开始
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
    if (isMaximized) return
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    setResizeDirection(direction)
    resizeStartPos.current = { x: e.clientX, y: e.clientY }
    resizeStartSize.current = { ...size }
    dragStartWindowPos.current = { ...position }
  }, [isMaximized, size, position])

  // 处理鼠标移动
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStartPos.current.x
        const deltaY = e.clientY - dragStartPos.current.y
        const newPos = {
          x: dragStartWindowPos.current.x + deltaX,
          y: dragStartWindowPos.current.y + deltaY,
        }
        setPosition(clampPosition(newPos, size))
      }

      if (isResizing) {
        const deltaX = e.clientX - resizeStartPos.current.x
        const deltaY = e.clientY - resizeStartPos.current.y
        let newWidth = resizeStartSize.current.width
        let newHeight = resizeStartSize.current.height
        let newX = dragStartWindowPos.current.x
        let newY = dragStartWindowPos.current.y

        if (resizeDirection.includes('e')) {
          newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStartSize.current.width + deltaX))
        }
        if (resizeDirection.includes('w')) {
          const widthDelta = Math.min(deltaX, resizeStartSize.current.width - minWidth)
          const actualDelta = Math.max(widthDelta, resizeStartSize.current.width - maxWidth)
          newWidth = resizeStartSize.current.width - actualDelta
          newX = dragStartWindowPos.current.x + actualDelta
        }
        if (resizeDirection.includes('s')) {
          newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStartSize.current.height + deltaY))
        }
        if (resizeDirection.includes('n')) {
          const heightDelta = Math.min(deltaY, resizeStartSize.current.height - minHeight)
          const actualDelta = Math.max(heightDelta, resizeStartSize.current.height - maxHeight)
          newHeight = resizeStartSize.current.height - actualDelta
          newY = dragStartWindowPos.current.y + actualDelta
        }

        setSize({ width: newWidth, height: newHeight })
        setPosition(clampPosition({ x: newX, y: newY }, { width: newWidth, height: newHeight }))
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setResizeDirection('')
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isResizing, resizeDirection, size, clampPosition, minWidth, minHeight, maxWidth, maxHeight])

  // 最小化
  const handleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev)
  }, [])

  // 最大化
  const handleMaximize = useCallback(() => {
    if (typeof window === 'undefined') return
    if (isMaximized) {
      setSize(savedSize.current)
      setPosition(savedPosition.current)
    } else {
      savedSize.current = size
      savedPosition.current = position
      setSize({ width: window.innerWidth - 100, height: window.innerHeight - 100 })
      setPosition({ x: 50, y: 50 })
    }
    setIsMaximized((prev) => !prev)
  }, [isMaximized, size, position])

  // 切换固定状态
  const handleTogglePin = useCallback(() => {
    onPinnedChange?.(!pinned)
  }, [pinned, onPinnedChange])

  if (!visible) return null

  const windowStyle: React.CSSProperties = {
    position: 'fixed',
    left: position.x,
    top: position.y,
    width: isMinimized ? 300 : size.width,
    height: isMinimized ? 48 : size.height,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    transition: isMinimized ? 'all 0.2s ease' : undefined,
  }

  return (
    <div
      ref={windowRef}
      className={styles.floatingWindow}
      style={windowStyle}
    >
      {/* 标题栏 */}
      <div
        className={styles.windowHeader}
        onMouseDown={handleDragStart}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <div className={styles.windowTitle}>
          {icon && <span className={styles.windowIcon}>{icon}</span>}
          <span>{title}</span>
        </div>
        <div className={styles.windowControls}>
          <Tooltip title={pinned ? '取消固定' : '固定窗口'}>
            <Button
              type="text"
              size="small"
              icon={pinned ? <PushpinFilled /> : <PushpinOutlined />}
              onClick={handleTogglePin}
              className={styles.windowButton}
            />
          </Tooltip>
          <Tooltip title="最小化">
            <Button
              type="text"
              size="small"
              icon={<MinusOutlined />}
              onClick={handleMinimize}
              className={styles.windowButton}
            />
          </Tooltip>
          <Tooltip title={isMaximized ? '还原' : '最大化'}>
            <Button
              type="text"
              size="small"
              icon={isMaximized ? <CompressOutlined /> : <ExpandOutlined />}
              onClick={handleMaximize}
              className={styles.windowButton}
            />
          </Tooltip>
          <Tooltip title="关闭">
            <Button
              type="text"
              size="small"
              icon={<CloseOutlined />}
              onClick={onClose}
              className={styles.windowButton}
            />
          </Tooltip>
        </div>
      </div>

      {/* 内容区域 */}
      {!isMinimized && (
        <>
          <div className={styles.windowContent}>
            {children}
          </div>

          {/* 底部区域 */}
          {footer && (
            <div className={styles.windowFooter}>
              {footer}
            </div>
          )}

          {/* 状态栏 */}
          {statusBar && (
            <div className={styles.windowStatusBar}>
              {statusBar}
            </div>
          )}
        </>
      )}

      {/* 调整大小的边框 */}
      {!isMinimized && !isMaximized && (
        <>
          <div className={`${styles.resizeHandle} ${styles.resizeN}`} onMouseDown={(e) => handleResizeStart(e, 'n')} />
          <div className={`${styles.resizeHandle} ${styles.resizeS}`} onMouseDown={(e) => handleResizeStart(e, 's')} />
          <div className={`${styles.resizeHandle} ${styles.resizeE}`} onMouseDown={(e) => handleResizeStart(e, 'e')} />
          <div className={`${styles.resizeHandle} ${styles.resizeW}`} onMouseDown={(e) => handleResizeStart(e, 'w')} />
          <div className={`${styles.resizeHandle} ${styles.resizeNE}`} onMouseDown={(e) => handleResizeStart(e, 'ne')} />
          <div className={`${styles.resizeHandle} ${styles.resizeNW}`} onMouseDown={(e) => handleResizeStart(e, 'nw')} />
          <div className={`${styles.resizeHandle} ${styles.resizeSE}`} onMouseDown={(e) => handleResizeStart(e, 'se')} />
          <div className={`${styles.resizeHandle} ${styles.resizeSW}`} onMouseDown={(e) => handleResizeStart(e, 'sw')} />
        </>
      )}
    </div>
  )
}

export default FloatingWindow
