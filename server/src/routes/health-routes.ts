import { Router } from 'express';
import { checkHealth, getSystemMetrics } from '../controllers/health-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Liveness probe (does not require auth)
router.get('/health', checkHealth);

// Comprehensive diagnostics (requires authentication)
router.get('/metrics', authMiddleware, getSystemMetrics);

export default router;
