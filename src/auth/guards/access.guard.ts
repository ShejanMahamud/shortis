import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Cache } from 'cache-manager';
import type { Request } from 'express';
import { IJwtPayload } from '../interfaces';

@Injectable()
export class AccessAuthGuard extends AuthGuard('access') {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = (await super.canActivate(context)) as boolean;
    if (!result) return false;

    const request: Request = context.switchToHttp().getRequest();
    const user = request.user as IJwtPayload;
    if (!user) return false;

    const token = await this.cacheManager.get(user.sub);
    return !!token;
  }
}
