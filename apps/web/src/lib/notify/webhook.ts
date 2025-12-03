// Webhook 通知发送

import type { AlertWebhookPayload } from '@platform/shared'

type WebhookConfig = {
  url: string
  headers?: Record<string, string>
  template?: string
}

/**
 * 发送 Webhook 通知
 */
export async function sendWebhookNotification(
  config: WebhookConfig,
  payload: AlertWebhookPayload
): Promise<void> {
  const { url, headers = {}, template } = config

  // 构建请求体
  let body: string
  if (template) {
    // 使用自定义模板
    body = renderTemplate(template, payload)
  } else {
    // 使用默认 JSON 格式
    body = JSON.stringify(payload)
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    console.log(`[Webhook] Notification sent to ${url}`)
  } catch (error) {
    console.error(`[Webhook] Failed to send to ${url}:`, error)
    throw error
  }
}

/**
 * 渲染模板（简单的变量替换）
 */
function renderTemplate(template: string, payload: AlertWebhookPayload): string {
  let result = template

  // 替换顶层变量
  result = result.replace(/\{\{alertId\}\}/g, payload.alertId)
  result = result.replace(/\{\{ruleName\}\}/g, payload.ruleName)
  result = result.replace(/\{\{severity\}\}/g, payload.severity)
  result = result.replace(/\{\{metric\}\}/g, payload.metric)
  result = result.replace(/\{\{value\}\}/g, String(payload.value))
  result = result.replace(/\{\{threshold\}\}/g, String(payload.threshold))
  result = result.replace(/\{\{condition\}\}/g, payload.condition)
  result = result.replace(/\{\{triggeredAt\}\}/g, payload.triggeredAt)

  // 替换 context 变量
  if (payload.context) {
    result = result.replace(/\{\{context\.taskId\}\}/g, payload.context.taskId || '')
    result = result.replace(/\{\{context\.taskName\}\}/g, payload.context.taskName || '')
    result = result.replace(/\{\{context\.promptId\}\}/g, payload.context.promptId || '')
    result = result.replace(/\{\{context\.promptName\}\}/g, payload.context.promptName || '')
    result = result.replace(/\{\{context\.modelId\}\}/g, payload.context.modelId || '')
    result = result.replace(/\{\{context\.modelName\}\}/g, payload.context.modelName || '')
  }

  return result
}

/**
 * 测试 Webhook 配置
 */
export async function testWebhookConfig(config: WebhookConfig): Promise<boolean> {
  const testPayload: AlertWebhookPayload = {
    alertId: 'test_alert_id',
    ruleName: '测试告警规则',
    severity: 'WARNING',
    metric: 'PASS_RATE',
    value: 0.75,
    threshold: 0.8,
    condition: 'LT',
    triggeredAt: new Date().toISOString(),
    context: {
      taskId: 'test_task_id',
      taskName: '测试任务',
    },
  }

  try {
    await sendWebhookNotification(config, testPayload)
    return true
  } catch {
    return false
  }
}
