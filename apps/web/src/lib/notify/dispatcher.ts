// 通知分发器

import { prisma } from '../prisma'
import { sendAlertEmail } from './email'
import { sendWebhookNotification } from './webhook'
import type {
  AlertWebhookPayload,
  EmailChannelConfig,
  WebhookChannelConfig,
} from '@platform/shared'

/**
 * 分发告警通知到所有配置的渠道
 */
export async function dispatchAlertNotifications(
  alertId: string,
  ruleId: string
): Promise<void> {
  // 获取告警和规则信息
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: {
      rule: {
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  })

  if (!alert || !alert.rule) {
    console.error(`[Dispatcher] Alert or rule not found: ${alertId}`)
    return
  }

  const rule = alert.rule
  const notifyChannelIds = rule.notifyChannels as string[]

  if (notifyChannelIds.length === 0) {
    console.log(`[Dispatcher] No notify channels configured for rule ${ruleId}`)
    return
  }

  // 获取通知渠道配置
  const channels = await prisma.notifyChannel.findMany({
    where: {
      id: { in: notifyChannelIds },
      isActive: true,
    },
  })

  if (channels.length === 0) {
    console.log(`[Dispatcher] No active notify channels for rule ${ruleId}`)
    return
  }

  // 构建通知 payload
  const payload: AlertWebhookPayload = {
    alertId: alert.id,
    ruleName: rule.name,
    severity: rule.severity as 'WARNING' | 'CRITICAL' | 'URGENT',
    metric: rule.metric as 'PASS_RATE' | 'AVG_LATENCY' | 'ERROR_RATE' | 'COST',
    value: alert.value,
    threshold: rule.threshold,
    condition: rule.condition as 'LT' | 'GT' | 'EQ' | 'LTE' | 'GTE',
    triggeredAt: alert.createdAt.toISOString(),
  }

  // 分发到各个渠道
  const results = await Promise.allSettled(
    channels.map(async (channel) => {
      try {
        switch (channel.type) {
          case 'EMAIL': {
            const config = channel.config as EmailChannelConfig
            await sendAlertEmail(config.recipients || [], payload)
            break
          }

          case 'WEBHOOK': {
            const config = channel.config as WebhookChannelConfig
            await sendWebhookNotification(config, payload)
            break
          }

          case 'INTERNAL': {
            // 站内消息功能：需要前端通知中心 UI 和消息表支持
            // 当前仅记录日志，实际推送在 WebSocket/SSE 实现后完成
            console.log(`[Dispatcher] Internal notification queued for channel ${channel.id}`)
            break
          }

          default:
            console.warn(`[Dispatcher] Unknown channel type: ${channel.type}`)
        }

        console.log(`[Dispatcher] Notification sent via ${channel.type} channel ${channel.id}`)
      } catch (error) {
        console.error(`[Dispatcher] Failed to send via channel ${channel.id}:`, error)
        throw error
      }
    })
  )

  // 统计结果
  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  console.log(
    `[Dispatcher] Alert ${alertId} dispatched: ${succeeded} succeeded, ${failed} failed`
  )
}

/**
 * 测试通知渠道
 */
export async function testNotifyChannel(channelId: string): Promise<{
  success: boolean
  error?: string
}> {
  const channel = await prisma.notifyChannel.findUnique({
    where: { id: channelId },
  })

  if (!channel) {
    return { success: false, error: '通知渠道不存在' }
  }

  const testPayload: AlertWebhookPayload = {
    alertId: 'test_alert',
    ruleName: '测试通知',
    severity: 'WARNING',
    metric: 'PASS_RATE',
    value: 0.75,
    threshold: 0.8,
    condition: 'LT',
    triggeredAt: new Date().toISOString(),
  }

  try {
    switch (channel.type) {
      case 'EMAIL': {
        const config = channel.config as EmailChannelConfig
        if (!config.recipients?.length) {
          return { success: false, error: '未配置收件人' }
        }
        await sendAlertEmail(config.recipients, testPayload)
        break
      }

      case 'WEBHOOK': {
        const config = channel.config as WebhookChannelConfig
        if (!config.url) {
          return { success: false, error: '未配置 Webhook URL' }
        }
        await sendWebhookNotification(config, testPayload)
        break
      }

      case 'INTERNAL':
        // 站内消息测试暂不支持
        return { success: true }

      default:
        return { success: false, error: '未知的渠道类型' }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '测试失败',
    }
  }
}
