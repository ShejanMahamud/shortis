import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BkashPayment } from 'bkash-js';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { BkashController } from './bkash.controller';
import { BkashService } from './bkash.service';

@Module({
  imports: [SubscriptionModule],
  controllers: [BkashController],
  providers: [
    BkashService,
    {
      provide: 'BKASH',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isSandboxString = config.get<string>('BKASH_IS_SANDBOX');
        const isSandbox = isSandboxString?.toLowerCase() === 'true';
        return new BkashPayment({
          appKey: config.get<string>('BKASH_APP_KEY') as string,
          appSecret: config.get<string>('BKASH_APP_SECRET') as string,
          username: config.get<string>('BKASH_USERNAME') as string,
          password: config.get<string>('BKASH_PASSWORD') as string,
          isSandbox,
          log: true,
        });
      },
    },
  ],
})
export class BkashModule { }
