import { Worker, Job } from 'bullmq';
import { redisService } from '../services/redis.service';
import { emailService } from '../services/email.service';
import { db } from '../database/db';
import { logger } from '../core/logger/logger';

const redisConnection = redisService.getClient();

// 1. Email Worker
export const emailWorker = new Worker(
  'email-queue',
  async (job: Job) => {
    const { to, type, payload } = job.data;
    logger.info(`Processing email job: ${job.id} for type: ${type}`);

    switch (type) {
      case 'WELCOME':
        await emailService.sendWelcomeEmail(to, payload.name);
        break;
      case 'VERIFY':
        await emailService.sendVerificationEmail(to, payload.code);
        break;
      case 'FORGOT_PASSWORD':
        await emailService.sendForgotPasswordEmail(to, payload.code);
        break;
      case 'CONFIRM_RESET':
        await emailService.sendPasswordResetConfirmation(to);
        break;
      case 'OTP':
        await emailService.sendOtpEmail(to, payload.code, payload.action);
        break;
      case 'LOGIN_ALERT':
        await emailService.sendLoginAlert(to, payload.info);
        break;
      default:
        throw new Error(`Unknown email job type: ${type}`);
    }
  },
  { connection: redisConnection as any }
);

// 2. Notification Worker
export const notificationWorker = new Worker(
  'notification-queue',
  async (job: Job) => {
    const { userId, title, message, type } = job.data;
    logger.info(`Processing notification job: ${job.id} for user: ${userId}`);

    // Create in-app notification in DB
    await db.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });

    // TODO: Trigger Push notifications (FCM / APNS) or WebSocket Socket.IO broadcasts
  },
  { connection: redisConnection as any }
);

// 3. Reports & Analytics Worker
export const reportsWorker = new Worker(
  'reports-queue',
  async (job: Job) => {
    const { reportType, dateRange } = job.data;
    logger.info(`Compiling report ${reportType} for date range: ${JSON.stringify(dateRange)}`);

    // Mock processing delay
    await new Promise((resolve) => setTimeout(resolve, 5000));
    logger.info(`Report ${reportType} compiled successfully.`);
  },
  { connection: redisConnection as any }
);

// 4. Database Cleanup Worker (Token & OTP purging)
export const cleanupWorker = new Worker(
  'cleanup-queue',
  async (job: Job) => {
    logger.info(`Running scheduled cleanup job: ${job.id}`);

    const now = new Date();

    // Delete expired OTP codes
    const otpRes = await db.otpCode.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    // Delete expired sessions / refresh tokens
    const tokenRes = await db.refreshToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    logger.info(`Cleanup finished. Purged ${otpRes.count} OTPs, ${tokenRes.count} refresh tokens.`);
  },
  { connection: redisConnection as any }
);

// Monitor errors
const workers = [emailWorker, notificationWorker, reportsWorker, cleanupWorker];
workers.forEach((worker) => {
  worker.on('failed', (job, err) => {
    logger.error(err, `❌ Job ${job?.id} in queue ${worker.name} failed`);
  });
});
