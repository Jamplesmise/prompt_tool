'use client'

import { useState } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tag,
  Space,
  Typography,
  Popconfirm,
  message,
  Alert,
} from 'antd'
import { KeyOutlined, PlusOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons'
import { useTokens, useCreateToken, useDeleteToken } from '@/hooks/useTokens'
import type { ColumnsType } from 'antd/es/table'
import type { ApiTokenScope } from '@platform/shared'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const scopeOptions = [
  { label: '只读 (read)', value: 'read' },
  { label: '读写 (write)', value: 'write' },
  { label: '执行 (execute)', value: 'execute' },
  { label: '管理 (admin)', value: 'admin' },
]

const scopeColors: Record<ApiTokenScope, string> = {
  read: 'green',
  write: 'blue',
  execute: 'orange',
  admin: 'red',
}

type TokenListItem = {
  id: string
  name: string
  tokenPrefix: string
  scopes: ApiTokenScope[]
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

export default function TokensPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useTokens({ page, pageSize: 10 })
  const createToken = useCreateToken()
  const deleteToken = useDeleteToken()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [form] = Form.useForm()

  const columns: ColumnsType<TokenListItem> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Token',
      dataIndex: 'tokenPrefix',
      key: 'tokenPrefix',
      render: (prefix: string) => <Text code>{prefix}</Text>,
    },
    {
      title: '权限',
      dataIndex: 'scopes',
      key: 'scopes',
      render: (scopes: ApiTokenScope[]) => (
        <Space>
          {scopes.map((scope) => (
            <Tag key={scope} color={scopeColors[scope]}>
              {scope}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (date: string | null) =>
        date ? dayjs(date).format('YYYY-MM-DD') : '永不过期',
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (date: string | null) =>
        date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '从未使用',
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="确定要删除此 Token 吗？"
          description="删除后使用此 Token 的请求将无法访问"
          onConfirm={() => deleteToken.mutate(record.id)}
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  const handleCreate = async (values: {
    name: string
    scopes: ApiTokenScope[]
    expiresAt?: dayjs.Dayjs
  }) => {
    try {
      const result = await createToken.mutateAsync({
        name: values.name,
        scopes: values.scopes,
        expiresAt: values.expiresAt?.toISOString() || null,
      })
      setNewToken(result.token)
      form.resetFields()
    } catch {
      // error handled in hook
    }
  }

  const copyToken = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken)
      message.success('Token 已复制到剪贴板')
    }
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          <KeyOutlined style={{ marginRight: 8 }} />
          API Token
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalOpen(true)}
        >
          创建 Token
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data?.list}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: page,
          pageSize: 10,
          total: data?.total,
          onChange: setPage,
        }}
      />

      <Modal
        title="创建 API Token"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false)
          setNewToken(null)
        }}
        footer={null}
        destroyOnClose
      >
        {newToken ? (
          <div>
            <Alert
              message="Token 创建成功"
              description="请立即复制保存此 Token，关闭后将无法再次查看完整内容。"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div
              style={{
                background: '#f5f5f5',
                padding: 12,
                borderRadius: 4,
                marginBottom: 16,
              }}
            >
              <Paragraph copyable={{ text: newToken }} style={{ margin: 0 }}>
                <Text code style={{ wordBreak: 'break-all' }}>
                  {newToken}
                </Text>
              </Paragraph>
            </div>
            <Space>
              <Button type="primary" icon={<CopyOutlined />} onClick={copyToken}>
                复制 Token
              </Button>
              <Button
                onClick={() => {
                  setCreateModalOpen(false)
                  setNewToken(null)
                }}
              >
                关闭
              </Button>
            </Space>
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleCreate}>
            <Form.Item
              label="Token 名称"
              name="name"
              rules={[{ required: true, message: '请输入 Token 名称' }]}
            >
              <Input placeholder="例如：CI/CD Token" />
            </Form.Item>

            <Form.Item
              label="权限范围"
              name="scopes"
              initialValue={['read']}
              rules={[{ required: true, message: '请选择权限范围' }]}
            >
              <Select mode="multiple" options={scopeOptions} />
            </Form.Item>

            <Form.Item label="过期时间" name="expiresAt">
              <DatePicker
                style={{ width: '100%' }}
                placeholder="留空表示永不过期"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setCreateModalOpen(false)}>取消</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createToken.isPending}
                >
                  创建
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Card>
  )
}
