'use client'

import { useRef, useEffect, useCallback } from 'react'
import Editor, { OnMount, OnChange, Monaco, BeforeMount } from '@monaco-editor/react'

type PromptEditorProps = {
  value: string
  onChange: (value: string) => void
  height?: number | string
  readOnly?: boolean
}

type MonacoEditor = Parameters<OnMount>[0]

export function PromptEditor({
  value,
  onChange,
  height = 400,
  readOnly = false,
}: PromptEditorProps) {
  const editorRef = useRef<MonacoEditor | null>(null)
  const isInternalChange = useRef(false)

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

      // 定义主题
      monaco.editor.defineTheme('prompt-theme', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'variable', foreground: '4EC9B0', fontStyle: 'bold' },
        ],
        colors: {},
      })
    }
  }, [])

  const handleEditorMount: OnMount = useCallback((editor, monaco: Monaco) => {
    editorRef.current = editor
    monaco.editor.setTheme('prompt-theme')
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

  return (
    <Editor
      height={height}
      language="prompt"
      value={value}
      onChange={handleChange}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorMount}
      loading={
        <div style={{ height, background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
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
      }}
      theme="prompt-theme"
    />
  )
}
