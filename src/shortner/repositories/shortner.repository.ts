import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    AnalyticsEntity,
    ClickData,
    ClickEntity,
    CreateUrlData,
    UpdateUrlData,
    UrlEntity,
} from '../interfaces/shortner.interface';

@Injectable()
export class ShortnerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createUrl(data: CreateUrlData): Promise<UrlEntity> {
    return this.prisma.url.create({
      data: {
        originalUrl: data.originalUrl,
        slug: data.customSlug || this.generateSlug(),
        title: data.title,
        description: data.description,
        userId: data.userId,
        isActive: data.isActive ?? true,
        expiresAt: data.expiresAt,
        password: data.password,
        customDomain: data.customDomain,
        clickLimit: data.clickLimit,
      },
    });
  }

  async findUrlBySlug(slug: string): Promise<UrlEntity | null> {
    return this.prisma.url.findUnique({
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
  }

  async findUrlById(id: string): Promise<UrlEntity | null> {
    return this.prisma.url.findUnique({
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
  }

  async findUrlsByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ urls: UrlEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    const [urls, total] = await Promise.all([
      this.prisma.url.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.url.count({
        where: { userId },
      }),
    ]);

    return { urls, total };
  }

  async findAllUrls(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ urls: UrlEntity[]; total: number }> {
    const skip = (page - 1) * limit;

    const [urls, total] = await Promise.all([
      this.prisma.url.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.url.count(),
    ]);

    return { urls, total };
  }

  async updateUrl(id: string, data: UpdateUrlData): Promise<UrlEntity> {
    return this.prisma.url.update({
      where: { id },
      data,
    });
  }

  async incrementClickCount(id: string): Promise<void> {
    await this.prisma.url.update({
      where: { id },
      data: {
        totalClicks: {
          increment: 1,
        },
      },
    });
  }

  async deleteUrl(id: string): Promise<void> {
    await this.prisma.url.delete({
      where: { id },
    });
  }

  async createClick(data: ClickData): Promise<ClickEntity> {
    return this.prisma.click.create({
      data,
    });
  }

  async getUrlClicks(
    urlId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ClickEntity[]> {
    return this.prisma.click.findMany({
      where: {
        urlId,
        clickedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { clickedAt: 'desc' },
    });
  }

  async getUrlAnalytics(
    urlId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AnalyticsEntity[]> {
    return this.prisma.analytics.findMany({
      where: {
        urlId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });
  }

  async createOrUpdateAnalytics(
    urlId: string,
    date: Date,
    isUnique: boolean,
  ): Promise<void> {
    const dateOnly = new Date(date.toISOString().split('T')[0]);

    await this.prisma.analytics.upsert({
      where: {
        urlId_date: {
          urlId,
          date: dateOnly,
        },
      },
      update: {
        clickCount: { increment: 1 },
        uniqueClicks: isUnique ? { increment: 1 } : undefined,
      },
      create: {
        urlId,
        date: dateOnly,
        clickCount: 1,
        uniqueClicks: isUnique ? 1 : 0,
      },
    });
  }

  async checkSlugExists(slug: string): Promise<boolean> {
    const url = await this.prisma.url.findUnique({
      where: { slug },
      select: { id: true },
    });
    return !!url;
  }

  private generateSlug(length: number = 6): string {
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
}
