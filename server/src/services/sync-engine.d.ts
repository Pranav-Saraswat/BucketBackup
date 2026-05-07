export interface SyncConfig {
    provider: 'aws' | 'gcp' | 'azure';
    bucketName: string;
    region?: string;
    credentials: {
        accessKeyId?: string;
        secretAccessKey?: string;
        connectionString?: string;
        keyFileContent?: string;
    };
}
export declare class SyncEngine {
    uploadFile(filePath: string, config: SyncConfig): Promise<string>;
    private uploadToAWS;
    private uploadToGCP;
    private uploadToAzure;
}
//# sourceMappingURL=sync-engine.d.ts.map