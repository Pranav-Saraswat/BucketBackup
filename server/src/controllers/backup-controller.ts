import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { scheduler } from '../index';

const prisma = new PrismaClient();

export const getAllJobs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const jobs = await prisma.backupJob.findMany({
      where: { organizationId: user.organizationId },
      include: {
        destConfig: {
          select: { id: true, provider: true, bucketName: true }
        },
        sourceConfig: {
          select: { id: true, provider: true, bucketName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(jobs);
  } catch (error: any) {
    console.error('Failed to fetch backup jobs:', error);
    res.status(500).json({ error: 'Failed to fetch backup jobs.' });
  }
};

export const createJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, description, syncMode, sourceType, sourcePath, sourceConfigId, destConfigId, cronExpression } = req.body;

    if (!name || !destConfigId) {
      return res.status(400).json({ error: 'Job name and destination config are required.' });
    }

    const job = await prisma.backupJob.create({
      data: {
        name,
        description,
        syncMode: syncMode || 'one-way',
        sourceType: sourceType || 'local',
        sourcePath: sourcePath || '',
        sourceConfigId: sourceConfigId || null,
        destConfigId,
        cronExpression: cronExpression || null,
        organizationId: user.organizationId,
        status: 'idle',
      },
      include: { destConfig: true, sourceConfig: true }
    });

    // Schedule job if cron is specified
    if (job.cronExpression) {
      scheduler.scheduleJob(job);
    }

    res.status(201).json(job);
  } catch (error: any) {
    console.error('Failed to create backup job:', error);
    res.status(500).json({ error: 'Failed to create backup job.' });
  }
};

export const getJobById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const job = await prisma.backupJob.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        destConfig: {
          select: { id: true, provider: true, bucketName: true }
        },
        sourceConfig: {
          select: { id: true, provider: true, bucketName: true }
        }
      }
    });

    if (!job) return res.status(404).json({ error: 'Backup job not found.' });
    res.json(job);
  } catch (error: any) {
    console.error('Failed to fetch job:', error);
    res.status(500).json({ error: 'Failed to fetch job.' });
  }
};

export const updateJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, description, syncMode, sourceType, sourcePath, sourceConfigId, destConfigId, cronExpression } = req.body;

    const existingJob = await prisma.backupJob.findFirst({
      where: { id, organizationId: user.organizationId }
    });

    if (!existingJob) return res.status(404).json({ error: 'Backup job not found.' });

    const job = await prisma.backupJob.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        syncMode: syncMode || undefined,
        sourceType: sourceType || undefined,
        sourcePath: sourcePath !== undefined ? sourcePath : undefined,
        sourceConfigId: sourceConfigId !== undefined ? sourceConfigId : undefined,
        destConfigId: destConfigId || undefined,
        cronExpression: cronExpression !== undefined ? cronExpression : undefined,
      },
      include: { destConfig: true, sourceConfig: true }
    });

    // Update schedule
    if (job.status !== 'paused') {
      if (job.cronExpression) {
        scheduler.scheduleJob(job);
      } else {
        scheduler.unscheduleJob(job.id);
      }
    }

    res.json(job);
  } catch (error: any) {
    console.error('Failed to update job:', error);
    res.status(500).json({ error: 'Failed to update backup job.' });
  }
};

export const deleteJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const existingJob = await prisma.backupJob.findFirst({
      where: { id, organizationId: user.organizationId }
    });

    if (!existingJob) return res.status(404).json({ error: 'Backup job not found.' });

    // Unschedule cron
    scheduler.unscheduleJob(id);

    await prisma.backupJob.delete({
      where: { id }
    });

    res.json({ message: 'Backup job successfully deleted.' });
  } catch (error: any) {
    console.error('Failed to delete job:', error);
    res.status(500).json({ error: 'Failed to delete backup job.' });
  }
};

export const triggerBackup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const existingJob = await prisma.backupJob.findFirst({
      where: { id, organizationId: user.organizationId }
    });

    if (!existingJob) return res.status(404).json({ error: 'Backup job not found.' });

    await scheduler.triggerManualBackup(id);
    res.json({ message: `Backup job '${existingJob.name}' triggered successfully in the background.` });
  } catch (error: any) {
    console.error('Failed to trigger backup:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger backup job.' });
  }
};

export const pauseJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const existingJob = await prisma.backupJob.findFirst({
      where: { id, organizationId: user.organizationId }
    });

    if (!existingJob) return res.status(404).json({ error: 'Backup job not found.' });

    scheduler.unscheduleJob(id);

    const job = await prisma.backupJob.update({
      where: { id },
      data: { status: 'paused' }
    });

    res.json({ message: `Job ${job.name} paused successfully.`, job });
  } catch (error: any) {
    console.error('Failed to pause job:', error);
    res.status(500).json({ error: 'Failed to pause backup job.' });
  }
};

export const resumeJob = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const existingJob = await prisma.backupJob.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { destConfig: true, sourceConfig: true }
    });

    if (!existingJob) return res.status(404).json({ error: 'Backup job not found.' });

    const job = await prisma.backupJob.update({
      where: { id },
      data: { status: 'idle' }
    });

    if (existingJob.cronExpression) {
      scheduler.scheduleJob(existingJob);
    }

    res.json({ message: `Job ${job.name} resumed successfully.`, job });
  } catch (error: any) {
    console.error('Failed to resume job:', error);
    res.status(500).json({ error: 'Failed to resume backup job.' });
  }
};

export const getJobLogs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const existingJob = await prisma.backupJob.findFirst({
      where: { id, organizationId: user.organizationId }
    });

    if (!existingJob) return res.status(404).json({ error: 'Backup job not found.' });

    const logs = await prisma.backupLog.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // Convert BigInt for JSON serialization
    const serializedLogs = logs.map(log => ({
      ...log,
      fileSize: log.fileSize?.toString()
    }));

    res.json(serializedLogs);
  } catch (error: any) {
    console.error('Failed to fetch logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs.' });
  }
};
