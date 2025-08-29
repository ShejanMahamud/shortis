import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
    const isActiveSubscriptionExist = await this.prisma.subscription.findFirst({
      where: {
        userId: dto.userId,
        status: 'ACTIVE',
      },
    });

    if (isActiveSubscriptionExist) {
      throw new Error('User already has an active subscription');
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        ...dto,
        status: 'ACTIVE',
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
}
