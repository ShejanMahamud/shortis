import { Injectable } from '@nestjs/common';
import { ClickEntity, UrlAnalytics } from '../interfaces/shortner.interface';
import { ShortnerRepository } from '../repositories/shortner.repository';

@Injectable()
export class AnalyticsService {
  constructor(private readonly shortnerRepository: ShortnerRepository) {}

  async getUrlAnalytics(
    urlId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<UrlAnalytics> {
    const clicks = await this.shortnerRepository.getUrlClicks(
      urlId,
      startDate,
      endDate,
    );
    const analytics = await this.shortnerRepository.getUrlAnalytics(
      urlId,
      startDate,
      endDate,
    );

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
      totalClicks,
      uniqueClicks,
      clicksByDate,
      clicksByCountry,
      clicksByDevice,
      clicksByBrowser,
      clicksByReferer,
    };
  }

  private countUniqueClicks(clicks: ClickEntity[]): number {
    const uniqueIps = new Set(
      clicks.filter((click) => click.ipAddress).map((click) => click.ipAddress),
    );
    return uniqueIps.size;
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

    await this.shortnerRepository.createClick(clickData);

    // Check if this is a unique click (based on IP address)
    const isUnique = await this.isUniqueClick(urlId, ipAddress);

    // Update analytics
    await this.shortnerRepository.createOrUpdateAnalytics(
      urlId,
      new Date(),
      isUnique,
    );

    // Increment URL click count
    await this.shortnerRepository.incrementClickCount(urlId);
  }

  private async isUniqueClick(
    urlId: string,
    ipAddress: string | null,
  ): Promise<boolean> {
    if (!ipAddress) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingClicks = await this.shortnerRepository.getUrlClicks(
      urlId,
      today,
    );

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
