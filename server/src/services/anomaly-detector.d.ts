export declare class AnomalyDetector {
    /**
     * Analyzes recent backup logs for a specific job to detect anomalies.
     * Features:
     * 1. Success rate drops
     * 2. Sudden file size variations (exceeding 50% deviation)
     * 3. Duration spikes
     */
    analyzeJob(jobId: string): Promise<{
        isAnomalous: boolean;
        reason?: string;
    }>;
}
//# sourceMappingURL=anomaly-detector.d.ts.map