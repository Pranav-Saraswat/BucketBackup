import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { getStorageAdapter } from '../services/provider-adapters';
import { encrypt, decrypt } from '../services/encryption';

const prisma = new PrismaClient();

export const createConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { provider, bucketName, region, accessKey, secretKey, connectionString, gcpKeyFile } = req.body;

    if (!provider || !bucketName) {
      return res.status(400).json({ error: 'Provider and bucketName are required.' });
    }

    // Encrypt credential secrets before database insertion
    const encryptedAccessKey = accessKey ? encrypt(accessKey) : null;
    const encryptedSecretKey = secretKey ? encrypt(secretKey) : null;
    const encryptedConnectionString = connectionString ? encrypt(connectionString) : null;
    const encryptedGcpKeyFile = gcpKeyFile ? encrypt(gcpKeyFile) : null;

    const config = await prisma.storageConfig.create({
      data: {
        provider: provider.toLowerCase(),
        bucketName,
        region: region || null,
        accessKey: encryptedAccessKey,
        secretKey: encryptedSecretKey,
        connectionString: encryptedConnectionString,
        gcpKeyFile: encryptedGcpKeyFile,
        organizationId: user.organizationId,
      },
    });

    // Mask secrets before sending to client
    res.status(201).json({
      id: config.id,
      provider: config.provider,
      bucketName: config.bucketName,
      region: config.region,
      createdAt: config.createdAt,
    });
  } catch (error: any) {
    console.error('Failed to create storage config:', error);
    res.status(500).json({ error: 'Failed to onboard storage configuration.' });
  }
};

export const listConfigs = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const configs = await prisma.storageConfig.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    // Mask details before returning
    const safeConfigs = configs.map((c) => ({
      id: c.id,
      provider: c.provider,
      bucketName: c.bucketName,
      region: c.region,
      createdAt: c.createdAt,
    }));

    res.json(safeConfigs);
  } catch (error: any) {
    console.error('List storage configs failed:', error);
    res.status(500).json({ error: 'Failed to retrieve configurations.' });
  }
};

export const getConfigById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const config = await prisma.storageConfig.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!config) return res.status(404).json({ error: 'Configuration not found.' });

    res.json({
      id: config.id,
      provider: config.provider,
      bucketName: config.bucketName,
      region: config.region,
      hasAccessKey: !!config.accessKey,
      hasSecretKey: !!config.secretKey,
      hasConnectionString: !!config.connectionString,
      hasGcpKeyFile: !!config.gcpKeyFile,
      createdAt: config.createdAt,
    });
  } catch (error: any) {
    console.error('Get storage config failed:', error);
    res.status(500).json({ error: 'Failed to retrieve configuration.' });
  }
};

export const deleteConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Check if configuration is tied to active backup jobs
    const activeJobs = await prisma.backupJob.findFirst({
      where: {
        OR: [
          { destConfigId: id },
          { sourceConfigId: id },
        ],
      },
    });

    if (activeJobs) {
      return res.status(400).json({ error: 'Cannot delete configuration. It is currently linked to one or more active backup jobs.' });
    }

    await prisma.storageConfig.delete({
      where: { id },
    });

    res.json({ message: 'Storage configuration successfully deleted.' });
  } catch (error: any) {
    console.error('Delete storage config failed:', error);
    res.status(500).json({ error: 'Failed to delete configuration.' });
  }
};

export const verifyConnection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const config = await prisma.storageConfig.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!config) return res.status(404).json({ error: 'Configuration not found.' });

    // Decrypt credentials
    const credentials = {
      accessKeyId: config.accessKey ? decrypt(config.accessKey) : undefined,
      secretAccessKey: config.secretKey ? decrypt(config.secretKey) : undefined,
      region: config.region || undefined,
      connectionString: config.connectionString ? decrypt(config.connectionString) : undefined,
      gcpKeyFile: config.gcpKeyFile ? decrypt(config.gcpKeyFile) : undefined,
    };

    const adapter = getStorageAdapter(config.provider, credentials);
    await adapter.testConnection(config.bucketName);

    res.json({ status: 'success', message: 'Connection test passed.' });
  } catch (error: any) {
    console.error('Connection test failed:', error);
    res.status(400).json({ status: 'failed', error: error.message || 'Connection test failed.' });
  }
};

export const getInventory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const id = req.params.id as string;
    const prefix = (req.query['prefix'] as string) || '';
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const config = await prisma.storageConfig.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!config) return res.status(404).json({ error: 'Configuration not found.' });

    // Decrypt credentials
    const credentials = {
      accessKeyId: config.accessKey ? decrypt(config.accessKey) : undefined,
      secretAccessKey: config.secretKey ? decrypt(config.secretKey) : undefined,
      region: config.region || undefined,
      connectionString: config.connectionString ? decrypt(config.connectionString) : undefined,
      gcpKeyFile: config.gcpKeyFile ? decrypt(config.gcpKeyFile) : undefined,
    };

    const adapter = getStorageAdapter(config.provider, credentials);
    const objects = await adapter.listObjects(config.bucketName, prefix);

    res.json(objects);
  } catch (error: any) {
    console.error('Retrieve inventory failed:', error);
    res.status(500).json({ error: error.message || 'Failed to retrieve storage bucket contents.' });
  }
};
