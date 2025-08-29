import { PaymentMethod, SubscriptionStatus } from 'generated/prisma';
import { IApiResponse } from 'src/interfaces';
import { IPlanFeature } from 'src/plan/interfaces';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';

export interface ISubscription {
    id: string;
    userId: string;
    planId: string;
    status: SubscriptionStatus;
    paymentMethod: PaymentMethod;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    plan?: {
        PlanFeature: IPlanFeature[];
    } | null;
}

export interface ISubscriptionService {
    createSubscription(
        dto: CreateSubscriptionDto,
    ): Promise<IApiResponse<ISubscription>>;
    updateSubscription(
        id: string,
        dto: UpdateSubscriptionDto,
        userId: string,
    ): Promise<IApiResponse<ISubscription>>;
    // getSubscription(id: string): Promise<Subscription>;
    // cancelSubscription(id: string): Promise<void>;
}
