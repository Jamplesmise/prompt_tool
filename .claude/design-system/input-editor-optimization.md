# 输入框与编辑器优化方案

> 解决当前表单输入控件"毫无美感"的问题，建立统一的输入体验规范

---

## 一、问题诊断

### 1.1 当前截图问题分析

| 问题 | 具体表现 | 影响 |
|------|----------|------|
| **代码编辑器割裂感** | 黑色编辑器直接嵌入白色页面，无过渡 | 视觉突兀，像是"贴上去"的 |
| **编辑器边界生硬** | 无圆角、无阴影、无边框 | 缺乏层次，显得廉价 |
| **输入框存在感弱** | 边框太浅、太细，几乎看不到 | 用户不知道哪里可以点击 |
| **聚焦状态不明显** | focus 时变化微弱 | 无法确认当前输入位置 |
| **placeholder 可读性差** | 颜色太浅 | 难以阅读提示信息 |
| **表单层次扁平** | 所有元素视觉权重相同 | 无法区分主次 |
| **缺少细节打磨** | 无图标、无字数统计、无状态反馈 | 显得简陋、不专业 |

### 1.2 根本原因

```
问题根源：直接使用 Ant Design 和 Monaco Editor 默认样式，
没有进行任何视觉定制，导致"开箱即用"的廉价感。
```

---

## 二、设计原则

### 2.1 输入控件的视觉层次

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─ 标签（Label）─────────────────────────────────────────┐   │
│   │  • 字重 500，颜色 $gray-700                            │   │
│   │  • 必填标记使用品牌红色                                  │   │
│   └──────────────────────────────────────────────────────────┘   │
│                           ↓ 8px                                 │
│   ┌─ 输入框（Input）────────────────────────────────────────┐   │
│   │  • 默认：柔和边框 + 微妙内阴影                          │   │
│   │  • 悬浮：边框加深                                       │   │
│   │  • 聚焦：品牌色边框 + 光晕                              │   │
│   │  • 错误：红色边框 + 浅红背景                            │   │
│   └──────────────────────────────────────────────────────────┘   │
│                           ↓ 4px                                 │
│   ┌─ 辅助文字（Helper）─────────────────────────────────────┐   │
│   │  • 字号 12px，颜色 $gray-500                           │   │
│   │  • 错误时变为红色                                       │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 代码编辑器的融入策略

```
不是让编辑器"变白"，而是让它"有机融入"

策略：
1. 使用容器包裹，添加圆角和阴影
2. 增加顶部工具栏，提供语言选择、设置等
3. 底部状态栏显示行数、字符数
4. 使用柔和的深色主题而非纯黑
5. 容器边框使用渐变或品牌色点缀
```

---

## 三、输入框样式规范

### 3.1 基础输入框

```scss
// ═══════════════════════════════════════════════════════════════
// 输入框变量定义
// ═══════════════════════════════════════════════════════════════

// 尺寸
$input-height-sm: 32px;
$input-height-md: 40px;    // 默认
$input-height-lg: 48px;

$input-padding-x: 12px;
$input-border-radius: 8px;

// 颜色
$input-bg: #FFFFFF;
$input-bg-hover: #FAFAFA;
$input-bg-disabled: #F3F4F6;
$input-bg-error: #FEF2F2;

$input-border: #E5E7EB;
$input-border-hover: #D1D5DB;
$input-border-focus: #EF4444;      // 品牌红
$input-border-error: #EF4444;

$input-text: #1F2937;
$input-placeholder: #9CA3AF;

// 阴影
$input-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
$input-shadow-focus: 0 0 0 3px rgba(239, 68, 68, 0.15);
$input-shadow-error: 0 0 0 3px rgba(239, 68, 68, 0.1);
```

```scss
// ═══════════════════════════════════════════════════════════════
// 输入框样式
// ═══════════════════════════════════════════════════════════════

.input-base {
  width: 100%;
  height: $input-height-md;
  padding: 0 $input-padding-x;
  
  background: $input-bg;
  border: 1.5px solid $input-border;  // 加粗边框
  border-radius: $input-border-radius;
  box-shadow: $input-shadow;
  
  font-size: 14px;
  color: $input-text;
  
  transition: all 0.2s ease;
  
  // Placeholder
  &::placeholder {
    color: $input-placeholder;
    font-weight: 400;
  }
  
  // 悬浮状态
  &:hover:not(:focus):not(:disabled) {
    border-color: $input-border-hover;
    background: $input-bg-hover;
  }
  
  // 聚焦状态 - 关键！
  &:focus {
    outline: none;
    border-color: $input-border-focus;
    box-shadow: $input-shadow, $input-shadow-focus;
    background: $input-bg;
  }
  
  // 禁用状态
  &:disabled {
    background: $input-bg-disabled;
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  // 错误状态
  &.input-error {
    border-color: $input-border-error;
    background: $input-bg-error;
    
    &:focus {
      box-shadow: $input-shadow, $input-shadow-error;
    }
  }
}
```

### 3.2 带图标的输入框

```tsx
// ═══════════════════════════════════════════════════════════════
// 增强型输入框组件
// ═══════════════════════════════════════════════════════════════

interface EnhancedInputProps extends InputProps {
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  showCount?: boolean;
  maxLength?: number;
  helper?: string;
  error?: string;
}

const EnhancedInput: React.FC<EnhancedInputProps> = ({
  prefixIcon,
  suffixIcon,
  showCount,
  maxLength,
  helper,
  error,
  value,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const charCount = String(value || '').length;
  
  return (
    <div className={`input-wrapper ${error ? 'has-error' : ''} ${focused ? 'is-focused' : ''}`}>
      <div className="input-container">
        {prefixIcon && (
          <span className="input-prefix">{prefixIcon}</span>
        )}
        
        <Input
          {...props}
          value={value}
          maxLength={maxLength}
          className="enhanced-input"
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
        />
        
        {suffixIcon && (
          <span className="input-suffix">{suffixIcon}</span>
        )}
        
        {showCount && maxLength && (
          <span className={`input-count ${charCount >= maxLength ? 'at-limit' : ''}`}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
      
      {(helper || error) && (
        <div className={`input-helper ${error ? 'error' : ''}`}>
          {error || helper}
        </div>
      )}
    </div>
  );
};
```

```scss
.input-wrapper {
  .input-container {
    position: relative;
    display: flex;
    align-items: center;
  }
  
  .input-prefix,
  .input-suffix {
    position: absolute;
    display: flex;
    align-items: center;
    color: $gray-400;
    font-size: 16px;
    transition: color 0.2s;
  }
  
  .input-prefix {
    left: 12px;
  }
  
  .input-suffix {
    right: 12px;
  }
  
  // 有前缀时的内边距调整
  &:has(.input-prefix) .enhanced-input {
    padding-left: 40px;
  }
  
  &:has(.input-suffix) .enhanced-input,
  &:has(.input-count) .enhanced-input {
    padding-right: 40px;
  }
  
  // 聚焦时图标变色
  &.is-focused {
    .input-prefix,
    .input-suffix {
      color: $primary-500;
    }
  }
  
  // 字数统计
  .input-count {
    position: absolute;
    right: 12px;
    font-size: 12px;
    color: $gray-400;
    
    &.at-limit {
      color: $error-500;
    }
  }
  
  // 辅助文字
  .input-helper {
    margin-top: 6px;
    font-size: 12px;
    color: $gray-500;
    
    &.error {
      color: $error-500;
    }
  }
}
```

### 3.3 文本域（Textarea）

```scss
// ═══════════════════════════════════════════════════════════════
// 文本域样式
// ═══════════════════════════════════════════════════════════════

.textarea-enhanced {
  @extend .input-base;
  
  height: auto;
  min-height: 120px;
  padding: 12px;
  
  resize: vertical;
  line-height: 1.6;
  
  // 自定义调整大小手柄
  &::-webkit-resizer {
    background: linear-gradient(
      135deg,
      transparent 0%,
      transparent 50%,
      $gray-300 50%,
      $gray-300 100%
    );
    border-radius: 0 0 8px 0;
  }
}

// 带字数统计的文本域容器
.textarea-wrapper {
  position: relative;
  
  .textarea-count {
    position: absolute;
    right: 12px;
    bottom: 12px;
    font-size: 12px;
    color: $gray-400;
    background: rgba(255, 255, 255, 0.9);
    padding: 2px 6px;
    border-radius: 4px;
    
    &.at-limit {
      color: $error-500;
      background: $error-50;
    }
  }
}
```

---

## 四、代码编辑器优化

### 4.1 编辑器容器设计

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │  📄 代码                              Node.js ▼  │  超时: 5000 ms  │ │  ← 工具栏
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │                                                                     │ │
│ │  1  │ /**                                                          │ │
│ │  2  │  * 评估函数                                                   │ │
│ │  3  │  * @param {string} input - 原始输入                          │ │
│ │  4  │  * @param {string} output - 模型输出                         │ │
│ │  5  │  */                                                          │ │
│ │  6  │ module.exports = async function evaluate(input, output) {    │ │  ← 编辑区
│ │  7  │   return {                                                   │ │
│ │  8  │     passed: true,                                            │ │
│ │  9  │     score: 1.0,                                              │ │
│ │ 10  │     reason: '评估通过'                                        │ │
│ │ 11  │   };                                                         │ │
│ │ 12  │ };                                                           │ │
│ │                                                                     │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │  第 6 行, 第 15 列  │  UTF-8  │  JavaScript  │  12 行, 284 字符   │ │  ← 状态栏
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
     ↑
     圆角容器 + 微妙阴影 + 左侧品牌色边框
```

### 4.2 编辑器容器组件

```tsx
// ═══════════════════════════════════════════════════════════════
// 代码编辑器容器组件
// ═══════════════════════════════════════════════════════════════

import Editor, { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  language?: 'javascript' | 'python' | 'json' | 'markdown';
  height?: number | string;
  readOnly?: boolean;
  showToolbar?: boolean;
  showStatusBar?: boolean;
  title?: string;
  timeout?: number;
  onTimeoutChange?: (value: number) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value = '',
  onChange,
  language = 'javascript',
  height = 400,
  readOnly = false,
  showToolbar = true,
  showStatusBar = true,
  title = '代码',
  timeout,
  onTimeoutChange,
}) => {
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null);
  
  const lineCount = value.split('\n').length;
  const charCount = value.length;
  
  const handleEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    setEditorInstance(editor);
    
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });
  };
  
  const languageOptions = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'json', label: 'JSON' },
    { value: 'markdown', label: 'Markdown' },
  ];
  
  return (
    <div className="code-editor-container">
      {/* 工具栏 */}
      {showToolbar && (
        <div className="code-editor-toolbar">
          <div className="toolbar-left">
            <span className="toolbar-icon">
              <FileCodeOutlined />
            </span>
            <span className="toolbar-title">{title}</span>
          </div>
          
          <div className="toolbar-right">
            <Select
              value={language}
              options={languageOptions}
              size="small"
              variant="borderless"
              className="language-select"
            />
            
            {timeout !== undefined && (
              <div className="timeout-input">
                <span className="timeout-label">超时:</span>
                <InputNumber
                  value={timeout}
                  onChange={onTimeoutChange}
                  min={1000}
                  max={30000}
                  step={1000}
                  size="small"
                  variant="borderless"
                />
                <span className="timeout-unit">ms</span>
              </div>
            )}
            
            <Tooltip title="全屏编辑">
              <Button 
                type="text" 
                size="small" 
                icon={<ExpandOutlined />}
                className="toolbar-btn"
              />
            </Tooltip>
          </div>
        </div>
      )}
      
      {/* 编辑器主体 */}
      <div className="code-editor-body">
        <Editor
          height={height}
          language={language}
          value={value}
          onChange={(val) => onChange?.(val || '')}
          onMount={handleEditorMount}
          theme="custom-dark"
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
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
            // 隐藏滚动条背景
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
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
            <span className="status-item">{languageOptions.find(l => l.value === language)?.label}</span>
            <span className="status-item">{lineCount} 行, {charCount} 字符</span>
          </div>
        </div>
      )}
    </div>
  );
};
```

### 4.3 编辑器容器样式

```scss
// ═══════════════════════════════════════════════════════════════
// 代码编辑器容器样式
// ═══════════════════════════════════════════════════════════════

.code-editor-container {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid $gray-200;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.06),
    0 4px 12px rgba(0, 0, 0, 0.04);
  
  // 左侧品牌色边框强调
  border-left: 3px solid $primary-500;
  
  // 工具栏
  .code-editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: $gray-50;
    border-bottom: 1px solid $gray-200;
    
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 8px;
      
      .toolbar-icon {
        color: $gray-400;
        font-size: 16px;
      }
      
      .toolbar-title {
        font-size: 13px;
        font-weight: 500;
        color: $gray-600;
      }
    }
    
    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .language-select {
        .ant-select-selector {
          background: transparent !important;
          border: none !important;
          font-size: 12px;
          color: $gray-500;
        }
      }
      
      .timeout-input {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: $gray-500;
        
        .ant-input-number {
          width: 70px;
          
          .ant-input-number-input {
            text-align: center;
          }
        }
      }
      
      .toolbar-btn {
        color: $gray-400;
        
        &:hover {
          color: $gray-600;
          background: $gray-100;
        }
      }
    }
  }
  
  // 编辑器主体
  .code-editor-body {
    background: #1a1d23;  // 柔和的深色，非纯黑
    
    // Monaco 编辑器样式覆盖
    .monaco-editor {
      .margin {
        background: #1a1d23 !important;
      }
      
      .line-numbers {
        color: #4a5568 !important;
      }
      
      .current-line ~ .line-numbers {
        color: #718096 !important;
      }
    }
  }
  
  // 状态栏
  .code-editor-statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 16px;
    background: #252830;
    border-top: 1px solid #2d3139;
    
    .status-left,
    .status-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .status-item {
      font-size: 11px;
      color: #8a919e;
      font-family: $font-family-mono;
    }
  }
  
  // 聚焦状态
  &:focus-within {
    border-color: $primary-300;
    box-shadow: 
      0 0 0 3px rgba($primary-500, 0.1),
      0 4px 12px rgba(0, 0, 0, 0.08);
  }
}
```

### 4.4 自定义 Monaco 主题

```tsx
// ═══════════════════════════════════════════════════════════════
// 自定义 Monaco 主题（柔和深色）
// ═══════════════════════════════════════════════════════════════

import { loader } from '@monaco-editor/react';

// 在应用初始化时注册主题
loader.init().then((monaco) => {
  monaco.editor.defineTheme('custom-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'F97583' },          // 品牌红色调
      { token: 'string', foreground: '9ECBFF' },
      { token: 'number', foreground: '79B8FF' },
      { token: 'function', foreground: 'B392F0' },
      { token: 'variable', foreground: 'E1E4E8' },
      { token: 'type', foreground: '79B8FF' },
      { token: 'class', foreground: 'B392F0' },
    ],
    colors: {
      // 编辑器背景
      'editor.background': '#1a1d23',
      'editor.foreground': '#E1E4E8',
      
      // 行高亮
      'editor.lineHighlightBackground': '#2a2e38',
      'editor.lineHighlightBorder': '#2a2e38',
      
      // 选中
      'editor.selectionBackground': '#3b4252',
      'editor.selectionHighlightBackground': '#3b425280',
      
      // 行号
      'editorLineNumber.foreground': '#4a5568',
      'editorLineNumber.activeForeground': '#a0aec0',
      
      // 光标
      'editorCursor.foreground': '#EF4444',  // 品牌红
      
      // 滚动条
      'scrollbarSlider.background': '#3b425250',
      'scrollbarSlider.hoverBackground': '#3b425280',
      'scrollbarSlider.activeBackground': '#3b4252a0',
      
      // 边框
      'editorWidget.border': '#2d3139',
    },
  });
});
```

---

## 五、表单布局优化

### 5.1 表单项组件

```tsx
// ═══════════════════════════════════════════════════════════════
// 增强型表单项组件
// ═══════════════════════════════════════════════════════════════

interface FormFieldProps {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: ReactNode;
  tooltip?: string;
  extra?: ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  helper,
  error,
  children,
  tooltip,
  extra,
}) => (
  <div className={`form-field ${error ? 'has-error' : ''}`}>
    <div className="form-field-header">
      <label className="form-field-label">
        {required && <span className="required-mark">*</span>}
        {label}
        {tooltip && (
          <Tooltip title={tooltip}>
            <QuestionCircleOutlined className="label-tooltip" />
          </Tooltip>
        )}
      </label>
      {extra && <div className="form-field-extra">{extra}</div>}
    </div>
    
    <div className="form-field-control">
      {children}
    </div>
    
    {(helper || error) && (
      <div className={`form-field-helper ${error ? 'error' : ''}`}>
        {error || helper}
      </div>
    )}
  </div>
);
```

```scss
.form-field {
  margin-bottom: 24px;
  
  .form-field-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .form-field-label {
    font-size: 14px;
    font-weight: 500;
    color: $gray-700;
    display: flex;
    align-items: center;
    gap: 4px;
    
    .required-mark {
      color: $primary-500;
      font-weight: 600;
    }
    
    .label-tooltip {
      color: $gray-400;
      font-size: 12px;
      cursor: help;
      
      &:hover {
        color: $gray-500;
      }
    }
  }
  
  .form-field-extra {
    font-size: 12px;
    color: $gray-500;
  }
  
  .form-field-helper {
    margin-top: 6px;
    font-size: 12px;
    color: $gray-500;
    line-height: 1.5;
    
    &.error {
      color: $error-500;
    }
  }
  
  // 错误状态
  &.has-error {
    .form-field-label {
      color: $error-600;
    }
  }
}
```

### 5.2 表单分组卡片

```tsx
// ═══════════════════════════════════════════════════════════════
// 表单分组卡片
// ═══════════════════════════════════════════════════════════════

interface FormSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  icon,
  children,
  collapsible = false,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className={`form-section ${expanded ? 'expanded' : 'collapsed'}`}>
      <div 
        className="form-section-header"
        onClick={() => collapsible && setExpanded(!expanded)}
      >
        <div className="section-title-group">
          {icon && <span className="section-icon">{icon}</span>}
          <div>
            <h4 className="section-title">{title}</h4>
            {description && (
              <p className="section-description">{description}</p>
            )}
          </div>
        </div>
        
        {collapsible && (
          <span className="section-toggle">
            {expanded ? <UpOutlined /> : <DownOutlined />}
          </span>
        )}
      </div>
      
      {expanded && (
        <div className="form-section-body">
          {children}
        </div>
      )}
    </div>
  );
};
```

```scss
.form-section {
  background: white;
  border-radius: 12px;
  border: 1px solid $gray-200;
  margin-bottom: 24px;
  overflow: hidden;
  
  .form-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    background: $gray-50;
    border-bottom: 1px solid $gray-100;
    
    .section-title-group {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    
    .section-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: linear-gradient(135deg, $primary-50, $primary-100);
      display: flex;
      align-items: center;
      justify-content: center;
      color: $primary-500;
      font-size: 18px;
    }
    
    .section-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: $gray-800;
    }
    
    .section-description {
      margin: 4px 0 0;
      font-size: 13px;
      color: $gray-500;
    }
    
    .section-toggle {
      color: $gray-400;
      transition: transform 0.2s;
    }
  }
  
  .form-section-body {
    padding: 24px;
  }
  
  // 可折叠时的悬浮效果
  &.collapsed .form-section-header {
    border-bottom: none;
    cursor: pointer;
    
    &:hover {
      background: $gray-100;
    }
  }
}
```

---

## 六、Ant Design 全局覆盖

### 6.1 Input 组件覆盖

```scss
// ═══════════════════════════════════════════════════════════════
// Ant Design Input 样式覆盖
// ═══════════════════════════════════════════════════════════════

// 基础输入框
.ant-input {
  height: 40px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1.5px solid $gray-200;
  font-size: 14px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  
  &::placeholder {
    color: $gray-400;
  }
  
  &:hover:not(:focus):not(:disabled) {
    border-color: $gray-300;
    background: $gray-50;
  }
  
  &:focus {
    border-color: $primary-500;
    box-shadow: 
      inset 0 1px 2px rgba(0, 0, 0, 0.04),
      0 0 0 3px rgba($primary-500, 0.12);
  }
  
  &-disabled {
    background: $gray-100;
  }
}

// 文本域
.ant-input-textarea {
  .ant-input {
    min-height: 120px;
    padding: 12px;
    line-height: 1.6;
    resize: vertical;
  }
}

// 带前后缀的输入框
.ant-input-affix-wrapper {
  padding: 0 12px;
  border-radius: 8px;
  border: 1.5px solid $gray-200;
  
  &:hover:not(:focus-within):not(.ant-input-affix-wrapper-disabled) {
    border-color: $gray-300;
  }
  
  &:focus-within {
    border-color: $primary-500;
    box-shadow: 0 0 0 3px rgba($primary-500, 0.12);
  }
  
  .ant-input {
    height: 38px;
    border: none;
    box-shadow: none;
    
    &:focus {
      box-shadow: none;
    }
  }
  
  .ant-input-prefix,
  .ant-input-suffix {
    color: $gray-400;
  }
}

// 搜索框
.ant-input-search {
  .ant-input-search-button {
    height: 40px;
    border-radius: 0 8px 8px 0;
  }
}

// 数字输入框
.ant-input-number {
  border-radius: 8px;
  border: 1.5px solid $gray-200;
  
  &:hover:not(:focus-within) {
    border-color: $gray-300;
  }
  
  &:focus-within {
    border-color: $primary-500;
    box-shadow: 0 0 0 3px rgba($primary-500, 0.12);
  }
}

// 错误状态
.ant-input-status-error,
.ant-input-affix-wrapper-status-error {
  border-color: $error-500 !important;
  background: $error-50 !important;
  
  &:focus,
  &:focus-within {
    box-shadow: 0 0 0 3px rgba($error-500, 0.12) !important;
  }
}
```

### 6.2 Select 组件覆盖

```scss
// 选择器
.ant-select {
  .ant-select-selector {
    height: 40px !important;
    padding: 0 12px !important;
    border-radius: 8px !important;
    border: 1.5px solid $gray-200 !important;
    
    .ant-select-selection-search-input {
      height: 38px !important;
    }
    
    .ant-select-selection-placeholder {
      color: $gray-400;
    }
  }
  
  &:hover .ant-select-selector {
    border-color: $gray-300 !important;
  }
  
  &.ant-select-focused .ant-select-selector {
    border-color: $primary-500 !important;
    box-shadow: 0 0 0 3px rgba($primary-500, 0.12) !important;
  }
}

// 下拉菜单
.ant-select-dropdown {
  border-radius: 10px;
  box-shadow: 
    0 4px 6px rgba(0, 0, 0, 0.05),
    0 10px 20px rgba(0, 0, 0, 0.08);
  padding: 6px;
  
  .ant-select-item {
    border-radius: 6px;
    padding: 8px 12px;
    
    &-option-selected {
      background: $primary-50;
      font-weight: 500;
    }
    
    &-option-active {
      background: $gray-50;
    }
  }
}
```

---

## 七、页面应用示例

### 7.1 新建评估器页面改造

```tsx
// ═══════════════════════════════════════════════════════════════
// 新建评估器页面 - 优化后
// ═══════════════════════════════════════════════════════════════

const NewEvaluatorPage: React.FC = () => {
  const [form] = Form.useForm();
  const [evaluatorType, setEvaluatorType] = useState<'preset' | 'code' | 'llm' | 'composite'>('code');
  
  return (
    <PageContainer
      header={{
        title: '新建评估器',
        onBack: () => router.back(),
      }}
    >
      <Form form={form} layout="vertical">
        {/* 基本信息分组 */}
        <FormSection
          title="基本信息"
          icon={<InfoCircleOutlined />}
        >
          <Row gutter={24}>
            <Col span={12}>
              <FormField label="名称" required>
                <Input 
                  placeholder="输入评估器名称"
                  className="enhanced-input"
                />
              </FormField>
            </Col>
            <Col span={12}>
              <FormField label="类型" required>
                <Radio.Group
                  value={evaluatorType}
                  onChange={(e) => setEvaluatorType(e.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  className="type-radio-group"
                >
                  <Radio.Button value="preset">预置评估器</Radio.Button>
                  <Radio.Button value="code">代码评估器</Radio.Button>
                  <Radio.Button value="llm">LLM 评估器</Radio.Button>
                  <Radio.Button value="composite">组合评估器</Radio.Button>
                </Radio.Group>
              </FormField>
            </Col>
          </Row>
          
          <FormField 
            label="描述" 
            helper="简要描述评估器的用途和评估逻辑"
          >
            <Input.TextArea 
              placeholder="输入评估器描述（可选）"
              className="textarea-enhanced"
              rows={3}
              showCount
              maxLength={200}
            />
          </FormField>
        </FormSection>
        
        {/* 代码评估器配置 */}
        {evaluatorType === 'code' && (
          <FormSection
            title="代码配置"
            icon={<CodeOutlined />}
            description="编写自定义评估逻辑，支持 Node.js 和 Python"
          >
            {/* 输入参数说明 */}
            <div className="params-info">
              <div className="params-title">输入参数</div>
              <div className="params-grid">
                <div className="param-item">
                  <code>input</code>
                  <span className="param-type">string</span>
                  <span className="param-desc">原始输入</span>
                </div>
                <div className="param-item">
                  <code>output</code>
                  <span className="param-type">string</span>
                  <span className="param-desc">模型输出</span>
                </div>
                <div className="param-item">
                  <code>expected</code>
                  <span className="param-type">string | null</span>
                  <span className="param-desc">期望输出</span>
                </div>
                <div className="param-item">
                  <code>metadata</code>
                  <span className="param-type">object</span>
                  <span className="param-desc">额外元数据</span>
                </div>
              </div>
            </div>
            
            {/* 代码编辑器 */}
            <FormField 
              label="评估代码"
              required
              extra={
                <Space>
                  <Select 
                    defaultValue="nodejs" 
                    size="small"
                    options={[
                      { value: 'nodejs', label: 'Node.js' },
                      { value: 'python', label: 'Python' },
                    ]}
                  />
                </Space>
              }
            >
              <CodeEditor
                value={codeValue}
                onChange={setCodeValue}
                language="javascript"
                height={350}
                title="评估代码"
                timeout={5000}
                onTimeoutChange={setTimeoutValue}
              />
            </FormField>
          </FormSection>
        )}
        
        {/* 提交按钮 */}
        <div className="form-actions">
          <Button onClick={() => router.back()}>
            取消
          </Button>
          <Button type="primary" className="btn-gradient" htmlType="submit">
            创建评估器
          </Button>
        </div>
      </Form>
    </PageContainer>
  );
};
```

### 7.2 参数信息样式

```scss
.params-info {
  background: $gray-50;
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 20px;
  
  .params-title {
    font-size: 13px;
    font-weight: 600;
    color: $gray-600;
    margin-bottom: 12px;
  }
  
  .params-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  
  .param-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    
    code {
      font-family: $font-family-mono;
      font-size: 13px;
      font-weight: 600;
      color: $gray-800;
    }
    
    .param-type {
      font-family: $font-family-mono;
      font-size: 11px;
      color: $primary-500;
    }
    
    .param-desc {
      font-size: 12px;
      color: $gray-500;
    }
  }
}
```

---

## 八、实施清单

### 8.1 文件创建

```
styles/
├── components/
│   ├── _input.scss          # 输入框样式
│   ├── _textarea.scss       # 文本域样式
│   ├── _select.scss         # 选择器样式
│   ├── _code-editor.scss    # 代码编辑器容器样式
│   └── _form.scss           # 表单布局样式
├── _variables.scss          # 变量定义（更新）
└── globals.scss             # 全局样式（引入组件样式）

components/
├── form/
│   ├── FormField.tsx        # 增强型表单项
│   ├── FormSection.tsx      # 表单分组卡片
│   └── EnhancedInput.tsx    # 增强型输入框
├── CodeEditor/
│   ├── index.tsx            # 代码编辑器容器
│   └── theme.ts             # Monaco 主题配置
└── index.ts                 # 统一导出
```

### 8.2 改造优先级

| 优先级 | 内容 | 工期 |
|--------|------|------|
| P0 | 输入框全局样式覆盖 | 1天 |
| P0 | CodeEditor 容器组件 | 1天 |
| P0 | Monaco 自定义主题 | 0.5天 |
| P1 | FormField / FormSection 组件 | 1天 |
| P1 | 新建评估器页面改造 | 1天 |
| P2 | 新建提示词页面改造 | 0.5天 |
| P2 | 创建任务页面改造 | 1天 |

### 8.3 验收标准

- [ ] 所有输入框边框清晰可见（1.5px）
- [ ] 聚焦状态有明显的品牌色光晕
- [ ] 代码编辑器有工具栏和状态栏
- [ ] 代码编辑器使用柔和深色主题
- [ ] 表单有清晰的分组和层次
- [ ] 错误状态视觉反馈明确
- [ ] 动效平滑，无卡顿

---

## 九、效果对比

### Before vs After

```
Before:                                After:
┌─────────────────────────────┐       ┌─────────────────────────────┐
│  ┌───────────────────────┐  │       │  ┌───────────────────────┐  │
│  │ 评估器名称            │  │       │  │ 📄 评估器名称 *       │  │
│  └───────────────────────┘  │       │  └───────────────────────┘  │
│  ← 边框太浅，几乎看不见     │       │  ← 边框清晰，有内阴影       │
│                             │       │                             │
│  ┌───────────────────────┐  │       │  ┌─────────────────────────┐│
│  │████████████████████████│  │       │  │ 📄 代码  │ Node.js ▼ │ ││
│  │████ 纯黑背景 ██████████│  │       │  ├─────────────────────────┤│
│  │████████████████████████│  │       │  │  1 │ // 评估函数       ││
│  │████████████████████████│  │       │  │  2 │ module.exports... ││
│  │████████████████████████│  │       │  │  3 │                   ││
│  │████████████████████████│  │       │  ├─────────────────────────┤│
│  └───────────────────────┘  │       │  │ 第1行 │ JS │ 12行      ││
│  ← 没有边框，直接贴上去     │       │  └─────────────────────────┘│
│                             │       │  ← 圆角容器+工具栏+状态栏   │
└─────────────────────────────┘       └─────────────────────────────┘
```

**关键改进点：**
1. 输入框边框加粗到 1.5px，添加内阴影增加立体感
2. 聚焦时有品牌色（红色）的光晕效果
3. 代码编辑器包裹在专业容器内，有工具栏和状态栏
4. 使用柔和深色主题（#1a1d23）替代纯黑
5. 左侧品牌色边框强调，与整体设计语言统一
6. 表单有清晰的分组卡片
