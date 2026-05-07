"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupScheduler = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const client_1 = require("@prisma/client");
const sync_engine_1 = require("./sync-engine");
const notification_service_1 = require("./notification-service");
const prisma = new client_1.PrismaClient();
const syncEngine = new sync_engine_1.SyncEngine();
const notificationService = new notification_service_1.NotificationService();
class BackupScheduler {
    activeJobs = new Map();
    async init() {
        const jobs = await prisma.backupJob.findMany({
            where: { cronExpression: { not: null } },
            include: { storageConfig: true }
        });
        for (const job of jobs) {
            if (job.cronExpression) {
                this.scheduleJob(job);
            }
        }
    }
    scheduleJob(job) {
        if (this.activeJobs.has(job.id)) {
            this.activeJobs.get(job.id)?.stop();
        }
        const task = node_cron_1.default.schedule(job.cronExpression, async () => {
            console.log(`Running scheduled backup for: ${job.name}`);
            await this.runBackup(job);
        });
        this.activeJobs.set(job.id, task);
    }
    async triggerManualBackup(jobId) {
        const job = await prisma.backupJob.findUnique({
            where: { id: jobId },
            include: { storageConfig: true }
        });
        if (!job)
            throw new Error('Job not found');
        // Run in background
        this.runBackup(job);
    }
    async runBackup(job) {
        const startTime = Date.now();
        try {
            await prisma.backupJob.update({
                where: { id: job.id },
                data: { status: 'running' }
            });
            // Simple implementation: upload the sourcePath file
            const location = await syncEngine.uploadFile(job.sourcePath, {
                provider: job.storageConfig.provider,
                bucketName: job.storageConfig.bucketName,
                region: job.storageConfig.region,
                credentials: {
                    accessKeyId: job.storageConfig.accessKey,
                    secretAccessKey: job.storageConfig.secretKey,
                    connectionString: job.storageConfig.connectionString
                }
            });
            const durationMs = Date.now() - startTime;
            await prisma.backupLog.create({
                data: {
                    jobId: job.id,
                    status: 'completed',
                    message: `Backup successful. Location: ${location}`,
                    durationMs
                }
            });
            await prisma.backupJob.update({
                where: { id: job.id },
                data: { status: 'completed', lastRun: new Date() }
            });
            await notificationService.sendSlackAlert(`Backup completed for ${job.name}`, 'success');
        }
        catch (error) {
            console.error(`Backup failed for ${job.name}:`, error);
            await prisma.backupLog.create({
                data: {
                    jobId: job.id,
                    status: 'failed',
                    message: `Backup failed: ${error.message}`
                }
            });
            await prisma.backupJob.update({
                where: { id: job.id },
                data: { status: 'failed' }
            });
            await notificationService.sendSlackAlert(`Backup failed for ${job.name}: ${error.message}`, 'error');
        }
    }
}
exports.BackupScheduler = BackupScheduler;
//# sourceMappingURL=scheduler.js.map