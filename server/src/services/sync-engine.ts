import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { getStorageAdapter, CloudStorageAdapter, CloudObject, CloudCredentials } from './provider-adapters';

export interface SyncEngineConfig {
  syncMode: 'one-way' | 'bidirectional';
  sourceType: 'local' | 'cloud';
  sourcePath: string; // Local folder or cloud folder prefix
  sourceProvider?: string;
  sourceCredentials?: CloudCredentials;
  sourceBucket?: string;
  destProvider: string;
  destCredentials: CloudCredentials;
  destBucket: string;
  concurrencyLimit?: number;
}

export interface SyncStats {
  filesTotal: number;
  filesSynced: number;
  bytesSynced: bigint;
  errors: string[];
}

export class SyncEngine {
  private concurrencyLimit = 5;

  /**
   * Orchestrates the sync between source and destination.
   */
  async sync(
    config: SyncEngineConfig,
    onProgress?: (syncedFiles: number, syncedBytes: bigint) => Promise<void>
  ): Promise<SyncStats> {
    const stats: SyncStats = {
      filesTotal: 0,
      filesSynced: 0,
      bytesSynced: 0n,
      errors: [],
    };

    try {
      this.concurrencyLimit = config.concurrencyLimit || 5;

      // 1. Get Destination Adapter
      const destAdapter = getStorageAdapter(config.destProvider, config.destCredentials);

      // 2. Fetch destination inventory
      const destObjects = await this.retry(() => destAdapter.listObjects(config.destBucket, ''));
      const destMap = new Map<string, CloudObject>();
      destObjects.forEach((obj) => destMap.set(obj.key, obj));

      // 3. Fetch source inventory & files to sync
      let sourceFiles: Array<{ key: string; size: number; lastModified: Date; getStream: () => Promise<Readable>; getChecksum: () => Promise<string> }> = [];

      if (config.sourceType === 'local') {
        if (!fs.existsSync(config.sourcePath)) {
          throw new Error(`Local source path does not exist: ${config.sourcePath}`);
        }
        const stat = await fs.promises.stat(config.sourcePath);
        if (stat.isFile()) {
          const key = path.basename(config.sourcePath);
          sourceFiles.push({
            key,
            size: stat.size,
            lastModified: stat.mtime,
            getStream: async () => fs.createReadStream(config.sourcePath),
            getChecksum: () => this.computeLocalMD5(config.sourcePath),
          });
        } else {
          const files = await this.getLocalFiles(config.sourcePath);
          sourceFiles = files.map((f) => ({
            key: f.key,
            size: f.size,
            lastModified: f.lastModified,
            getStream: async () => fs.createReadStream(f.absolutePath),
            getChecksum: () => this.computeLocalMD5(f.absolutePath),
          }));
        }
      } else {
        if (!config.sourceProvider || !config.sourceCredentials || !config.sourceBucket) {
          throw new Error('Cloud source configuration parameters are missing.');
        }
        const srcAdapter = getStorageAdapter(config.sourceProvider, config.sourceCredentials);
        const srcObjects = await this.retry(() => srcAdapter.listObjects(config.sourceBucket!, config.sourcePath));
        
        sourceFiles = srcObjects.map((obj) => ({
          key: obj.key,
          size: obj.size,
          lastModified: obj.lastModified,
          getStream: () => srcAdapter.downloadObject(config.sourceBucket!, obj.key),
          getChecksum: async () => obj.checksum,
        }));
      }

      stats.filesTotal = sourceFiles.length;

      // 4. Determine delta files to upload/update
      const tasksToRun: typeof sourceFiles = [];

      for (const srcFile of sourceFiles) {
        const destFile = destMap.get(srcFile.key);

        if (!destFile) {
          // File not in destination: requires sync
          tasksToRun.push(srcFile);
        } else {
          // File exists in destination: check if modified
          const sourceChecksum = await srcFile.getChecksum();
          const checksumMatch = sourceChecksum && destFile.checksum && 
            sourceChecksum.toLowerCase() === destFile.checksum.toLowerCase();

          const sizeMismatch = srcFile.size !== destFile.size;
          const timeMismatch = srcFile.lastModified.getTime() > destFile.lastModified.getTime();

          if (sizeMismatch || (!checksumMatch && timeMismatch)) {
            tasksToRun.push(srcFile);
          }
        }
      }

      // 5. Run sync tasks concurrently
      await this.runConcurrent(this.concurrencyLimit, tasksToRun, async (file) => {
        try {
          await this.retry(async () => {
            const stream = await file.getStream();
            await destAdapter.uploadObject(config.destBucket, file.key, stream, file.size);
          });

          stats.filesSynced += 1;
          stats.bytesSynced += BigInt(file.size);

          if (onProgress) {
            await onProgress(stats.filesSynced, stats.bytesSynced);
          }
        } catch (err: any) {
          const message = `Failed syncing file ${file.key}: ${err.message}`;
          console.error(message);
          stats.errors.push(message);
        }
      });

      // 6. Handle Bidirectional Sync (Sync changes back from destination to source)
      if (config.syncMode === 'bidirectional') {
        const sourceMap = new Map<string, typeof sourceFiles[0]>();
        sourceFiles.forEach((f) => sourceMap.set(f.key, f));

        const reverseTasks: CloudObject[] = [];
        for (const destFile of destObjects) {
          const srcFile = sourceMap.get(destFile.key);
          if (!srcFile) {
            reverseTasks.push(destFile);
          } else {
            const sourceChecksum = await srcFile.getChecksum();
            const checksumMatch = sourceChecksum && destFile.checksum &&
              sourceChecksum.toLowerCase() === destFile.checksum.toLowerCase();

            const timeMismatch = destFile.lastModified.getTime() > srcFile.lastModified.getTime();

            if (!checksumMatch && timeMismatch) {
              reverseTasks.push(destFile);
            }
          }
        }

        if (reverseTasks.length > 0) {
          if (config.sourceType === 'local') {
            await this.runConcurrent(this.concurrencyLimit, reverseTasks, async (file) => {
              try {
                const destFileStream = await destAdapter.downloadObject(config.destBucket, file.key);
                const localFilePath = path.join(config.sourcePath, file.key);
                await fs.promises.mkdir(path.dirname(localFilePath), { recursive: true });

                const writeStream = fs.createWriteStream(localFilePath);
                destFileStream.pipe(writeStream);

                await new Promise<void>((resolve, reject) => {
                  writeStream.on('finish', () => resolve());
                  writeStream.on('error', reject);
                });

                stats.filesSynced += 1;
                stats.bytesSynced += BigInt(file.size);
              } catch (err: any) {
                stats.errors.push(`Bidirectional failed downloading ${file.key}: ${err.message}`);
              }
            });
          } else {
            const srcAdapter = getStorageAdapter(config.sourceProvider!, config.sourceCredentials!);
            await this.runConcurrent(this.concurrencyLimit, reverseTasks, async (file) => {
              try {
                const destFileStream = await destAdapter.downloadObject(config.destBucket, file.key);
                await srcAdapter.uploadObject(config.sourceBucket!, file.key, destFileStream, file.size);
                
                stats.filesSynced += 1;
                stats.bytesSynced += BigInt(file.size);
              } catch (err: any) {
                stats.errors.push(`Bidirectional failed syncing ${file.key} to source: ${err.message}`);
              }
            });
          }
        }
      }

    } catch (error: any) {
      console.error('Core sync job failed:', error);
      stats.errors.push(`Job termination error: ${error.message}`);
    }

    return stats;
  }

  /**
   * Helper to perform file uploads for singular files (Legacy compatibility)
   */
  async uploadFile(filePath: string, destConfig: { provider: string; bucketName: string; region?: string; credentials: any }): Promise<string> {
    const adapter = getStorageAdapter(destConfig.provider, {
      accessKeyId: destConfig.credentials.accessKeyId,
      secretAccessKey: destConfig.credentials.secretAccessKey,
      region: destConfig.region,
      connectionString: destConfig.credentials.connectionString,
    });
    const key = path.basename(filePath);
    const size = (await fs.promises.stat(filePath)).size;
    const stream = fs.createReadStream(filePath);
    return adapter.uploadObject(destConfig.bucketName, key, stream, size);
  }

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------

  private async runConcurrent<T>(
    limit: number,
    items: T[],
    fn: (item: T) => Promise<void>
  ): Promise<void> {
    const pool = new Set<Promise<void>>();
    for (const item of items) {
      const task = fn(item).then(() => {
        pool.delete(task);
      });
      pool.add(task);
      if (pool.size >= limit) {
        await Promise.race(pool);
      }
    }
    await Promise.all(pool);
  }

  private async retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000,
    factor = 2
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries <= 0) throw error;
      console.warn(`Retryable error occurred. Retrying in ${delay}ms... Details: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retry(fn, retries - 1, delay * factor, factor);
    }
  }

  private async getLocalFiles(dir: string, baseDir = dir): Promise<Array<{ key: string; absolutePath: string; size: number; lastModified: Date }>> {
    const results: Array<{ key: string; absolutePath: string; size: number; lastModified: Date }> = [];
    const list = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const file of list) {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        const subFiles = await this.getLocalFiles(filePath, baseDir);
        results.push(...subFiles);
      } else {
        const stat = await fs.promises.stat(filePath);
        const key = path.relative(baseDir, filePath).replace(/\\/g, '/');
        results.push({
          key,
          absolutePath: filePath,
          size: stat.size,
          lastModified: stat.mtime,
        });
      }
    }
    return results;
  }

  private computeLocalMD5(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }
}
