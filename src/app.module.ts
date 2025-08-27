import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { ShortnerModule } from './shortner/shortner.module';
import { TaskModule } from './task/task.module';
import { PlanModule } from './plan/plan.module';
import { BkashModule } from './bkash/bkash.module';
import { SubscriptionModule } from './subscription/subscription.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CacheModule.register({
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
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
