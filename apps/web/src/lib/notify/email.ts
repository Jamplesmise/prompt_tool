// 邮件通知发送

import nodemailer from 'nodemailer'
import type { AlertWebhookPayload, AlertSeverity } from '@platform/shared'

// 邮件配置（从环境变量读取）
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
}

const fromAddress = process.env.SMTP_FROM || 'noreply@example.com'

// 创建邮件传输器（惰性初始化）
let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport(emailConfig)
  }
  return transporter
}

// 告警级别颜色
const severityColors: Record<AlertSeverity, string> = {
  WARNING: '#faad14',
  CRITICAL: '#ff4d4f',
  URGENT: '#cf1322',
}

// 告警级别中文名
const severityNames: Record<AlertSeverity, string> = {
  WARNING: '警告',
  CRITICAL: '严重',
  URGENT: '紧急',
}

/**
 * 生成告警邮件 HTML 模板
 */
function generateAlertEmailHtml(payload: AlertWebhookPayload): string {
  const color = severityColors[payload.severity]
  const severityName = severityNames[payload.severity]

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${color}; color: white; padding: 16px; border-radius: 8px 8px 0 0; }
    .content { background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px; }
    .label { color: #666; font-size: 14px; margin-bottom: 4px; }
    .value { font-size: 16px; margin-bottom: 16px; }
    .metric { background: white; padding: 12px; border-radius: 4px; margin-bottom: 16px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">[${severityName}] ${payload.ruleName}</h2>
    </div>
    <div class="content">
      <div class="metric">
        <div class="label">当前值</div>
        <div class="value" style="font-size: 24px; font-weight: bold;">${formatMetricValue(payload.metric, payload.value)}</div>
        <div class="label">阈值</div>
        <div class="value">${formatMetricValue(payload.metric, payload.threshold)}</div>
      </div>

      <div class="label">触发时间</div>
      <div class="value">${new Date(payload.triggeredAt).toLocaleString('zh-CN')}</div>

      ${payload.context?.taskName ? `
      <div class="label">关联任务</div>
      <div class="value">${payload.context.taskName}</div>
      ` : ''}
    </div>
    <div class="footer">
      此邮件由 AI 模型测试平台自动发送
    </div>
  </div>
</body>
</html>
`
}

/**
 * 格式化指标值
 */
function formatMetricValue(metric: string, value: number): string {
  switch (metric) {
    case 'PASS_RATE':
    case 'ERROR_RATE':
      return `${(value * 100).toFixed(1)}%`
    case 'AVG_LATENCY':
      return `${Math.round(value)}ms`
    case 'COST':
      return `$${value.toFixed(4)}`
    default:
      return String(value)
  }
}

/**
 * 发送告警邮件
 */
export async function sendAlertEmail(
  recipients: string[],
  payload: AlertWebhookPayload
): Promise<void> {
  if (recipients.length === 0) {
    console.log('[Email] No recipients, skipping')
    return
  }

  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.warn('[Email] SMTP not configured, skipping email notification')
    return
  }

  const severityName = severityNames[payload.severity]
  const subject = `[${severityName}] ${payload.ruleName} - AI 模型测试平台告警`

  const html = generateAlertEmailHtml(payload)

  try {
    const transport = getTransporter()

    await transport.sendMail({
      from: fromAddress,
      to: recipients.join(','),
      subject,
      html,
    })

    console.log(`[Email] Alert email sent to ${recipients.length} recipients`)
  } catch (error) {
    console.error('[Email] Failed to send alert email:', error)
    throw error
  }
}

/**
 * 测试邮件配置
 */
export async function testEmailConfig(recipient: string): Promise<boolean> {
  try {
    const transport = getTransporter()
    await transport.verify()

    await transport.sendMail({
      from: fromAddress,
      to: recipient,
      subject: 'AI 模型测试平台 - 邮件配置测试',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>邮件配置测试成功</h2>
          <p>如果您收到此邮件，说明邮件通知配置正确。</p>
          <p style="color: #999; font-size: 12px;">发送时间: ${new Date().toLocaleString('zh-CN')}</p>
        </div>
      `,
    })

    return true
  } catch (error) {
    console.error('[Email] Config test failed:', error)
    return false
  }
}
