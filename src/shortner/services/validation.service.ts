import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
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
  private readonly DEFAULT_REDIS_TTL = 60;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    @InjectQueue('billing') private readonly billingQueue: Queue,
  ) { }

  /**
   * Generate Redis cache keys
   */
  private getFeatureUsageKey(
    userId: string,
    subscriptionId: string,
    featureKey: string,
    periodStart: Date,
    periodEnd: Date,
  ): string {
    return `feature_usage:${userId}:${subscriptionId}:${featureKey}:${periodStart.toISOString()}:${periodEnd.toISOString()}`;
  }

  private getActiveSubscriptionKey(userId: string): string {
    return `active_subscription:${userId}`;
  }

  private getSlugCacheKey(slug: string): string {
    return `slug:${slug}`;
  }

  /**
   * Calculate TTL in seconds based on end date
   */
  private calculateTtlSeconds(endDate: Date): number {
    return Math.max(
      Math.floor((endDate.getTime() - Date.now()) / 1000),
      this.DEFAULT_REDIS_TTL,
    );
  }

  /**
   * Generic Redis cache getter with JSON parsing
   */
  private async getCachedData<T>(key: string): Promise<T | null> {
    const cached = await this.redisClient.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  }

  /**
   * Generic Redis cache setter with JSON stringification and TTL
   */
  private async setCachedData<T>(
    key: string,
    data: T,
    ttlSeconds?: number,
  ): Promise<void> {
    if (ttlSeconds) {
      await this.redisClient.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    } else {
      await this.redisClient.set(key, JSON.stringify(data));
    }
  }

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

    // Get feature limit
    const featureLimit = subscription.plan?.PlanFeature?.find(
      (feature) => feature.key === featureKey,
    );
    if (!featureLimit) {
      throw new NotFoundException(
        `Feature ${featureKey} not available in this plan`,
      );
    }

    const limit = parseInt(featureLimit.value, 10);
    const redisKey = this.getFeatureUsageKey(
      userId,
      subscription.id,
      featureKey,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
    );

    // Try to get cached usage
    const cachedUsage = await this.redisClient.get(redisKey);
    if (cachedUsage) {
      const used = parseInt(cachedUsage, 10);
      return { used, limit, allowed: used < limit };
    }

    // Get usage from database
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
    console.log('Used:', used);

    // Cache the usage with TTL
    await this.redisClient.set(
      redisKey,
      used.toString(),
      'EX',
      this.DEFAULT_REDIS_TTL,
    );

    return { used, limit, allowed: used < limit };
  }

  public async incrementFeatureUsage(userId: string, featureKey: string) {
    const subscription = await this.checkActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    const redisKey = this.getFeatureUsageKey(
      userId,
      subscription.id,
      featureKey,
      subscription.currentPeriodStart,
      subscription.currentPeriodEnd,
    );

    // Increment in Redis
    const used = await this.redisClient.incr(redisKey);
    console.log('Incremented usage to:', used);

    // Set expiry aligned with billing cycle
    const ttlSeconds = this.calculateTtlSeconds(subscription.currentPeriodEnd);
    await this.redisClient.expire(redisKey, ttlSeconds);

    // Queue database sync
    await this.billingQueue.add('syncFeatureUsage', {
      userId,
      planId: subscription.planId,
      subscriptionId: subscription.id,
      featureKey,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      used,
    });
  }

  async checkActiveSubscription(userId: string): Promise<ISubscription> {
    const redisKey = this.getActiveSubscriptionKey(userId);

    // Try to get cached subscription
    const cachedSubscription =
      await this.getCachedData<ISubscription>(redisKey);
    if (cachedSubscription) {
      console.log('Cached Subscription:', cachedSubscription);
      return cachedSubscription;
    }

    console.log(userId);

    // Fetch from database
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        currentPeriodEnd: { gte: new Date() },
        currentPeriodStart: { lte: new Date() },
      },
      include: {
        plan: {
          include: {
            PlanFeature: true,
          },
        },
      },
    });

    console.log('DB Subscription:', subscription);

    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    // Cache subscription with TTL based on period end
    const ttlSeconds = this.calculateTtlSeconds(subscription.currentPeriodEnd);
    await this.setCachedData(redisKey, subscription, ttlSeconds);

    return subscription;
  }

  generateSlug(length: number = 6): string {
    return Util.generateRandomString(length);
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
    const cacheKey = this.getSlugCacheKey(slug);

    // Check cache first
    const cached = await this.redisClient.get(cacheKey);
    if (cached !== null) {
      return cached === 'true';
    }

    // Check database
    const url = await this.prisma.url.findUnique({
      where: { slug },
      select: { id: true },
    });

    const exists = !!url;

    // Cache result with TTL
    await this.redisClient.setex(
      cacheKey,
      this.SLUG_CACHE_TTL / 1000,
      exists ? 'true' : 'false',
    );

    return exists;
  }

  /**
   * URL validation methods
   */
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
    this.validateUrlStatus(url);
    this.validateUrlExpiration(url);
    this.validateClickLimit(url);
    await this.validatePasswordAccess(url, password);
  }

  /**
   * Individual validation methods for better separation of concerns
   */
  private validateUrlStatus(url: IMinimalUrl): void {
    if (!url.isActive) {
      throw new UrlInactiveException();
    }
  }

  private validateUrlExpiration(url: IMinimalUrl): void {
    if (url.expiresAt && new Date() > url.expiresAt) {
      throw new UrlExpiredException();
    }
  }

  private validateClickLimit(url: IMinimalUrl): void {
    if (url.clickLimit && url.totalClicks >= url.clickLimit) {
      throw new ClickLimitExceededException();
    }
  }

  private async validatePasswordAccess(
    url: IMinimalUrl,
    password?: string,
  ): Promise<void> {
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
