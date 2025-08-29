import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'generated/prisma/wasm';
import Redis from 'ioredis';
import { IApiResponse } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { REDIS_CLIENT } from 'src/queue/queue.module';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ISubscription, ISubscriptionService } from './interfaces';

@Injectable()
export class SubscriptionService implements ISubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
  ) { }
  async createSubscription(
    dto: CreateSubscriptionDto,
  ): Promise<IApiResponse<ISubscription>> {
    // Check for existing active subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId: dto.userId,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });

    // If user has an active subscription, check if it's an upgrade scenario
    if (existingSubscription) {
      // Get the new plan details
      const newPlan = await this.prisma.plan.findUnique({
        where: { id: dto.planId },
      });

      if (!newPlan) {
        throw new Error('Plan not found');
      }

      // Allow upgrade from FREE to PAID plan
      if (
        existingSubscription.plan.type === 'FREE' &&
        newPlan.type === 'PAID'
      ) {
        // Cancel the existing free subscription
        await this.prisma.subscription.update({
          where: { id: existingSubscription.id },
          data: {
            status: 'CANCELED',
            canceledAt: new Date(),
          },
        });

        // Clear cache for the user
        await this.redisClient.del(`active_subscription:${dto.userId}`);
      } else {
        throw new Error(
          'User already has an active subscription of the same or higher tier',
        );
      }
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        ...dto,
        status: 'ACTIVE',
      },
      include: {
        plan: {
          include: {
            PlanFeature: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    };
  }

  public async findASubscription(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
    });
    return {
      success: true,
      message: 'Subscription retrieved successfully',
      data: subscription,
    };
  }

  public async updateSubscription(
    id: string,
    dto: UpdateSubscriptionDto,
    userId: string,
  ): Promise<IApiResponse<ISubscription>> {
    const isExist = await this.findASubscription(id);
    if (!isExist) {
      throw new NotFoundException('Subscription not found');
    }
    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: dto,
    });
    await this.redisClient.del(`active_subscription:${userId}`);

    return {
      success: true,
      message: 'Subscription updated successfully',
      data: subscription,
    };
  }

  public async autoSubscribeToFreePlan(
    userId: string,
  ): Promise<IApiResponse<ISubscription> | null> {
    try {
      // Check if user already has an active subscription
      const existingSubscription = await this.prisma.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
      });

      if (existingSubscription) {
        return null; // User already has a subscription
      }

      // Find the free plan
      const freePlan = await this.prisma.plan.findFirst({
        where: {
          type: 'FREE',
          isActive: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (!freePlan) {
        throw new NotFoundException('No free plan available');
      }

      // Create subscription for the free plan
      const now = new Date();
      const oneYear = new Date();
      oneYear.setFullYear(now.getFullYear() + 1);

      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          planId: freePlan.id,
          status: 'ACTIVE',
          paymentMethod: 'BKASH', // Default payment method
          currentPeriodStart: now,
          currentPeriodEnd: oneYear, // Free plan lasts 1 year
        },
        include: {
          plan: {
            include: {
              PlanFeature: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'User automatically subscribed to free plan',
        data: subscription,
      };
    } catch (error) {
      console.error('Failed to auto-subscribe user to free plan:', error);
      throw error;
    }
  }

  public async upgradeSubscription(
    userId: string,
    newPlanId: string,
    paymentMethod: 'BKASH' = 'BKASH',
  ): Promise<IApiResponse<ISubscription>> {
    try {
      // Get current active subscription
      const currentSubscription = await this.prisma.subscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          plan: true,
        },
      });

      if (!currentSubscription) {
        throw new Error('No active subscription found for user');
      }

      // Get the new plan
      const newPlan = await this.prisma.plan.findUnique({
        where: { id: newPlanId },
      });

      if (!newPlan) {
        throw new Error('New plan not found');
      }

      // Only allow upgrade from FREE to PAID
      if (currentSubscription.plan.type === 'FREE' && newPlan.type === 'PAID') {
        // Cancel current subscription
        await this.prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            status: 'CANCELED',
            canceledAt: new Date(),
          },
        });

        // Create new subscription
        const now = new Date();
        const periodEnd = new Date();

        // Set period based on plan interval
        switch (newPlan.interval) {
          case 'MONTH':
            periodEnd.setMonth(now.getMonth() + 1);
            break;
          case 'YEAR':
            periodEnd.setFullYear(now.getFullYear() + 1);
            break;
        }

        const newSubscription = await this.prisma.subscription.create({
          data: {
            userId,
            planId: newPlanId,
            status: 'ACTIVE',
            paymentMethod,
            currentPeriodStart: now,
            currentPeriodEnd: periodEnd,
          },
          include: {
            plan: {
              include: {
                PlanFeature: true,
              },
            },
          },
        });

        // Clear cache
        await this.redisClient.del(`active_subscription:${userId}`);

        return {
          success: true,
          message: 'Subscription upgraded successfully',
          data: newSubscription,
        };
      } else if (
        currentSubscription.plan.type === 'PAID' &&
        newPlan.type === 'PAID'
      ) {
        // Handle paid to paid upgrade (same tier or different features)
        const updatedSubscription = await this.prisma.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            planId: newPlanId,
          },
          include: {
            plan: {
              include: {
                PlanFeature: true,
              },
            },
          },
        });

        // Clear cache
        await this.redisClient.del(`active_subscription:${userId}`);

        return {
          success: true,
          message: 'Subscription plan updated successfully',
          data: updatedSubscription,
        };
      } else {
        throw new Error('Invalid upgrade path');
      }
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
      throw error;
    }
  }

  public async getAllSubscription(
    limit: number,
    cursor?: string,
    userId?: string,
  ): Promise<
    IApiResponse<
      ISubscription[],
      {
        limit: number;
        count: number;
        hasNextPage: boolean;
        nextCursor: string;
      }
    >
  > {
    try {
      const queryOptions: Prisma.SubscriptionFindManyArgs = {
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        ...(userId && {
          where: {
            userId,
          },
        }),
        ...(cursor && {
          skip: 1,
          cursor: {
            id: cursor,
          },
        }),
      };
      const subscriptions =
        await this.prisma.subscription.findMany(queryOptions);
      const hasNextPage = subscriptions.length === limit;
      const nextCursor = hasNextPage
        ? subscriptions[subscriptions.length - 1].id
        : null;
      return {
        success: true,
        data: subscriptions,
        meta: {
          limit,
          count: subscriptions.length,
          hasNextPage,
          nextCursor,
        },
      };
    } catch (error) {
      console.error('Failed to get all subscriptions:', error);
      throw error;
    }
  }

  public async cancelSubscription(id: string, userId: string) {
    try {
      await this.prisma.subscription.update({
        where: {
          id,
          userId,
          status: 'ACTIVE',
          currentPeriodEnd: { gte: new Date() },
          currentPeriodStart: { lte: new Date() },
        },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
        },
      });
      return {
        success: true,
        message: 'Subscription canceled successfully',
      };
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }

  public async deleteSubscription(id: string) {
    try {
      await this.prisma.subscription.delete({
        where: { id },
      });
      return {
        success: true,
        message: 'Subscription deleted successfully',
      };
    } catch (error) {
      console.error('Failed to delete subscription:', error);
      throw error;
    }
  }
}
