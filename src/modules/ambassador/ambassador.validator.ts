import { z } from 'zod';

export const ambassadorWithdrawSchema = {
  body: z.object({
    amount: z.coerce.number().positive().max(100000),
    paymentMethod: z.enum(['PAYPAL', 'STRIPE', 'BANK_TRANSFER']),
    accountDetails: z.string().min(5),
  }).strict(),
};

export const joinCampaignSchema = {
  params: z.object({
    campaignId: z.string().uuid(),
  }),
};
