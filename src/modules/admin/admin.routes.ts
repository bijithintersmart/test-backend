import { Router } from 'express';
import { adminController } from './admin.controller';
import { authenticate, isAdmin } from '../../core/middleware/auth.middleware';
import { validateRequest } from '../../core/middleware/validation.middleware';
import { paginationMiddleware } from '../../core/middleware/pagination.middleware';
import {
  createCampaignSchema,
  createMissionSchema,
  reviewSubmissionSchema,
  updateUserRoleSchema,
} from './admin.validator';

const router = Router();

// Secure all admin endpoints
router.use(authenticate, isAdmin);

router.get('/stats', adminController.getStats);

router.post(
  '/campaigns',
  validateRequest(createCampaignSchema),
  adminController.createCampaign
);

router.post(
  '/campaigns/:campaignId/missions',
  validateRequest(createMissionSchema),
  adminController.createMission
);

router.get('/submissions', adminController.getSubmissions);

router.post(
  '/submissions/:submissionId/review',
  validateRequest(reviewSubmissionSchema),
  adminController.reviewSubmission
);

router.get(
  '/audit-logs',
  paginationMiddleware('createdAt', 20),
  adminController.getAuditLogs
);

router.post(
  '/users/:userId/role',
  validateRequest(updateUserRoleSchema),
  adminController.updateUserRole
);

export default router;
