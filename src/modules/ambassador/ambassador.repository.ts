import { AmbassadorProfile, UserReferral, Campaign } from '@prisma/client';
import { db } from '../../database/db';

export class AmbassadorRepository {
  async findProfileByUserId(userId: string): Promise<AmbassadorProfile | null> {
    return db.ambassadorProfile.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });
  }

  async getReferrals(profileId: string): Promise<UserReferral[]> {
    return db.userReferral.findMany({
      where: { ambassadorProfileId: profileId },
      include: {
        referredUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async getReferralStats(profileId: string) {
    const referrals = await db.userReferral.findMany({
      where: { ambassadorProfileId: profileId },
    });

    const total = referrals.length;
    const completed = referrals.filter((r) => r.status === 'COMPLETED').length;
    const pending = referrals.filter((r) => r.status === 'PENDING').length;

    return {
      total,
      completed,
      pending,
    };
  }

  async getLeaderboard(limit = 10) {
    return db.ambassadorProfile.findMany({
      take: limit,
      orderBy: {
        earnings: 'desc',
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async listActiveCampaigns(): Promise<Campaign[]> {
    return db.campaign.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
    });
  }
}

// Extend Prisma typings in-memory for referredUser references
declare global {
  namespace PrismaJson {
    // Custom typings if needed
  }
}
