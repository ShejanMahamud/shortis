import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, User } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { GoogleLoginDto } from '../dto/google-login.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { IUserResponse, IUserService } from '../interfaces/auth.interface';

@Injectable()
export class UserService implements IUserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email, isActive: true },
      });
    } catch (error) {
      this.logger.error('Failed to find user by email', error);
      throw new Error('Database query failed');
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id, isActive: true },
      });
    } catch (error) {
      this.logger.error('Failed to find user by ID', error);
      throw new Error('Database query failed');
    }
  }

  async createUser(data: GoogleLoginDto): Promise<User> {
    try {
      return await this.prisma.user.create({
        data,
      });
    } catch (error) {
      this.logger.error('Failed to create user', error);
      throw new Error('User creation failed');
    }
  }

  async updateUser(id: string, data: Partial<UpdateUserDto>): Promise<User> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      return await this.prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to update user', error);
      throw new Error('User update failed');
    }
  }

  async upsertUser(email: string, data: GoogleLoginDto): Promise<User> {
    try {
      return await this.prisma.user.upsert({
        where: { email, isActive: true },
        update: {
          name: data.name,
          profilePicture: data.profilePicture,
        },
        create: data,
      });
    } catch (error) {
      this.logger.error('Failed to upsert user', error);
      throw new Error('User upsert failed');
    }
  }

  async deactivateUser(id: string): Promise<User> {
    try {
      return await this.updateUser(id, {
        isActive: false,
        refreshToken: undefined,
        refreshTokenExp: undefined,
      });
    } catch (error) {
      this.logger.error('Failed to deactivate user', error);
      throw error;
    }
  }

  async findAllUsers(
    limit: number,
    cursor?: string,
    search?: string,
  ): Promise<IUserResponse<User[]>> {
    try {
      const queryOptions: Prisma.UserFindManyArgs = {
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      };
      if (cursor) {
        queryOptions.skip = 1;
        queryOptions.cursor = { id: cursor };
      }
      if (search) {
        queryOptions.where = {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        };
      }
      const users = await this.prisma.user.findMany(queryOptions);
      const hasNextPage = users.length > limit;
      const nextCursor = users.length > 0 ? users[users.length - 1].id : null;

      return {
        success: true,
        message: 'Users retrieved successfully',
        data: {
          ...users,
        },
        meta: {
          limit,
          count: users.length,
          hasNextPage,
          nextCursor,
        },
      };
    } catch {
      return {
        success: false,
        message: 'Failed to fetch users',
      };
    }
  }

  async deleteUser(id: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const user = await this.findById(id);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Soft delete by deactivating the user
      await this.deactivateUser(id);

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to delete user', error);
      throw new Error('User deletion failed');
    }
  }
}
