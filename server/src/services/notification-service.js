"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const axios_1 = __importDefault(require("axios"));
class NotificationService {
    webhookUrl;
    constructor() {
        this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    }
    async sendSlackAlert(message, type = 'info') {
        if (!this.webhookUrl)
            return;
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
            await axios_1.default.post(this.webhookUrl, payload);
        }
        catch (error) {
            console.error('Failed to send Slack notification:', error);
        }
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=notification-service.js.map