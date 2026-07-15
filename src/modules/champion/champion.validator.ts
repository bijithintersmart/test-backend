import { z } from 'zod';

export const joinCampaignSchema = {
  params: z.object({
    campaignId: z.string().uuid(),
  }),
};

export const submitMissionSchema = {
  params: z.object({
    missionId: z.string().uuid(),
  }),
  body: z.object({
    submissionUrl: z.string().url(),
  }).strict(),
};
