import { BullModule } from '@nestjs/bullmq';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    //configure bullmq
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') as string,
          password: config.get<string>('REDIS_PASSWORD') as string,
          port: config.get<number>('REDIS_PORT') as number,
        },
      }),
    }),
    //register uploader queue with default options
    BullModule.registerQueue({
      name: 'uploader',
      defaultJobOptions: {
        removeOnComplete: {
          age: 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 86400,
          count: 100,
        },
        attempts: 3,
        backoff: {
          delay: 3000,
          type: 'exponential',
        },
      },
    }),
  ],
  //export the configured bullmodule
  exports: [BullModule],
})
export class QueueModule {}
