import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import os from 'os';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

/**
 * Health check endpoint for Kubernetes liveness/readiness probes.
 */
export const checkHealth = async (req: Request, res: Response) => {
  try {
    // Verify database connection is alive
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error: any) {
    console.error('Liveness probe failed:', error.message);
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
    });
  }
};

/**
 * Retrieve comprehensive statistics and system resources.
 */
export const getSystemMetrics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Gather DB counts for the current organization
    const totalJobs = await prisma.backupJob.count({
      where: { organizationId: user.organizationId }
    });

    const activeJobs = await prisma.backupJob.count({
      where: { organizationId: user.organizationId, status: 'running' }
    });

    const completedRuns = await prisma.jobRun.count({
      where: {
        status: 'completed',
        job: { organizationId: user.organizationId }
      }
    });

    const failedRuns = await prisma.jobRun.count({
      where: {
        status: 'failed',
        job: { organizationId: user.organizationId }
      }
    });

    const storageConfigsCount = await prisma.storageConfig.count({
      where: { organizationId: user.organizationId }
    });

    const activeAlerts = await prisma.alert.count({
      where: {
        resolved: false,
        job: { organizationId: user.organizationId }
      }
    });

    // 2. Sum up total volume of data synchronized
    const dataTransferredResult = await prisma.jobRun.aggregate({
      where: {
        status: 'completed',
        job: { organizationId: user.organizationId }
      },
      _sum: {
        bytesSynced: true
      }
    });
    const bytesTransferred = dataTransferredResult._sum.bytesSynced || 0n;

    // 3. Compute System Resource Allocation
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const cpuLoad = os.loadavg()[0] || 0; // 1-minute load average

    // Calculate Sync Success Rate
    const totalRuns = completedRuns + failedRuns;
    const successRate = totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 100.0;

    // 4. Save snapshot in DB for records
    await prisma.healthSnapshot.create({
      data: {
        cpuUsage: cpuLoad,
        memoryUsage: Number(((usedMemory / totalMemory) * 100).toFixed(2)),
        diskUsage: 0.0, // OS-level disk checking can be complex; default to 0.0 or mock check
        apiLatencyMs: 5, // Static estimate for database check
        activeWorkers: activeJobs
      }
    });

    // Send complete diagnostic results
    res.json({
      organizationId: user.organizationId,
      counters: {
        totalJobs,
        activeJobs,
        completedRuns,
        failedRuns,
        storageConfigsCount,
        activeAlerts,
        successRate: Number(successRate.toFixed(1)),
        bytesTransferred: bytesTransferred.toString()
      },
      system: {
        cpuLoad: Number(cpuLoad.toFixed(2)),
        memory: {
          total: totalMemory.toString(),
          free: freeMemory.toString(),
          used: usedMemory.toString(),
          usagePercent: Number(((usedMemory / totalMemory) * 100).toFixed(2))
        },
        uptime: process.uptime(),
        platform: os.platform(),
        arch: os.arch()
      }
    });
  } catch (error: any) {
    console.error('Failed to compile diagnostics metrics:', error);
    res.status(500).json({ error: 'Failed to compile system metrics.' });
  }
};
