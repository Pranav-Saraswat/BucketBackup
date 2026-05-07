import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { SyncEngine } from './sync-engine';
import { NotificationService } from './notification-service';

const prisma = new PrismaClient();
const syncEngine = new SyncEngine();
const notificationService = new NotificationService();

export class BackupScheduler {
  private activeJobs: Map<string, any> = new Map();

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

  scheduleJob(job: any) {
    if (this.activeJobs.has(job.id)) {
      this.activeJobs.get(job.id)?.stop();
    }

    const task = cron.schedule(job.cronExpression, async () => {
      console.log(`Running scheduled backup for: ${job.name}`);
      await this.runBackup(job);
    });

    this.activeJobs.set(job.id, task);
  }

  async triggerManualBackup(jobId: string) {
    const job = await prisma.backupJob.findUnique({
      where: { id: jobId },
      include: { storageConfig: true }
    });
    if (!job) throw new Error('Job not found');
    
    // Run in background
    this.runBackup(job);
  }

  private async runBackup(job: any) {
    const startTime = Date.now();
    try {
      await prisma.backupJob.update({
        where: { id: job.id },
        data: { status: 'running' }
      });

      // Simple implementation: upload the sourcePath file
      const location = await syncEngine.uploadFile(job.sourcePath, {
        provider: job.storageConfig.provider as any,
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

    } catch (error: any) {
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
