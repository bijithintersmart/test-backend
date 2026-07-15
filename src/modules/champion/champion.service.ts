import { ChampionRepository } from './champion.repository';
import { NotFoundError, BadRequestError } from '../../core/errors/custom-errors';
import { db } from '../../database/db';

export class ChampionService {
  private repository = new ChampionRepository();

  async getProfile(userId: string) {
    const profile = await this.repository.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Champion profile not found');
    }
    return profile;
  }

  async getDashboard(userId: string) {
    const profile = await this.getProfile(userId);
    const campaigns = await this.repository.getParticipatingCampaigns(profile.id);
    const achievements = await this.repository.getAchievements(profile.id);
    const submissions = await this.repository.getMissionParticipations(profile.id);

    return {
      profile: {
        points: profile.points,
        createdAt: profile.createdAt,
      },
      participations: {
        campaignsCount: campaigns.length,
        campaignsList: campaigns.map((c) => ({
          id: c.campaign.id,
          title: c.campaign.title,
          status: c.status,
        })),
      },
      achievementsCount: achievements.length,
      recentSubmissions: submissions.map((s) => ({
        id: s.id,
        missionTitle: s.mission.title,
        status: s.status,
        pointsReward: s.mission.pointsReward,
        submittedAt: s.createdAt,
      })),
    };
  }

  async listActiveCampaigns() {
    return this.repository.listActiveCampaigns();
  }

  async joinCampaign(userId: string, campaignId: string) {
    const profile = await this.getProfile(userId);
    const campaign = await this.repository.getCampaignDetails(campaignId);
    if (!campaign || campaign.status !== 'ACTIVE') {
      throw new BadRequestError('Campaign is not available or active');
    }

    // Check if already joined
    const existing = await db.campaignParticipation.findUnique({
      where: {
        campaignId_championProfileId: {
          campaignId,
          championProfileId: profile.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestError('You have already joined this campaign');
    }

    await this.repository.joinCampaign(profile.id, campaignId);
    return { message: 'Successfully joined campaign' };
  }

  async submitMission(userId: string, missionId: string, submissionUrl: string) {
    const profile = await this.getProfile(userId);

    const mission = await db.mission.findUnique({
      where: { id: missionId },
      include: { campaign: true },
    });

    if (!mission || mission.status !== 'ACTIVE') {
      throw new NotFoundError('Mission not found or inactive');
    }

    // Validate champion is participating in the campaign
    const isParticipating = await db.campaignParticipation.findUnique({
      where: {
        campaignId_championProfileId: {
          campaignId: mission.campaignId,
          championProfileId: profile.id,
        },
      },
    });

    if (!isParticipating) {
      throw new BadRequestError('You must join the campaign before submitting missions');
    }

    const submission = await this.repository.submitMission(profile.id, missionId, submissionUrl);
    return {
      message: 'Mission submitted successfully',
      submissionId: submission.id,
      status: submission.status,
    };
  }

  async getLeaderboard(limit = 10) {
    const rawLeaderboard = await this.repository.getLeaderboard(limit);
    return rawLeaderboard.map((item, index) => ({
      rank: index + 1,
      name: `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || 'Anonymous',
      avatar: item.user.avatar,
      points: item.points,
    }));
  }

  async getAchievements(userId: string) {
    const profile = await this.getProfile(userId);
    return this.repository.getAchievements(profile.id);
  }
}

export const championService = new ChampionService();
