import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/queue/queue.module';

@Injectable()
export class FeatureUsageService {
    private readonly logger = new Logger(FeatureUsageService.name);
    private readonly DEFAULT_REDIS_TTL = 60;

    constructor(
        private readonly prisma: PrismaService,
        @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
        @InjectQueue('billing') private readonly billingQueue: Queue,
    ) { }

    /**
     * Generate Redis cache keys for feature usage
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

    /**
     * Get current feature usage for a subscription period
     */
    async getCurrentFeatureUsage(
        userId: string,
        subscriptionId: string,
        featureKey: string,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<number> {
        try {
            const cacheKey = this.getFeatureUsageKey(
                userId,
                subscriptionId,
                featureKey,
                periodStart,
                periodEnd,
            );

            // Try to get from cache first
            const cachedUsage = await this.redisClient.get(cacheKey);
            if (cachedUsage) {
                return parseInt(cachedUsage, 10);
            }

            // Get from database
            const usage = await this.prisma.featureUsage.findUnique({
                where: {
                    userId_subscriptionId_featureKey_periodStart_periodEnd: {
                        userId,
                        subscriptionId,
                        featureKey,
                        periodStart,
                        periodEnd,
                    },
                },
            });

            const currentUsage = usage?.used || 0;

            // Cache the result
            await this.redisClient.setex(
                cacheKey,
                this.DEFAULT_REDIS_TTL,
                currentUsage.toString(),
            );

            return currentUsage;
        } catch (error) {
            this.logger.error('Error getting current feature usage', error);
            return 0;
        }
    }

    /**
     * Increment feature usage and update via queue
     */
    async incrementFeatureUsage(
        userId: string,
        planId: string,
        subscriptionId: string,
        featureKey: string,
        periodStart: Date,
        periodEnd: Date,
        incrementBy: number = 1,
    ): Promise<void> {
        try {
            const cacheKey = this.getFeatureUsageKey(
                userId,
                subscriptionId,
                featureKey,
                periodStart,
                periodEnd,
            );

            // Increment in cache
            const currentUsage = await this.getCurrentFeatureUsage(
                userId,
                subscriptionId,
                featureKey,
                periodStart,
                periodEnd,
            );

            const newUsage = currentUsage + incrementBy;

            await this.redisClient.setex(
                cacheKey,
                this.DEFAULT_REDIS_TTL,
                newUsage.toString(),
            );

            // Queue database update
            await this.billingQueue.add('update-feature-usage', {
                userId,
                planId,
                subscriptionId,
                featureKey,
                periodStart,
                periodEnd,
                used: newUsage,
            });

            this.logger.log(
                `Feature usage incremented for user ${userId}, feature ${featureKey}`,
            );
        } catch (error) {
            this.logger.error('Error incrementing feature usage', error);
            throw error;
        }
    }

    /**
     * Reset feature usage for a new period
     */
    async resetFeatureUsage(
        userId: string,
        subscriptionId: string,
        featureKey: string,
        periodStart: Date,
        periodEnd: Date,
    ): Promise<void> {
        try {
            const cacheKey = this.getFeatureUsageKey(
                userId,
                subscriptionId,
                featureKey,
                periodStart,
                periodEnd,
            );

            await this.redisClient.del(cacheKey);

            this.logger.log(
                `Feature usage reset for user ${userId}, feature ${featureKey}`,
            );
        } catch (error) {
            this.logger.error('Error resetting feature usage', error);
            throw error;
        }
    }

    /**
     * Get feature usage summary for a user
     */
    async getFeatureUsageSummary(userId: string, subscriptionId: string) {
        try {
            const usageRecords = await this.prisma.featureUsage.findMany({
                where: {
                    userId,
                    subscriptionId,
                },
                orderBy: {
                    periodStart: 'desc',
                },
                take: 10,
            });

            return usageRecords;
        } catch (error) {
            this.logger.error('Error getting feature usage summary', error);
            return [];
        }
    }
}
