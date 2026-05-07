import { Router } from 'express';
import * as backupController from '../controllers/backup-controller';

const router = Router();

router.get('/', backupController.getAllJobs);
router.post('/', backupController.createJob);
router.get('/:id', backupController.getJobById);
router.post('/:id/trigger', backupController.triggerBackup);
router.get('/:id/logs', backupController.getJobLogs);

export default router;
