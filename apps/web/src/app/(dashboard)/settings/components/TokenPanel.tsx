'use client'

import { useState } from 'react'
import { Table, Space, Tag, Button, Popconfirm, Modal, Form, Input, Select, DatePicker, Alert, message, Typography } from 'antd'
import { PlusOutlined, CopyOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { ApiTokenScope } from '@platform/shared'
import { useTokens, useCreateToken, useDeleteToken } from '@/hooks/useTokens'
import dayjs from 'dayjs'
import styles from '../settings.module.css'

const { Text, Paragraph } = Typography

type TokenListItem = {
  id: string
  name: string
  tokenPrefix: string
  scopes: ApiTokenScope[]
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

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

export function TokenPanel() {
  const [tokenPage, setTokenPage] = useState(1)
  const { data: tokenData, isLoading: tokenLoading } = useTokens({ page: tokenPage, pageSize: 5 })
  const createToken = useCreateToken()
  const deleteToken = useDeleteToken()
  const [createTokenModalOpen, setCreateTokenModalOpen] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)
  const [tokenForm] = Form.useForm()

  const handleCreateToken = async (formValues: {
    name: string
    scopes: ApiTokenScope[]
    expiresAt?: dayjs.Dayjs
  }) => {
    try {
      const result = await createToken.mutateAsync({
        name: formValues.name,
        scopes: formValues.scopes,
        expiresAt: formValues.expiresAt?.toISOString() || null,
      })
      setNewToken(result.token)
      tokenForm.resetFields()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建 Token 失败')
    }
  }

  const tokenColumns: ColumnsType<TokenListItem> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
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
        <Space size={4}>
          {scopes.map((s) => (
            <Tag key={s} color={scopeColors[s]}>
              {s}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '过期',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (d: string | null) => (d ? dayjs(d).format('YYYY-MM-DD') : '永不'),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, r) => (
        <Popconfirm title="确定删除？" onConfirm={() => deleteToken.mutate(r.id)}>
          <Button type="link" danger size="small">
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <div className={styles.panelContent}>
        <Table<TokenListItem>
          columns={tokenColumns}
          dataSource={tokenData?.list}
          rowKey="id"
          loading={tokenLoading}
          size="small"
          pagination={{
            current: tokenPage,
            pageSize: 5,
            total: tokenData?.total,
            onChange: setTokenPage,
            showSizeChanger: false,
          }}
        />
      </div>

      <Modal
        title="创建 API Token"
        open={createTokenModalOpen}
        onCancel={() => {
          setCreateTokenModalOpen(false)
          setNewToken(null)
          tokenForm.resetFields()
        }}
        footer={null}
        destroyOnClose
      >
        {newToken ? (
          <div>
            <Alert
              message="Token 创建成功"
              description="请立即复制保存，关闭后无法再次查看。"
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <div className={styles.tokenDisplay}>
              <Paragraph copyable={{ text: newToken }} style={{ margin: 0 }}>
                <Text code style={{ wordBreak: 'break-all' }}>
                  {newToken}
                </Text>
              </Paragraph>
            </div>
            <Space>
              <Button
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(newToken)
                  message.success('已复制')
                }}
              >
                复制
              </Button>
              <Button
                onClick={() => {
                  setCreateTokenModalOpen(false)
                  setNewToken(null)
                }}
              >
                关闭
              </Button>
            </Space>
          </div>
        ) : (
          <Form form={tokenForm} layout="vertical" onFinish={handleCreateToken}>
            <Form.Item label="Token 名称" name="name" rules={[{ required: true, message: '请输入名称' }]}>
              <Input placeholder="例如：CI/CD Token" />
            </Form.Item>
            <Form.Item
              label="权限范围"
              name="scopes"
              initialValue={['read']}
              rules={[{ required: true, message: '请选择权限' }]}
            >
              <Select mode="multiple" options={scopeOptions} />
            </Form.Item>
            <Form.Item label="过期时间" name="expiresAt">
              <DatePicker
                style={{ width: '100%' }}
                placeholder="留空表示永不过期"
                disabledDate={(c) => c && c < dayjs().startOf('day')}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setCreateTokenModalOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit" loading={createToken.isPending}>
                  创建
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </>
  )
}

// 导出面板头部额外按钮
export function TokenPanelExtra({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="primary"
      size="small"
      icon={<PlusOutlined />}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      创建
    </Button>
  )
}
