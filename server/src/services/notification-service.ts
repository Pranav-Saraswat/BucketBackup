import axios from 'axios';

export class NotificationService {
  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
  }

  async sendSlackAlert(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    if (!this.webhookUrl) return;

    const colors = {
      info: '#3b82f6',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b'
    };

    const payload = {
      attachments: [
        {
          color: colors[type],
          title: `BucketBackup Alert: ${type.toUpperCase()}`,
          text: message,
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    try {
      await axios.post(this.webhookUrl, payload);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }
}
