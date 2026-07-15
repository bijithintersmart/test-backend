import { Queue, JobsOptions } from 'bullmq';
import { redisService } from '../services/redis.service';

const redisConnection = redisService.getClient();

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // retry after 5s, then 10s, then 20s...
  },
  removeOnComplete: {
    age: 3600 * 24, // Keep for 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 3600 * 24 * 7, // Keep failed jobs for 7 days (Dead Letter Queue inspection)
  },
};

// 1. Email Job Queue
export const emailQueue = new Queue('email-queue', {
  connection: redisConnection as any,
  defaultJobOptions,
});

// 2. Notification Queue
export const notificationQueue = new Queue('notification-queue', {
  connection: redisConnection as any,
  defaultJobOptions,
});

// 3. Reports Queue
export const reportsQueue = new Queue('reports-queue', {
  connection: redisConnection as any,
  defaultJobOptions,
});

// 4. System Cleanup Queue
export const cleanupQueue = new Queue('cleanup-queue', {
  connection: redisConnection as any,
  defaultJobOptions,
});
