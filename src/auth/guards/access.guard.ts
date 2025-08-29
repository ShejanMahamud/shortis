import { ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import { IJwtPayload, ISessionMetadata } from '../interfaces';

@Injectable()
export class AccessAuthGuard extends AuthGuard('access') {
  private readonly logger = new Logger(AccessAuthGuard.name);

  constructor(@Inject(REDIS_CLIENT) private redisClient: Redis) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;
    if (!result) return false;

    const request: Request = context.switchToHttp().getRequest();
    const user = request.user as IJwtPayload;
    if (!user) return false;

    // Check if user has an active session using new session keys
    const sessionAccessToken = await this.redisClient.get(
      `session:${user.sub}:access`,
    );
    const sessionMetadata = await this.redisClient.get(
      `session:${user.sub}:meta`,
    );

    if (!sessionAccessToken || !sessionMetadata) {
      this.logger.warn(`No active session found for user ${user.sub}`);
      return false;
    }

    // Verify the token in the request matches the session token
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const requestToken = authHeader.substring(7);
    if (requestToken !== sessionAccessToken) {
      this.logger.warn(`Token mismatch for user ${user.sub}`);
      return false;
    }

    // Update session activity (last activity timestamp)
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
        `Failed to update session activity for user ${user.sub}`,
        error,
      );
    }

    return true;
  }
}
