export declare class BackupScheduler {
    private activeJobs;
    init(): Promise<void>;
    scheduleJob(job: any): void;
    triggerManualBackup(jobId: string): Promise<void>;
    private runBackup;
}
//# sourceMappingURL=scheduler.d.ts.map