import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AnomalyDetector {
  /**
   * Analyzes recent backup logs for a specific job to detect anomalies.
   * Features: 
   * 1. Success rate drops
   * 2. Sudden file size variations (exceeding 50% deviation)
   * 3. Duration spikes
   */
  async analyzeJob(jobId: string): Promise<{ isAnomalous: boolean; reason?: string }> {
    const logs = await prisma.backupLog.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (logs.length < 3) return { isAnomalous: false };

    // 1. Success Rate Check
    const failureCount = logs.filter((l: any) => l.status === 'failed').length;
    if (failureCount > 3) {
      return { isAnomalous: true, reason: 'Frequent backup failures detected recently.' };
    }

    // 2. File Size Anomaly
    const sizes = logs.map((l: any) => Number(l.fileSize || 0)).filter((s: number) => s > 0);
    if (sizes.length >= 2) {
      const lastSize = sizes[0] as number;
      const avgSize = sizes.slice(1).reduce((a: number, b: number) => a + b, 0) / (sizes.length - 1);
      
      const deviation = Math.abs(lastSize - avgSize) / avgSize;
      if (deviation > 0.5) {
        return { 
          isAnomalous: true, 
          reason: `Sudden data change: Last backup size (${(lastSize / 1024 / 1024).toFixed(2)} MB) deviated by ${(deviation * 100).toFixed(1)}% from average.` 
        };
      }
    }

    // 3. Duration Anomaly
    const durations = logs.map((l: any) => l.durationMs || 0).filter((d: number) => d > 0);
    if (durations.length >= 2) {
      const lastDuration = durations[0] as number;
      const avgDuration = durations.slice(1).reduce((a: number, b: number) => a + b, 0) / (durations.length - 1);
      
      if (lastDuration > avgDuration * 2) {
        return { isAnomalous: true, reason: 'Significant backup duration spike detected.' };
      }
    }

    return { isAnomalous: false };
  }
}
