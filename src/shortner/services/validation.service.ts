import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { PrismaService } from 'src/prisma/prisma.service';
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
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

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
    const cached = await this.cacheManager.get<boolean>(`slug:${slug}`);
    if (cached) {
      return cached;
    }
    const url = await this.prisma.url.findUnique({
      where: { slug },
      select: { id: true },
    });
    const exists = !!url;
    await this.cacheManager.set(`slug:${slug}`, exists, this.SLUG_CACHE_TTL);
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
