'use client'

import { Form, Input, Select, Switch, Space, Button, message } from 'antd'
import { SaveButton } from '@/components/settings'
import { useSettingsForm } from '@/hooks/useSettingsForm'
import styles from '../settings.module.css'

type GeneralSettings = {
  siteName: string
  defaultPageSize: number
  defaultTimezone: string
  language: string
  enableNotifications: boolean
}

const TIMEZONE_OPTIONS = [
  { label: '亚洲/上海 (UTC+8)', value: 'Asia/Shanghai' },
  { label: '亚洲/东京 (UTC+9)', value: 'Asia/Tokyo' },
  { label: '美国/纽约 (UTC-5)', value: 'America/New_York' },
  { label: '欧洲/伦敦 (UTC+0)', value: 'Europe/London' },
]

const LANGUAGE_OPTIONS = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
]

const PAGE_SIZE_OPTIONS = [
  { label: '10 条/页', value: 10 },
  { label: '20 条/页', value: 20 },
  { label: '50 条/页', value: 50 },
]

export function GeneralSettingsPanel() {
  const {
    values: generalValues,
    setFieldValue: setGeneralField,
    isDirty: generalDirty,
    saveState: generalSaveState,
    save: saveGeneral,
    reset: resetGeneral,
  } = useSettingsForm({
    initialValues: {
      siteName: 'AI 测试平台',
      defaultPageSize: 20,
      defaultTimezone: 'Asia/Shanghai',
      language: 'zh-CN',
      enableNotifications: true,
    } as GeneralSettings,
    onSave: async (values) => {
      // 系统设置存储到 localStorage（后续可扩展为 API 持久化）
      localStorage.setItem('system-settings', JSON.stringify(values))
      await new Promise((resolve) => setTimeout(resolve, 300))
      message.success('设置已保存')
    },
  })

  return (
    <div className={styles.panelContent}>
      <Form layout="vertical" className={styles.compactForm}>
        <Form.Item label="站点名称">
          <Input value={generalValues.siteName} onChange={(e) => setGeneralField('siteName', e.target.value)} />
        </Form.Item>
        <Space size={16}>
          <Form.Item label="默认分页">
            <Select
              value={generalValues.defaultPageSize}
              onChange={(v) => setGeneralField('defaultPageSize', v)}
              options={PAGE_SIZE_OPTIONS}
              style={{ width: 120 }}
            />
          </Form.Item>
          <Form.Item label="时区">
            <Select
              value={generalValues.defaultTimezone}
              onChange={(v) => setGeneralField('defaultTimezone', v)}
              options={TIMEZONE_OPTIONS}
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item label="语言">
            <Select
              value={generalValues.language}
              onChange={(v) => setGeneralField('language', v)}
              options={LANGUAGE_OPTIONS}
              style={{ width: 120 }}
            />
          </Form.Item>
        </Space>
        <Form.Item label="系统通知">
          <Switch
            checked={generalValues.enableNotifications}
            onChange={(v) => setGeneralField('enableNotifications', v)}
            checkedChildren="开启"
            unCheckedChildren="关闭"
          />
        </Form.Item>
      </Form>
      <Space>
        <Button onClick={resetGeneral} disabled={!generalDirty} size="small">
          重置
        </Button>
        <SaveButton state={generalSaveState} onClick={saveGeneral} disabled={!generalDirty} />
      </Space>
    </div>
  )
}
