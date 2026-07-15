import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { sendSuccess } from '../../core/utils/response';

export class AdminController {
  async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getDashboardStats();
      return sendSuccess({
        res,
        message: 'Admin dashboard analytics retrieved successfully',
        data: stats,
      });
    } catch (error) {
      return next(error);
    }
  }

  async createCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const campaign = await adminService.createCampaign(req.body);
      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Campaign created successfully',
        data: campaign,
      });
    } catch (error) {
      return next(error);
    }
  }

  async createMission(req: Request, res: Response, next: NextFunction) {
    try {
      const { campaignId } = req.params;
      const mission = await adminService.createMission(campaignId, req.body);
      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Mission created and linked to campaign successfully',
        data: mission,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getSubmissions(_req: Request, res: Response, next: NextFunction) {
    try {
      const submissions = await adminService.listSubmissions();
      return sendSuccess({
        res,
        message: 'Mission submissions list retrieved successfully',
        data: submissions,
      });
    } catch (error) {
      return next(error);
    }
  }

  async reviewSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const { submissionId } = req.params;
      const { status } = req.body;
      const result = await adminService.reviewSubmission(submissionId, status);
      return sendSuccess({
        res,
        message: result.message,
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const pagination = req.pagination!;
      const { logs, total } = await adminService.listAuditLogs(pagination);

      return sendSuccess({
        res,
        message: 'Audit logs retrieved successfully',
        data: logs,
        meta: {
          total,
          page: pagination.page,
          limit: pagination.limit,
          totalPages: Math.ceil(total / pagination.limit),
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { roleName } = req.body;
      const result = await adminService.updateUserRole(userId, roleName);
      return sendSuccess({
        res,
        message: result.message,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const adminController = new AdminController();
