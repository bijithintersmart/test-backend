import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import ambassadorRoutes from '../modules/ambassador/ambassador.routes';
import championRoutes from '../modules/champion/champion.routes';
import adminRoutes from '../modules/admin/admin.routes';
import uploadRoutes from '../modules/uploads/uploads.routes';
import healthRoutes from '../modules/health/health.routes';

const router = Router();

// Versioned APIs router hub
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/ambassador', ambassadorRoutes);
router.use('/champion', championRoutes);
router.use('/admin', adminRoutes);
router.use('/uploads', uploadRoutes);
router.use('/health', healthRoutes);

export default router;
