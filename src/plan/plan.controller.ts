import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreatePlanFeatureDto } from './dto/create-plan-feature.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanFeatureDto } from './dto/update-plan-feature.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanService } from './plan.service';
import { PlanFeatureService } from './services/plan-feature.service';

// @UseGuards(AccessAuthGuard, RolesGuard)
// @Roles(Role.ADMIN)
@Controller('plan')
export class PlanController {
  constructor(
    private readonly planService: PlanService,
    private readonly planFeatureService: PlanFeatureService,
  ) {}

  @Post()
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.planService.createPlan(createPlanDto);
  }

  @Get()
  findAll() {
    return this.planService.getAllPlans();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planService.getPlanById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.planService.updatePlan(id, updatePlanDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planService.deletePlan(id);
  }

  @Post('features')
  createFeature(@Body() createFeatureDto: CreatePlanFeatureDto) {
    return this.planFeatureService.createFeature(createFeatureDto);
  }

  @Get('features/:planId')
  getFeaturesByPlanId(@Param('planId') planId: string) {
    return this.planFeatureService.getFeaturesByPlanId(planId);
  }

  @Get('features/:id')
  getFeatureById(@Param('id') id: string) {
    return this.planFeatureService.getFeatureById(id);
  }

  @Patch('features/:id')
  updateFeature(
    @Param('id') id: string,
    @Body() updateFeatureDto: UpdatePlanFeatureDto,
  ) {
    return this.planFeatureService.updateFeature(id, updateFeatureDto);
  }

  @Delete('features/:id')
  deleteFeature(@Param('id') id: string) {
    return this.planFeatureService.deleteFeature(id);
  }
}
