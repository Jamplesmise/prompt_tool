'use client'

import { useState } from 'react'
import { Dropdown, Avatar, Space, Modal, Form, Input, Button, Spin } from 'antd'
import { DownOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useTeamStore } from '@/stores/teamStore'
import { useTeams, useCreateTeam } from '@/hooks/useTeams'

export function TeamSelector() {
  const { currentTeam, teams, setCurrentTeam } = useTeamStore()
  const { isLoading } = useTeams()
  const createTeam = useCreateTeam()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [form] = Form.useForm()

  if (isLoading && teams.length === 0) {
    return (
      <Space>
        <Spin size="small" />
        <span>加载团队...</span>
      </Space>
    )
  }

  if (!currentTeam) {
    return (
      <Button type="link" onClick={() => setCreateModalOpen(true)}>
        <PlusOutlined /> 创建团队
      </Button>
    )
  }

  const menuItems: MenuProps['items'] = [
    ...teams.map((t) => ({
      key: t.id,
      label: (
        <Space>
          <Avatar
            size="small"
            src={t.avatar}
            icon={<TeamOutlined />}
            style={{ backgroundColor: t.id === currentTeam.id ? '#1890ff' : '#ccc' }}
          />
          <span>{t.name}</span>
          {t.id === currentTeam.id && (
            <span style={{ color: '#1890ff', fontSize: 12 }}>(当前)</span>
          )}
        </Space>
      ),
      onClick: () => setCurrentTeam(t),
    })),
    { type: 'divider' as const },
    {
      key: 'create',
      label: (
        <Space>
          <PlusOutlined /> 创建新团队
        </Space>
      ),
      onClick: () => setCreateModalOpen(true),
    },
  ]

  const handleCreate = async (values: { name: string; description?: string }) => {
    try {
      await createTeam.mutateAsync(values)
      setCreateModalOpen(false)
      form.resetFields()
    } catch {
      // error handled in hook
    }
  }

  return (
    <>
      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <Space style={{ cursor: 'pointer' }}>
          <Avatar
            size="small"
            src={currentTeam.avatar}
            icon={<TeamOutlined />}
            style={{ backgroundColor: '#1890ff' }}
          />
          <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentTeam.name}
          </span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      </Dropdown>

      <Modal
        title="创建新团队"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="团队名称"
            name="name"
            rules={[{ required: true, message: '请输入团队名称' }]}
          >
            <Input placeholder="请输入团队名称" />
          </Form.Item>
          <Form.Item label="团队描述" name="description">
            <Input.TextArea placeholder="请输入团队描述（可选）" rows={3} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createTeam.isPending}
              >
                创建
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
