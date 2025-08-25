import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { IApiResponse } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import {
  ClickData,
  ClickEntity,
  IAnalyticsService,
  UrlAnalytics,
} from '../interfaces/shortner.interface';

@Injectable()
export class AnalyticsService implements IAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) {}

  private async getUrlClicks(
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
  ): Promise<IApiResponse<UrlAnalytics>> {
    const clicks = await this.getUrlClicks(urlId, startDate, endDate);
    const analytics = await this.prisma.analytics.findMany({
      where: {
        urlId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    const totalClicks = clicks.length;
    const uniqueClicks = this.countUniqueClicks(clicks);

    const clicksByDate = analytics.map((analytic) => ({
      date: analytic.date.toISOString().split('T')[0],
      clicks: analytic.clickCount,
      uniqueClicks: analytic.uniqueClicks,
    }));

    const clicksByCountry = this.groupClicksByField(clicks, 'country');
    const clicksByDevice = this.groupClicksByField(clicks, 'device');
    const clicksByBrowser = this.groupClicksByField(clicks, 'browser');
    const clicksByReferer = this.groupClicksByField(clicks, 'referer');

    return {
      success: true,
      message: 'URL analytics fetched successfully!',
      data: {
        totalClicks,
        uniqueClicks,
        clicksByDate,
        clicksByCountry,
        clicksByDevice,
        clicksByBrowser,
        clicksByReferer,
      },
    };
  }

  private countUniqueClicks(clicks: ClickEntity[]): number {
    const uniqueIps = new Set(
      clicks.filter((click) => click.ipAddress).map((click) => click.ipAddress),
    );
    return uniqueIps.size;
  }

  private async createClick(data: ClickData): Promise<ClickEntity> {
    return this.prisma.click.create({
      data,
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

  private groupClicksByField(
    clicks: ClickEntity[],
    field: keyof Pick<
      ClickEntity,
      'country' | 'device' | 'browser' | 'referer'
    >,
  ): Array<Record<string, string | number>> {
    const grouped = clicks.reduce(
      (acc, click) => {
        const value = click[field];
        const key = value || 'Unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10) // Top 10 results
      .map(([key, count]) => ({
        [field]: key,
        clicks: count,
      }));
  }

  private async incrementClickCount(id: string): Promise<void> {
    await this.prisma.url.update({
      where: { id },
      data: {
        totalClicks: {
          increment: 1,
        },
      },
    });
  }

  async recordClick(
    urlId: string,
    userId: string | null,
    ipAddress: string | null,
    userAgent: string | null,
    referer: string | null,
  ): Promise<void> {
    const clickData = {
      urlId,
      userId,
      ipAddress,
      userAgent,
      referer,
      country: this.getCountryFromIP(ipAddress),
      city: this.getCityFromIP(ipAddress),
      device: this.getDeviceFromUserAgent(userAgent),
      browser: this.getBrowserFromUserAgent(userAgent),
      os: this.getOSFromUserAgent(userAgent),
    };

    await this.redisClient.sadd('activeUrls', urlId);

    // 1. Store full click data in Redis list for later processing
    await this.redisClient.rpush(`clicks:${urlId}`, JSON.stringify(clickData));

    // 3. Increment unique clicks based on IP
    if (ipAddress) {
      const ipKey = `unique:${urlId}:${ipAddress}`;
      const isNew = await this.redisClient.set(ipKey, 1, 'EX', 86400, 'NX'); // 1 day expiry
      if (isNew) {
        await this.redisClient.incr(`uniqueCount:${urlId}`);
      }
    }
  }

  async flushClicksToDB(urlId: string) {
    // 1. Read all click events
    const clicks = await this.redisClient.lrange(`clicks:${urlId}`, 0, -1);
    if (!clicks.length) return;

    // 2. Clear Redis list
    await this.redisClient.del(`clicks:${urlId}`);

    // 3. Parse & insert in bulk
    const clickData = clicks.map((c) => JSON.parse(c) as ClickData);
    await this.prisma.click.createMany({ data: clickData });

    // 4. Update counters
    const unique = await this.redisClient.get(`uniqueCount:${urlId}`);

    await this.prisma.url.update({
      where: { id: urlId },
      data: {
        totalClicks: Number(unique || 0),
      },
    });

    // 5. Reset counters after flush
    await this.redisClient.del(`clickCount:${urlId}`, `uniqueCount:${urlId}`);
  }

  private async isUniqueClick(
    urlId: string,
    ipAddress: string | null,
  ): Promise<boolean> {
    if (!ipAddress) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingClicks = await this.getUrlClicks(urlId, today);

    return !existingClicks.some((click) => click.ipAddress === ipAddress);
  }

  private getCountryFromIP(ipAddress: string | null): string {
    // In a real application, you would use a service like MaxMind GeoIP2
    // For now, return a placeholder
    return ipAddress ? 'Unknown' : 'Unknown';
  }

  private getCityFromIP(ipAddress: string | null): string {
    // In a real application, you would use a service like MaxMind GeoIP2
    // For now, return a placeholder
    return ipAddress ? 'Unknown' : 'Unknown';
  }

  private getDeviceFromUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();

    if (ua.includes('mobile')) return 'Mobile';
    if (ua.includes('tablet') || ua.includes('ipad')) return 'Tablet';
    return 'Desktop';
  }

  private getBrowserFromUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();

    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';

    return 'Unknown';
  }

  private getOSFromUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'Unknown';

    const ua = userAgent.toLowerCase();

    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('ios')) return 'iOS';

    return 'Unknown';
  }
}
