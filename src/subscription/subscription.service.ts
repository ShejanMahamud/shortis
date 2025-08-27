import { Injectable } from '@nestjs/common';
import { IApiResponse } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ISubscription, ISubscriptionService } from './interfaces';

@Injectable()
export class SubscriptionService implements ISubscriptionService {
  constructor(private readonly prisma: PrismaService) { }
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

    const subscription = await this.prisma.subscription.create({ data: dto });
    return {
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    };
  }
}
