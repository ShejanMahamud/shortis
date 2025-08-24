import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma';
import { IApiResponse } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { Util } from 'src/utils/util';
import { AccessUrlDto } from './dto/access-url.dto';
import { CreateShortnerDto } from './dto/create-shortner.dto';
import { GetAnalyticsDto } from './dto/get-analytics.dto';
import { UpdateShortnerDto } from './dto/update-shortner.dto';
import {
  SlugAlreadyExistsException,
  UnauthorizedUrlAccessException,
  UrlNotFoundException,
} from './exceptions/shortner.exceptions';
import {
  IMeta,
  IShortnerService,
  UpdateUrlData,
  UrlAnalytics,
  UrlEntity,
} from './interfaces/shortner.interface';
import { AnalyticsService } from './services/analytics.service';
import { ValidationService } from './services/validation.service';

@Injectable()
export class ShortnerService implements IShortnerService {
  private readonly logger = new Logger(ShortnerService.name);

  constructor(
    private readonly validationService: ValidationService,
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createShortnerDto: CreateShortnerDto,
    userId?: string,
  ): Promise<IApiResponse<UrlEntity>> {
    try {
      this.validationService.validateUrl(createShortnerDto.originalUrl);
      this.validationService.validateExpirationDate(
        createShortnerDto.expiresAt
          ? new Date(createShortnerDto.expiresAt)
          : undefined,
      );

      // Generate unique slug
      const uniqueSlug = await this.validationService.generateUniqueSlug(
        createShortnerDto.customSlug,
      );

      //hash if password provided by user
      if (createShortnerDto.password) {
        createShortnerDto.password = await Util.hash(
          createShortnerDto.password,
        );
      }

      const url = await this.prisma.url.create({
        data: {
          slug: createShortnerDto.customSlug || uniqueSlug,
          userId,
          ...createShortnerDto,
        },
      });
      this.logger.log(`Created URL: ${url.slug} for ${url.originalUrl}`);

      return {
        success: true,
        message: `Created URL: ${url.slug} for ${url.originalUrl}`,
        data: url,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new SlugAlreadyExistsException(createShortnerDto.customSlug!);
      }
      throw error;
    }
  }

  async findAll(
    limit: number,
    cursor?: string,
    userId?: string,
  ): Promise<IApiResponse<UrlEntity[], IMeta>> {
    const queryOptions: Prisma.UrlFindManyArgs = {
      orderBy: { createdAt: 'desc' },
      take: limit,
    };

    if (cursor) {
      queryOptions.skip = 1;
      queryOptions.cursor = { id: cursor };
    }

    if (userId) {
      queryOptions.where = { userId };
    }

    const urls = await this.prisma.url.findMany(queryOptions);
    const hasNextPage = urls.length > limit;
    const nextCursor = urls.length > 0 ? urls[urls.length - 1].id : null;

    return {
      success: true,
      message: 'All urls fetched successfully!',
      data: urls,
      meta: {
        limit: 10,
        count: urls.length,
        nextCursor,
        hasNextPage,
      },
    };
  }

  async findOne(id: string, userId?: string): Promise<IApiResponse<UrlEntity>> {
    const url = await this.prisma.url.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!url) {
      throw new UrlNotFoundException();
    }

    if (userId && url.userId !== userId) {
      throw new UnauthorizedUrlAccessException();
    }

    return {
      success: true,
      message: 'Url fetched successfully!',
      data: url,
    };
  }

  async findBySlug(slug: string): Promise<IApiResponse<UrlEntity>> {
    const url = await this.prisma.url.findUnique({
      where: { slug },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!url) {
      throw new UrlNotFoundException();
    }

    return {
      success: true,
      message: 'Url fetched successfully!',
      data: url,
    };
  }

  async redirectToUrl(
    slug: string,
    accessDto?: AccessUrlDto,
    ipAddress?: string,
    userAgent?: string,
    referer?: string,
    userId?: string,
  ): Promise<string> {
    const data = await this.findBySlug(slug);

    if (!data.data) {
      throw new UrlNotFoundException();
    }

    // Validate URL accessibility
    await this.validationService.validateUrlAccess(
      data.data,
      accessDto?.password,
    );

    // Record click analytics
    await this.analyticsService.recordClick(
      data.data.id,
      userId || null,
      ipAddress || null,
      userAgent || null,
      referer || null,
    );

    this.logger.log(`Redirecting ${slug} to ${data.data.originalUrl}`);

    return data.data.originalUrl;
  }

  async update(
    id: string,
    updateShortnerDto: UpdateShortnerDto,
    userId?: string,
  ): Promise<IApiResponse<UrlEntity>> {
    await this.findOne(id, userId);

    if (updateShortnerDto.expiresAt) {
      this.validationService.validateExpirationDate(
        new Date(updateShortnerDto.expiresAt),
      );
    }
    const updateData: UpdateUrlData = {
      ...updateShortnerDto,
      expiresAt: updateShortnerDto.expiresAt
        ? new Date(updateShortnerDto.expiresAt)
        : undefined,
    };

    const updatedUrl = await this.prisma.url.update({
      where: { id },
      data: updateData,
    });
    this.logger.log(`Updated URL: ${updatedUrl.slug}`);

    return {
      success: true,
      message: 'URL updated successfully!',
      data: updatedUrl,
    };
  }

  async remove(
    id: string,
    userId?: string,
  ): Promise<IApiResponse<{ success: boolean; message: string }>> {
    await this.findOne(id, userId);

    await this.prisma.url.delete({
      where: { id },
    });

    this.logger.log(`Deleted URL with ID: ${id}`);
    return {
      success: true,
      message: 'URL deleted successfully!',
    };
  }

  async getAnalytics(
    id: string,
    analyticsDto: GetAnalyticsDto,
    userId?: string,
  ): Promise<IApiResponse<UrlAnalytics>> {
    await this.findOne(id, userId);

    const startDate = analyticsDto.startDate
      ? new Date(analyticsDto.startDate)
      : undefined;
    const endDate = analyticsDto.endDate
      ? new Date(analyticsDto.endDate)
      : undefined;

    const data = await this.analyticsService.getUrlAnalytics(
      id,
      startDate,
      endDate,
    );

    return {
      success: true,
      message: 'Analytics fetched successfully!',
      data: data.data,
    };
  }

  async toggleUrlStatus(
    id: string,
    userId?: string,
  ): Promise<IApiResponse<UrlEntity>> {
    const url = await this.findOne(id, userId);

    const updatedUrl = await this.prisma.url.update({
      where: { id },
      data: {
        isActive: !url.data?.isActive,
      },
    });
    this.logger.log(
      `Toggled URL status: ${updatedUrl.slug} is now ${updatedUrl.isActive ? 'active' : 'inactive'}`,
    );
    return {
      success: true,
      message: 'URL status toggled successfully!',
      data: updatedUrl,
    };
  }
}
