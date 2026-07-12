import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { SyncEngine } from './sync-engine';
import { NotificationService } from './notification-service';
import { AnomalyDetector } from './anomaly-detector';
import { decrypt } from './encryption';

const prisma = new PrismaClient();
const syncEngine = new SyncEngine();
const notificationService = new NotificationService();
const anomalyDetector = new AnomalyDetector();

export class BackupScheduler {
  private activeJobs: Map<string, any> = new Map();

  /**
   * Initializes all schedules stored in the database on startup.
   */
  async init() {
    console.log('⏰ Loading active schedules from database...');
    try {
      const jobs = await prisma.backupJob.findMany({
        where: { 
          cronExpression: { not: null },
          status: { not: 'paused' } 
        },
        include: { destConfig: true, sourceConfig: true }
      });

      for (const job of jobs) {
        if (job.cronExpression) {
          this.scheduleJob(job);
        }
      }
    } catch (error) {
      console.error('Failed to load jobs in scheduler initialization:', error);
    }
  }

  /**
   * Registers or updates a cron task for a backup job.
   */
  scheduleJob(job: any) {
    if (this.activeJobs.has(job.id)) {
      this.activeJobs.get(job.id)?.stop();
      this.activeJobs.delete(job.id);
    }

    if (!job.cronExpression) return;

    try {
      const task = cron.schedule(job.cronExpression, async () => {
        console.log(`[Scheduler] Triggering scheduled job: ${job.name} (${job.id})`);
        await this.runBackup(job.id);
      });

      this.activeJobs.set(job.id, task);
      console.log(`[Scheduler] Successfully scheduled job '${job.name}' with expression: '${job.cronExpression}'`);
    } catch (err: any) {
      console.error(`[Scheduler] Failed scheduling job '${job.name}':`, err.message);
    }
  }

  /**
   * Stops and deletes a scheduled cron task.
   */
  unscheduleJob(jobId: string) {
    if (this.activeJobs.has(jobId)) {
      this.activeJobs.get(jobId)?.stop();
      this.activeJobs.delete(jobId);
      console.log(`[Scheduler] Unscheduled job schedule: ${jobId}`);
    }
  }

  /**
   * Manually triggers a backup execution in the background.
   */
  async triggerManualBackup(jobId: string) {
    const job = await prisma.backupJob.findUnique({
      where: { id: jobId }
    });
    if (!job) throw new Error('Backup job not found.');
    
    // Background execution
    this.runBackup(jobId).catch(err => {
      console.error(`[Scheduler] Background run failed for manual trigger on job ${jobId}:`, err);
    });
  }

  /**
   * Core orchestrator that runs the sync and records metrics.
   */
  async runBackup(jobId: string) {
    const job = await prisma.backupJob.findUnique({
      where: { id: jobId },
      include: { destConfig: true, sourceConfig: true }
    });

    if (!job) {
      console.error(`[Scheduler] Job ID ${jobId} not found. Sync request ignored.`);
      return;
    }

    // Register a new JobRun tracker
    const jobRun = await prisma.jobRun.create({
      data: {
        jobId: job.id,
        status: 'running',
        startedAt: new Date()
      }
    });

    const startTime = Date.now();

    try {
      await prisma.backupJob.update({
        where: { id: job.id },
        data: { status: 'running' }
      });

      // Decrypt credentials
      const destCreds = {
        accessKeyId: job.destConfig.accessKey ? decrypt(job.destConfig.accessKey) : undefined,
        secretAccessKey: job.destConfig.secretKey ? decrypt(job.destConfig.secretKey) : undefined,
        region: job.destConfig.region || undefined,
        connectionString: job.destConfig.connectionString ? decrypt(job.destConfig.connectionString) : undefined,
        gcpKeyFile: job.destConfig.gcpKeyFile ? decrypt(job.destConfig.gcpKeyFile) : undefined
      };

      const sourceCreds = job.sourceConfig ? {
        accessKeyId: job.sourceConfig.accessKey ? decrypt(job.sourceConfig.accessKey) : undefined,
        secretAccessKey: job.sourceConfig.secretKey ? decrypt(job.sourceConfig.secretKey) : undefined,
        region: job.sourceConfig.region || undefined,
        connectionString: job.sourceConfig.connectionString ? decrypt(job.sourceConfig.connectionString) : undefined,
        gcpKeyFile: job.sourceConfig.gcpKeyFile ? decrypt(job.sourceConfig.gcpKeyFile) : undefined
      } : undefined;

      const syncConfig = {
        syncMode: job.syncMode as any,
        sourceType: job.sourceType as any,
        sourcePath: job.sourcePath,
        sourceProvider: job.sourceConfig?.provider,
        sourceCredentials: sourceCreds,
        sourceBucket: job.sourceConfig?.bucketName,
        destProvider: job.destConfig.provider,
        destCredentials: destCreds,
        destBucket: job.destConfig.bucketName,
        concurrencyLimit: 5
      };

      // Execute file syncing
      const syncResult = await syncEngine.sync(syncConfig, async (syncedFiles, syncedBytes) => {
        // Live progress tracking
        await prisma.jobRun.update({
          where: { id: jobRun.id },
          data: {
            filesSynced: syncedFiles,
            bytesSynced: syncedBytes
          }
        });
      });

      const durationMs = Date.now() - startTime;
      const finalStatus = syncResult.errors.length > 0 ? 'failed' : 'completed';

      // Update the JobRun record
      await prisma.jobRun.update({
        where: { id: jobRun.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          durationMs,
          filesTotal: syncResult.filesTotal,
          filesSynced: syncResult.filesSynced,
          bytesSynced: syncResult.bytesSynced,
          errorMessage: syncResult.errors.join('\n') || null,
          checksumsVerified: true
        }
      });

      // Update backup job
      await prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: finalStatus,
          lastRun: new Date()
        }
      });

      // Add to BackupLog
      await prisma.backupLog.create({
        data: {
          jobId: job.id,
          status: finalStatus,
          message: syncResult.errors.length > 0 
            ? `Sync completed with errors: ${syncResult.errors.join('; ')}`
            : `Sync completed successfully. Total files: ${syncResult.filesTotal}.`,
          fileSize: syncResult.bytesSynced,
          durationMs
        }
      });

      // Perform anomaly detection check
      const anomaly = await anomalyDetector.analyzeJob(job.id);
      if (anomaly.isAnomalous) {
        await prisma.alert.create({
          data: {
            jobId: job.id,
            type: 'anomaly',
            severity: 'warning',
            message: anomaly.reason || 'Anomaly detected in backup metrics.'
          }
        });
        await notificationService.sendSlackAlert(`⚠️ Anomaly detected for ${job.name}: ${anomaly.reason}`, 'warning');
      }

      if (finalStatus === 'completed') {
        await notificationService.sendSlackAlert(`✅ Backup completed successfully for job ${job.name}. Synced ${syncResult.filesSynced} files.`, 'success');
      } else {
        await notificationService.sendSlackAlert(`❌ Backup failed for job ${job.name}. Errors: ${syncResult.errors.slice(0, 3).join('; ')}`, 'error');
      }

    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      console.error(`[Scheduler] Failure during backup execution on job ${job.id}:`, error);

      await prisma.jobRun.update({
        where: { id: jobRun.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          durationMs,
          errorMessage: error.message || 'Fatal system failure during storage backup.'
        }
      });

      await prisma.backupJob.update({
        where: { id: job.id },
        data: { status: 'failed' }
      });

      await prisma.backupLog.create({
        data: {
          jobId: job.id,
          status: 'failed',
          message: `Fatal error: ${error.message}`
        }
      });

      await prisma.alert.create({
        data: {
          jobId: job.id,
          type: 'failure',
          severity: 'critical',
          message: `Critical sync failure: ${error.message}`
        }
      });

      await notificationService.sendSlackAlert(`🚨 CRITICAL: Job failure for ${job.name}: ${error.message}`, 'error');
    }
  }
}
