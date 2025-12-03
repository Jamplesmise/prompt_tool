'use client'

import { useEffect, useState } from 'react'
import { Modal, Form, Input, Select, Switch, Space, Typography } from 'antd'
import { useCreateScheduledTask, useUpdateScheduledTask } from '@/hooks/useScheduledTasks'
import { useTasks } from '@/hooks/useTasks'
import CronEditor from './CronEditor'
import type { ScheduledTaskListItem } from '@/services/scheduledTasks'

const { TextArea } = Input
const { Text } = Typography

type CreateScheduledModalProps = {
  open: boolean
  onClose: () => void
  editingTask?: ScheduledTaskListItem | null
}

type FormValues = {
  name: string
  description?: string
  taskTemplateId?: string
  cronExpression: string
  timezone: string
  isActive: boolean
}

// 时区选项
const TIMEZONE_OPTIONS = [
  { label: 'Asia/Shanghai (中国标准时间)', value: 'Asia/Shanghai' },
  { label: 'Asia/Tokyo (日本标准时间)', value: 'Asia/Tokyo' },
  { label: 'America/New_York (美国东部时间)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (美国太平洋时间)', value: 'America/Los_Angeles' },
  { label: 'Europe/London (伦敦时间)', value: 'Europe/London' },
  { label: 'UTC (协调世界时)', value: 'UTC' },
]

export default function CreateScheduledModal({
  open,
  onClose,
  editingTask,
}: CreateScheduledModalProps) {
  const [form] = Form.useForm<FormValues>()
  const [cronValue, setCronValue] = useState('0 0 * * *')

  const createMutation = useCreateScheduledTask()
  const updateMutation = useUpdateScheduledTask()

  // 获取已完成的任务作为模板选项
  const { data: tasksData, isLoading: tasksLoading } = useTasks({
    status: 'COMPLETED',
    pageSize: 100,
  })

  const isEditing = !!editingTask

  useEffect(() => {
    if (open) {
      if (editingTask) {
        form.setFieldsValue({
          name: editingTask.name,
          description: editingTask.description || undefined,
          cronExpression: editingTask.cronExpression,
          timezone: editingTask.timezone,
          isActive: editingTask.isActive,
        })
        setCronValue(editingTask.cronExpression)
      } else {
        form.resetFields()
        form.setFieldsValue({
          cronExpression: '0 0 * * *',
          timezone: 'Asia/Shanghai',
          isActive: true,
        })
        setCronValue('0 0 * * *')
      }
    }
  }, [open, editingTask, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: editingTask.id,
          data: {
            name: values.name,
            description: values.description,
            cronExpression: values.cronExpression,
            timezone: values.timezone,
          },
        })
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          description: values.description,
          taskTemplateId: values.taskTemplateId!,
          cronExpression: values.cronExpression,
          timezone: values.timezone,
          isActive: values.isActive,
        })
      }

      onClose()
    } catch (error) {
      // Form validation error or API error
      console.error('Submit error:', error)
    }
  }

  const handleCronChange = (value: string) => {
    setCronValue(value)
    form.setFieldsValue({ cronExpression: value })
  }

  return (
    <Modal
      title={isEditing ? '编辑定时任务' : '创建定时任务'}
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          cronExpression: '0 0 * * *',
          timezone: 'Asia/Shanghai',
          isActive: true,
        }}
      >
        <Form.Item
          name="name"
          label="任务名称"
          rules={[{ required: true, message: '请输入任务名称' }]}
        >
          <Input placeholder="输入定时任务名称" maxLength={100} />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <TextArea
            placeholder="输入任务描述（可选）"
            rows={2}
            maxLength={500}
            showCount
          />
        </Form.Item>

        {!isEditing && (
          <Form.Item
            name="taskTemplateId"
            label="任务模板"
            rules={[{ required: true, message: '请选择任务模板' }]}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                选择一个已完成的任务作为定时执行的模板
              </Text>
            }
          >
            <Select
              placeholder="选择任务模板"
              loading={tasksLoading}
              showSearch
              optionFilterProp="label"
              options={tasksData?.list?.map((task) => ({
                label: task.name,
                value: task.id,
              }))}
            />
          </Form.Item>
        )}

        <Form.Item
          name="cronExpression"
          label="执行频率"
          rules={[{ required: true, message: '请设置执行频率' }]}
        >
          <CronEditor value={cronValue} onChange={handleCronChange} />
        </Form.Item>

        <Form.Item name="timezone" label="时区">
          <Select options={TIMEZONE_OPTIONS} />
        </Form.Item>

        <Form.Item name="isActive" label="启用状态" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
