import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { Request } from 'express';
import { User } from 'generated/prisma';
import { Util } from 'src/utils/util';
import { GoogleLoginDto } from './dto/google-login.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  InvalidTokenException,
  RefreshTokenMismatchException,
  UserInactiveException,
} from './exceptions';
import {
  IAuthResponse,
  IAuthService,
  IJwtPayload,
  ITokenPair,
} from './interfaces/auth.interface';
import { TokenService, UserService } from './services';

@Injectable()
export class AuthService implements IAuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async loginOrCreateUser(
    data: GoogleLoginDto,
  ): Promise<IAuthResponse<ITokenPair>> {
    try {
      const user = await this.userService.upsertUser(data.email, data);
      const tokens = this.tokenService.generateTokens(user);

      // Save refresh token in database
      const hashedRefreshToken = await Util.hash(tokens.refreshToken);
      await this.userService.updateUser(user.id, {
        refreshToken: hashedRefreshToken,
        refreshTokenExp: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      });

      await this.cacheManager.set(user.id, tokens.accessToken, 300000);

      return {
        success: true,
        message: 'Google login successful!',
        data: tokens,
      };
    } catch (error) {
      this.logger.error('Login or create user failed', error);
      throw new Error('Authentication failed');
    }
  }

  async getCurrentUser(userId: string): Promise<IAuthResponse<Partial<User>>> {
    try {
      const user = await this.userService.findById(userId);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return {
        success: true,
        message: 'User retrieved successfully',
        data: user,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Get current user failed', error);
      throw new Error('Failed to retrieve user');
    }
  }

  async refreshTokens(
    refreshToken: string,
  ): Promise<IAuthResponse<ITokenPair>> {
    try {
      // Verify refresh token
      const decoded = await this.tokenService.verifyRefreshToken(refreshToken);

      // Find user
      const user = await this.userService.findById(decoded.sub, {
        refreshToken: true,
        refreshTokenExp: true,
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UserInactiveException();
      }

      // Validate stored refresh token
      if (!user.refreshToken) {
        throw new UnauthorizedException('No refresh token found for user');
      }

      const isTokenValid = await Util.match(user.refreshToken, refreshToken);
      if (!isTokenValid) {
        throw new RefreshTokenMismatchException();
      }

      // Generate new tokens
      const newTokens = this.tokenService.generateTokens(user);

      // Update stored refresh token
      const hashedRefreshToken = await Util.hash(newTokens.refreshToken);
      await this.userService.updateUser(user.id!, {
        refreshToken: hashedRefreshToken,
        refreshTokenExp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      return {
        success: true,
        message: 'Tokens refreshed successfully',
        data: newTokens,
      };
    } catch (error) {
      if (
        error instanceof InvalidTokenException ||
        error instanceof NotFoundException ||
        error instanceof UserInactiveException ||
        error instanceof RefreshTokenMismatchException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('Refresh tokens failed', error);
      throw new Error('Token refresh failed');
    }
  }

  async logout(userId: string): Promise<IAuthResponse> {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      await this.userService.updateUser(userId, {
        refreshToken: null,
        refreshTokenExp: null,
      });

      await this.cacheManager.del(userId);

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      this.logger.error('Logout failed', error);
      throw new Error('Logout failed');
    }
  }

  // Legacy method for backward compatibility
  async me(req: Request): Promise<IAuthResponse<Partial<User>>> {
    const payload = req.user as IJwtPayload;
    return this.getCurrentUser(payload.sub);
  }

  // Legacy method for backward compatibility
  async validateRefreshTokenAndGenerateNewToken(rToken: string) {
    return this.refreshTokens(rToken);
  }

  // Legacy method for backward compatibility
  async updateUser(id: string, data: Partial<UpdateUserDto>) {
    const updatedUser = await this.userService.updateUser(id, data);
    return {
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    };
  }
}
