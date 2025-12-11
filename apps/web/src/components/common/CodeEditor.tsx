'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Editor, { OnMount, BeforeMount, loader } from '@monaco-editor/react'
import { Select, InputNumber, Button, Tooltip, Dropdown, type MenuProps } from 'antd'
import {
  FileTextOutlined,
  ExpandOutlined,
  CompressOutlined,
  CopyOutlined,
  CheckOutlined,
  BgColorsOutlined,
} from '@ant-design/icons'
import { useMonacoLayout } from '@/hooks/useMonacoLayout'

type MonacoEditor = Parameters<OnMount>[0]
type Monaco = Parameters<BeforeMount>[0]

// 编辑器主题配置
const EDITOR_THEMES = {
  dark: {
    name: '深色',
    background: '#1a1a2e',
    foreground: '#e4e4e7',
    lineHighlight: '#27273a',
    selection: '#EF444440',
    cursor: '#EF4444',
    lineNumber: '#52525b',
    lineNumberActive: '#a1a1aa',
    gutter: '#1a1a2e',
    indent: '#27273a',
    indentActive: '#3f3f5a',
  },
  light: {
    name: '柔白',
    background: '#FAFAFA',
    foreground: '#374151',
    lineHighlight: '#F3F4F6',
    selection: '#EF444430',
    cursor: '#EF4444',
    lineNumber: '#9CA3AF',
    lineNumberActive: '#4B5563',
    gutter: '#FAFAFA',
    indent: '#E5E7EB',
    indentActive: '#D1D5DB',
  },
  peach: {
    name: '桃粉',
    background: '#FFF5F5',
    foreground: '#4A3728',
    lineHighlight: '#FFEAEA',
    selection: '#EF444425',
    cursor: '#EF4444',
    lineNumber: '#C9A89A',
    lineNumberActive: '#8B6F5C',
    gutter: '#FFF5F5',
    indent: '#FFE4E4',
    indentActive: '#FECACA',
  },
  cream: {
    name: '米黄',
    background: '#FFFBF0',
    foreground: '#5C4A32',
    lineHighlight: '#FFF6E0',
    selection: '#D9923025',
    cursor: '#D99230',
    lineNumber: '#C4A972',
    lineNumberActive: '#8B7355',
    gutter: '#FFFBF0',
    indent: '#F5ECD5',
    indentActive: '#E8DCC0',
  },
} as const

export type CodeEditorTheme = keyof typeof EDITOR_THEMES

export type CodeEditorLanguage = 'javascript' | 'python' | 'json' | 'markdown' | 'typescript' | 'prompt'

export type CodeEditorProps = {
  value?: string
  onChange?: (value: string) => void
  language?: CodeEditorLanguage
  height?: number | string
  readOnly?: boolean
  showToolbar?: boolean
  showStatusBar?: boolean
  showThemeSwitch?: boolean
  title?: string
  timeout?: number
  onTimeoutChange?: (value: number) => void
  onLanguageChange?: (language: CodeEditorLanguage) => void
  placeholder?: string
  theme?: CodeEditorTheme
  onThemeChange?: (theme: CodeEditorTheme) => void
}

const languageOptions = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'prompt', label: 'Prompt' },
]

const languageLabels: Record<CodeEditorLanguage, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  json: 'JSON',
  markdown: 'Markdown',
  prompt: 'Prompt',
}

// 主题和语言注册状态
let themesRegistered = false
let promptLanguageRegistered = false

// 注册所有主题
const registerThemes = (monaco: Monaco) => {
  if (themesRegistered) return

  Object.entries(EDITOR_THEMES).forEach(([key, theme]) => {
    const isLight = key !== 'dark'
    monaco.editor.defineTheme(`editor-theme-${key}`, {
      base: isLight ? 'vs' : 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'F97583' },
        { token: 'string', foreground: '9ECBFF' },
        { token: 'number', foreground: '79B8FF' },
        { token: 'function', foreground: 'B392F0' },
        { token: 'variable', foreground: 'EF4444', fontStyle: 'bold' },
        { token: 'type', foreground: '79B8FF' },
        { token: 'class', foreground: 'B392F0' },
      ],
      colors: {
        'editor.background': theme.background,
        'editor.foreground': theme.foreground,
        'editor.lineHighlightBackground': theme.lineHighlight,
        'editor.lineHighlightBorder': '#00000000',
        'editor.selectionBackground': theme.selection,
        'editorCursor.foreground': theme.cursor,
        'editorLineNumber.foreground': theme.lineNumber,
        'editorLineNumber.activeForeground': theme.lineNumberActive,
        'editorGutter.background': theme.gutter,
        'editorIndentGuide.background': theme.indent,
        'editorIndentGuide.activeBackground': theme.indentActive,
        'scrollbarSlider.background': `${theme.lineNumber}50`,
        'scrollbarSlider.hoverBackground': `${theme.lineNumber}80`,
        'scrollbarSlider.activeBackground': `${theme.lineNumber}a0`,
      },
    })
  })
  themesRegistered = true
}

// 注册 prompt 语言（支持变量高亮 {{var}}）
const registerPromptLanguage = (monaco: Monaco) => {
  if (promptLanguageRegistered) return
  if (monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === 'prompt')) {
    promptLanguageRegistered = true
    return
  }

  monaco.languages.register({ id: 'prompt' })
  monaco.languages.setMonarchTokensProvider('prompt', {
    tokenizer: {
      root: [
        [/\{\{[a-zA-Z_]\w*\}\}/, 'variable'],
      ],
    },
  })
  promptLanguageRegistered = true
}

// 初始化 Monaco
const initMonaco = () => {
  loader.init().then((monaco) => {
    registerThemes(monaco)
    registerPromptLanguage(monaco)
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
  showThemeSwitch = false,
  title = '代码',
  timeout,
  onTimeoutChange,
  onLanguageChange,
  placeholder,
  theme: propTheme,
  onThemeChange,
}: CodeEditorProps) {
  const { containerRef, isReady, handleEditorMount: baseHandleEditorMount, forceLayout } = useMonacoLayout()
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [currentTheme, setCurrentTheme] = useState<CodeEditorTheme>(propTheme || 'dark')
  const monacoRef = useRef<Monaco | null>(null)

  // 初始化 Monaco（注册主题和语言）
  useEffect(() => {
    initMonaco()
  }, [])

  // 同步外部主题变化
  useEffect(() => {
    if (propTheme && propTheme !== currentTheme) {
      setCurrentTheme(propTheme)
      if (monacoRef.current) {
        monacoRef.current.editor.setTheme(`editor-theme-${propTheme}`)
      }
    }
  }, [propTheme])

  const lineCount = value.split('\n').length
  const charCount = value.length
  const variableCount = language === 'prompt' ? (value.match(/\{\{[a-zA-Z_]\w*\}\}/g) || []).length : 0

  // 在 Monaco 加载前配置语言和主题
  const handleEditorWillMount: BeforeMount = useCallback((monaco) => {
    monacoRef.current = monaco
    registerThemes(monaco)
    registerPromptLanguage(monaco)
  }, [])

  const handleMount: OnMount = useCallback((editor, monaco) => {
    baseHandleEditorMount(editor, monaco)
    monacoRef.current = monaco
    monaco.editor.setTheme(`editor-theme-${currentTheme}`)

    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })
  }, [baseHandleEditorMount, currentTheme])

  // 切换主题
  const handleThemeChange = useCallback((theme: CodeEditorTheme) => {
    setCurrentTheme(theme)
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(`editor-theme-${theme}`)
    }
    onThemeChange?.(theme)
  }, [onThemeChange])

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
    forceLayout()
  }, [height, isFullscreen, forceLayout])

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
            {variableCount > 0 && (
              <span className="variable-count" style={{ marginLeft: 8, fontSize: 12, color: '#EF4444' }}>
                {variableCount} 个变量
              </span>
            )}
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

            {showThemeSwitch && (
              <Dropdown
                menu={{
                  items: Object.entries(EDITOR_THEMES).map(([key, theme]) => ({
                    key,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            background: theme.background,
                            border: '1px solid #E5E7EB',
                          }}
                        />
                        <span>{theme.name}</span>
                        {currentTheme === key && <span style={{ color: '#EF4444', marginLeft: 'auto' }}>✓</span>}
                      </div>
                    ),
                    onClick: () => handleThemeChange(key as CodeEditorTheme),
                  })),
                }}
                trigger={['click']}
              >
                <Button
                  type="text"
                  size="small"
                  className="toolbar-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px' }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 3,
                      background: EDITOR_THEMES[currentTheme].background,
                      border: '1px solid #D1D5DB',
                    }}
                  />
                  <BgColorsOutlined />
                </Button>
              </Dropdown>
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
        {isReady ? (
          <Editor
            height={isFullscreen ? 'calc(100vh - 80px)' : height}
            language={language}
            value={value}
            onChange={handleChange}
            beforeMount={handleEditorWillMount}
            onMount={handleMount}
            theme={`editor-theme-${currentTheme}`}
            loading={
              <div style={{
                height: isFullscreen ? 'calc(100vh - 80px)' : height,
                background: EDITOR_THEMES[currentTheme].background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: EDITOR_THEMES[currentTheme].lineNumber
              }}>
                加载编辑器...
              </div>
            }
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
              folding: language !== 'prompt',
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
        ) : (
          <div style={{
            height: isFullscreen ? 'calc(100vh - 80px)' : height,
            background: EDITOR_THEMES[currentTheme].background,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: EDITOR_THEMES[currentTheme].lineNumber
          }}>
            加载编辑器...
          </div>
        )}
      </div>

      {/* 状态栏 */}
      {showStatusBar && (
        <div
          className="code-editor-statusbar"
          style={{
            background: currentTheme === 'dark' ? '#252830' : EDITOR_THEMES[currentTheme].lineHighlight,
            borderTopColor: currentTheme === 'dark' ? '#2d3139' : EDITOR_THEMES[currentTheme].indent,
          }}
        >
          <div className="status-left">
            <span className="status-item" style={{ color: currentTheme === 'dark' ? '#8a919e' : EDITOR_THEMES[currentTheme].lineNumber }}>
              行 {cursorPosition.line}, 列 {cursorPosition.column}
            </span>
          </div>
          <div className="status-right">
            <span className="status-item" style={{ color: currentTheme === 'dark' ? '#8a919e' : EDITOR_THEMES[currentTheme].lineNumber }}>UTF-8</span>
            <span className="status-item" style={{ color: currentTheme === 'dark' ? '#8a919e' : EDITOR_THEMES[currentTheme].lineNumber }}>{languageLabels[language]}</span>
            <span className="status-item" style={{ color: currentTheme === 'dark' ? '#8a919e' : EDITOR_THEMES[currentTheme].lineNumber }}>
              {lineCount} 行, {charCount} 字符
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default CodeEditor
