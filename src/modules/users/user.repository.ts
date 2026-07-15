import { Prisma, User } from '@prisma/client';
import { db } from '../../database/db';
import { PaginationParams } from '../../core/middleware/pagination.middleware';

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return db.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return db.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return db.user.create({ data });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return db.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return db.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async list(params: PaginationParams): Promise<User[]> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...this.buildWhereClause(params.search, params.filters),
    };

    return db.user.findMany({
      where,
      take: params.limit,
      skip: params.skip,
      orderBy: {
        [params.sort]: params.order,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async count(params: PaginationParams): Promise<number> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...this.buildWhereClause(params.search, params.filters),
    };

    return db.user.count({ where });
  }

  async assignRole(userId: string, roleName: string): Promise<void> {
    const role = await db.role.findUnique({ where: { name: roleName } });
    if (!role) throw new Error(`Role ${roleName} does not exist`);

    await db.userRole.upsert({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        userId,
        roleId: role.id,
      },
    });
  }

  async removeRole(userId: string, roleName: string): Promise<void> {
    const role = await db.role.findUnique({ where: { name: roleName } });
    if (!role) return;

    await db.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
    });
  }

  private buildWhereClause(search?: string, filters?: Record<string, any>): Prisma.UserWhereInput {
    const clause: Prisma.UserWhereInput = {};

    if (search) {
      clause.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (filters) {
      if (filters.status) {
        clause.status = filters.status;
      }
      if (filters.emailVerified !== undefined) {
        clause.emailVerified = filters.emailVerified;
      }
    }

    return clause;
  }
}
