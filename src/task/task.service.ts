import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';

@Injectable()
export class TaskService {
  constructor(
    @InjectQueue('analytics') private readonly analyticsQueue: Queue,
  ) {}

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
}
