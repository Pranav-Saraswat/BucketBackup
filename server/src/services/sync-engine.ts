import AWS from 'aws-sdk';
import { Storage as GCS } from '@google-cloud/storage';
import { BlobServiceClient } from '@azure/storage-blob';
import fs from 'fs';
import path from 'path';

export interface SyncConfig {
  provider: 'aws' | 'gcp' | 'azure';
  bucketName: string;
  region?: string;
  credentials: {
    accessKeyId?: string;
    secretAccessKey?: string;
    connectionString?: string;
    keyFileContent?: string; // For GCP
  };
}

export class SyncEngine {
  async uploadFile(filePath: string, config: SyncConfig): Promise<string> {
    const fileName = path.basename(filePath);
    
    switch (config.provider) {
      case 'aws':
        return this.uploadToAWS(filePath, fileName, config);
      case 'gcp':
        return this.uploadToGCP(filePath, fileName, config);
      case 'azure':
        return this.uploadToAzure(filePath, fileName, config);
      default:
        throw new Error('Unsupported provider');
    }
  }

  private async uploadToAWS(filePath: string, fileName: string, config: SyncConfig): Promise<string> {
    const s3 = new AWS.S3({
      accessKeyId: config.credentials.accessKeyId,
      secretAccessKey: config.credentials.secretAccessKey,
      region: config.region
    });

    const fileStream = fs.createReadStream(filePath);
    const params = {
      Bucket: config.bucketName,
      Key: fileName,
      Body: fileStream
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  }

  private async uploadToGCP(filePath: string, fileName: string, config: SyncConfig): Promise<string> {
    const storage = new GCS({
      credentials: JSON.parse(config.credentials.keyFileContent || '{}')
    });

    const bucket = storage.bucket(config.bucketName);
    const file = bucket.file(fileName);

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(file.createWriteStream())
        .on('error', reject)
        .on('finish', () => resolve(`gs://${config.bucketName}/${fileName}`));
    });
  }

  private async uploadToAzure(filePath: string, fileName: string, config: SyncConfig): Promise<string> {
    if (!config.credentials.connectionString) throw new Error('Azure connection string missing');
    
    const blobServiceClient = BlobServiceClient.fromConnectionString(config.credentials.connectionString);
    const containerClient = blobServiceClient.getContainerClient(config.bucketName);
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    await blockBlobClient.uploadFile(filePath);
    return blockBlobClient.url;
  }
}
