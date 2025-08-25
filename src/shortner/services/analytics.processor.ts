import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import { ClickData } from '../interfaces';

@Processor('analytics')
export class AnalyticsProcessor extends WorkerHost {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process() {
    // 1. Get all URLs that received clicks
    const urlIds = await this.redisClient.smembers('activeUrls');
    if (!urlIds.length) return;

    for (const urlId of urlIds) {
      // 2. Get clicks for this URL
      const clicks = await this.redisClient.lrange(`clicks:${urlId}`, 0, -1);
      if (!clicks.length) continue;

      // 3. Clear Redis list
      await this.redisClient.del(`clicks:${urlId}`);

      // 4. Parse & bulk insert
      const clickData = clicks.map((c) => JSON.parse(c) as ClickData);
      await this.prisma.click.createMany({ data: clickData });

      // 5. Update URL counters
      const uniqueClicks = await this.redisClient.get(`uniqueCount:${urlId}`);

      if (uniqueClicks) {
        await this.prisma.url.update({
          where: { id: urlId },
          data: {
            totalClicks: Number(uniqueClicks),
          },
        });
      }

      // 6. Reset counters
      await this.redisClient.del(`clickCount:${urlId}`, `uniqueCount:${urlId}`);
    }

    // 7. Clear the active URLs set
    await this.redisClient.del('activeUrls');
  }
}
