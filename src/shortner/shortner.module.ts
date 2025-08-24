import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsService } from './services/analytics.service';
import { ValidationService } from './services/validation.service';
import { ShortnerController } from './shortner.controller';
import { ShortnerService } from './shortner.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShortnerController],
  providers: [ShortnerService, AnalyticsService, ValidationService],
  exports: [ShortnerService, AnalyticsService, ValidationService],
})
export class ShortnerModule {}
