import { z } from 'zod';
import { CampaignStatus, MissionParticipationStatus } from '@prisma/client';

export const createCampaignSchema = {
  body: z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(5),
    status: z.nativeEnum(CampaignStatus).optional(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }).strict(),
};

export const createMissionSchema = {
  params: z.object({
    campaignId: z.string().uuid(),
  }),
  body: z.object({
    title: z.string().min(3).max(100),
    description: z.string().min(5),
    pointsReward: z.coerce.number().int().nonnegative(),
  }).strict(),
};

export const reviewSubmissionSchema = {
  params: z.object({
    submissionId: z.string().uuid(),
  }),
  body: z.object({
    status: z.enum([MissionParticipationStatus.APPROVED, MissionParticipationStatus.REJECTED]),
  }).strict(),
};

export const updateUserRoleSchema = {
  params: z.object({
    userId: z.string().uuid(),
  }),
  body: z.object({
    roleName: z.enum(['ADMIN', 'AMBASSADOR', 'CHAMPION']),
  }).strict(),
};
