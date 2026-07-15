import { Router } from 'express';
import { healthController } from './health.controller';

const router = Router();

router.get('/', healthController.getHealth);
router.get('/live', healthController.getLive);
router.get('/ready', healthController.getReady);

export default router;
