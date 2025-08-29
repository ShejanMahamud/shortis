import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { PlanFeatureService } from './services/plan-feature.service';

@Module({
  imports: [PrismaModule],
  controllers: [PlanController],
  providers: [PlanService, PlanFeatureService],
  exports: [PlanService, PlanFeatureService],
})
export class PlanModule {}
