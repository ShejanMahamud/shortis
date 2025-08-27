import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import { ISubscription } from 'src/subscription/interfaces';
import { Util } from 'src/utils/util';
import {
  ClickLimitExceededException,
  IncorrectPasswordException,
  InvalidUrlException,
  PasswordRequiredException,
  UrlExpiredException,
  UrlInactiveException,
} from '../exceptions';
import { IMinimalUrl, IValidationService } from '../interfaces';

@Injectable()
export class ValidationService implements IValidationService {
  private readonly logger = new Logger(ValidationService.name);
  private readonly SLUG_CACHE_TTL = 30000;
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) { }

  public async checkSubscriptionLimit(
    userId: string,
    featureKey: string,
  ): Promise<{
    used: number;
    limit: number;
    allowed: boolean;
  }> {
    const subscription = await this.checkActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }
    //get feature limit
    const featureLimit = subscription.plan?.PlanFeature?.find(
      (feature) => feature.key === featureKey,
    );
    if (!featureLimit) {
      throw new NotFoundException(
        `Feature ${featureKey} not available in this plan`,
      );
    }

    const limit = parseInt(featureLimit.value, 10);

    const redisKey = `feature_usage:${userId}:${subscription.id}:${featureKey}:${subscription.currentPeriodStart.toISOString()}:${subscription.currentPeriodEnd.toISOString()}`;

    const cached = await this.redisClient.get(redisKey);

    if (cached) {
      const used = parseInt(cached, 10);
      return {
        used,
        limit,
        allowed: used < limit,
      };
    }

    const usage = await this.prisma.featureUsage.findFirst({
      where: {
        subscriptionId: subscription.id,
        userId: userId,
        featureKey: featureLimit.key,
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
      },
    });
    const used = usage ? usage.used : 0;

    await this.redisClient.set(redisKey, used.toString(), 'EX', 60);

    return {
      used,
      limit,
      allowed: used < limit,
    };
  }

  public async incrementFeatureUsage(userId: string, featureKey: string) {
    const subscription = await this.checkActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }
    await this.prisma.featureUsage.upsert({
      where: {
        userId_subscriptionId_featureKey_periodStart_periodEnd: {
          featureKey,
          userId,
          periodStart: new Date(),
          periodEnd: new Date(),
          subscriptionId: subscription.id,
        },
      },
      update: {
        used: {
          increment: 1,
        },
      },
      create: {
        featureKey,
        userId,
        periodStart: new Date(),
        periodEnd: new Date(),
        subscriptionId: subscription.id,
      },
    });
  }

  async checkActiveSubscription(userId: string): Promise<ISubscription> {
    const redisKey = `active_subscription:${userId}`;
    const cached = await this.redisClient.get(redisKey);
    if (cached) {
      return JSON.parse(cached) as ISubscription;
    }
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        currentPeriodStart: {
          gte: new Date(),
        },
      },
      include: {
        plan: {
          include: {
            PlanFeature: true,
          },
        },
      },
    });
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }
    const ttlSeconds = Math.floor(
      (subscription.currentPeriodEnd.getTime() - Date.now()) / 1000,
    );
    await this.redisClient.set(
      redisKey,
      JSON.stringify(subscription),
      'EX',
      ttlSeconds,
    );
    return subscription;
  }

  generateSlug(length: number = 6): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
    }
    return result;
  }

  async generateUniqueSlug(customSlug?: string): Promise<string> {
    if (customSlug) {
      const exists = await this.checkSlugExists(customSlug);
      if (exists) {
        throw new Error(`Slug '${customSlug}' already exists`);
      }
      return customSlug;
    }

    let slug: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      slug = this.generateSlug(attempts < 5 ? 6 : 8);
      attempts++;
    } while ((await this.checkSlugExists(slug)) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Unable to generate unique slug');
    }
    return slug;
  }

  async checkSlugExists(slug: string): Promise<boolean> {
    // Check cache first
    const cacheKey = `slug:${slug}`;
    const cached = await this.redisClient.get(cacheKey);
    if (cached !== null) {
      return cached === 'true';
    }

    const url = await this.prisma.url.findUnique({
      where: { slug },
      select: { id: true },
    });
    const exists = !!url;
    await this.redisClient.setex(
      cacheKey,
      this.SLUG_CACHE_TTL / 1000,
      exists ? 'true' : 'false',
    );
    return exists;
  }

  validateUrl(url: string): boolean {
    if (!Util.isValidUrl(url)) {
      throw new InvalidUrlException('Please provide a valid URL');
    }
    return true;
  }

  validateExpirationDate(date?: Date): boolean {
    if (date) {
      const expirationDate = new Date(date);
      const now = new Date();

      if (expirationDate <= now) {
        throw new InvalidUrlException('Expiration date must be in the future');
      }
    }
    return true;
  }

  async validateUrlAccess(url: IMinimalUrl, password?: string): Promise<void> {
    // Check if URL is active
    if (!url.isActive) {
      throw new UrlInactiveException();
    }

    // Check if URL has expired
    if (url.expiresAt && new Date() > url.expiresAt) {
      throw new UrlExpiredException();
    }

    // Check if click limit has been exceeded
    if (url.clickLimit && url.totalClicks >= url.clickLimit) {
      throw new ClickLimitExceededException();
    }

    // Check password protection
    if (url.password) {
      if (!password) {
        throw new PasswordRequiredException();
      }

      const isPasswordValid = await this.verifyPassword(password, url.password);
      if (!isPasswordValid) {
        throw new IncorrectPasswordException();
      }
    }
  }

  private async verifyPassword(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await Util.match(hashedPassword, plainPassword);
    } catch (error) {
      this.logger.error('Password verification failed', error);
      return false;
    }
  }
}
