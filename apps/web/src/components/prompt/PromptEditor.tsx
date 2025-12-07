'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import Editor, { OnMount, OnChange, Monaco, BeforeMount } from '@monaco-editor/react'
import { CopyOutlined, ExpandOutlined, CompressOutlined, BgColorsOutlined } from '@ant-design/icons'
import { message, Dropdown, type MenuProps } from 'antd'

// 编辑器背景色主题配置
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

type ThemeKey = keyof typeof EDITOR_THEMES

type PromptEditorProps = {
  value: string
  onChange: (value: string) => void
  height?: number | string
  readOnly?: boolean
  title?: string
  showToolbar?: boolean
  showStatusBar?: boolean
}

type MonacoEditor = Parameters<OnMount>[0]

export function PromptEditor({
  value,
  onChange,
  height = 400,
  readOnly = false,
  title,
  showToolbar = true,
  showStatusBar = true,
}: PromptEditorProps) {
  const editorRef = useRef<MonacoEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const isInternalChange = useRef(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 })
  const [currentTheme, setCurrentTheme] = useState<ThemeKey>('dark')

  // 定义所有主题
  const defineThemes = useCallback((monaco: Monaco) => {
    Object.entries(EDITOR_THEMES).forEach(([key, theme]) => {
      const isLight = key !== 'dark'
      monaco.editor.defineTheme(`prompt-theme-${key}`, {
        base: isLight ? 'vs' : 'vs-dark',
        inherit: true,
        rules: [
          { token: 'variable', foreground: 'EF4444', fontStyle: 'bold' },
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
        },
      })
    })
  }, [])

  // 在 Monaco 加载前配置语言和主题
  const handleEditorWillMount: BeforeMount = useCallback((monaco) => {
    // 注册变量高亮语言（只注册一次）
    if (!monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === 'prompt')) {
      monaco.languages.register({ id: 'prompt' })

      // 设置语法高亮规则
      monaco.languages.setMonarchTokensProvider('prompt', {
        tokenizer: {
          root: [
            [/\{\{[a-zA-Z_]\w*\}\}/, 'variable'],
          ],
        },
      })

      // 定义所有主题
      defineThemes(monaco)
    }
  }, [defineThemes])

  const handleEditorMount: OnMount = useCallback((editor, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    monaco.editor.setTheme(`prompt-theme-${currentTheme}`)

    // 监听光标位置变化
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      })
    })
  }, [currentTheme])

  // 切换主题
  const handleThemeChange = useCallback((theme: ThemeKey) => {
    setCurrentTheme(theme)
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(`prompt-theme-${theme}`)
    }
  }, [])

  const handleChange: OnChange = useCallback((newValue) => {
    isInternalChange.current = true
    onChange(newValue ?? '')
  }, [onChange])

  // 同步外部 value 变化到编辑器
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const currentValue = editorRef.current.getValue()
      if (currentValue !== value) {
        editorRef.current.setValue(value)
      }
    }
    isInternalChange.current = false
  }, [value])

  // 复制代码
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败')
    }
  }, [value])

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  // 统计信息
  const lineCount = value.split('\n').length
  const charCount = value.length
  const variableCount = (value.match(/\{\{[a-zA-Z_]\w*\}\}/g) || []).length

  // 主题下拉菜单配置
  const themeMenuItems: MenuProps['items'] = Object.entries(EDITOR_THEMES).map(([key, theme]) => ({
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
    onClick: () => handleThemeChange(key as ThemeKey),
  }))

  const themeConfig = EDITOR_THEMES[currentTheme]

  const containerStyle: React.CSSProperties = isFullscreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        background: themeConfig.background,
      }
    : {}

  const editorHeight = isFullscreen ? 'calc(100vh - 76px)' : height

  return (
    <div className="code-editor-container" style={containerStyle}>
      {showToolbar && (
        <div className="code-editor-toolbar">
          <div className="toolbar-left">
            {title && <span className="toolbar-title">{title}</span>}
            <span className="toolbar-info">
              {variableCount > 0 && (
                <span className="variable-count">{variableCount} 个变量</span>
              )}
            </span>
          </div>
          <div className="toolbar-right">
            <Dropdown menu={{ items: themeMenuItems }} trigger={['click']}>
              <button
                className="toolbar-btn"
                title="切换背景色"
                style={{
                  width: 'auto',
                  padding: '0 8px',
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: themeConfig.background,
                    border: '1px solid #D1D5DB',
                  }}
                />
                <BgColorsOutlined />
              </button>
            </Dropdown>
            <button
              className="toolbar-btn"
              onClick={handleCopy}
              title="复制"
            >
              <CopyOutlined />
            </button>
            <button
              className="toolbar-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? '退出全屏' : '全屏'}
            >
              {isFullscreen ? <CompressOutlined /> : <ExpandOutlined />}
            </button>
          </div>
        </div>
      )}

      <Editor
        height={editorHeight}
        language="prompt"
        value={value}
        onChange={handleChange}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorMount}
        loading={
          <div style={{ height: editorHeight, background: themeConfig.background, display: 'flex', alignItems: 'center', justifyContent: 'center', color: themeConfig.lineNumber }}>
            加载编辑器...
          </div>
        }
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          tabSize: 2,
          readOnly,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          folding: false,
          glyphMargin: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 3,
          renderLineHighlight: 'line',
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          overviewRulerLanes: 0,
        }}
        theme={`prompt-theme-${currentTheme}`}
      />

      {showStatusBar && (
        <div
          className="code-editor-statusbar"
          style={{
            background: currentTheme === 'dark' ? '#252830' : themeConfig.lineHighlight,
            borderTopColor: currentTheme === 'dark' ? '#2d3139' : themeConfig.indent,
          }}
        >
          <div className="statusbar-left">
            <span style={{ color: currentTheme === 'dark' ? '#8a919e' : themeConfig.lineNumber }}>
              行 {cursorPosition.line}, 列 {cursorPosition.column}
            </span>
          </div>
          <div className="statusbar-right">
            <span style={{ color: currentTheme === 'dark' ? '#8a919e' : themeConfig.lineNumber }}>Prompt</span>
            <span style={{ color: currentTheme === 'dark' ? '#8a919e' : themeConfig.lineNumber }}>{lineCount} 行</span>
            <span style={{ color: currentTheme === 'dark' ? '#8a919e' : themeConfig.lineNumber }}>{charCount} 字符</span>
          </div>
        </div>
      )}
    </div>
  )
}
