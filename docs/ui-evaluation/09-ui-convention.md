# UI 组件规范

> 本文档定义了 AI 测试平台的 UI 组件使用规范和设计系统标准

## 一、设计系统概览

### 1.1 品牌理念

| 维度 | 关键词 | 设计体现 |
|------|--------|----------|
| **专业** | 可信赖、精准、严谨 | 清晰的信息层次、准确的数据展示 |
| **效率** | 快速、流畅、智能 | 流线型视觉元素、快捷操作入口 |
| **创新** | AI原生、前沿、现代 | 渐变色彩、动态交互、智能提示 |

### 1.2 组件库使用

| 来源 | 用途 | 导入方式 |
|------|------|----------|
| antd | 基础组件 | `import { Button } from 'antd'` |
| @ant-design/pro-components | 高级业务组件 | `import { ProTable } from '@ant-design/pro-components'` |
| @ant-design/icons | 图标 | `import { PlusOutlined } from '@ant-design/icons'` |
| @monaco-editor/react | 代码编辑器 | `import Editor from '@monaco-editor/react'` |
| recharts | 图表 | `import { LineChart } from 'recharts'` |

### 1.3 禁止使用

- 不要直接使用原生 HTML form 元素，使用 Ant Design Form
- 不要使用其他 UI 库（Material UI, Chakra UI 等）
- 不要使用 Tailwind CSS（样式使用 CSS Modules 或 SCSS）

---

## 二、色彩系统

### 2.1 品牌色

```scss
// 品牌主色（红色调）
$primary-50:  #FEF2F2;   // 最浅，用于背景高亮
$primary-100: #FEE2E2;   // 浅色背景
$primary-200: #FECACA;   // 悬浮状态背景
$primary-300: #FCA5A5;   // 禁用状态
$primary-400: #F87171;   // 次要强调
$primary-500: #EF4444;   // 🎯 品牌主色
$primary-600: #DC2626;   // 悬浮/按下状态
$primary-700: #B91C1C;   // 深色强调
$primary-800: #991B1B;   // 深色文字
$primary-900: #7F1D1D;   // 最深

// 品牌渐变
$primary-gradient: linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%);
$primary-gradient-hover: linear-gradient(135deg, #DC2626 0%, #B91C1C 50%, #991B1B 100%);
```

### 2.2 语义色

```scss
// 成功（绿色）
$success-50:  #ECFDF5;
$success-500: #10B981;   // 主色
$success-600: #059669;

// 警告（琥珀色）
$warning-50:  #FFFBEB;
$warning-500: #F59E0B;   // 主色
$warning-600: #D97706;

// 错误（红色）
$error-50:  #FEF2F2;
$error-500: #EF4444;     // 与品牌色统一
$error-600: #DC2626;

// 信息（蓝色）
$info-50:  #EFF6FF;
$info-500: #3B82F6;      // 主色
$info-600: #2563EB;
```

### 2.3 中性色

```scss
$gray-50:  #F9FAFB;   // 页面背景
$gray-100: #F3F4F6;   // 卡片悬浮背景
$gray-200: #E5E7EB;   // 分割线、边框
$gray-300: #D1D5DB;   // 禁用边框
$gray-400: #9CA3AF;   // 占位符文字
$gray-500: #6B7280;   // 次要文字
$gray-600: #4B5563;   // 正文文字
$gray-700: #374151;   // 标题文字
$gray-800: #1F2937;   // 强调文字
$gray-900: #111827;   // 最深文字

// 背景层次
$bg-base:     #F9FAFB;   // 页面底层背景
$bg-card:     #FFFFFF;   // 卡片/容器背景
$bg-elevated: #FFFFFF;   // 弹窗/悬浮层背景
```

### 2.4 色彩应用规则

| 场景 | 颜色 | 说明 |
|------|------|------|
| 主按钮 | `$primary-gradient` | 渐变红色，核心操作 |
| 次要按钮 | `$gray-100` + 边框 | 白底灰边 |
| 危险按钮 | `$error-500` | 删除等破坏性操作 |
| 链接文字 | `$primary-500` | 可点击文字 |
| 成功状态 | `$success-500` | 通过、完成、在线 |
| 警告状态 | `$warning-500` | 警告、待处理 |
| 错误状态 | `$error-500` | 失败、离线、错误 |
| 选中高亮 | `$primary-50` | 列表选中行背景 |
| 悬浮高亮 | `$gray-50` | 列表悬浮行背景 |

---

## 三、排版系统

### 3.1 字体栈

```scss
// 主字体（界面）
$font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   'Helvetica Neue', Arial, 'Noto Sans', 'PingFang SC',
                   'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;

// 等宽字体（代码）
$font-family-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco,
                   'Cascadia Code', Consolas, monospace;
```

### 3.2 字号与行高

```scss
$text-xs:   12px;   // 辅助说明、标签
$text-sm:   14px;   // 正文、表格内容
$text-base: 16px;   // 大段正文
$text-lg:   18px;   // 小标题
$text-xl:   20px;   // 页面标题
$text-2xl:  24px;   // 大标题
$text-3xl:  30px;   // 统计数字
$text-4xl:  36px;   // 核心数据展示

// 行高
$leading-tight:  1.25;  // 标题
$leading-normal: 1.5;   // 正文
$leading-relaxed: 1.75; // 长文本

// 字重
$font-normal:   400;
$font-medium:   500;
$font-semibold: 600;
$font-bold:     700;
```

### 3.3 文字颜色应用

| 层级 | 颜色 | 用途 |
|------|------|------|
| 标题文字 | `$gray-800` | 页面标题、卡片标题 |
| 正文文字 | `$gray-700` | 主要内容 |
| 次要文字 | `$gray-500` | 描述、说明 |
| 辅助文字 | `$gray-400` | 占位符、禁用 |
| 链接文字 | `$primary-500` | 可点击 |
| 成功文字 | `$success-600` | 通过提示 |
| 错误文字 | `$error-600` | 错误提示 |

---

## 四、间距与布局

### 4.1 间距系统

```scss
// 基于 4px 的间距系统
$space-0:  0;
$space-1:  4px;
$space-2:  8px;
$space-3:  12px;
$space-4:  16px;
$space-5:  20px;
$space-6:  24px;
$space-8:  32px;
$space-10: 40px;
$space-12: 48px;
$space-16: 64px;
```

### 4.2 常用间距规范

| 场景 | 间距 |
|------|------|
| 卡片内边距 | 24px |
| 卡片之间间距 | 24px |
| 表单项间距 | 24px |
| 按钮组间距 | 8px |
| 列表项间距 | 16px |
| 图标与文字间距 | 8px |

### 4.3 圆角规范

```scss
$radius-sm:  6px;   // 小按钮、标签
$radius-md:  8px;   // 按钮、输入框
$radius-lg:  12px;  // 卡片
$radius-xl:  16px;  // 大卡片、弹窗
$radius-full: 9999px; // 圆形
```

## 五、动效规范

### 5.1 动效时长与缓动

```scss
// 时长
$duration-fast:   0.15s;   // 微交互（悬浮、按下）
$duration-normal: 0.25s;   // 常规过渡（展开、切换）
$duration-slow:   0.4s;    // 复杂动画（页面切换）

// 缓动函数
$ease-default:    cubic-bezier(0.4, 0, 0.2, 1);     // 标准
$ease-in:         cubic-bezier(0.4, 0, 1, 1);       // 进入
$ease-out:        cubic-bezier(0, 0, 0.2, 1);       // 退出
$ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1); // 弹性
```

### 5.2 常用动效类

```scss
// 悬浮抬升
.hover-lift {
  transition: transform $duration-fast $ease-default,
              box-shadow $duration-fast $ease-default;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

// 悬浮卡片
.hover-card {
  transition: all 0.2s ease;

  &:hover {
    border-color: $primary-200;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    transform: translateY(-2px);
  }
}

// 淡入
.fade-in {
  animation: fadeIn $duration-normal $ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 状态点动画
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 六、按钮系统

### 6.1 按钮类型与使用场景

```tsx
// 主要按钮 - 页面核心操作（每页最多1个）
<Button type="primary" className="btn-gradient">
  + 新建测试任务
</Button>

// 次要按钮 - 次要操作
<Button>保存草稿</Button>

// 文字按钮 - 行内操作
<Button type="link">查看详情</Button>

// 危险按钮 - 破坏性操作
<Button danger>删除</Button>

// 图标按钮 - 紧凑空间
<Button type="text" icon={<EditOutlined />} />
```

### 6.2 主按钮渐变样式

```scss
.btn-gradient {
  background: $primary-gradient;
  border: none;
  color: white;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba($primary-500, 0.35);
  transition: all 0.2s ease;

  &:hover {
    background: $primary-gradient-hover;
    box-shadow: 0 4px 12px rgba($primary-500, 0.45);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba($primary-500, 0.35);
  }
}
```

### 6.3 按钮尺寸

```scss
.btn-sm { height: 28px; padding: 0 12px; font-size: 12px; }
.btn-md { height: 36px; padding: 0 16px; font-size: 14px; }  // 默认
.btn-lg { height: 44px; padding: 0 24px; font-size: 16px; }
```

---

## 七、常用组件选择指南

### 7.1 表格

| 场景 | 组件 | 说明 |
|------|------|------|
| 简单列表 | `Table` | 基础表格 |
| 复杂列表（筛选、分页、操作） | `ProTable` | 自带筛选、分页、工具栏 |
| 可编辑表格 | `EditableProTable` | 行内编辑 |

**ProTable 使用规范**：

```tsx
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns, ActionType } from '@ant-design/pro-components';

const columns: ProColumns<DataType>[] = [
  {
    title: '名称',
    dataIndex: 'name',
    // 搜索配置
    search: true,
  },
  {
    title: '状态',
    dataIndex: 'status',
    valueType: 'select',
    valueEnum: {
      PENDING: { text: '待执行', status: 'Default' },
      RUNNING: { text: '执行中', status: 'Processing' },
      COMPLETED: { text: '已完成', status: 'Success' },
    },
  },
  {
    title: '操作',
    valueType: 'option',
    render: (_, record) => [
      <a key="edit">编辑</a>,
      <a key="delete">删除</a>,
    ],
  },
];

<ProTable<DataType>
  columns={columns}
  request={async (params) => {
    const { data } = await api.getList(params);
    return {
      data: data.list,
      total: data.total,
      success: true,
    };
  }}
  rowKey="id"
  pagination={{ pageSize: 20 }}
  search={{ labelWidth: 'auto' }}
  toolBarRender={() => [
    <Button key="add" type="primary" icon={<PlusOutlined />}>
      新建
    </Button>,
  ]}
/>
```

### 7.2 表单

| 场景 | 组件 | 说明 |
|------|------|------|
| 简单表单 | `Form` | 基础表单 |
| 复杂表单（多步骤、分组） | `ProForm` / `StepsForm` | 自带布局和校验 |
| 弹窗表单 | `ModalForm` / `DrawerForm` | 弹窗 + 表单 |

**ModalForm 使用规范**：

```tsx
import { ModalForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components';

<ModalForm
  title="新建提示词"
  trigger={<Button type="primary">新建</Button>}
  onFinish={async (values) => {
    await api.create(values);
    message.success('创建成功');
    return true; // 返回 true 关闭弹窗
  }}
>
  <ProFormText
    name="name"
    label="名称"
    placeholder="请输入名称"
    rules={[{ required: true, message: '请输入名称' }]}
  />
  <ProFormTextArea
    name="description"
    label="描述"
    placeholder="请输入描述"
  />
</ModalForm>
```

**StepsForm 使用规范（创建任务）**：

```tsx
import { StepsForm, ProFormSelect } from '@ant-design/pro-components';

<StepsForm
  onFinish={async (values) => {
    await api.createTask(values);
    message.success('创建成功');
  }}
>
  <StepsForm.StepForm name="basic" title="基本信息">
    <ProFormText name="name" label="任务名称" />
  </StepsForm.StepForm>
  
  <StepsForm.StepForm name="config" title="测试配置">
    <ProFormSelect name="promptIds" label="提示词" mode="multiple" />
    <ProFormSelect name="modelIds" label="模型" mode="multiple" />
  </StepsForm.StepForm>
  
  <StepsForm.StepForm name="execution" title="执行配置">
    <ProFormDigit name="concurrency" label="并发数" min={1} max={20} />
  </StepsForm.StepForm>
</StepsForm>
```

### 7.3 布局

| 场景 | 组件 |
|------|------|
| 整体页面布局 | `ProLayout` |
| 页面内容容器 | `PageContainer` |
| 卡片容器 | `ProCard` |
| 描述列表 | `ProDescriptions` |

**PageContainer 使用规范**：

```tsx
import { PageContainer } from '@ant-design/pro-components';

<PageContainer
  header={{
    title: '提示词详情',
    onBack: () => router.back(),
    extra: [
      <Button key="save">保存</Button>,
      <Button key="publish" type="primary">发布</Button>,
    ],
  }}
>
  {/* 页面内容 */}
</PageContainer>
```

---

## 八、状态管理

### 8.1 Zustand Store 规范

```typescript
// stores/promptStore.ts
import { create } from 'zustand';

type PromptState = {
  // 状态
  currentPrompt: Prompt | null;
  isLoading: boolean;
  
  // 操作
  setCurrentPrompt: (prompt: Prompt | null) => void;
  fetchPrompt: (id: string) => Promise<void>;
};

export const usePromptStore = create<PromptState>((set) => ({
  currentPrompt: null,
  isLoading: false,
  
  setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
  
  fetchPrompt: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.getPrompt(id);
      set({ currentPrompt: data });
    } finally {
      set({ isLoading: false });
    }
  },
}));
```

### 8.2 React Query 使用规范

```typescript
// hooks/usePrompts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 查询
export function usePrompts(params: ListParams) {
  return useQuery({
    queryKey: ['prompts', params],
    queryFn: () => api.getPrompts(params),
  });
}

// 单条查询
export function usePrompt(id: string) {
  return useQuery({
    queryKey: ['prompt', id],
    queryFn: () => api.getPrompt(id),
    enabled: !!id,
  });
}

// 创建
export function useCreatePrompt() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: api.createPrompt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      message.success('创建成功');
    },
  });
}
```

---

## 九、通用组件封装

### 9.1 确认删除按钮

```tsx
// components/DeleteButton.tsx
import { Popconfirm, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

type Props = {
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
};

export function DeleteButton({ onConfirm, loading }: Props) {
  return (
    <Popconfirm
      title="确认删除"
      description="删除后不可恢复，确认删除吗？"
      onConfirm={onConfirm}
      okText="删除"
      okType="danger"
      cancelText="取消"
    >
      <Button 
        type="text" 
        danger 
        icon={<DeleteOutlined />}
        loading={loading}
      >
        删除
      </Button>
    </Popconfirm>
  );
}
```

### 9.2 状态标签

```tsx
// components/StatusTag.tsx
import { Tag } from 'antd';

const statusConfig = {
  PENDING: { color: 'default', text: '待执行' },
  RUNNING: { color: 'processing', text: '执行中' },
  COMPLETED: { color: 'success', text: '已完成' },
  FAILED: { color: 'error', text: '失败' },
  STOPPED: { color: 'warning', text: '已终止' },
};

type Props = {
  status: keyof typeof statusConfig;
};

export function StatusTag({ status }: Props) {
  const config = statusConfig[status];
  return <Tag color={config.color}>{config.text}</Tag>;
}
```

### 9.3 代码编辑器封装

```tsx
// components/CodeEditor.tsx
import Editor from '@monaco-editor/react';

type Props = {
  value?: string;
  onChange?: (value: string) => void;
  language?: 'javascript' | 'python' | 'json' | 'markdown';
  height?: number | string;
  readOnly?: boolean;
};

export function CodeEditor({
  value,
  onChange,
  language = 'javascript',
  height = 400,
  readOnly = false,
}: Props) {
  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={(val) => onChange?.(val || '')}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
      }}
      theme="vs-dark"
    />
  );
}
```

### 9.4 空状态

```tsx
// components/EmptyState.tsx
import { Empty, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

type Props = {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionText, onAction }: Props) {
  return (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div>
          <div style={{ marginBottom: 8 }}>{title}</div>
          {description && (
            <div style={{ color: '#999', fontSize: 12 }}>{description}</div>
          )}
        </div>
      }
    >
      {actionText && onAction && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onAction}>
          {actionText}
        </Button>
      )}
    </Empty>
  );
}
```

---

## 十、页面模板

### 10.1 列表页模板

```tsx
// app/(dashboard)/prompts/page.tsx
'use client';

import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { api } from '@/services/api';
import { DeleteButton } from '@/components/DeleteButton';

export default function PromptsPage() {
  const router = useRouter();
  const actionRef = useRef<ActionType>();
  
  const columns: ProColumns<Prompt>[] = [
    { title: '名称', dataIndex: 'name' },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '版本', dataIndex: 'currentVersion', width: 80 },
    { 
      title: '更新时间', 
      dataIndex: 'updatedAt', 
      valueType: 'dateTime',
      width: 180,
      sorter: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      render: (_, record) => [
        <a key="edit" onClick={() => router.push(`/prompts/${record.id}`)}>
          编辑
        </a>,
        <DeleteButton
          key="delete"
          onConfirm={async () => {
            await api.deletePrompt(record.id);
            message.success('删除成功');
            actionRef.current?.reload();
          }}
        />,
      ],
    },
  ];
  
  return (
    <PageContainer>
      <ProTable<Prompt>
        actionRef={actionRef}
        columns={columns}
        request={async (params, sort) => {
          const { data } = await api.getPrompts({
            page: params.current,
            pageSize: params.pageSize,
            keyword: params.name,
            sortBy: Object.keys(sort)[0],
            sortOrder: Object.values(sort)[0] === 'ascend' ? 'asc' : 'desc',
          });
          return {
            data: data.list,
            total: data.total,
            success: true,
          };
        }}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        pagination={{ pageSize: 20 }}
        toolBarRender={() => [
          <Button
            key="add"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/prompts/new')}
          >
            新建提示词
          </Button>,
        ]}
      />
    </PageContainer>
  );
}
```

### 10.2 详情页模板

```tsx
// app/(dashboard)/prompts/[id]/page.tsx
'use client';

import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Spin, message } from 'antd';
import { useRouter, useParams } from 'next/navigation';
import { usePrompt, useUpdatePrompt } from '@/hooks/usePrompts';
import { CodeEditor } from '@/components/CodeEditor';
import { useState } from 'react';

export default function PromptDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  
  const { data: prompt, isLoading } = usePrompt(id);
  const updateMutation = useUpdatePrompt();
  
  const [content, setContent] = useState('');
  
  // 初始化内容
  useEffect(() => {
    if (prompt) {
      setContent(prompt.content);
    }
  }, [prompt]);
  
  const handleSave = async () => {
    await updateMutation.mutateAsync({ id, content });
    message.success('保存成功');
  };
  
  if (isLoading) {
    return <Spin />;
  }
  
  return (
    <PageContainer
      header={{
        title: prompt?.name || '提示词详情',
        onBack: () => router.back(),
        extra: [
          <Button key="save" onClick={handleSave} loading={updateMutation.isPending}>
            保存草稿
          </Button>,
          <Button key="publish" type="primary">
            发布版本
          </Button>,
        ],
      }}
    >
      <ProCard split="vertical">
        <ProCard colSpan="70%">
          <CodeEditor
            value={content}
            onChange={setContent}
            language="markdown"
            height={600}
          />
        </ProCard>
        <ProCard colSpan="30%" title="版本历史">
          {/* 版本列表 */}
        </ProCard>
      </ProCard>
    </PageContainer>
  );
}
```

---

## 十一、Ant Design 主题配置

### 11.1 ConfigProvider 配置

```tsx
// theme/antdTheme.ts
import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    // 品牌色
    colorPrimary: '#EF4444',
    colorPrimaryHover: '#DC2626',
    colorPrimaryActive: '#B91C1C',
    colorPrimaryBg: '#FEF2F2',
    colorPrimaryBgHover: '#FEE2E2',

    // 成功色
    colorSuccess: '#10B981',
    colorSuccessBg: '#ECFDF5',

    // 警告色
    colorWarning: '#F59E0B',
    colorWarningBg: '#FFFBEB',

    // 错误色
    colorError: '#EF4444',
    colorErrorBg: '#FEF2F2',

    // 信息色
    colorInfo: '#3B82F6',
    colorInfoBg: '#EFF6FF',

    // 圆角
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,

    // 字体
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                 'Helvetica Neue', Arial, 'Noto Sans', 'PingFang SC',
                 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`,

    // 尺寸
    controlHeight: 36,
    controlHeightLG: 44,
    controlHeightSM: 28,
  },

  components: {
    Button: {
      primaryShadow: '0 2px 8px rgba(239, 68, 68, 0.35)',
      defaultBorderColor: '#E5E7EB',
      defaultColor: '#374151',
    },
    Card: {
      borderRadiusLG: 12,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    },
    Table: {
      headerBg: '#F9FAFB',
      headerColor: '#374151',
      rowHoverBg: '#F9FAFB',
      rowSelectedBg: '#FEF2F2',
      rowSelectedHoverBg: '#FEE2E2',
    },
    Menu: {
      itemSelectedBg: '#FEF2F2',
      itemSelectedColor: '#DC2626',
      itemHoverBg: '#F9FAFB',
    },
    Tabs: {
      inkBarColor: '#EF4444',
      itemSelectedColor: '#DC2626',
      itemHoverColor: '#EF4444',
    },
    Input: {
      activeBorderColor: '#EF4444',
      hoverBorderColor: '#FCA5A5',
    },
  },
};
```

### 11.2 使用主题 Token

```tsx
import { theme } from 'antd';

function MyComponent() {
  const { token } = theme.useToken();

  return (
    <div style={{
      color: token.colorText,
      background: token.colorBgContainer,
      borderRadius: token.borderRadius,
    }}>
      内容
    </div>
  );
}
```

---

## 十二、国际化（预留）

MVP 阶段仅支持中文，但组件应预留国际化能力：

```tsx
// 使用语义化的文本常量
const texts = {
  create: '新建',
  edit: '编辑',
  delete: '删除',
  confirm: '确认',
  cancel: '取消',
};

// 组件中使用
<Button>{texts.create}</Button>
```

---

## 十三、UI/UX 优化组件（V2）

> 基于 design-ui-plan 的页面优化需要实现的增强组件

### 13.1 统计卡片增强 (EnhancedStatCard)

工作台统计卡片增强版本，支持趋势指示和迷你图表：

```tsx
type EnhancedStatCardProps = {
  icon: ReactNode;
  iconBg: 'primary' | 'success' | 'warning' | 'info';
  title: string;
  value: number | string;
  suffix?: string;
  trend?: {
    value: number;
    type: 'up' | 'down';
    label?: string;  // 如 "较上周"、"本周"
  };
  sparkline?: number[];  // 迷你趋势数据
  onClick?: () => void;
};
```

**样式规范**：
- 图标背景：渐变色（按类型区分）
- 悬浮效果：`translateY(-2px)` + 阴影增强
- 趋势箭头：上升 `$success-500` / 下降 `$error-500`

### 13.2 任务卡片 (TaskCard)

任务列表卡片化展示组件：

```tsx
type TaskCardProps = {
  id: string;
  name: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  progress: {
    total: number;
    completed: number;
    passed: number;
    failed: number;
  };
  estimatedRemaining?: string;  // 预估剩余时间
  passRate?: number;
  completedAt?: Date;
  duration?: string;
  onViewDetail: () => void;
  onStop?: () => void;
  onRerun?: () => void;
  onExport?: () => void;
};
```

**状态颜色**：
| 状态 | 颜色 | 图标 |
|------|------|------|
| PENDING | `$gray-500` | ⏳ |
| RUNNING | `$info-500` | 🔄 |
| COMPLETED | `$success-500` | ✅ |
| FAILED | `$error-500` | ❌ |
| PAUSED | `$warning-500` | ⏸️ |

### 13.3 快速预览卡片 (PreviewCard)

提示词/数据集快速预览组件：

```tsx
type PreviewCardProps = {
  title: string;
  version?: string;
  tag?: { text: string; color: string };
  content: string;  // 预览内容（截断）
  variables?: string[];
  model?: string;
  creator?: string;
  updatedAt: Date;
  onViewDetail: () => void;
  onQuickTest?: () => void;
};
```

### 13.4 连接状态指示器 (ConnectionStatus)

模型连接状态可视化：

```tsx
type ConnectionStatusProps = {
  status: 'connected' | 'slow' | 'failed';
  latency?: number;  // 毫秒
  lastTested?: Date;
  errorMessage?: string;
};

// 状态颜色
const statusColors = {
  connected: '$success-500',  // 🟢
  slow: '$warning-500',       // 🟡 (延迟 > 2s)
  failed: '$error-500',       // 🔴
};
```

### 13.5 时间范围选择器 (TimeRangeSelector)

监控中心时间范围切换：

```tsx
type TimeRangeSelectorProps = {
  value: '24h' | '7d' | '30d' | 'custom';
  onChange: (value: string) => void;
  customRange?: [Date, Date];
};
```

**样式**：
- 选中态：背景高亮 `$primary-50` + 边框 `$primary-500`
- 使用 `Radio.Group` 实现

### 13.6 全局搜索 (GlobalSearch)

Ctrl/Cmd + K 唤起的命令面板：

```tsx
type GlobalSearchProps = {
  open: boolean;
  onClose: () => void;
};

type SearchResult = {
  type: 'prompt' | 'dataset' | 'task' | 'command';
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
};
```

**功能**：
- 搜索提示词、数据集、任务
- 命令模式（输入 `>` 前缀）
- 最近访问记录
- 键盘导航（↑↓ 选择，Enter 确认）

### 13.7 保存按钮状态 (SaveButton)

设置页面保存按钮状态管理：

```tsx
type SaveButtonProps = {
  state: 'idle' | 'saving' | 'saved' | 'error';
  onClick: () => void;
  disabled?: boolean;
};

// 状态显示
// idle:   [💾 保存设置] (primary)
// saving: [保存中...] (loading)
// saved:  [✓ 已保存] (success, 2秒后恢复)
// error:  [保存失败] (danger)
```

### 13.8 评估器类型标签 (EvaluatorTypeTag)

评估器类型图标化展示：

```tsx
type EvaluatorType =
  | 'exact_match'
  | 'contains'
  | 'regex'
  | 'json_schema'
  | 'similarity'
  | 'llm_judge'
  | 'code'
  | 'composite';

const evaluatorTypeConfig: Record<EvaluatorType, { icon: string; color: string; label: string }> = {
  exact_match: { icon: '✅', color: '#52C41A', label: '精确匹配' },
  contains: { icon: '🔍', color: '#1677FF', label: '包含匹配' },
  regex: { icon: '📝', color: '#722ED1', label: '正则匹配' },
  json_schema: { icon: '📋', color: '#13C2C2', label: 'JSON Schema' },
  similarity: { icon: '📊', color: '#FA8C16', label: '相似度' },
  llm_judge: { icon: '🤖', color: '#EB2F96', label: 'LLM 评估' },
  code: { icon: '💻', color: '#2F54EB', label: '代码评估' },
  composite: { icon: '🔗', color: '#52C41A', label: '组合评估' },
};
```

### 13.9 告警级别标签 (AlertLevelTag)

监控告警级别展示：

```tsx
type AlertLevel = 'critical' | 'warning' | 'info';

const alertLevelConfig: Record<AlertLevel, { icon: string; color: string; bg: string }> = {
  critical: { icon: '🔴', color: '#991B1B', bg: '#FEE2E2' },
  warning: { icon: '🟡', color: '#92400E', bg: '#FEF3C7' },
  info: { icon: '🔵', color: '#1E40AF', bg: '#DBEAFE' },
};
```

---

## 十四、深度优化组件（V3）

> 基于 product-deep-optimization 的专业深度功能所需组件

### 14.1 失败模式卡片 (FailurePatternCard)

智能分析中的失败模式聚类展示：

```tsx
type FailurePatternCardProps = {
  id: string;
  title: string;           // 如 "格式错误"
  count: number;           // 该模式的失败数量
  typicalSample: string;   // 典型样本描述
  commonFeatures: string[];// 共同特征列表
  suggestion: string;      // 优化建议
  samples: FailureSample[];// 该聚类下的所有样本
  expanded: boolean;
  onToggleExpand: () => void;
  onApplySuggestion?: () => void;
  onIgnore?: () => void;
};

type FailureSample = {
  id: string;
  index: number;
  input: string;
  output: string;
  expected?: string;
};
```

**样式规范**：
- 折叠态：显示标题、数量、典型样本、建议
- 展开态：显示完整样本列表
- 建议操作：[应用建议] [忽略]

### 14.2 版本对比面板 (VersionComparePanel)

提示词版本对比展示：

```tsx
type VersionComparePanelProps = {
  leftVersion: PromptVersion;
  rightVersion: PromptVersion;
  metrics: {
    left: VersionMetrics;
    right: VersionMetrics;
  };
  diffContent: DiffLine[];
  effectAnalysis: {
    improvements: string[];
    risks: string[];
  };
  onPublish?: () => void;
  onContinueOptimize?: () => void;
};

type VersionMetrics = {
  passRate: number;
  avgLatency: number;
  tokenUsage: number;
};

type DiffLine = {
  type: 'add' | 'remove' | 'unchanged';
  content: string;
};
```

**样式规范**：
- 左右双栏布局
- 指标变化：上升绿色 ↑ / 下降红色 ↓
- Diff 高亮：新增绿色背景 / 删除红色背景

### 14.3 模型对比表格 (ModelCompareTable)

多模型对比结果展示：

```tsx
type ModelCompareTableProps = {
  models: ModelCompareResult[];
  metrics: MetricConfig[];
  recommendation?: string;
};

type ModelCompareResult = {
  modelId: string;
  modelName: string;
  passRate: number;
  avgLatency: number;
  tokenCost: number;
  formatAccuracy: number;
  complexTaskRate: number;
};

type MetricConfig = {
  key: string;
  title: string;
  sortOrder: 'asc' | 'desc';  // 排序方向
};
```

**样式规范**：
- 胜出指标：绿色背景 `#F6FFED`
- 表头居中，数据右对齐
- 支持点击排序

### 14.4 回归趋势图 (RegressionTrendChart)

版本通过率趋势折线图：

```tsx
type RegressionTrendChartProps = {
  data: VersionTrendPoint[];
  onVersionClick?: (version: string) => void;
};

type VersionTrendPoint = {
  version: string;
  date: string;
  passRate: number;
  changeDescription?: string;
  isRegression?: boolean;  // 是否为回归点
};
```

**样式规范**：
- 正常点：蓝色 `#1677FF`
- 回归点：红色 `#FF4D4F` + 警告图标
- 悬浮显示版本详情和变更说明

### 14.5 版本时间线 (VersionTimeline)

提示词版本变更记录：

```tsx
type VersionTimelineProps = {
  versions: VersionRecord[];
  currentVersion: string;
  onVersionSelect: (version: string) => void;
  onRollback?: (version: string) => void;
  onCompare?: (v1: string, v2: string) => void;
};

type VersionRecord = {
  version: string;
  createdAt: Date;
  changeDescription: string;
  passRate?: number;
  author?: string;
};
```

**样式规范**：
- 当前版本高亮
- 每个节点显示版本号、时间、变更说明、通过率
- 支持点击查看/对比/回滚

### 14.6 任务模板卡片 (TemplateCard)

任务配置模板展示：

```tsx
type TemplateCardProps = {
  id: string;
  name: string;
  description?: string;
  scope: 'personal' | 'team';
  creator?: string;
  configSummary: string;  // 如 "GPT-4o + 标准数据集 + 基础评估器"
  lastUsedAt?: Date;
  usageCount: number;
  onUse: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};
```

**样式规范**：
- 标签区分：我的 / 团队
- 悬浮显示操作按钮
- 常用标识：⭐

### 14.7 异常告警卡片 (AnomalyAlertCard)

智能异常检测结果展示：

```tsx
type AnomalyAlertCardProps = {
  id: string;
  type: 'passrate_drop' | 'latency_spike' | 'failure_pattern' | 'token_anomaly';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  comparison: {
    baseline: number;
    current: number;
    changePercent: number;
  };
  possibleCauses: string[];
  timestamp: Date;
  onViewDetail?: () => void;
  onCompareVersions?: () => void;
  onRollback?: () => void;
  onDismiss?: () => void;
};
```

**严重级别颜色**：
| 级别 | 边框颜色 | 背景颜色 | 图标 |
|------|----------|----------|------|
| critical | `#FF4D4F` | `#FFF2F0` | ⚠️ |
| warning | `#FAAD14` | `#FFFBE6` | 🔔 |
| info | `#1677FF` | `#E6F4FF` | ℹ️ |

### 14.8 评估器推荐面板 (EvaluatorRecommendPanel)

智能评估器推荐展示：

```tsx
type EvaluatorRecommendPanelProps = {
  recommendations: EvaluatorRecommendation[];
  matchScore: number;  // 匹配度百分比
  onUseRecommended: () => void;
  onManualSelect: () => void;
};

type EvaluatorRecommendation = {
  evaluatorId: string;
  name: string;
  type: EvaluatorType;
  reason: string;      // 推荐原因
  isRequired: boolean; // 必选/可选
  isSelected: boolean;
};
```

**样式规范**：
- 推荐组合卡片高亮
- 显示匹配度百分比
- 每个评估器显示推荐原因

### 14.9 上下文提示组件 (ContextualTip)

用户操作后的智能建议提示：

```tsx
type ContextualTipProps = {
  trigger: 'prompt_modified' | 'task_completed' | 'version_published';
  visible: boolean;
  onClose: () => void;
  suggestions: SuggestionItem[];
};

type SuggestionItem = {
  icon: ReactNode;
  title: string;
  action: () => void;
  actionText: string;
};
```

**样式规范**：
- 右下角浮动提示
- 自动消失时间：10秒
- 半透明背景 + 阴影

### 14.10 引导向导步骤 (OnboardingStep)

新用户引导向导步骤：

```tsx
type OnboardingStepProps = {
  step: 1 | 2 | 3;
  title: string;
  description: string;
  estimatedTime: string;  // 如 "2分钟"
  isCompleted: boolean;
  isCurrent: boolean;
  content: ReactNode;     // 步骤内容
  onNext?: () => void;
  onSkip?: () => void;
  onBack?: () => void;
};
```

**样式规范**：
- 步骤指示器在顶部
- 当前步骤高亮
- 已完成步骤显示 ✓
- 预估时间显示在步骤标题旁

---

## 十五、相关文档

- [11-design-system.md](./11-design-system.md) - 设计系统规范（权威来源）
- [02-page-spec.md](./02-page-spec.md) - 页面规格说明
