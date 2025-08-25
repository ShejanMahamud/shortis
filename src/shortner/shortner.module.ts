import { Module } from '@nestjs/common';
import { UploadModule } from 'src/upload/upload.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AnalyticsProcessor } from './services/analytics.processor';
import { AnalyticsService } from './services/analytics.service';
import { ValidationService } from './services/validation.service';
import { ShortnerController } from './shortner.controller';
import { ShortnerService } from './shortner.service';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [ShortnerController],
  providers: [
    ShortnerService,
    AnalyticsService,
    ValidationService,
    AnalyticsProcessor,
  ],
  exports: [ShortnerService, AnalyticsService, ValidationService],
})
export class ShortnerModule {}
