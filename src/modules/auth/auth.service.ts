import { db } from '../../database/db';
import { AuthRepository } from './auth.repository';
import { UserService } from '../users/user.service';
import { emailQueue } from '../../jobs/queue';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../core/security/auth.utils';
import {
  BadRequestError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from '../../core/errors/custom-errors';
import { logger } from '../../core/logger/logger';

export class AuthService {
  private authRepository = new AuthRepository();
  private userService = new UserService();

  async register(dto: any) {
    const existing = await db.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictError('Email is already registered');
    }

    const passwordHash = await hashPassword(dto.password);
    const roleName = dto.role || 'CHAMPION';

    // 1. Create User
    const user = await db.user.create({
      data: {
        email: dto.email,
        password: passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: 'ACTIVE',
        emailVerified: false,
      },
    });

    // 2. Link Role in DB
    const role = await db.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new NotFoundError(`Role ${roleName} not found`);
    }

    await db.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });

    // 3. Provision Role-Specific Profiles
    if (roleName === 'AMBASSADOR') {
      const referralCode = `${dto.firstName.substring(0, 3).toUpperCase()}${Math.floor(
        1000 + Math.random() * 9000
      )}`;
      await db.ambassadorProfile.create({
        data: {
          userId: user.id,
          referralCode,
          walletBalance: 0.0,
          earnings: 0.0,
        },
      });
    } else if (roleName === 'CHAMPION') {
      await db.championProfile.create({
        data: {
          userId: user.id,
          points: 0,
        },
      });
    }

    // 4. Generate Verification OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await this.authRepository.createOtpCode(user.id, otpCode, 'EMAIL_VERIFICATION', expiresAt);

    // 5. Queue Email Job (BullMQ)
    await emailQueue.add('send-verify', {
      to: user.email,
      type: 'VERIFY',
      payload: { code: otpCode },
    });

    await this.authRepository.logActivity(
      user.id,
      'REGISTER',
      `Registered as ${roleName}`
    );

    return this.userService.sanitizeUser(user);
  }

  async login(dto: any, ip?: string, userAgent?: string) {
    const user = await db.user.findFirst({
      where: { email: dto.email, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.password) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new AuthenticationError(`Your account is ${user.status.toLowerCase()}`);
    }

    const isMatch = await verifyPassword(dto.password, user.password);
    if (!isMatch) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Update Last Login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Create Session
    await this.authRepository.createUserSession(user.id, ip, userAgent);

    // Generate Tokens
    const roles = user.userRoles.map((ur) => ur.role.name);
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      roles,
    });

    const refreshTokenString = generateRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.authRepository.saveRefreshToken(user.id, refreshTokenString, expiresAt);

    // Queue Login Alert Email
    await emailQueue.add('send-login-alert', {
      to: user.email,
      type: 'LOGIN_ALERT',
      payload: {
        info: {
          ip: ip || 'unknown',
          userAgent: userAgent || 'unknown',
          time: new Date().toISOString(),
        },
      },
    });

    await this.authRepository.logActivity(user.id, 'LOGIN', 'Logged into application', ip, userAgent);

    return {
      user: this.userService.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: refreshTokenString,
      },
    };
  }

  async verifyEmail(email: string, code: string) {
    const otp = await this.authRepository.findValidOtpCode(email, code, 'EMAIL_VERIFICATION');
    if (!otp) {
      throw new BadRequestError('Invalid or expired verification code');
    }

    await db.user.update({
      where: { id: otp.userId },
      data: { emailVerified: true },
    });

    await this.authRepository.deleteOtpCode(otp.id);

    const user = await db.user.findUnique({ where: { id: otp.userId } });
    if (user) {
      // Queue Welcome Email
      await emailQueue.add('send-welcome', {
        to: user.email,
        type: 'WELCOME',
        payload: { name: user.firstName || 'User' },
      });
      await this.authRepository.logActivity(user.id, 'VERIFY_EMAIL', 'Email address verified');
    }
  }

  async forgotPassword(email: string) {
    const user = await db.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) {
      // Don't leak account existence, just return success
      return;
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await this.authRepository.createOtpCode(user.id, otpCode, 'PASSWORD_RESET', expiresAt);

    // Queue Forgot Password Email
    await emailQueue.add('send-forgot-password', {
      to: user.email,
      type: 'FORGOT_PASSWORD',
      payload: { code: otpCode },
    });

    await this.authRepository.logActivity(user.id, 'REQUEST_PASSWORD_RESET', 'Requested password reset OTP');
  }

  async resetPassword(dto: any) {
    const otp = await this.authRepository.findValidOtpCode(dto.email, dto.code, 'PASSWORD_RESET');
    if (!otp) {
      throw new BadRequestError('Invalid or expired reset code');
    }

    const passwordHash = await hashPassword(dto.newPassword);

    await db.$transaction([
      db.user.update({
        where: { id: otp.userId },
        data: { password: passwordHash },
      }),
      db.refreshToken.updateMany({
        where: { userId: otp.userId },
        data: { revokedAt: new Date() }, // Force all devices logout
      }),
      db.otpCode.delete({
        where: { id: otp.id },
      }),
    ]);

    const user = await db.user.findUnique({ where: { id: otp.userId } });
    if (user) {
      // Queue confirmation email
      await emailQueue.add('send-confirm-reset', {
        to: user.email,
        type: 'CONFIRM_RESET',
        payload: {},
      });
      await this.authRepository.logActivity(user.id, 'RESET_PASSWORD', 'Password reset successfully');
    }
  }

  async resendOtp(email: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') {
    const user = await db.user.findFirst({ where: { email, deletedAt: null } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await this.authRepository.createOtpCode(user.id, otpCode, type, expiresAt);

    // Queue Resend OTP Email
    await emailQueue.add('send-resend-otp', {
      to: user.email,
      type: type === 'EMAIL_VERIFICATION' ? 'VERIFY' : 'FORGOT_PASSWORD',
      payload: { code: otpCode },
    });

    await this.authRepository.logActivity(user.id, 'RESEND_OTP', `Resent ${type} OTP`);
  }

  async changePassword(userId: string, dto: any) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      throw new BadRequestError('User not found or password not set');
    }

    const isMatch = await verifyPassword(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestError('Invalid current password');
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await db.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    // Revoke other tokens except current session in production (optional, we do all here)
    await this.authRepository.revokeAllUserRefreshTokens(userId);
    await this.authRepository.logActivity(userId, 'CHANGE_PASSWORD', 'Changed password');
  }

  async refreshSession(token: string) {
    try {
      verifyRefreshToken(token);
    } catch (err) {
      throw new AuthenticationError('Invalid refresh token');
    }

    const dbToken = await this.authRepository.findRefreshToken(token);
    if (!dbToken || dbToken.revokedAt || dbToken.expiresAt < new Date()) {
      // Replay attack prevention: if token was already revoked, compromise detected!
      // Revoke all refresh tokens for this user for security.
      if (dbToken) {
        await this.authRepository.revokeAllUserRefreshTokens(dbToken.userId);
        logger.warn(`🚨 Refresh Token Reuse Detected! Revoked all sessions for user: ${dbToken.userId}`);
      }
      throw new AuthenticationError('Invalid or expired refresh session');
    }

    // Token Rotation: revoke the used token
    await this.authRepository.revokeRefreshToken(token);

    const user = (dbToken as any).user;
    const roles = user.userRoles.map((ur: any) => ur.role.name);
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      roles,
    });

    const newRefreshToken = generateRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.authRepository.saveRefreshToken(user.id, newRefreshToken, expiresAt);

    await this.authRepository.logActivity(user.id, 'REFRESH_TOKEN', 'Rotated refresh token');

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(token: string) {
    await this.authRepository.revokeRefreshToken(token);
  }

  async logoutAllDevices(userId: string) {
    await this.authRepository.revokeAllUserRefreshTokens(userId);
    await this.authRepository.logActivity(userId, 'LOGOUT_ALL', 'Logged out of all devices');
  }

  // Handle Google / Apple logins
  async handleSocialLogin(dto: any) {
    const { provider } = dto;
    logger.info(`Processing social login: ${provider}`);

    // In a real S2S flow, verify the idToken (e.g. google-auth-library or apple-signin-auth)
    // We will parse mock payload details or construct a payload
    // Let's assume verified details:
    const socialUser = {
      email: `${provider}-user-${Math.floor(100 + Math.random() * 900)}@social.com`,
      firstName: 'Social',
      lastName: `${provider.charAt(0).toUpperCase()}${provider.slice(1)}`,
      providerId: `prov_${Math.floor(Math.random() * 10000000)}`,
    };

    let user = await db.user.findFirst({
      where: {
        OR: [
          { email: socialUser.email },
          {
            socialAccounts: {
              some: {
                provider,
                providerId: socialUser.providerId,
              },
            },
          },
        ],
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      // Auto register
      user = await db.user.create({
        data: {
          email: socialUser.email,
          firstName: socialUser.firstName,
          lastName: socialUser.lastName,
          provider,
          providerId: socialUser.providerId,
          emailVerified: true,
        },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      const role = await db.role.findUnique({ where: { name: 'CHAMPION' } });
      if (role) {
        await db.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });
      }

      await db.championProfile.create({
        data: {
          userId: user.id,
          points: 0,
        },
      });

      await db.socialAccount.create({
        data: {
          userId: user.id,
          provider,
          providerId: socialUser.providerId,
          email: socialUser.email,
        },
      });
    }

    // Issue tokens
    const roles = user.userRoles.map((ur) => ur.role?.name || 'CHAMPION');
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      roles,
    });

    const refreshTokenString = generateRefreshToken(user.id);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.authRepository.saveRefreshToken(user.id, refreshTokenString, expiresAt);

    return {
      user: this.userService.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: refreshTokenString,
      },
    };
  }
}

export const authService = new AuthService();
