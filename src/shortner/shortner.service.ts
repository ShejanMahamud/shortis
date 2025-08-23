import { Injectable, Logger } from '@nestjs/common';
import { Util } from '../utils/util';
import { AccessUrlDto } from './dto/access-url.dto';
import { CreateShortnerDto } from './dto/create-shortner.dto';
import { GetAnalyticsDto } from './dto/get-analytics.dto';
import { UpdateShortnerDto } from './dto/update-shortner.dto';
import {
  ClickLimitExceededException,
  IncorrectPasswordException,
  InvalidUrlException,
  PasswordRequiredException,
  SlugAlreadyExistsException,
  UnauthorizedUrlAccessException,
  UrlExpiredException,
  UrlInactiveException,
  UrlNotFoundException,
} from './exceptions/shortner.exceptions';
import {
  CreateUrlData,
  UpdateUrlData,
  UrlAnalytics,
  UrlEntity,
} from './interfaces/shortner.interface';
import { ShortnerRepository } from './repositories/shortner.repository';
import { AnalyticsService } from './services/analytics.service';

@Injectable()
export class ShortnerService {
  private readonly logger = new Logger(ShortnerService.name);

  constructor(
    private readonly shortnerRepository: ShortnerRepository,
    private readonly analyticsService: AnalyticsService,
  ) {}

  async create(
    createShortnerDto: CreateShortnerDto,
    userId?: string,
  ): Promise<UrlEntity> {
    try {
      this.validateUrl(createShortnerDto.originalUrl);
      this.validateExpirationDate(createShortnerDto.expiresAt);

      const createUrlData: CreateUrlData = {
        originalUrl: createShortnerDto.originalUrl,
        customSlug: createShortnerDto.customSlug,
        title: createShortnerDto.title,
        description: createShortnerDto.description,
        password: createShortnerDto.password
          ? await Util.hash(createShortnerDto.password)
          : undefined,
        expiresAt: createShortnerDto.expiresAt
          ? new Date(createShortnerDto.expiresAt)
          : undefined,
        customDomain: createShortnerDto.customDomain,
        clickLimit: createShortnerDto.clickLimit,
        isActive: createShortnerDto.isActive ?? true,
        userId,
      };

      // Generate unique slug
      const uniqueSlug = await this.shortnerRepository.generateUniqueSlug(
        createUrlData.customSlug,
      );
      createUrlData.customSlug = uniqueSlug;

      const url = await this.shortnerRepository.createUrl(createUrlData);
      this.logger.log(`Created URL: ${url.slug} for ${url.originalUrl}`);

      return url;
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new SlugAlreadyExistsException(createShortnerDto.customSlug!);
      }
      throw error;
    }
  }

  async findAll(
    userId?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ urls: UrlEntity[]; total: number; totalPages: number }> {
    const result = userId
      ? await this.shortnerRepository.findUrlsByUser(userId, page, limit)
      : await this.shortnerRepository.findAllUrls(page, limit);

    const totalPages = Math.ceil(result.total / limit);

    return {
      urls: result.urls,
      total: result.total,
      totalPages,
    };
  }

  async findOne(id: string, userId?: string): Promise<UrlEntity> {
    const url = await this.shortnerRepository.findUrlById(id);

    if (!url) {
      throw new UrlNotFoundException();
    }

    if (userId && url.userId !== userId) {
      throw new UnauthorizedUrlAccessException();
    }

    return url;
  }

  async findBySlug(slug: string): Promise<UrlEntity> {
    const url = await this.shortnerRepository.findUrlBySlug(slug);

    if (!url) {
      throw new UrlNotFoundException();
    }

    return url;
  }

  async redirectToUrl(
    slug: string,
    accessDto?: AccessUrlDto,
    ipAddress?: string,
    userAgent?: string,
    referer?: string,
    userId?: string,
  ): Promise<string> {
    const url = await this.findBySlug(slug);

    // Validate URL accessibility
    await this.validateUrlAccess(url, accessDto?.password);

    // Record click analytics
    await this.analyticsService.recordClick(
      url.id,
      userId || null,
      ipAddress || null,
      userAgent || null,
      referer || null,
    );

    this.logger.log(`Redirecting ${slug} to ${url.originalUrl}`);

    return url.originalUrl;
  }

  async update(
    id: string,
    updateShortnerDto: UpdateShortnerDto,
    userId?: string,
  ): Promise<UrlEntity> {
    await this.findOne(id, userId); // Validate existence and authorization

    if (updateShortnerDto.expiresAt) {
      this.validateExpirationDate(updateShortnerDto.expiresAt);
    }

    const updateData: UpdateUrlData = {
      title: updateShortnerDto.title,
      description: updateShortnerDto.description,
      isActive: updateShortnerDto.isActive,
      expiresAt: updateShortnerDto.expiresAt
        ? new Date(updateShortnerDto.expiresAt)
        : undefined,
      clickLimit: updateShortnerDto.clickLimit,
    };

    const updatedUrl = await this.shortnerRepository.updateUrl(id, updateData);
    this.logger.log(`Updated URL: ${updatedUrl.slug}`);

    return updatedUrl;
  }

  async remove(id: string, userId?: string): Promise<void> {
    await this.findOne(id, userId); // This will throw if not found or unauthorized

    await this.shortnerRepository.deleteUrl(id);
    this.logger.log(`Deleted URL with ID: ${id}`);
  }

  async getAnalytics(
    id: string,
    analyticsDto: GetAnalyticsDto,
    userId?: string,
  ): Promise<UrlAnalytics> {
    await this.findOne(id, userId); // This will throw if not found or unauthorized

    const startDate = analyticsDto.startDate
      ? new Date(analyticsDto.startDate)
      : undefined;
    const endDate = analyticsDto.endDate
      ? new Date(analyticsDto.endDate)
      : undefined;

    return this.analyticsService.getUrlAnalytics(id, startDate, endDate);
  }

  async toggleUrlStatus(id: string, userId?: string): Promise<UrlEntity> {
    const url = await this.findOne(id, userId);

    const updatedUrl = await this.shortnerRepository.updateUrl(id, {
      isActive: !url.isActive,
    });

    this.logger.log(
      `Toggled URL status: ${updatedUrl.slug} is now ${updatedUrl.isActive ? 'active' : 'inactive'}`,
    );

    return updatedUrl;
  }

  // Private validation methods
  private validateUrl(url: string): void {
    if (!Util.isValidUrl(url)) {
      throw new InvalidUrlException('Please provide a valid URL');
    }
  }

  private validateExpirationDate(expiresAt?: string): void {
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      const now = new Date();

      if (expirationDate <= now) {
        throw new InvalidUrlException('Expiration date must be in the future');
      }
    }
  }

  private async validateUrlAccess(
    url: UrlEntity,
    password?: string,
  ): Promise<void> {
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
      return await Util.match(plainPassword, hashedPassword);
    } catch (error) {
      this.logger.error('Password verification failed', error);
      return false;
    }
  }
}
