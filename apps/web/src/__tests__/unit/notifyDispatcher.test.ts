import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AlertWebhookPayload } from '@platform/shared'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    alert: {
      findUnique: vi.fn(),
    },
    notifyChannel: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

// Mock email
vi.mock('@/lib/notify/email', () => ({
  sendAlertEmail: vi.fn(),
}))

// Mock webhook
vi.mock('@/lib/notify/webhook', () => ({
  sendWebhookNotification: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { sendAlertEmail } from '@/lib/notify/email'
import { sendWebhookNotification } from '@/lib/notify/webhook'
import { dispatchAlertNotifications, testNotifyChannel } from '@/lib/notify/dispatcher'

describe('UT-8.3 通知分发器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('dispatchAlertNotifications', () => {
    const mockAlert = {
      id: 'alert-1',
      value: 0.75,
      createdAt: new Date('2024-01-01'),
      rule: {
        id: 'rule-1',
        name: '通过率告警',
        severity: 'WARNING',
        metric: 'PASS_RATE',
        threshold: 0.8,
        condition: 'LT',
        notifyChannels: ['channel-1', 'channel-2'],
        createdBy: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    }

    const mockEmailChannel = {
      id: 'channel-1',
      type: 'EMAIL',
      isActive: true,
      config: {
        recipients: ['admin@example.com'],
      },
    }

    const mockWebhookChannel = {
      id: 'channel-2',
      type: 'WEBHOOK',
      isActive: true,
      config: {
        url: 'https://webhook.example.com/alerts',
        headers: { Authorization: 'Bearer token' },
      },
    }

    it('应该分发通知到所有配置的渠道', async () => {
      vi.mocked(prisma.alert.findUnique).mockResolvedValue(mockAlert as never)
      vi.mocked(prisma.notifyChannel.findMany).mockResolvedValue([
        mockEmailChannel,
        mockWebhookChannel,
      ] as never)
      vi.mocked(sendAlertEmail).mockResolvedValue(undefined)
      vi.mocked(sendWebhookNotification).mockResolvedValue(undefined)

      await dispatchAlertNotifications('alert-1', 'rule-1')

      expect(sendAlertEmail).toHaveBeenCalledWith(
        ['admin@example.com'],
        expect.objectContaining({
          alertId: 'alert-1',
          ruleName: '通过率告警',
          severity: 'WARNING',
        })
      )

      expect(sendWebhookNotification).toHaveBeenCalledWith(
        mockWebhookChannel.config,
        expect.objectContaining({
          alertId: 'alert-1',
          metric: 'PASS_RATE',
          value: 0.75,
          threshold: 0.8,
        })
      )
    })

    it('应该在找不到告警时退出', async () => {
      vi.mocked(prisma.alert.findUnique).mockResolvedValue(null)

      await dispatchAlertNotifications('invalid-alert', 'rule-1')

      expect(sendAlertEmail).not.toHaveBeenCalled()
      expect(sendWebhookNotification).not.toHaveBeenCalled()
    })

    it('应该在没有配置通知渠道时退出', async () => {
      vi.mocked(prisma.alert.findUnique).mockResolvedValue({
        ...mockAlert,
        rule: { ...mockAlert.rule, notifyChannels: [] },
      } as never)

      await dispatchAlertNotifications('alert-1', 'rule-1')

      expect(prisma.notifyChannel.findMany).not.toHaveBeenCalled()
    })

    it('应该只分发到活跃的渠道', async () => {
      vi.mocked(prisma.alert.findUnique).mockResolvedValue(mockAlert as never)
      vi.mocked(prisma.notifyChannel.findMany).mockResolvedValue([mockEmailChannel] as never)
      vi.mocked(sendAlertEmail).mockResolvedValue(undefined)

      await dispatchAlertNotifications('alert-1', 'rule-1')

      expect(sendAlertEmail).toHaveBeenCalledTimes(1)
      expect(sendWebhookNotification).not.toHaveBeenCalled()
    })

    it('应该继续处理其他渠道即使某个渠道失败', async () => {
      vi.mocked(prisma.alert.findUnique).mockResolvedValue(mockAlert as never)
      vi.mocked(prisma.notifyChannel.findMany).mockResolvedValue([
        mockEmailChannel,
        mockWebhookChannel,
      ] as never)
      vi.mocked(sendAlertEmail).mockRejectedValue(new Error('Email failed'))
      vi.mocked(sendWebhookNotification).mockResolvedValue(undefined)

      await dispatchAlertNotifications('alert-1', 'rule-1')

      expect(sendAlertEmail).toHaveBeenCalled()
      expect(sendWebhookNotification).toHaveBeenCalled()
    })
  })

  describe('testNotifyChannel', () => {
    it('应该成功测试邮件渠道', async () => {
      vi.mocked(prisma.notifyChannel.findUnique).mockResolvedValue({
        id: 'channel-1',
        type: 'EMAIL',
        config: { recipients: ['test@example.com'] },
      } as never)
      vi.mocked(sendAlertEmail).mockResolvedValue(undefined)

      const result = await testNotifyChannel('channel-1')

      expect(result.success).toBe(true)
      expect(sendAlertEmail).toHaveBeenCalledWith(
        ['test@example.com'],
        expect.objectContaining({
          ruleName: '测试通知',
          severity: 'WARNING',
        })
      )
    })

    it('应该成功测试 Webhook 渠道', async () => {
      vi.mocked(prisma.notifyChannel.findUnique).mockResolvedValue({
        id: 'channel-2',
        type: 'WEBHOOK',
        config: { url: 'https://webhook.example.com' },
      } as never)
      vi.mocked(sendWebhookNotification).mockResolvedValue(undefined)

      const result = await testNotifyChannel('channel-2')

      expect(result.success).toBe(true)
      expect(sendWebhookNotification).toHaveBeenCalled()
    })

    it('应该在渠道不存在时返回错误', async () => {
      vi.mocked(prisma.notifyChannel.findUnique).mockResolvedValue(null)

      const result = await testNotifyChannel('invalid-channel')

      expect(result.success).toBe(false)
      expect(result.error).toBe('通知渠道不存在')
    })

    it('应该在邮件渠道未配置收件人时返回错误', async () => {
      vi.mocked(prisma.notifyChannel.findUnique).mockResolvedValue({
        id: 'channel-1',
        type: 'EMAIL',
        config: { recipients: [] },
      } as never)

      const result = await testNotifyChannel('channel-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('未配置收件人')
    })

    it('应该在 Webhook 未配置 URL 时返回错误', async () => {
      vi.mocked(prisma.notifyChannel.findUnique).mockResolvedValue({
        id: 'channel-2',
        type: 'WEBHOOK',
        config: {},
      } as never)

      const result = await testNotifyChannel('channel-2')

      expect(result.success).toBe(false)
      expect(result.error).toBe('未配置 Webhook URL')
    })

    it('应该在发送失败时返回错误', async () => {
      vi.mocked(prisma.notifyChannel.findUnique).mockResolvedValue({
        id: 'channel-1',
        type: 'EMAIL',
        config: { recipients: ['test@example.com'] },
      } as never)
      vi.mocked(sendAlertEmail).mockRejectedValue(new Error('SMTP connection failed'))

      const result = await testNotifyChannel('channel-1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('SMTP connection failed')
    })

    it('应该对站内消息渠道返回成功', async () => {
      vi.mocked(prisma.notifyChannel.findUnique).mockResolvedValue({
        id: 'channel-3',
        type: 'INTERNAL',
        config: {},
      } as never)

      const result = await testNotifyChannel('channel-3')

      expect(result.success).toBe(true)
    })
  })
})
