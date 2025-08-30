import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { IApiResponse } from 'src/interfaces';
import { REDIS_CLIENT } from 'src/queue/queue.module';

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);

    constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) { }

    /**
     * Clear all Redis cache
     */
    async clearAllCache(): Promise<IApiResponse<{ clearedKeys: number }>> {
        try {
            this.logger.log('Starting to clear all Redis cache...');

            // Get all keys
            const keys = await this.redisClient.keys('*');

            if (keys.length === 0) {
                this.logger.log('No keys found in Redis cache');
                return {
                    success: true,
                    message: 'No cache keys found to clear',
                    data: { clearedKeys: 0 },
                };
            }

            // Delete all keys
            const result = await this.redisClient.del(...keys);

            this.logger.log(`Successfully cleared ${result} cache keys`);

            return {
                success: true,
                message: `Successfully cleared ${result} cache keys`,
                data: { clearedKeys: result },
            };
        } catch (error) {
            this.logger.error('Failed to clear Redis cache:', error);
            throw new Error('Failed to clear cache');
        }
    }

    /**
     * Clear cache by pattern
     */
    async clearCacheByPattern(
        pattern: string,
    ): Promise<IApiResponse<{ clearedKeys: number }>> {
        try {
            this.logger.log(`Starting to clear cache with pattern: ${pattern}`);

            // Get keys matching pattern
            const keys = await this.redisClient.keys(pattern);

            if (keys.length === 0) {
                this.logger.log(`No keys found matching pattern: ${pattern}`);
                return {
                    success: true,
                    message: `No cache keys found matching pattern: ${pattern}`,
                    data: { clearedKeys: 0 },
                };
            }

            // Delete matching keys
            const result = await this.redisClient.del(...keys);

            this.logger.log(
                `Successfully cleared ${result} cache keys matching pattern: ${pattern}`,
            );

            return {
                success: true,
                message: `Successfully cleared ${result} cache keys matching pattern: ${pattern}`,
                data: { clearedKeys: result },
            };
        } catch (error) {
            this.logger.error(
                `Failed to clear cache with pattern ${pattern}:`,
                error,
            );
            throw new Error(`Failed to clear cache with pattern: ${pattern}`);
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats(): Promise<IApiResponse<any>> {
        try {
            const info = await this.redisClient.info('memory');
            const keyspace = await this.redisClient.info('keyspace');
            const allKeys = await this.redisClient.keys('*');

            // Parse memory info
            const memoryLines = info
                .split('\r\n')
                .filter((line) => line.includes(':'));
            const memoryInfo: Record<string, string> = {};
            memoryLines.forEach((line) => {
                const [key, value] = line.split(':');
                if (key && value) {
                    memoryInfo[key] = value;
                }
            });

            // Parse keyspace info
            const keyspaceLines = keyspace
                .split('\r\n')
                .filter((line) => line.includes('db'));
            const keyspaceInfo: Record<string, string> = {};
            keyspaceLines.forEach((line) => {
                const [key, value] = line.split(':');
                if (key && value) {
                    keyspaceInfo[key] = value;
                }
            });

            // Count keys by pattern
            const keyPatterns = {
                url: allKeys.filter((key) => key.startsWith('url:')).length,
                active_subscription: allKeys.filter((key) =>
                    key.startsWith('active_subscription:'),
                ).length,
                feature_usage: allKeys.filter((key) => key.includes('feature_usage'))
                    .length,
                validation: allKeys.filter((key) => key.includes('validation')).length,
                other: allKeys.filter(
                    (key) =>
                        !key.startsWith('url:') &&
                        !key.startsWith('active_subscription:') &&
                        !key.includes('feature_usage') &&
                        !key.includes('validation'),
                ).length,
            };

            return {
                success: true,
                message: 'Cache statistics retrieved successfully',
                data: {
                    totalKeys: allKeys.length,
                    keyPatterns,
                    memoryInfo,
                    keyspaceInfo,
                },
            };
        } catch (error) {
            this.logger.error('Failed to get cache statistics:', error);
            throw new Error('Failed to get cache statistics');
        }
    }
}
