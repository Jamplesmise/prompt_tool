'use client'

import { useState } from 'react'
import { Dropdown, Avatar, Space, Modal, Form, Input, Button, Spin } from 'antd'
import { DownOutlined, PlusOutlined, ProjectOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useProjectStore } from '@/stores/projectStore'
import { useProjects, useCreateProject } from '@/hooks/useProjects'

export function ProjectSelector() {
  const { currentProject, projects, setCurrentProject } = useProjectStore()
  const { isLoading } = useProjects()
  const createProject = useCreateProject()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [form] = Form.useForm()

  if (isLoading && projects.length === 0) {
    return (
      <Space>
        <Spin size="small" />
        <span>加载项目...</span>
      </Space>
    )
  }

  if (!currentProject) {
    return (
      <Button type="link" onClick={() => setCreateModalOpen(true)}>
        <PlusOutlined /> 创建项目
      </Button>
    )
  }

  const menuItems: MenuProps['items'] = [
    ...projects.map((p) => ({
      key: p.id,
      label: (
        <Space>
          <Avatar
            size="small"
            src={p.avatar}
            icon={<ProjectOutlined />}
            style={{ backgroundColor: p.id === currentProject.id ? '#1890ff' : '#ccc' }}
          />
          <span>{p.name}</span>
          {p.id === currentProject.id && (
            <span style={{ color: '#1890ff', fontSize: 12 }}>(当前)</span>
          )}
        </Space>
      ),
      onClick: () => setCurrentProject(p),
    })),
    { type: 'divider' as const },
    {
      key: 'create',
      label: (
        <Space>
          <PlusOutlined /> 创建新项目
        </Space>
      ),
      onClick: () => setCreateModalOpen(true),
    },
  ]

  const handleCreate = async (values: { name: string; description?: string }) => {
    try {
      await createProject.mutateAsync(values)
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
            src={currentProject.avatar}
            icon={<ProjectOutlined />}
            style={{ backgroundColor: '#1890ff' }}
          />
          <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {currentProject.name}
          </span>
          <DownOutlined style={{ fontSize: 10 }} />
        </Space>
      </Dropdown>

      <Modal
        title="创建新项目"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item
            label="项目名称"
            name="name"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          <Form.Item label="项目描述" name="description">
            <Input.TextArea placeholder="请输入项目描述（可选）" rows={3} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createProject.isPending}
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
