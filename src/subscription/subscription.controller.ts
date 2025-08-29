import { Body, Controller, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { IJwtPayload } from 'src/auth/interfaces/auth.interface';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionService } from './subscription.service';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) { }

  private getUserFromRequest(req: Request): IJwtPayload {
    return req.user as IJwtPayload;
  }

  @Post()
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionService.createSubscription(createSubscriptionDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
    @Req() req: Request,
  ) {
    const userId = this.getUserFromRequest(req)?.sub;
    return this.subscriptionService.updateSubscription(
      id,
      updateSubscriptionDto,
      userId,
    );
  }
}
