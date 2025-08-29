import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionService.findASubscription(id);
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query('limit', ParseIntPipe, new DefaultValuePipe(10)) limit: number,
    @Query('cursor') cursor?: string,
  ) {
    const userId = this.getUserFromRequest(req)?.sub;
    return this.subscriptionService.getAllSubscription(limit, cursor, userId);
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
