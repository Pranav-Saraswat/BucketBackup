import { Router } from 'express';
import * as backupController from '../controllers/backup-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', backupController.getAllJobs);
router.post('/', backupController.createJob);
router.get('/:id', backupController.getJobById);
router.put('/:id', backupController.updateJob);
router.delete('/:id', backupController.deleteJob);
router.post('/:id/trigger', backupController.triggerBackup);
router.post('/:id/pause', backupController.pauseJob);
router.post('/:id/resume', backupController.resumeJob);
router.get('/:id/logs', backupController.getJobLogs);

export default router;
