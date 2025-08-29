import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BillingProcessor } from './processors/billing.processor';
import { FeatureUsageService, SubscriptionValidationService } from './services';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'billing',
    }),
  ],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    FeatureUsageService,
    SubscriptionValidationService,
    BillingProcessor,
  ],
  exports: [
    SubscriptionService,
    FeatureUsageService,
    SubscriptionValidationService,
  ],
})
export class SubscriptionModule { }
