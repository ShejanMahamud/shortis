import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShortnerRepository } from './repositories/shortner.repository';
import { AnalyticsService } from './services/analytics.service';
import { ShortnerController } from './shortner.controller';
import { ShortnerService } from './shortner.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShortnerController],
  providers: [ShortnerService, ShortnerRepository, AnalyticsService],
  exports: [ShortnerService, ShortnerRepository, AnalyticsService],
})
export class ShortnerModule {}
