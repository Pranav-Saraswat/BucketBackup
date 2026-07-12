import AWS from 'aws-sdk';
import { Storage as GCS } from '@google-cloud/storage';
import { BlobServiceClient } from '@azure/storage-blob';
import { Readable } from 'stream';

export interface CloudCredentials {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  connectionString?: string; // Azure
  gcpKeyFile?: string; // GCP Service Account JSON string
}

export interface CloudObject {
  key: string;
  size: number;
  lastModified: Date;
  checksum: string; // MD5/ETag hex string
}

export interface CloudStorageAdapter {
  listObjects(bucket: string, prefix?: string): Promise<CloudObject[]>;
  downloadObject(bucket: string, key: string): Promise<Readable>;
  uploadObject(bucket: string, key: string, stream: Readable, size: number): Promise<string>;
  deleteObject(bucket: string, key: string): Promise<void>;
  testConnection(bucket: string): Promise<boolean>;
}

// -------------------------------------------------------------
// AWS S3 Adapter
// -------------------------------------------------------------
export class AWSS3Adapter implements CloudStorageAdapter {
  private s3: AWS.S3;

  constructor(creds: CloudCredentials) {
    this.s3 = new AWS.S3({
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
      region: creds.region || 'us-east-1',
      signatureVersion: 'v4',
    });
  }

  async listObjects(bucket: string, prefix?: string): Promise<CloudObject[]> {
    const params: AWS.S3.ListObjectsV2Request = {
      Bucket: bucket,
      Prefix: prefix,
    };
    const response = await this.s3.listObjectsV2(params).promise();
    return (
      response.Contents?.map((item) => ({
        key: item.Key || '',
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
        checksum: (item.ETag || '').replace(/"/g, ''), // Strip quotes from ETag
      })) || []
    );
  }

  async downloadObject(bucket: string, key: string): Promise<Readable> {
    return this.s3
      .getObject({ Bucket: bucket, Key: key })
      .createReadStream();
  }

  async uploadObject(bucket: string, key: string, stream: Readable, size: number): Promise<string> {
    const uploadResult = await this.s3
      .upload({
        Bucket: bucket,
        Key: key,
        Body: stream,
      })
      .promise();
    return uploadResult.Location;
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.s3.deleteObject({ Bucket: bucket, Key: key }).promise();
  }

  async testConnection(bucket: string): Promise<boolean> {
    try {
      await this.s3.headBucket({ Bucket: bucket }).promise();
      return true;
    } catch (error: any) {
      console.error('AWS S3 connection test failed:', error.message);
      throw new Error(`AWS Connection Failed: ${error.message}`);
    }
  }
}

// -------------------------------------------------------------
// GCP Storage Adapter
// -------------------------------------------------------------
export class GCPStorageAdapter implements CloudStorageAdapter {
  private storage: GCS;

  constructor(creds: CloudCredentials) {
    let credentialsConfig = {};
    if (creds.gcpKeyFile) {
      try {
        credentialsConfig = JSON.parse(creds.gcpKeyFile);
      } catch (err: any) {
        throw new Error('Invalid GCP JSON key credentials format.');
      }
    }
    this.storage = new GCS({
      credentials: credentialsConfig,
    });
  }

  async listObjects(bucketName: string, prefix?: string): Promise<CloudObject[]> {
    const [files] = await this.storage.bucket(bucketName).getFiles({ prefix });
    return files.map((file) => ({
      key: file.name,
      size: Number(file.metadata.size || 0),
      lastModified: new Date(file.metadata.updated || file.metadata.timeCreated || new Date()),
      checksum: file.metadata.md5Hash || '',
    }));
  }

  async downloadObject(bucketName: string, key: string): Promise<Readable> {
    return this.storage.bucket(bucketName).file(key).createReadStream();
  }

  async uploadObject(bucketName: string, key: string, stream: Readable, size: number): Promise<string> {
    const bucket = this.storage.bucket(bucketName);
    const file = bucket.file(key);
    const writeStream = file.createWriteStream({
      resumable: false,
    });

    return new Promise((resolve, reject) => {
      stream
        .pipe(writeStream)
        .on('error', reject)
        .on('finish', () => {
          resolve(`gs://${bucketName}/${key}`);
        });
    });
  }

  async deleteObject(bucketName: string, key: string): Promise<void> {
    await this.storage.bucket(bucketName).file(key).delete();
  }

  async testConnection(bucketName: string): Promise<boolean> {
    try {
      const [exists] = await this.storage.bucket(bucketName).exists();
      if (!exists) {
        throw new Error(`Bucket ${bucketName} does not exist.`);
      }
      return true;
    } catch (error: any) {
      console.error('GCP connection test failed:', error.message);
      throw new Error(`GCP Connection Failed: ${error.message}`);
    }
  }
}

// -------------------------------------------------------------
// Azure Blob Adapter
// -------------------------------------------------------------
export class AzureBlobAdapter implements CloudStorageAdapter {
  private blobServiceClient: BlobServiceClient;

  constructor(creds: CloudCredentials) {
    if (!creds.connectionString) {
      throw new Error('Azure Connection String is required.');
    }
    this.blobServiceClient = BlobServiceClient.fromConnectionString(creds.connectionString);
  }

  async listObjects(containerName: string, prefix?: string): Promise<CloudObject[]> {
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const objects: CloudObject[] = [];
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      objects.push({
        key: blob.name,
        size: blob.properties.contentLength || 0,
        lastModified: blob.properties.lastModified || new Date(),
        checksum: blob.properties.contentMD5
          ? Buffer.from(blob.properties.contentMD5).toString('hex')
          : '',
      });
    }
    return objects;
  }

  async downloadObject(containerName: string, key: string): Promise<Readable> {
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(key);
    const downloadResponse = await blobClient.download();
    if (!downloadResponse.readableStreamBody) {
      throw new Error('Azure Blob download returned empty body stream.');
    }
    return downloadResponse.readableStreamBody as Readable;
  }

  async uploadObject(containerName: string, key: string, stream: Readable, size: number): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    // uploadStream buffers and uploads chunks over the network
    await blockBlobClient.uploadStream(stream);
    return blockBlobClient.url;
  }

  async deleteObject(containerName: string, key: string): Promise<void> {
    const containerClient = this.blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(key);
    await blockBlobClient.delete();
  }

  async testConnection(containerName: string): Promise<boolean> {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(containerName);
      const exists = await containerClient.exists();
      if (!exists) {
        throw new Error(`Container ${containerName} does not exist.`);
      }
      return true;
    } catch (error: any) {
      console.error('Azure connection test failed:', error.message);
      throw new Error(`Azure Connection Failed: ${error.message}`);
    }
  }
}

// -------------------------------------------------------------
// Factory Function
// -------------------------------------------------------------
export function getStorageAdapter(provider: string, creds: CloudCredentials): CloudStorageAdapter {
  switch (provider.toLowerCase()) {
    case 'aws':
    case 's3':
      return new AWSS3Adapter(creds);
    case 'gcp':
    case 'gcs':
      return new GCPStorageAdapter(creds);
    case 'azure':
    case 'blob':
      return new AzureBlobAdapter(creds);
    default:
      throw new Error(`Unsupported cloud provider: ${provider}`);
  }
}
