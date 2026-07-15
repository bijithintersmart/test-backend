import { RefreshToken, OtpCode, OtpType } from '@prisma/client';
import { db } from '../../database/db';

export class AuthRepository {
  async saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    return db.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async findRefreshToken(token: string): Promise<RefreshToken | null> {
    return db.refreshToken.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await db.refreshToken.updateMany({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async createOtpCode(userId: string, code: string, type: OtpType, expiresAt: Date): Promise<OtpCode> {
    // Invalidate existing active OTPs of same type for this user
    await db.otpCode.deleteMany({
      where: { userId, type },
    });

    return db.otpCode.create({
      data: {
        userId,
        code,
        type,
        expiresAt,
      },
    });
  }

  async findValidOtpCode(email: string, code: string, type: OtpType): Promise<OtpCode | null> {
    const now = new Date();
    const user = await db.user.findUnique({ where: { email } });
    if (!user) return null;

    return db.otpCode.findFirst({
      where: {
        userId: user.id,
        code,
        type,
        expiresAt: { gt: now },
      },
    });
  }

  async deleteOtpCode(id: string): Promise<void> {
    await db.otpCode.delete({ where: { id } });
  }

  async createUserSession(userId: string, ipAddress?: string, userAgent?: string) {
    return db.session.create({
      data: {
        userId,
        ipAddress,
        userAgent,
      },
    });
  }

  async logActivity(userId: string, action: string, description?: string, ipAddress?: string, userAgent?: string) {
    return db.activityLog.create({
      data: {
        userId,
        action,
        description,
        ipAddress,
        userAgent,
      },
    });
  }
}
