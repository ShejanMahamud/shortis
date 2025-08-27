import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TaskService {
  constructor(
    @InjectQueue('analytics') private readonly analyticsQueue: Queue,
    private readonly prisma: PrismaService,
  ) { }

  //added cron job which will run every 30 seconds
  @Cron(CronExpression.EVERY_30_SECONDS, {
    name: 'click-analytics-flush',
    timeZone: 'Asia/Dhaka',
  })
  //run flush
  public async flushClickAnalytics() {
    try {
      await this.analyticsQueue.add('flush-clicks', {});
    } catch (error) {
      console.error('Error adding job to queue:', error);
    }
  }

  //added cron job which will run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'inactive-expired-subscription',
    timeZone: 'Asia/Dhaka',
  })
  //run flush
  public async expireInactiveSubscriptions() {
    try {
      await this.prisma.subscription.updateMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: {
            lte: new Date(),
          },
        },
        data: {
          status: 'PAUSED',
        },
      });
    } catch (error) {
      console.error('Error expiring inactive subscriptions:', error);
    }
  }
}
