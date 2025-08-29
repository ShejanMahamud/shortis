import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { User } from 'generated/prisma';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import { SubscriptionService } from 'src/subscription/subscription.service';
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
  ISessionMetadata,
  ITokenPair,
} from './interfaces/auth.interface';
import { TokenService, UserService } from './services';

@Injectable()
export class AuthService implements IAuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private readonly config: ConfigService,
    private readonly subscriptionService: SubscriptionService,
  ) { }

  async loginOrCreateUser(
    data: GoogleLoginDto,
  ): Promise<IAuthResponse<ITokenPair>> {
    try {
      const user = await this.userService.upsertUser(data.email, data);

      // Check if user already has an active session
      const existingSession = await this.getActiveSession(user.id);
      if (existingSession) {
        this.logger.log(`User ${user.id} already has an active session`);
        return {
          success: true,
          message: 'Already logged in with active session!',
          data: existingSession,
        };
      }

      // Auto-subscribe user to free plan if they don't have an active subscription
      try {
        const subscriptionResult =
          await this.subscriptionService.autoSubscribeToFreePlan(user.id);
        if (subscriptionResult) {
          this.logger.log(`User ${user.id} auto-subscribed to free plan`);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to auto-subscribe user ${user.id} to free plan:`,
          error,
        );
        // Don't fail the login process if subscription creation fails
      }

      const tokens = this.tokenService.generateTokens(user);

      // Save refresh token in database
      const hashedRefreshToken = await Util.hash(tokens.refreshToken);
      await this.userService.updateUser(user.id, {
        refreshToken: hashedRefreshToken,
        refreshTokenExp: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      });

      // Store session in Redis with metadata
      await this.createUserSession(user.id, tokens);

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

      // Update session activity
      await this.updateSessionActivity(userId);

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

      // Update session with new tokens
      await this.createUserSession(user.id!, newTokens);
      // Update session activity
      await this.updateSessionActivity(user.id!);

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

      // Clear session data using new session management
      await this.clearUserSession(userId);

      return {
        success: true,
        message: 'Logout successful',
      };
    } catch (error) {
      this.logger.error('Logout failed', error);
      throw new Error('Logout failed');
    }
  }

  /**
   * Check if user has an active session in Redis
   */
  private async getActiveSession(userId: string): Promise<ITokenPair | null> {
    try {
      const accessToken = await this.redisClient.get(
        `session:${userId}:access`,
      );
      const refreshToken = await this.redisClient.get(
        `session:${userId}:refresh`,
      );

      if (accessToken && refreshToken) {
        // Verify that the access token is still valid
        try {
          await this.tokenService.verifyAccessToken(accessToken);
          return { accessToken, refreshToken };
        } catch {
          // If access token is invalid, clean up the session
          await this.clearUserSession(userId);
          return null;
        }
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Failed to get active session for user ${userId}`,
        error,
      );
      return null;
    }
  }

  /**
   * Create a new user session in Redis
   */
  private async createUserSession(
    userId: string,
    tokens: ITokenPair,
  ): Promise<void> {
    try {
      const sessionId = `session:${userId}`;
      const accessTokenKey = `${sessionId}:access`;
      const refreshTokenKey = `${sessionId}:refresh`;
      const metadataKey = `${sessionId}:meta`;

      // Store tokens with expiration
      await this.redisClient.setex(accessTokenKey, 3600, tokens.accessToken); // 1 hour
      await this.redisClient.setex(
        refreshTokenKey,
        604800,
        tokens.refreshToken,
      ); // 7 days

      // Store session metadata
      const sessionMetadata: ISessionMetadata = {
        userId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        isActive: true,
      };
      await this.redisClient.setex(
        metadataKey,
        604800,
        JSON.stringify(sessionMetadata),
      );

      // Add user to active sessions set
      await this.redisClient.sadd('active_sessions', userId);

      this.logger.log(`Created new session for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to create session for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Clear user session from Redis
   */
  private async clearUserSession(userId: string): Promise<void> {
    try {
      const sessionId = `session:${userId}`;
      const keys = [
        `${sessionId}:access`,
        `${sessionId}:refresh`,
        `${sessionId}:meta`,
      ];

      await this.redisClient.del(...keys);
      await this.redisClient.srem('active_sessions', userId);

      this.logger.log(`Cleared session for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to clear session for user ${userId}`, error);
    }
  }

  /**
   * Update session activity timestamp
   */
  private async updateSessionActivity(userId: string): Promise<void> {
    try {
      const metadataKey = `session:${userId}:meta`;
      const metadataStr = await this.redisClient.get(metadataKey);

      if (metadataStr) {
        const metadata = JSON.parse(metadataStr) as ISessionMetadata;
        metadata.lastActivity = new Date().toISOString();
        await this.redisClient.setex(
          metadataKey,
          604800,
          JSON.stringify(metadata),
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update session activity for user ${userId}`,
        error,
      );
    }
  }

  /**
   * Get all active sessions (admin functionality)
   */
  async getActiveSessions(): Promise<string[]> {
    try {
      return await this.redisClient.smembers('active_sessions');
    } catch (error) {
      this.logger.error('Failed to get active sessions', error);
      return [];
    }
  }

  /**
   * Force logout user by clearing their session
   */
  async forceLogout(userId: string): Promise<IAuthResponse> {
    try {
      await this.clearUserSession(userId);

      // Also clear database refresh token
      await this.userService.updateUser(userId, {
        refreshToken: null,
        refreshTokenExp: null,
      });

      return {
        success: true,
        message: 'User forcefully logged out',
      };
    } catch (error) {
      this.logger.error(`Failed to force logout user ${userId}`, error);
      throw new Error('Force logout failed');
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
