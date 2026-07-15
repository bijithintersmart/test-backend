import { Router } from 'express';
import { ambassadorController } from './ambassador.controller';
import { authenticate, isAmbassador } from '../../core/middleware/auth.middleware';
import { validateRequest } from '../../core/middleware/validation.middleware';
import { ambassadorWithdrawSchema } from './ambassador.validator';

const router = Router();

// Secure all ambassador endpoints
router.use(authenticate, isAmbassador);

router.get('/dashboard', ambassadorController.getDashboard);
router.get('/profile', ambassadorController.getProfile);
router.get('/referrals', ambassadorController.getReferrals);
router.get('/leaderboard', ambassadorController.getLeaderboard);
router.post(
  '/withdraw',
  validateRequest(ambassadorWithdrawSchema),
  ambassadorController.withdraw
);

export default router;
