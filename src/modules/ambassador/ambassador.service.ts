import { AmbassadorRepository } from './ambassador.repository';
import { NotFoundError, BadRequestError } from '../../core/errors/custom-errors';
import { db } from '../../database/db';
import { Decimal } from '@prisma/client/runtime/library';

export class AmbassadorService {
  private repository = new AmbassadorRepository();

  async getProfile(userId: string) {
    const profile = await this.repository.findProfileByUserId(userId);
    if (!profile) {
      throw new NotFoundError('Ambassador profile not found');
    }
    return profile;
  }

  async getDashboard(userId: string) {
    const profile = await this.getProfile(userId);
    const stats = await this.repository.getReferralStats(profile.id);
    const campaigns = await this.repository.listActiveCampaigns();

    return {
      profile: {
        referralCode: profile.referralCode,
        walletBalance: profile.walletBalance,
        earnings: profile.earnings,
      },
      referralStats: stats,
      activeCampaigns: campaigns,
    };
  }

  async getReferrals(userId: string) {
    const profile = await this.getProfile(userId);
    return this.repository.getReferrals(profile.id);
  }

  async getLeaderboard(limit = 10) {
    const rawLeaderboard = await this.repository.getLeaderboard(limit);
    return rawLeaderboard.map((item, index) => ({
      rank: index + 1,
      name: `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || 'Anonymous',
      avatar: item.user.avatar,
      earnings: item.earnings,
    }));
  }

  async withdrawEarnings(userId: string, amount: number, method: string, details: string) {
    const profile = await this.getProfile(userId);

    const balanceNum = Number(profile.walletBalance);
    if (balanceNum < amount) {
      throw new BadRequestError('Insufficient wallet balance');
    }

    const newBalance = new Decimal(balanceNum - amount);

    // Update in transaction
    await db.$transaction([
      db.ambassadorProfile.update({
        where: { id: profile.id },
        data: {
          walletBalance: newBalance,
        },
      }),
      db.auditLog.create({
        data: {
          userId,
          action: 'WITHDRAWAL_REQUEST',
          entity: 'AmbassadorProfile',
          entityId: profile.id,
          newState: {
            amount,
            paymentMethod: method,
            accountDetails: details,
            remainingBalance: newBalance.toString(),
          },
        },
      }),
    ]);

    return {
      message: 'Withdrawal request created successfully',
      remainingBalance: newBalance.toString(),
    };
  }
}

export const ambassadorService = new AmbassadorService();
