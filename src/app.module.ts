import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { BkashModule } from './bkash/bkash.module';
import { CacheModule } from './cache/cache.module';
import { PlanModule } from './plan/plan.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { ShortnerModule } from './shortner/shortner.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { TaskModule } from './task/task.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    NestCacheModule.register({
      isGlobal: true,
    }),
    TaskModule,
    PrismaModule,
    AuthModule,
    ShortnerModule,
    QueueModule,
    PlanModule,
    BkashModule,
    SubscriptionModule,
    CacheModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule { }
