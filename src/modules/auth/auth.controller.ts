import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../core/utils/response';
import { BadRequestError } from '../../core/errors/custom-errors';
import { env } from '../../config/env';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      return sendSuccess({
        res,
        statusCode: 201,
        message: 'Registration successful. Verification email sent.',
        data: user,
      });
    } catch (error) {
      return next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const data = await authService.login(req.body, ip, userAgent);

      return sendSuccess({
        res,
        message: 'Login successful',
        data,
      });
    } catch (error) {
      return next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, code } = req.body;
      await authService.verifyEmail(email, code);
      return sendSuccess({
        res,
        message: 'Email verified successfully',
      });
    } catch (error) {
      return next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      return sendSuccess({
        res,
        message: 'If the email exists, a password reset code has been sent.',
      });
    } catch (error) {
      return next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.resetPassword(req.body);
      return sendSuccess({
        res,
        message: 'Password reset successful. All other sessions have been logged out.',
      });
    } catch (error) {
      return next(error);
    }
  }

  async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, type } = req.body;
      await authService.resendOtp(email, type);
      return sendSuccess({
        res,
        message: 'OTP resent successfully.',
      });
    } catch (error) {
      return next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.changePassword(req.user!.id, req.body);
      return sendSuccess({
        res,
        message: 'Password changed successfully',
      });
    } catch (error) {
      return next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      if (!env.JWT_REFRESH_ENABLED) {
        throw new BadRequestError('Refresh tokens are disabled');
      }

      const { refreshToken } = req.body;
      if (!refreshToken) {
        throw new BadRequestError('Refresh token is required');
      }

      const tokens = await authService.refreshSession(refreshToken);
      return sendSuccess({
        res,
        message: 'Tokens rotated successfully',
        data: tokens,
      });
    } catch (error) {
      return next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      return sendSuccess({
        res,
        message: 'Logged out successfully',
      });
    } catch (error) {
      return next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logoutAllDevices(req.user!.id);
      return sendSuccess({
        res,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      return next(error);
    }
  }

  async socialLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await authService.handleSocialLogin(req.body);
      return sendSuccess({
        res,
        message: 'OAuth login successful',
        data,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const authController = new AuthController();
