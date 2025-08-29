import { Injectable } from '@nestjs/common';
import { IApiResponse } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import {
  PlanAlreadyExistsException,
  PlanNotFoundException,
} from './exceptions';
import { IPlan, IPlanService } from './interfaces';

@Injectable()
export class PlanService implements IPlanService {
  constructor(private readonly prisma: PrismaService) { }
  public async createPlan(data: CreatePlanDto): Promise<IApiResponse<IPlan>> {
    const existingPlan = await this.prisma.plan.findUnique({
      where: { name: data.name },
    });
    if (existingPlan) {
      throw new PlanAlreadyExistsException(data.name);
    }
    const plan = await this.prisma.plan.create({ data });
    return {
      success: true,
      message: 'Plan created successfully',
      data: plan,
    };
  }
  public async getPlanById(id: string): Promise<IApiResponse<IPlan | null>> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new PlanNotFoundException(id);
    }
    return {
      success: true,
      message: 'Plan retrieved successfully',
      data: plan,
    };
  }

  public async getAllPlans(): Promise<IApiResponse<IPlan[]>> {
    const plans = await this.prisma.plan.findMany();
    return {
      success: true,
      message: 'Plans retrieved successfully',
      data: plans,
    };
  }

  public async updatePlan(
    id: string,
    data: UpdatePlanDto,
  ): Promise<IApiResponse<IPlan | null>> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new PlanNotFoundException(id);
    }
    const updatedPlan = await this.prisma.plan.update({
      where: { id },
      data,
    });
    return {
      success: true,
      message: 'Plan updated successfully',
      data: updatedPlan,
    };
  }

  public async deletePlan(id: string): Promise<IApiResponse> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) {
      throw new PlanNotFoundException(id);
    }
    await this.prisma.plan.delete({ where: { id } });
    return {
      success: true,
      message: 'Plan deleted successfully',
    };
  }

  public async getFreePlan(): Promise<IPlan | null> {
    return this.prisma.plan.findFirst({
      where: {
        type: 'FREE',
        isActive: true,
      },
      orderBy: {
        createdAt: 'asc', // Get the first free plan created
      },
    });
  }
}
