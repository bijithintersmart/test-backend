import { User, Prisma } from '@prisma/client';
import { UserRepository } from './user.repository';
import { NotFoundError, BadRequestError } from '../../core/errors/custom-errors';
import { PaginationParams } from '../../core/middleware/pagination.middleware';
import { hashPassword } from '../../core/security/auth.utils';

export class UserService {
  private userRepository = new UserRepository();

  async getUserById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User with this email not found');
    }
    return user;
  }

  async createUser(data: Prisma.UserCreateInput & { role?: string }): Promise<User> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new BadRequestError('Email is already registered');
    }

    let passwordHash = data.password;
    if (passwordHash) {
      passwordHash = await hashPassword(passwordHash);
    }

    const { role, ...userData } = data;
    const user = await this.userRepository.create({
      ...userData,
      password: passwordHash,
    });

    if (role) {
      await this.userRepository.assignRole(user.id, role);
    } else {
      await this.userRepository.assignRole(user.id, 'CHAMPION'); // default role
    }

    return this.getUserById(user.id);
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    await this.getUserById(id); // Throws 404 if not found

    if (data.password && typeof data.password === 'string') {
      data.password = await hashPassword(data.password);
    }

    await this.userRepository.update(id, data);
    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<void> {
    await this.getUserById(id);
    await this.userRepository.delete(id);
  }

  async listUsers(params: PaginationParams) {
    const users = await this.userRepository.list(params);
    const total = await this.userRepository.count(params);

    return {
      users: users.map((user) => this.sanitizeUser(user)),
      total,
    };
  }

  // Remove sensitive details from User object
  sanitizeUser(user: any) {
    const { password, deletedAt, lastLogin, createdAt, updatedAt, ...sanitized } = user;
    return sanitized;
  }
}
export const userService = new UserService();
