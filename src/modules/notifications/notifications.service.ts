import { notificationQueue } from '../../jobs/queue';
import { db } from '../../database/db';
import { NotificationType } from '@prisma/client';
import { logger } from '../../core/logger/logger';

export class NotificationsService {
  async sendNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = 'IN_APP'
  ) {
    logger.info(`Queuing ${type.toLowerCase()} notification for user: ${userId}`);

    // Add job to BullMQ
    await notificationQueue.add('send-notification', {
      userId,
      title,
      message,
      type,
    });
  }

  async getUserNotifications(userId: string) {
    return db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await db.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return db.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return db.notification.updateMany({
      where: { userId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}

export const notificationsService = new NotificationsService();
