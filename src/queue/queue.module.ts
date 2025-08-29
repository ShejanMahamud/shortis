import { BullModule } from '@nestjs/bullmq';
import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq/dist/esm/classes/queue';

// Define a unique token for the Redis client
export const REDIS_CLIENT = 'REDIS_CLIENT';

// Custom provider to expose the BullMQ's Redis client
const redisClientProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: ['BullQueue_uploader'],
  useFactory: (uploaderQueue: Queue) => {
    return uploaderQueue.client;
  },
};

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
    BullModule.registerQueue(
      {
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
      },
      {
        name: 'analytics',
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
      },

      {
        name: 'billing',
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
      },
    ),
  ],
  providers: [redisClientProvider],
  exports: [BullModule, REDIS_CLIENT],
})
export class QueueModule { }
