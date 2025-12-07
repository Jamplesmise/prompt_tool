'use client'

import { useState } from 'react'
import { Modal, Form, Input, Switch, Typography, Space, Tag } from 'antd'
import { SaveOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { useCreateTemplate } from '@/hooks/useTemplates'
import type { TemplateConfig } from '@/hooks/useTemplates'

const { Text, Paragraph } = Typography
const { TextArea } = Input

type SaveTemplateModalProps = {
  open: boolean
  onClose: () => void
  config: TemplateConfig
  teamId?: string
  onSuccess?: () => void
}

export function SaveTemplateModal({
  open,
  onClose,
  config,
  teamId,
  onSuccess,
}: SaveTemplateModalProps) {
  const [form] = Form.useForm()
  const createTemplate = useCreateTemplate()

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      await createTemplate.mutateAsync({
        name: values.name,
        description: values.description,
        config,
        isPublic: values.isPublic,
        teamId: values.isPublic ? teamId : undefined,
      })

      form.resetFields()
      onClose()
      onSuccess?.()
    } catch (error) {
      // 表单验证失败或请求失败，hook 内已处理错误提示
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  // 配置摘要
  const configSummary = []
  if (config.promptId) configSummary.push('提示词')
  if (config.modelId) configSummary.push('模型')
  if (config.datasetId) configSummary.push('数据集')
  if (config.evaluatorIds?.length) configSummary.push(`${config.evaluatorIds.length}个评估器`)
  if (config.samplingConfig) configSummary.push('采样配置')
  if (config.abTest?.enabled) configSummary.push('A/B测试')

  return (
    <Modal
      title={
        <Space>
          <SaveOutlined />
          <span>保存为模板</span>
        </Space>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText="保存"
      cancelText="取消"
      confirmLoading={createTemplate.isPending}
      width={480}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ isPublic: false }}
      >
        <Form.Item
          name="name"
          label="模板名称"
          rules={[
            { required: true, message: '请输入模板名称' },
            { max: 50, message: '名称不能超过50个字符' },
          ]}
        >
          <Input placeholder="如：标准测试配置、快速验证模板" />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述（可选）"
          rules={[{ max: 200, message: '描述不能超过200个字符' }]}
        >
          <TextArea
            placeholder="描述模板的用途和适用场景"
            rows={2}
            showCount
            maxLength={200}
          />
        </Form.Item>

        {teamId && (
          <Form.Item
            name="isPublic"
            label="共享范围"
            valuePropName="checked"
          >
            <Switch
              checkedChildren={<><TeamOutlined /> 团队</>}
              unCheckedChildren={<><UserOutlined /> 个人</>}
            />
          </Form.Item>
        )}

        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>将保存以下配置：</Text>
          <div style={{ marginTop: 8 }}>
            {configSummary.length > 0 ? (
              <Space wrap>
                {configSummary.map((item, index) => (
                  <Tag key={index}>{item}</Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">暂无配置</Text>
            )}
          </div>
        </div>
      </Form>
    </Modal>
  )
}
