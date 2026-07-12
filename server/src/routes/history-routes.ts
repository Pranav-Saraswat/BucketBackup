import { Router } from 'express';
import { getJobRuns, getRestoreJobs, getRestoreJobById, createRestoreJob } from '../controllers/history-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/runs', getJobRuns);
router.get('/restores', getRestoreJobs);
router.get('/restores/:id', getRestoreJobById);
router.post('/restores', createRestoreJob);

export default router;
