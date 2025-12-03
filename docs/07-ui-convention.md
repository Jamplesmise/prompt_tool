# UI 组件规范

## 一、组件库使用

### 1.1 主要组件来源

| 来源 | 用途 | 导入方式 |
|------|------|----------|
| antd | 基础组件 | `import { Button } from 'antd'` |
| @ant-design/pro-components | 高级业务组件 | `import { ProTable } from '@ant-design/pro-components'` |
| @ant-design/icons | 图标 | `import { PlusOutlined } from '@ant-design/icons'` |
| @monaco-editor/react | 代码编辑器 | `import Editor from '@monaco-editor/react'` |

### 1.2 禁止使用

- 不要直接使用原生 HTML form 元素，使用 Ant Design Form
- 不要使用其他 UI 库（Material UI, Chakra UI 等）
- 不要使用 Tailwind CSS（样式使用 CSS Modules 或 styled-components）

---

## 二、常用组件选择指南

### 2.1 表格

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

### 2.2 表单

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

### 2.3 布局

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

## 三、状态管理

### 3.1 Zustand Store 规范

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

### 3.2 React Query 使用规范

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

## 四、通用组件封装

### 4.1 确认删除按钮

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

### 4.2 状态标签

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

### 4.3 代码编辑器封装

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

### 4.4 空状态

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

## 五、页面模板

### 5.1 列表页模板

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

### 5.2 详情页模板

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

## 六、样式规范

### 6.1 间距规范

| 场景 | 间距 |
|------|------|
| 卡片内边距 | 24px |
| 表单项间距 | 24px |
| 按钮组间距 | 8px |
| 列表项间距 | 16px |

### 6.2 颜色规范

使用 Ant Design 主题 Token：

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

### 6.3 响应式断点

| 断点 | 宽度 | 说明 |
|------|------|------|
| xs | < 576px | 手机 |
| sm | ≥ 576px | 小屏 |
| md | ≥ 768px | 平板 |
| lg | ≥ 992px | 桌面 |
| xl | ≥ 1200px | 大屏 |
| xxl | ≥ 1600px | 超大屏 |

---

## 七、国际化（预留）

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
