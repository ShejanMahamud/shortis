import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import { ISubscription } from '../interfaces';
import { FeatureUsageService } from './feature-usage.service';

@Injectable()
export class SubscriptionValidationService {
    private readonly logger = new Logger(SubscriptionValidationService.name);

    constructor(
        private readonly prisma: PrismaService,
        @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
        private readonly featureUsageService: FeatureUsageService,
    ) { }

    /**
     * Generate Redis cache key for active subscription
     */
    private getActiveSubscriptionKey(userId: string): string {
        return `active_subscription:${userId}`;
    }

    /**
     * Check if user has an active subscription
     */
    async checkActiveSubscription(userId: string): Promise<ISubscription | null> {
        try {
            // Try cache first
            const cacheKey = this.getActiveSubscriptionKey(userId);
            const cachedSubscription = await this.redisClient.get(cacheKey);

            if (cachedSubscription) {
                return JSON.parse(cachedSubscription) as ISubscription;
            }

            // Get from database
            const subscription = await this.prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'ACTIVE',
                    currentPeriodEnd: {
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

            if (subscription) {
                // Cache for 5 minutes
                await this.redisClient.setex(
                    cacheKey,
                    300,
                    JSON.stringify(subscription),
                );
            }

            return subscription;
        } catch (error) {
            this.logger.error(
                `Error checking active subscription for user ${userId}`,
                error,
            );
            return null;
        }
    }

    /**
     * Check if user can use a specific feature (subscription limit validation)
     */
    async checkSubscriptionLimit(
        userId: string,
        featureKey: string,
        requestedUsage: number = 1,
    ): Promise<boolean> {
        try {
            // Check if user is admin - admins have unlimited access to all features
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });

            if (user?.role === 'ADMIN') {
                this.logger.log(
                    `User ${userId} is admin - granting unlimited access to feature ${featureKey}`,
                );
                return true;
            }

            const subscription = await this.checkActiveSubscription(userId);
            if (!subscription) {
                throw new NotFoundException('No active subscription found');
            }

            // Find the feature limit in the plan
            const featureLimit = subscription.plan?.PlanFeature?.find(
                (pf) => pf.key === featureKey,
            );

            if (!featureLimit) {
                return false; // Feature not available in current plan
            }

            // Parse the limit value (stored as string in schema)
            const limitValue = parseInt(featureLimit.value, 10);
            if (isNaN(limitValue)) {
                return false; // Invalid limit value
            }

            // Get current usage
            const currentUsage =
                await this.featureUsageService.getCurrentFeatureUsage(
                    userId,
                    subscription.id,
                    featureKey,
                    subscription.currentPeriodStart,
                    subscription.currentPeriodEnd,
                );

            // Check if adding requested usage would exceed limit
            const wouldExceedLimit = currentUsage + requestedUsage > limitValue;

            if (wouldExceedLimit) {
                this.logger.warn(
                    `User ${userId} would exceed limit for feature ${featureKey}. Current: ${currentUsage}, Requested: ${requestedUsage}, Limit: ${limitValue}`,
                );
                return false;
            }

            return true;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(
                `Error checking subscription limit for user ${userId}`,
                error,
            );
            return false;
        }
    }

    /**
     * Validate and consume feature usage
     */
    async validateAndConsumeFeature(
        userId: string,
        featureKey: string,
        consumeAmount: number = 1,
    ): Promise<boolean> {
        try {
            // Check if user is admin - admins have unlimited access to all features
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });

            if (user?.role === 'ADMIN') {
                this.logger.log(
                    `User ${userId} is admin - allowing feature ${featureKey} consumption without limits`,
                );
                // For admins, we don't need to track usage or check subscription
                return true;
            }

            const subscription = await this.checkActiveSubscription(userId);
            if (!subscription) {
                throw new NotFoundException('No active subscription found');
            }

            // Check if usage is allowed
            const canUse = await this.checkSubscriptionLimit(
                userId,
                featureKey,
                consumeAmount,
            );
            if (!canUse) {
                return false;
            }

            // Consume the feature usage
            await this.featureUsageService.incrementFeatureUsage(
                userId,
                subscription.planId,
                subscription.id,
                featureKey,
                subscription.currentPeriodStart,
                subscription.currentPeriodEnd,
                consumeAmount,
            );

            return true;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(
                `Error validating and consuming feature for user ${userId}`,
                error,
            );
            return false;
        }
    }

    /**
     * Get subscription status with usage information
     */
    async getSubscriptionWithUsage(userId: string) {
        try {
            const subscription = await this.checkActiveSubscription(userId);
            if (!subscription) {
                return null;
            }

            // Get usage summary
            const usageSummary =
                await this.featureUsageService.getFeatureUsageSummary(
                    userId,
                    subscription.id,
                );

            return {
                subscription,
                usage: usageSummary,
            };
        } catch (error) {
            this.logger.error(
                `Error getting subscription with usage for user ${userId}`,
                error,
            );
            return null;
        }
    }

    /**
     * Clear subscription cache
     */
    async clearSubscriptionCache(userId: string): Promise<void> {
        try {
            const cacheKey = this.getActiveSubscriptionKey(userId);
            await this.redisClient.del(cacheKey);
        } catch (error) {
            this.logger.error(
                `Error clearing subscription cache for user ${userId}`,
                error,
            );
        }
    }
}
