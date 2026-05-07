import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import backupRoutes from './routes/backup-routes';
import { BackupScheduler } from './services/scheduler';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const scheduler = new BackupScheduler();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/backups', backupRoutes);

app.listen(PORT, async () => {
  console.log(`🚀 BucketBackup Server running on port ${PORT}`);
  await scheduler.init();
  console.log('⏰ Backup Scheduler initialized');
});

export { prisma, scheduler };
