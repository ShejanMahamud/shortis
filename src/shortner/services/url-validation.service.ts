import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import { SubscriptionValidationService } from 'src/subscription/services';
import { Util } from 'src/utils/util';
import {
    ClickLimitExceededException,
    IncorrectPasswordException,
    InvalidUrlException,
    PasswordRequiredException,
    UrlExpiredException,
    UrlInactiveException,
} from '../exceptions';
import { IMinimalUrl, IUrlValidationService } from '../interfaces';

@Injectable()
export class UrlValidationService implements IUrlValidationService {
    private readonly logger = new Logger(UrlValidationService.name);
    private readonly SLUG_CACHE_TTL = 30000;

    constructor(
        private readonly prisma: PrismaService,
        @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
        private readonly subscriptionValidationService: SubscriptionValidationService,
    ) { }

    /**
     * Generate Redis cache key for slug
     */
    private getSlugCacheKey(slug: string): string {
        return `slug:${slug}`;
    }

    /**
     * Validate URL creation against subscription limits
     */
    async validateUrlCreation(userId: string): Promise<boolean> {
        try {
            // Check if user can create more URLs (subscription validation)
            const canCreateUrl =
                await this.subscriptionValidationService.checkSubscriptionLimit(
                    userId,
                    'url_creation',
                    1,
                );

            if (!canCreateUrl) {
                this.logger.warn(`User ${userId} has reached URL creation limit`);
                return false;
            }

            return true;
        } catch (error) {
            this.logger.error(
                `Error validating URL creation for user ${userId}`,
                error,
            );
            return false;
        }
    }

    /**
     * Consume URL creation feature usage
     */
    async consumeUrlCreation(userId: string): Promise<void> {
        try {
            const consumed =
                await this.subscriptionValidationService.validateAndConsumeFeature(
                    userId,
                    'url_creation',
                    1,
                );

            if (!consumed) {
                throw new Error('Failed to consume URL creation feature');
            }

            this.logger.log(`URL creation consumed for user ${userId}`);
        } catch (error) {
            this.logger.error(
                `Error consuming URL creation for user ${userId}`,
                error,
            );
            throw error;
        }
    }

    /**
     * Validate URL access and handle click tracking
     */
    async validateUrlAccess(
        slug: string,
        password?: string,
        userIp?: string,
    ): Promise<IMinimalUrl> {
        try {
            // Try cache first
            const cacheKey = this.getSlugCacheKey(slug);
            let url: IMinimalUrl | null = null;

            const cachedUrl = await this.redisClient.get(cacheKey);
            if (cachedUrl) {
                url = JSON.parse(cachedUrl);
            } else {
                // Get from database
                const dbUrl = await this.prisma.url.findUnique({
                    where: { slug },
                    select: {
                        id: true,
                        originalUrl: true,
                        slug: true,
                        isActive: true,
                        expiresAt: true,
                        password: true,
                        clickLimit: true,
                        totalClicks: true,
                        userId: true,
                    },
                });

                if (!dbUrl) {
                    throw new NotFoundException('URL not found');
                }

                // Transform to match interface
                url = {
                    ...dbUrl,
                    hasPassword: !!dbUrl.password,
                    clickCount: dbUrl.totalClicks,
                }; // Cache the URL for performance
                await this.redisClient.setex(
                    cacheKey,
                    this.SLUG_CACHE_TTL,
                    JSON.stringify(url),
                );
            }

            // Ensure url is not null after this point
            if (!url) {
                throw new NotFoundException('URL not found');
            }

            // Validation checks
            if (!url.isActive) {
                throw new UrlInactiveException();
            }

            if (url.expiresAt && url.expiresAt < new Date()) {
                throw new UrlExpiredException();
            }

            if (url.hasPassword) {
                if (!password) {
                    throw new PasswordRequiredException();
                }

                const isPasswordValid = await Util.match(url.password!, password);
                if (!isPasswordValid) {
                    throw new IncorrectPasswordException();
                }
            }

            if (url.clickLimit && (url.clickCount || 0) >= url.clickLimit) {
                throw new ClickLimitExceededException();
            } // Increment click count
            await this.incrementUrlClicks(url.id, userIp);

            // Consume click tracking if user has subscription
            if (url.userId) {
                try {
                    await this.subscriptionValidationService.validateAndConsumeFeature(
                        url.userId,
                        'click_tracking',
                        1,
                    );
                } catch (error) {
                    // Don't fail URL access if click tracking consumption fails
                    this.logger.warn(
                        `Failed to consume click tracking for user ${url.userId}`,
                        error,
                    );
                }
            }

            return url;
        } catch (error) {
            if (
                error instanceof NotFoundException ||
                error instanceof UrlInactiveException ||
                error instanceof UrlExpiredException ||
                error instanceof PasswordRequiredException ||
                error instanceof IncorrectPasswordException ||
                error instanceof ClickLimitExceededException ||
                error instanceof InvalidUrlException
            ) {
                throw error;
            }

            this.logger.error(`Error validating URL access for slug ${slug}`, error);
            throw new Error('URL validation failed');
        }
    }

    /**
     * Increment URL click count
     */
    private async incrementUrlClicks(
        urlId: string,
        userIp?: string,
    ): Promise<void> {
        try {
            // Update click count using correct field name
            await this.prisma.url.update({
                where: { id: urlId },
                data: { totalClicks: { increment: 1 } },
            });

            // Track click details if IP is provided (use Click model)
            if (userIp) {
                await this.prisma.click.create({
                    data: {
                        urlId,
                        ipAddress: userIp,
                        clickedAt: new Date(),
                    },
                });
            }
        } catch (error) {
            this.logger.error(`Error incrementing clicks for URL ${urlId}`, error);
            // Don't throw error as this shouldn't block URL access
        }
    }

    /**
     * Validate URL update permissions
     */
    async validateUrlUpdate(userId: string, urlId: string): Promise<boolean> {
        try {
            const url = await this.prisma.url.findUnique({
                where: { id: urlId },
                select: { userId: true },
            });

            if (!url) {
                return false;
            }

            // Check if user owns the URL
            return url.userId === userId;
        } catch (error) {
            this.logger.error(
                `Error validating URL update for user ${userId}, URL ${urlId}`,
                error,
            );
            return false;
        }
    }

    /**
     * Clear URL cache
     */
    async clearUrlCache(slug: string): Promise<void> {
        try {
            const cacheKey = this.getSlugCacheKey(slug);
            await this.redisClient.del(cacheKey);
        } catch (error) {
            this.logger.error(`Error clearing URL cache for slug ${slug}`, error);
        }
    }
}
