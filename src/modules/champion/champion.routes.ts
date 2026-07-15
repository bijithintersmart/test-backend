import { Router } from 'express';
import { championController } from './champion.controller';
import { authenticate, isChampion } from '../../core/middleware/auth.middleware';
import { validateRequest } from '../../core/middleware/validation.middleware';
import { joinCampaignSchema, submitMissionSchema } from './champion.validator';

const router = Router();

// Secure all champion endpoints
router.use(authenticate, isChampion);

router.get('/dashboard', championController.getDashboard);
router.get('/profile', championController.getProfile);
router.get('/campaigns', championController.listCampaigns);
router.post(
  '/campaigns/:campaignId/join',
  validateRequest(joinCampaignSchema),
  championController.joinCampaign
);
router.post(
  '/missions/:missionId/submit',
  validateRequest(submitMissionSchema),
  championController.submitMission
);
router.get('/leaderboard', championController.getLeaderboard);
router.get('/achievements', championController.getAchievements);

export default router;
