import { ChampionProfile, Campaign, MissionParticipation, ChampionAchievement } from '@prisma/client';
import { db } from '../../database/db';

export class ChampionRepository {
  async findProfileByUserId(userId: string): Promise<ChampionProfile | null> {
    return db.championProfile.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });
  }

  async listActiveCampaigns(): Promise<Campaign[]> {
    return db.campaign.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gt: new Date() },
      },
      include: {
        missions: true,
      },
    });
  }

  async getCampaignDetails(campaignId: string): Promise<Campaign | null> {
    return db.campaign.findUnique({
      where: { id: campaignId },
      include: {
        missions: true,
      },
    });
  }

  async joinCampaign(profileId: string, campaignId: string) {
    return db.campaignParticipation.create({
      data: {
        campaignId,
        championProfileId: profileId,
        status: 'JOINED',
      },
    });
  }

  async submitMission(profileId: string, missionId: string, submissionUrl: string): Promise<MissionParticipation> {
    return db.missionParticipation.upsert({
      where: {
        missionId_championProfileId: {
          missionId,
          championProfileId: profileId,
        },
      },
      update: {
        status: 'SUBMITTED',
        submissionUrl,
      },
      create: {
        missionId,
        championProfileId: profileId,
        status: 'SUBMITTED',
        submissionUrl,
      },
    });
  }

  async getAchievements(profileId: string): Promise<ChampionAchievement[]> {
    return db.championAchievement.findMany({
      where: { championProfileId: profileId },
      include: {
        achievement: true,
      },
    });
  }

  async getLeaderboard(limit = 10) {
    return db.championProfile.findMany({
      take: limit,
      orderBy: {
        points: 'desc',
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

  async getParticipatingCampaigns(profileId: string) {
    return db.campaignParticipation.findMany({
      where: { championProfileId: profileId },
      include: {
        campaign: true,
      },
    });
  }

  async getMissionParticipations(profileId: string) {
    return db.missionParticipation.findMany({
      where: { championProfileId: profileId },
      include: {
        mission: true,
      },
    });
  }
}
