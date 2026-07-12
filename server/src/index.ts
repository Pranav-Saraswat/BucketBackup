import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth-routes';
import storageRoutes from './routes/storage-routes';
import backupRoutes from './routes/backup-routes';
import historyRoutes from './routes/history-routes';
import monitoringRoutes from './routes/monitoring-routes';
import healthRoutes from './routes/health-routes';
import { BackupScheduler } from './services/scheduler';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const scheduler = new BackupScheduler();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/system', healthRoutes);

app.listen(PORT, async () => {
  console.log(`🚀 BucketBackup Server running on port ${PORT}`);
  await scheduler.init();
  console.log('⏰ Backup Scheduler initialized');
});

export { prisma, scheduler };
