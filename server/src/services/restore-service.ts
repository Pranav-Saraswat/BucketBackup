import { PrismaClient } from '@prisma/client';
import { getStorageAdapter } from './provider-adapters';
import { decrypt } from './encryption';

const prisma = new PrismaClient();

export class RestoreService {
  /**
   * Performs the disaster recovery restore workflow in the background.
   */
  async runRestore(restoreJobId: string): Promise<void> {
    const restoreJob = await prisma.restoreJob.findUnique({
      where: { id: restoreJobId },
      include: {
        backupJob: {
          include: {
            destConfig: true,
          },
        },
        targetConfig: true,
      },
    });

    if (!restoreJob) {
      console.error(`[Restore] Job ID ${restoreJobId} not found in database.`);
      return;
    }

    const startTime = Date.now();

    await prisma.restoreJob.update({
      where: { id: restoreJobId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    try {
      const backupJob = restoreJob.backupJob;
      const backupConfig = backupJob.destConfig;
      const targetConfig = restoreJob.targetConfig;

      // 1. Decrypt credentials for both source (backup location) and target (restore target location)
      const backupCreds = {
        accessKeyId: backupConfig.accessKey ? decrypt(backupConfig.accessKey) : undefined,
        secretAccessKey: backupConfig.secretKey ? decrypt(backupConfig.secretKey) : undefined,
        region: backupConfig.region || undefined,
        connectionString: backupConfig.connectionString ? decrypt(backupConfig.connectionString) : undefined,
        gcpKeyFile: backupConfig.gcpKeyFile ? decrypt(backupConfig.gcpKeyFile) : undefined,
      };

      const targetCreds = {
        accessKeyId: targetConfig.accessKey ? decrypt(targetConfig.accessKey) : undefined,
        secretAccessKey: targetConfig.secretKey ? decrypt(targetConfig.secretKey) : undefined,
        region: targetConfig.region || undefined,
        connectionString: targetConfig.connectionString ? decrypt(targetConfig.connectionString) : undefined,
        gcpKeyFile: targetConfig.gcpKeyFile ? decrypt(targetConfig.gcpKeyFile) : undefined,
      };

      // 2. Instantiate adapters
      const backupAdapter = getStorageAdapter(backupConfig.provider, backupCreds);
      const targetAdapter = getStorageAdapter(targetConfig.provider, targetCreds);

      // 3. List objects to restore
      // The backups are saved with keys matching their original structure (sourcePath prefix).
      const prefix = backupJob.sourceType === 'local' ? '' : backupJob.sourcePath;
      const backupObjects = await backupAdapter.listObjects(backupConfig.bucketName, prefix);

      if (backupObjects.length === 0) {
        throw new Error(`No files found to restore in backup container '${backupConfig.bucketName}' with prefix '${prefix}'.`);
      }

      let filesRestored = 0;
      let bytesRestored = 0n;

      // 4. Perform direct streaming copy from backup storage -> restore target storage
      for (const obj of backupObjects) {
        const stream = await backupAdapter.downloadObject(backupConfig.bucketName, obj.key);

        // Prep target key base directory path
        let targetKey = obj.key;
        if (restoreJob.targetPath) {
          const cleanPath = restoreJob.targetPath.replace(/\/$/, '');
          targetKey = `${cleanPath}/${obj.key}`;
        }

        await targetAdapter.uploadObject(targetConfig.bucketName, targetKey, stream, obj.size);

        filesRestored += 1;
        bytesRestored += BigInt(obj.size);

        // Update database progress counter
        await prisma.restoreJob.update({
          where: { id: restoreJobId },
          data: {
            filesRestored,
            bytesRestored,
          },
        });
      }

      const durationMs = Date.now() - startTime;

      await prisma.restoreJob.update({
        where: { id: restoreJobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          durationMs,
        },
      });

      // Log success event
      await prisma.auditEvent.create({
        data: {
          action: 'restore_job_completed',
          details: `Disaster recovery restore job ${restoreJobId} successfully completed. Restored ${filesRestored} files (${bytesRestored.toString()} bytes).`,
        },
      });

    } catch (error: any) {
      console.error(`[Restore] Failure during job ${restoreJobId}:`, error);
      const durationMs = Date.now() - startTime;

      await prisma.restoreJob.update({
        where: { id: restoreJobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          durationMs,
          errorMessage: error.message || 'An unexpected error occurred during storage replication.',
        },
      });

      // Log failure event
      await prisma.auditEvent.create({
        data: {
          action: 'restore_job_failed',
          details: `Disaster recovery restore job ${restoreJobId} failed. Error: ${error.message}`,
        },
      });
    }
  }
}
