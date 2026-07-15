import { AdminRepository } from './admin.repository';
import { NotFoundError, BadRequestError } from '../../core/errors/custom-errors';
import { db } from '../../database/db';
import { PaginationParams } from '../../core/middleware/pagination.middleware';

export class AdminService {
  private repository = new AdminRepository();

  async getDashboardStats() {
    return this.repository.getAnalyticsSummary();
  }

  async createCampaign(dto: any) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate >= endDate) {
      throw new BadRequestError('Start date must be before end date');
    }

    return this.repository.createCampaign({
      title: dto.title,
      description: dto.description,
      status: dto.status || 'DRAFT',
      startDate,
      endDate,
    });
  }

  async createMission(campaignId: string, dto: any) {
    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      throw new NotFoundError('Campaign not found');
    }

    return this.repository.createMission(campaignId, {
      title: dto.title,
      description: dto.description,
      pointsReward: dto.pointsReward,
    });
  }

  async listSubmissions() {
    const list = await this.repository.getSubmissions();
    return list.map((item: any) => ({
      id: item.id,
      submissionUrl: item.submissionUrl,
      status: item.status,
      submittedAt: item.createdAt,
      mission: {
        id: item.mission.id,
        title: item.mission.title,
        pointsReward: item.mission.pointsReward,
      },
      champion: {
        id: item.champion.id,
        name: `${item.champion.user.firstName || ''} ${item.champion.user.lastName || ''}`.trim(),
        email: item.champion.user.email,
      },
    }));
  }

  async reviewSubmission(submissionId: string, status: 'APPROVED' | 'REJECTED') {
    const submission = await this.repository.getSubmissionById(submissionId);
    if (!submission) {
      throw new NotFoundError('Mission submission not found');
    }

    if (submission.status !== 'PENDING' && submission.status !== 'SUBMITTED') {
      throw new BadRequestError(`Submission has already been reviewed and is ${submission.status.toLowerCase()}`);
    }

    const pointsToAward = submission.mission.pointsReward;

    await db.$transaction(async (tx) => {
      // 1. Update status
      await tx.missionParticipation.update({
        where: { id: submissionId },
        data: {
          status,
          reviewedAt: new Date(),
        },
      });

      // 2. If approved, add points to ChampionProfile
      if (status === 'APPROVED') {
        await tx.championProfile.update({
          where: { id: submission.championProfileId },
          data: {
            points: {
              increment: pointsToAward,
            },
          },
        });
      }
    });

    return {
      message: `Submission was reviewed and ${status.toLowerCase()}`,
      pointsAwarded: status === 'APPROVED' ? pointsToAward : 0,
    };
  }

  async listAuditLogs(params: PaginationParams) {
    const logs = await this.repository.listAuditLogs(params);
    const total = await this.repository.countAuditLogs();

    return {
      logs,
      total,
    };
  }

  async updateUserRole(userId: string, roleName: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const currentRoles = user.userRoles.map((ur) => ur.role.name);
    if (currentRoles.includes(roleName)) {
      throw new BadRequestError('User already has this role');
    }

    const role = await db.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new NotFoundError(`Role ${roleName} not found`);
    }

    await db.$transaction(async (tx) => {
      // Assign new role
      await tx.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      });

      // Provision corresponding profiles if they don't exist
      if (roleName === 'AMBASSADOR') {
        const referralCode = `${(user.firstName || 'AMB').substring(0, 3).toUpperCase()}${Math.floor(
          1000 + Math.random() * 9000
        )}`;
        await tx.ambassadorProfile.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            referralCode,
            walletBalance: 0.0,
            earnings: 0.0,
          },
        });
      } else if (roleName === 'CHAMPION') {
        await tx.championProfile.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            points: 0,
          },
        });
      }
    });

    return { message: `Role ${roleName} successfully assigned to user.` };
  }
}

export const adminService = new AdminService();
