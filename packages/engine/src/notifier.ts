import { errorMessage } from '@corvus/contract'
import * as crypto from 'node:crypto'

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean
  user?: string
  password?: string
  fromAddress: string
}

export interface WebhookConfig {
  url: string
  secretKey?: string
  headers?: Record<string, string>
}

export interface NotificationPayload {
  jobId: string
  jobName: string
  status: 'SUCCESS' | 'FAILED' | 'WARNING'
  message: string
  durationMs: number
  timestamp: string
}

export class CorvusNotifier {
  public static signWebhookPayload(payload: string, secretKey: string): string {
    return crypto.createHmac('sha256', secretKey).update(payload).digest('hex')
  }

  public static async sendWebhook(
    config: WebhookConfig,
    payload: NotificationPayload,
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
      const body = JSON.stringify(payload)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.headers || {}),
      }

      if (config.secretKey) {
        headers['X-Corvus-Signature'] = this.signWebhookPayload(body, config.secretKey)
      }

      const response = await fetch(config.url, {
        method: 'POST',
        headers,
        body,
      })

      return {
        success: response.ok,
        statusCode: response.status,
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: errorMessage(err),
      }
    }
  }

  public static async sendTestNotification(
    type: 'webhook' | 'smtp',
    config: { webhook?: WebhookConfig; smtp?: SmtpConfig },
  ): Promise<{ success: boolean; error?: string }> {
    const testPayload: NotificationPayload = {
      jobId: 'test-job',
      jobName: 'Test Notification',
      status: 'SUCCESS',
      message: 'This is a test notification from Corvus DB Studio.',
      durationMs: 120,
      timestamp: new Date().toISOString(),
    }

    if (type === 'webhook' && config.webhook) {
      const res = await this.sendWebhook(config.webhook, testPayload)
      return { success: res.success, error: res.error }
    }

    return { success: true }
  }
}
