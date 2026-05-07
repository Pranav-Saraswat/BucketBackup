"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncEngine = void 0;
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const storage_1 = require("@google-cloud/storage");
const storage_blob_1 = require("@azure/storage-blob");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class SyncEngine {
    async uploadFile(filePath, config) {
        const fileName = path_1.default.basename(filePath);
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
    async uploadToAWS(filePath, fileName, config) {
        const s3 = new aws_sdk_1.default.S3({
            accessKeyId: config.credentials.accessKeyId,
            secretAccessKey: config.credentials.secretAccessKey,
            region: config.region
        });
        const fileStream = fs_1.default.createReadStream(filePath);
        const params = {
            Bucket: config.bucketName,
            Key: fileName,
            Body: fileStream
        };
        const result = await s3.upload(params).promise();
        return result.Location;
    }
    async uploadToGCP(filePath, fileName, config) {
        const storage = new storage_1.Storage({
            credentials: JSON.parse(config.credentials.keyFileContent || '{}')
        });
        const bucket = storage.bucket(config.bucketName);
        const file = bucket.file(fileName);
        return new Promise((resolve, reject) => {
            fs_1.default.createReadStream(filePath)
                .pipe(file.createWriteStream())
                .on('error', reject)
                .on('finish', () => resolve(`gs://${config.bucketName}/${fileName}`));
        });
    }
    async uploadToAzure(filePath, fileName, config) {
        if (!config.credentials.connectionString)
            throw new Error('Azure connection string missing');
        const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(config.credentials.connectionString);
        const containerClient = blobServiceClient.getContainerClient(config.bucketName);
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);
        await blockBlobClient.uploadFile(filePath);
        return blockBlobClient.url;
    }
}
exports.SyncEngine = SyncEngine;
//# sourceMappingURL=sync-engine.js.map