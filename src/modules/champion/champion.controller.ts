import { Request, Response, NextFunction } from 'express';
import { championService } from './champion.service';
import { sendSuccess } from '../../core/utils/response';

export class ChampionController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await championService.getDashboard(req.user!.id);
      return sendSuccess({
        res,
        message: 'Champion dashboard data retrieved successfully',
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await championService.getProfile(req.user!.id);
      return sendSuccess({
        res,
        message: 'Champion profile retrieved successfully',
        data: profile,
      });
    } catch (error) {
      return next(error);
    }
  }

  async listCampaigns(_req: Request, res: Response, next: NextFunction) {
    try {
      const campaigns = await championService.listActiveCampaigns();
      return sendSuccess({
        res,
        message: 'Active campaigns list retrieved successfully',
        data: campaigns,
      });
    } catch (error) {
      return next(error);
    }
  }

  async joinCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { campaignId } = req.params;
      const result = await championService.joinCampaign(req.user!.id, campaignId);
      return sendSuccess({
        res,
        message: result.message,
      });
    } catch (error) {
      return next(error);
    }
  }

  async submitMission(req: Request, res: Response, next: NextFunction) {
    try {
      const { missionId } = req.params;
      const { submissionUrl } = req.body;
      const result = await championService.submitMission(req.user!.id, missionId, submissionUrl);
      return sendSuccess({
        res,
        message: result.message,
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string || '10', 10);
      const leaderboard = await championService.getLeaderboard(limit);
      return sendSuccess({
        res,
        message: 'Leaderboard retrieved successfully',
        data: leaderboard,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getAchievements(req: Request, res: Response, next: NextFunction) {
    try {
      const achievements = await championService.getAchievements(req.user!.id);
      return sendSuccess({
        res,
        message: 'Unlocked achievements retrieved successfully',
        data: achievements,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const championController = new ChampionController();
