import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { Role, Roles } from 'src/auth/decorators';
import { AccessAuthGuard } from 'src/auth/guards/access.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CacheService } from './cache.service';

@ApiTags('Cache Management')
@ApiBearerAuth()
@Controller('admin/cache')
@UseGuards(AccessAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CacheController {
    constructor(private readonly cacheService: CacheService) { }

    @Delete('clear-all')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Clear all Redis cache (Admin only)',
        description: 'Removes all cache entries from Redis database',
    })
    @ApiResponse({
        status: 200,
        description: 'Cache cleared successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        clearedKeys: { type: 'number' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Admin role required',
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error',
    })
    async clearAllCache() {
        return this.cacheService.clearAllCache();
    }

    @Delete('clear/:pattern')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Clear cache by pattern (Admin only)',
        description: 'Removes cache entries matching a specific pattern',
    })
    @ApiParam({
        name: 'pattern',
        description: 'Redis key pattern (e.g., "url:*", "active_subscription:*")',
        example: 'url:*',
    })
    @ApiResponse({
        status: 200,
        description: 'Cache cleared successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        clearedKeys: { type: 'number' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Admin role required',
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error',
    })
    async clearCacheByPattern(@Param('pattern') pattern: string) {
        return this.cacheService.clearCacheByPattern(pattern);
    }

    @Get('stats')
    @ApiOperation({
        summary: 'Get cache statistics (Admin only)',
        description: 'Retrieve detailed cache statistics and memory usage',
    })
    @ApiResponse({
        status: 200,
        description: 'Cache statistics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        totalKeys: { type: 'number' },
                        keyPatterns: {
                            type: 'object',
                            properties: {
                                url: { type: 'number' },
                                active_subscription: { type: 'number' },
                                feature_usage: { type: 'number' },
                                validation: { type: 'number' },
                                other: { type: 'number' },
                            },
                        },
                        memoryInfo: { type: 'object' },
                        keyspaceInfo: { type: 'object' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Token missing or invalid',
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Admin role required',
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error',
    })
    async getCacheStats() {
        return this.cacheService.getCacheStats();
    }
}
