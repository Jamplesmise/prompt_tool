'use client'

import { useRef, useState, useEffect, useCallback, type RefObject } from 'react'
import type { OnMount } from '@monaco-editor/react'

// 使用简化的编辑器类型，避免 monaco-editor 内部类型依赖
type EditorInstance = {
  layout: () => void
  getValue: () => string
  setValue: (value: string) => void
}

// 定义返回类型
type UseMonacoLayoutReturn = {
  containerRef: RefObject<HTMLDivElement>
  editorRef: RefObject<EditorInstance | null>
  isReady: boolean
  handleEditorMount: OnMount
  forceLayout: () => void
}

/**
 * Monaco 编辑器布局修复 Hook
 *
 * 解决 Monaco 编辑器在某些情况下显示为黑色竖条的问题：
 * 1. 等待容器宽度计算完成后再渲染编辑器
 * 2. 在编辑器挂载后延迟触发布局更新
 * 3. 监听容器尺寸变化，手动触发重新布局
 *
 * @example
 * ```tsx
 * const { containerRef, editorRef, isReady, handleEditorMount } = useMonacoLayout()
 *
 * return (
 *   <div ref={containerRef}>
 *     {isReady && (
 *       <Editor onMount={handleEditorMount} ... />
 *     )}
 *   </div>
 * )
 * ```
 */
export function useMonacoLayout(): UseMonacoLayoutReturn {
  const containerRef = useRef<HTMLDivElement>(null!)
  const editorRef = useRef<EditorInstance | null>(null)
  const [isReady, setIsReady] = useState(false)
  const checkCountRef = useRef(0)
  const maxChecks = 50 // 最多检测 50 次（约 500ms）

  // 确保容器有宽度后再渲染编辑器
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let animationId: number | null = null
    checkCountRef.current = 0

    const checkReady = () => {
      checkCountRef.current++

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const width = rect.width

        // 容器有有效宽度（至少 50px）时才认为准备好
        if (width >= 50) {
          setIsReady(true)
          return
        }
      }

      // 如果还没准备好且未超过最大检测次数，继续等待
      if (checkCountRef.current < maxChecks) {
        // 使用 setTimeout + requestAnimationFrame 双重确保
        timeoutId = setTimeout(() => {
          animationId = requestAnimationFrame(checkReady)
        }, 10)
      } else {
        // 超过最大检测次数，强制设置为 ready（避免永远卡住）
        console.warn('[useMonacoLayout] Container width check timeout, forcing ready state')
        setIsReady(true)
      }
    }

    // 初始延迟一帧后开始检测，确保 DOM 已渲染
    animationId = requestAnimationFrame(() => {
      // 再延迟一小段时间，确保 CSS 布局计算完成
      timeoutId = setTimeout(checkReady, 10)
    })

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [])

  // 监听容器尺寸变化，手动触发编辑器布局更新
  useEffect(() => {
    if (!containerRef.current || !isReady) return

    const resizeObserver = new ResizeObserver(() => {
      // 使用 requestAnimationFrame 确保在下一帧执行布局
      requestAnimationFrame(() => {
        editorRef.current?.layout()
      })
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [isReady])

  // 编辑器挂载回调，包含布局修复逻辑
  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor as EditorInstance

    // 多次延迟触发布局更新，确保容器尺寸已计算完成
    // 这是解决 Monaco 编辑器显示为黑色竖条问题的关键
    const layoutDelays = [0, 50, 100, 200, 500]
    layoutDelays.forEach((delay) => {
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.layout()
        }
      }, delay)
    })

    // 使用 requestAnimationFrame 确保在渲染周期内更新
    requestAnimationFrame(() => {
      editor.layout()
      // 再次延迟确保
      requestAnimationFrame(() => {
        editor.layout()
      })
    })
  }, [])

  // 手动触发布局更新
  const forceLayout = useCallback(() => {
    editorRef.current?.layout()
  }, [])

  return {
    containerRef,
    editorRef,
    isReady,
    handleEditorMount,
    forceLayout,
  }
}

export default useMonacoLayout
