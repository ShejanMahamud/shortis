import { IApiResponse } from 'src/interfaces';
import { CreatePlanFeatureDto } from '../dto/create-plan-feature.dto';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanFeatureDto } from '../dto/update-plan-feature.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';

export interface IPlan {
  id: string;
  name: string;
  description: string;
  stripePriceId: string | null;
  stripeProductId: string | null;
  price: number;
  currency: string;
  interval: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlanFeature {
  id: string;
  planId: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPlanService {
  createPlan(data: CreatePlanDto): Promise<IApiResponse<IPlan>>;
  getPlanById(id: string): Promise<IApiResponse<IPlan | null>>;
  getAllPlans(): Promise<IApiResponse<IPlan[]>>;
  updatePlan(
    id: string,
    data: UpdatePlanDto,
  ): Promise<IApiResponse<IPlan | null>>;
  deletePlan(id: string): Promise<IApiResponse>;
}

export interface IPlanFeatureService {
  createFeature(
    data: CreatePlanFeatureDto,
  ): Promise<IApiResponse<IPlanFeature>>;
  getFeaturesByPlanId(planId: string): Promise<IApiResponse<IPlanFeature[]>>;
  getFeatureById(id: string): Promise<IApiResponse<IPlanFeature | null>>;
  deleteFeature(id: string): Promise<IApiResponse>;
  updateFeature(
    id: string,
    data: UpdatePlanFeatureDto,
  ): Promise<IApiResponse<IPlanFeature | null>>;
}
