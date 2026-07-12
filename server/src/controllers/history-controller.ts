import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { RestoreService } from '../services/restore-service';

const prisma = new PrismaClient();
const restoreService = new RestoreService();

export const getJobRuns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const runs = await prisma.jobRun.findMany({
      where: {
        job: { organizationId: user.organizationId }
      },
      include: {
        job: {
          select: { name: true, sourceType: true, syncMode: true }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 100
    });

    const serializedRuns = runs.map(run => ({
      ...run,
      bytesSynced: run.bytesSynced.toString()
    }));

    res.json(serializedRuns);
  } catch (error: any) {
    console.error('Failed to retrieve job runs:', error);
    res.status(500).json({ error: 'Failed to retrieve job runs.' });
  }
};

export const getRestoreJobs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const restores = await prisma.restoreJob.findMany({
      where: {
        backupJob: { organizationId: user.organizationId }
      },
      include: {
        backupJob: {
          select: { name: true }
        },
        targetConfig: {
          select: { provider: true, bucketName: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const serializedRestores = restores.map(r => ({
      ...r,
      bytesRestored: r.bytesRestored.toString()
    }));

    res.json(serializedRestores);
  } catch (error: any) {
    console.error('Failed to retrieve restore jobs:', error);
    res.status(500).json({ error: 'Failed to retrieve restore jobs.' });
  }
};

export const getRestoreJobById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const restore = await prisma.restoreJob.findFirst({
      where: {
        id,
        backupJob: { organizationId: user.organizationId }
      },
      include: {
        backupJob: {
          select: { name: true }
        },
        targetConfig: {
          select: { provider: true, bucketName: true }
        }
      }
    });

    if (!restore) return res.status(404).json({ error: 'Restore job not found.' });

    res.json({
      ...restore,
      bytesRestored: restore.bytesRestored.toString()
    });
  } catch (error: any) {
    console.error('Failed to fetch restore details:', error);
    res.status(500).json({ error: 'Failed to retrieve restore job details.' });
  }
};

export const createRestoreJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { backupJobId, targetConfigId, targetPath, checkpointRunId } = req.body;

    if (!backupJobId || !targetConfigId) {
      return res.status(400).json({ error: 'Backup job ID and target config ID are required.' });
    }

    // Verify backup job ownership
    const backupJob = await prisma.backupJob.findFirst({
      where: { id: backupJobId, organizationId: user.organizationId }
    });
    if (!backupJob) {
      return res.status(404).json({ error: 'Backup job not found.' });
    }

    // Verify target config ownership
    const targetConfig = await prisma.storageConfig.findFirst({
      where: { id: targetConfigId, organizationId: user.organizationId }
    });
    if (!targetConfig) {
      return res.status(404).json({ error: 'Target storage configuration not found.' });
    }

    // Create restore tracking model
    const restoreJob = await prisma.restoreJob.create({
      data: {
        backupJobId,
        targetConfigId,
        targetPath: targetPath || '',
        checkpointRunId: checkpointRunId || null,
        status: 'running'
      }
    });

    // Run restore in background
    restoreService.runRestore(restoreJob.id).catch((err) => {
      console.error(`[Restore] Background execution fail on job ${restoreJob.id}:`, err);
    });

    // Log the restore request
    await prisma.auditEvent.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'trigger_restore',
        details: `Triggered restore for backup job ${backupJobId} onto target storage config ${targetConfigId}.`,
      },
    });

    res.status(201).json({
      id: restoreJob.id,
      status: restoreJob.status,
      message: 'Restore job initiated successfully in the background.'
    });

  } catch (error: any) {
    console.error('Failed to trigger restore:', error);
    res.status(500).json({ error: 'Failed to schedule disaster recovery restore.' });
  }
};
