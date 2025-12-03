'use client'

import { useEffect, useRef } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'

type MonacoEditor = Parameters<OnMount>[0]

type CodeEditorProps = {
  value: string
  onChange: (value: string) => void
  height?: string | number
  readOnly?: boolean
  language?: 'javascript' | 'python' | 'json'
}

export function CodeEditor({
  value,
  onChange,
  height = 400,
  readOnly = false,
  language = 'javascript',
}: CodeEditorProps) {
  const editorRef = useRef<MonacoEditor | null>(null)

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor
  }

  const handleChange = (val: string | undefined) => {
    onChange(val || '')
  }

  useEffect(() => {
    // 更新编辑器布局
    if (editorRef.current) {
      editorRef.current.layout()
    }
  }, [height])

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          readOnly,
          wordWrap: 'on',
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          renderLineHighlight: 'line',
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
        theme="vs-dark"
      />
    </div>
  )
}
