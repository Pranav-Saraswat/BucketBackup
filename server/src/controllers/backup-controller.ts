import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { scheduler } from '../index';

const prisma = new PrismaClient();

export const getAllJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.backupJob.findMany({
      include: { storageConfig: true }
    });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch backup jobs' });
  }
};

export const createJob = async (req: Request, res: Response) => {
  try {
    const { name, sourcePath, cronExpression, storageConfigId } = req.body;
    const job = await prisma.backupJob.create({
      data: { name, sourcePath, cronExpression, storageConfigId }
    });
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create backup job' });
  }
};

export const getJobById = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  try {
    const job = await prisma.backupJob.findUnique({
      where: { id },
      include: { storageConfig: true }
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch job' });
  }
};

export const triggerBackup = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  try {
    await scheduler.triggerManualBackup(id);
    res.json({ message: `Backup job ${id} triggered successfully` });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to trigger backup' });
  }
};

export const getJobLogs = async (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  try {
    const logs = await prisma.backupLog.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    // Convert BigInt to string for JSON serialization
    const serializedLogs = logs.map(log => ({
      ...log,
      fileSize: log.fileSize?.toString()
    }));
    res.json(serializedLogs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};
