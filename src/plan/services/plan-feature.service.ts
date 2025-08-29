import { Injectable } from '@nestjs/common';
import { IApiResponse } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePlanFeatureDto } from '../dto/create-plan-feature.dto';
import { UpdatePlanFeatureDto } from '../dto/update-plan-feature.dto';
import {
  NoFeaturesForPlanException,
  PlanFeatureAlreadyExistsException,
  PlanFeatureNotFoundException,
} from '../exceptions';
import { IPlanFeature, IPlanFeatureService } from '../interfaces';

@Injectable()
export class PlanFeatureService implements IPlanFeatureService {
  constructor(private readonly prisma: PrismaService) {}

  public async createFeature(
    data: CreatePlanFeatureDto,
  ): Promise<IApiResponse<IPlanFeature>> {
    const existingFeature = await this.prisma.planFeature.findUnique({
      where: { planId_key: { planId: data.planId, key: data.key } },
    });
    if (existingFeature) {
      throw new PlanFeatureAlreadyExistsException(data.key);
    }
    const feature = await this.prisma.planFeature.create({ data });
    return {
      success: true,
      message: 'Feature created successfully',
      data: feature,
    };
  }

  public async getFeatureById(
    id: string,
  ): Promise<IApiResponse<IPlanFeature | null>> {
    const feature = await this.prisma.planFeature.findUnique({ where: { id } });
    if (!feature) {
      throw new PlanFeatureNotFoundException(id);
    }
    return {
      success: true,
      message: 'Feature retrieved successfully',
      data: feature,
    };
  }

  public async getFeaturesByPlanId(
    planId: string,
  ): Promise<IApiResponse<IPlanFeature[]>> {
    const features = await this.prisma.planFeature.findMany({
      where: { planId },
    });
    if (!features) {
      throw new NoFeaturesForPlanException(planId);
    }
    return {
      success: true,
      message: 'Features retrieved successfully',
      data: features,
    };
  }

  public async updateFeature(
    id: string,
    data: UpdatePlanFeatureDto,
  ): Promise<IApiResponse<IPlanFeature | null>> {
    const existingFeature = await this.prisma.planFeature.findUnique({
      where: { id },
    });
    if (!existingFeature) {
      throw new PlanFeatureNotFoundException(id);
    }
    const feature = await this.prisma.planFeature.update({
      where: { id },
      data,
    });
    return {
      success: true,
      message: 'Feature updated successfully',
      data: feature,
    };
  }

  public async deleteFeature(id: string): Promise<IApiResponse> {
    const existingFeature = await this.prisma.planFeature.findUnique({
      where: { id },
    });
    if (!existingFeature) {
      throw new PlanFeatureNotFoundException(id);
    }
    await this.prisma.planFeature.delete({ where: { id } });
    return {
      success: true,
      message: 'Feature deleted successfully',
    };
  }
}
