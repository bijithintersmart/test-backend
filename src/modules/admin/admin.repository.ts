import { Campaign, Mission, MissionParticipation, AuditLog } from '@prisma/client';
import { db } from '../../database/db';
import { PaginationParams } from '../../core/middleware/pagination.middleware';

export class AdminRepository {
  async getAnalyticsSummary() {
    const totalUsers = await db.user.count({ where: { deletedAt: null } });
    const verifiedUsers = await db.user.count({ where: { emailVerified: true, deletedAt: null } });
    const ambassadors = await db.ambassadorProfile.count();
    const champions = await db.championProfile.count();
    const campaignsCount = await db.campaign.count();
    const activeCampaigns = await db.campaign.count({ where: { status: 'ACTIVE' } });

    // Sum total earnings
    const sumResult = await db.ambassadorProfile.aggregate({
      _sum: {
        earnings: true,
      },
    });

    return {
      totalUsers,
      verifiedUsers,
      ambassadors,
      champions,
      campaignsCount,
      activeCampaigns,
      totalEarningsPaid: sumResult._sum.earnings || 0,
    };
  }

  async createCampaign(data: {
    title: string;
    description: string;
    status?: any;
    startDate: Date;
    endDate: Date;
  }): Promise<Campaign> {
    return db.campaign.create({ data });
  }

  async createMission(campaignId: string, data: {
    title: string;
    description: string;
    pointsReward: number;
  }): Promise<Mission> {
    return db.mission.create({
      data: {
        campaignId,
        ...data,
      },
    });
  }

  async getSubmissions(): Promise<MissionParticipation[]> {
    return db.missionParticipation.findMany({
      include: {
        mission: true,
        champion: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getSubmissionById(id: string): Promise<any> {
    return db.missionParticipation.findUnique({
      where: { id },
      include: {
        mission: true,
        champion: true,
      },
    });
  }

  async listAuditLogs(params: PaginationParams): Promise<AuditLog[]> {
    return db.auditLog.findMany({
      take: params.limit,
      skip: params.skip,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async countAuditLogs(): Promise<number> {
    return db.auditLog.count();
  }
}
