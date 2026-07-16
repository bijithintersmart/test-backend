import { Router } from 'express';
import { healthController } from './health.controller';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Retrieve general system health and memory statistics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System health details retrieved successfully
 */
router.get('/', healthController.getHealth);

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness check for monitoring process activity
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Process is active and running
 */
router.get('/live', healthController.getLive);

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check to verify database and Redis connectivity
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Services are ready to accept traffic
 */
router.get('/ready', healthController.getReady);

export default router;
