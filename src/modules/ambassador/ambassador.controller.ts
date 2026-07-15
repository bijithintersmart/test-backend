import { Request, Response, NextFunction } from 'express';
import { ambassadorService } from './ambassador.service';
import { sendSuccess } from '../../core/utils/response';

export class AmbassadorController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ambassadorService.getDashboard(req.user!.id);
      return sendSuccess({
        res,
        message: 'Ambassador dashboard data retrieved successfully',
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await ambassadorService.getProfile(req.user!.id);
      return sendSuccess({
        res,
        message: 'Ambassador profile retrieved successfully',
        data: profile,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getReferrals(req: Request, res: Response, next: NextFunction) {
    try {
      const referrals = await ambassadorService.getReferrals(req.user!.id);
      return sendSuccess({
        res,
        message: 'Referrals list retrieved successfully',
        data: referrals,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string || '10', 10);
      const leaderboard = await ambassadorService.getLeaderboard(limit);
      return sendSuccess({
        res,
        message: 'Leaderboard retrieved successfully',
        data: leaderboard,
      });
    } catch (error) {
      return next(error);
    }
  }

  async withdraw(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, paymentMethod, accountDetails } = req.body;
      const result = await ambassadorService.withdrawEarnings(
        req.user!.id,
        amount,
        paymentMethod,
        accountDetails
      );
      return sendSuccess({
        res,
        message: result.message,
        data: { remainingBalance: result.remainingBalance },
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const ambassadorController = new AmbassadorController();
