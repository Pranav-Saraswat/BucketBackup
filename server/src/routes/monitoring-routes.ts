import { Router } from 'express';
import { getAuditEvents, getAlerts, resolveAlert } from '../controllers/monitoring-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/audits', getAuditEvents);
router.get('/alerts', getAlerts);
router.post('/alerts/:id/resolve', resolveAlert);

export default router;
