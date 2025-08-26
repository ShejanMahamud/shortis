import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import { IJwtPayload } from '../interfaces';

@Injectable()
export class RefreshAuthGuard extends AuthGuard('refresh') {
  constructor(@Inject(REDIS_CLIENT) private redisClient: Redis) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const user = request?.user as IJwtPayload;
    const token = await this.redisClient.get(`refresh:${user.sub}`);
    if (!token) {
      return false;
    }
    return true;
  }
}
