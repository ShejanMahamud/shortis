import { ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import { IJwtPayload, ISessionMetadata } from '../interfaces';

@Injectable()
export class RefreshAuthGuard extends AuthGuard('refresh') {
  private readonly logger = new Logger(RefreshAuthGuard.name);

  constructor(@Inject(REDIS_CLIENT) private redisClient: Redis) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;
    if (!result) return false;

    const request: Request = context.switchToHttp().getRequest();
    const user = request?.user as IJwtPayload;

    if (!user) return false;

    // Check if user has an active session using new session keys
    const sessionRefreshToken = await this.redisClient.get(
      `session:${user.sub}:refresh`,
    );
    const sessionMetadata = await this.redisClient.get(
      `session:${user.sub}:meta`,
    );

    if (!sessionRefreshToken || !sessionMetadata) {
      this.logger.warn(`No active refresh session found for user ${user.sub}`);
      return false;
    }

    // Get the refresh token from request body
    const refreshToken = request.body?.rToken || request.body?.refreshToken;
    if (!refreshToken || refreshToken !== sessionRefreshToken) {
      this.logger.warn(`Refresh token mismatch for user ${user.sub}`);
      return false;
    }

    // Update session activity
    try {
      const metadata: ISessionMetadata = JSON.parse(sessionMetadata);
      metadata.lastActivity = new Date().toISOString();
      await this.redisClient.setex(
        `session:${user.sub}:meta`,
        604800,
        JSON.stringify(metadata),
      );
    } catch (error) {
      this.logger.error(
        `Failed to update refresh session activity for user ${user.sub}`,
        error,
      );
    }

    return true;
  }
}
