'use client'

import { useState, useRef, useEffect } from 'react'
import Editor, { OnMount, loader } from '@monaco-editor/react'
import { Select, InputNumber, Button, Tooltip } from 'antd'
import {
  FileTextOutlined,
  ExpandOutlined,
  CompressOutlined,
  CopyOutlined,
  CheckOutlined,
} from '@ant-design/icons'

type MonacoEditor = Parameters<OnMount>[0]

export type CodeEditorLanguage = 'javascript' | 'python' | 'json' | 'markdown' | 'typescript'

export type CodeEditorProps = {
  value?: string
  onChange?: (value: string) => void
  language?: CodeEditorLanguage
  height?: number | string
  readOnly?: boolean
  showToolbar?: boolean
  showStatusBar?: boolean
  title?: string
  timeout?: number
  onTimeoutChange?: (value: number) => void
  onLanguageChange?: (language: CodeEditorLanguage) => void
  placeholder?: string
}

const languageOptions = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
]

const languageLabels: Record<CodeEditorLanguage, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  json: 'JSON',
  markdown: 'Markdown',
}

// 注册自定义主题
let themeRegistered = false

const registerCustomTheme = () => {
  if (themeRegistered) return

  loader.init().then((monaco) => {
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'F97583' },
        { token: 'string', foreground: '9ECBFF' },
        { token: 'number', foreground: '79B8FF' },
        { token: 'function', foreground: 'B392F0' },
        { token: 'variable', foreground: 'E1E4E8' },
        { token: 'type', foreground: '79B8FF' },
        { token: 'class', foreground: 'B392F0' },
      ],
      colors: {
        'editor.background': '#1a1d23',
        'editor.foreground': '#E1E4E8',
        'editor.lineHighlightBackground': '#2a2e38',
        'editor.lineHighlightBorder': '#2a2e38',
        'editor.selectionBackground': '#3b4252',
        'editor.selectionHighlightBackground': '#3b425280',
        'editorLineNumber.foreground': '#4a5568',
        'editorLineNumber.activeForeground': '#a0aec0',
        'editorCursor.foreground': '#EF4444',
        'scrollbarSlider.background': '#3b425250',
        'scrollbarSlider.hoverBackground': '#3b425280',
        'scrollbarSlider.activeBackground': '#3b4252a0',
        'editorWidget.border': '#2d3139',
      },
    })
    themeRegistered = true
  })
}

export function CodeEditor({
  value = '',
  onChange,
  language = 'javascript',
  height = 350,
  readOnly = false,
  showToolbar = true,
  showStatusBar = true,
  title = '代码',
  timeout,
  onTimeoutChange,
  onLanguageChange,
  placeholder,
}: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor | null>(null)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 注册主题
  useEffect(() => {
    registerCustomTheme()
  }, [])

  const lineCount = value.split('\n').length
  const charCount = value.length

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor

    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })
  }

  const handleChange = (val: string | undefined) => {
    onChange?.(val || '')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 忽略复制失败
    }
  }

  const handleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // 更新编辑器布局
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.layout()
    }
  }, [height, isFullscreen])

  return (
    <div
      ref={containerRef}
      className="code-editor-container"
      style={isFullscreen ? { height: '100vh', borderRadius: 0 } : undefined}
    >
      {/* 工具栏 */}
      {showToolbar && (
        <div className="code-editor-toolbar">
          <div className="toolbar-left">
            <span className="toolbar-icon">
              <FileTextOutlined />
            </span>
            <span className="toolbar-title">{title}</span>
          </div>

          <div className="toolbar-right">
            {onLanguageChange && (
              <Select
                value={language}
                options={languageOptions}
                size="small"
                variant="borderless"
                className="language-select"
                onChange={onLanguageChange}
                popupMatchSelectWidth={false}
              />
            )}

            {timeout !== undefined && onTimeoutChange && (
              <div className="timeout-config">
                <span>超时:</span>
                <InputNumber
                  value={timeout}
                  onChange={(val) => onTimeoutChange(val || 5000)}
                  min={1000}
                  max={60000}
                  step={1000}
                  size="small"
                  variant="borderless"
                  formatter={(val) => `${val}`}
                />
                <span>ms</span>
              </div>
            )}

            <Tooltip title={copied ? '已复制' : '复制代码'}>
              <Button
                type="text"
                size="small"
                icon={copied ? <CheckOutlined style={{ color: '#10B981' }} /> : <CopyOutlined />}
                className="toolbar-btn"
                onClick={handleCopy}
              />
            </Tooltip>

            <Tooltip title={isFullscreen ? '退出全屏' : '全屏编辑'}>
              <Button
                type="text"
                size="small"
                icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
                className="toolbar-btn"
                onClick={handleFullscreen}
              />
            </Tooltip>
          </div>
        </div>
      )}

      {/* 编辑器主体 */}
      <div className="code-editor-body">
        <Editor
          height={isFullscreen ? 'calc(100vh - 80px)' : height}
          language={language}
          value={value}
          onChange={handleChange}
          onMount={handleMount}
          theme="custom-dark"
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, Consolas, monospace",
            fontLigatures: true,
            lineHeight: 22,
            padding: { top: 16, bottom: 16 },
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            lineNumbers: 'on',
            lineNumbersMinChars: 4,
            glyphMargin: false,
            folding: true,
            renderLineHighlight: 'line',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            placeholder: placeholder,
          }}
        />
      </div>

      {/* 状态栏 */}
      {showStatusBar && (
        <div className="code-editor-statusbar">
          <div className="status-left">
            <span className="status-item">
              第 {cursorPosition.line} 行, 第 {cursorPosition.column} 列
            </span>
          </div>
          <div className="status-right">
            <span className="status-item">UTF-8</span>
            <span className="status-item">{languageLabels[language]}</span>
            <span className="status-item">
              {lineCount} 行, {charCount} 字符
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default CodeEditor
