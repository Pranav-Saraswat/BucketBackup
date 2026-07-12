import { Router } from 'express';
import { createConfig, listConfigs, getConfigById, deleteConfig, verifyConnection, getInventory } from '../controllers/storage-controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', createConfig);
router.get('/', listConfigs);
router.get('/:id', getConfigById);
router.delete('/:id', deleteConfig);
router.post('/:id/verify', verifyConnection);
router.get('/:id/inventory', getInventory);

export default router;
