import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../core/middleware/auth.middleware';
import { validateRequest } from '../../core/middleware/validation.middleware';
import { strictRateLimiter } from '../../core/security/rate-limiter';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendOtpSchema,
  changePasswordSchema,
  refreshSessionSchema,
  oauthSchema,
} from './auth.validator';

const router = Router();

// Apply brute-force protection to sensitive authentication paths
router.post(
  "/register",
  strictRateLimiter,
  validateRequest(registerSchema),
  authController.register,
);

router.post(
  "/login",
  strictRateLimiter,
  validateRequest(loginSchema),
  authController.login,
);

router.post(
  '/verify-email',
  validateRequest(verifyEmailSchema),
  authController.verifyEmail
);

router.post(
  '/forgot-password',
  strictRateLimiter,
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  strictRateLimiter,
  validateRequest(resetPasswordSchema),
  authController.resetPassword
);

router.post(
  "/resend-otp",
  strictRateLimiter,
  validateRequest(resendOtpSchema),
  authController.resendOtp,
);

router.post(
  '/refresh',
  validateRequest(refreshSessionSchema),
  authController.refresh
);

router.post(
  '/logout',
  authController.logout
);

// Authenticated Routes
router.post(
  '/change-password',
  authenticate,
  validateRequest(changePasswordSchema),
  authController.changePassword
);

router.post(
  '/logout-all',
  authenticate,
  authController.logoutAll
);

router.post(
  '/oauth',
  validateRequest(oauthSchema),
  authController.socialLogin
);

export default router;
