import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AccessAuthGuard } from 'src/auth';
import { BkashService } from './bkash.service';
import { CreateBkashPaymentDto } from './dto/create-bkash-payment.dto';
import { RefundBkashDto } from './dto/refund-bkash.dto';

@Controller('bkash')
export class BkashController {
  constructor(private readonly bkashService: BkashService) { }

  @Post()
  @UseGuards(AccessAuthGuard)
  create(@Body() createBkashDto: CreateBkashPaymentDto, @Req() req: Request) {
    return this.bkashService.createPayment(createBkashDto, req);
  }

  @Get('callback')
  callback(
    @Query()
    callbackDto: {
      paymentID: string;
      status: string;
      planId: string;
      userId: string;
    },
  ) {
    return this.bkashService.bkashCallback(
      callbackDto.paymentID,
      callbackDto.status,
      callbackDto.planId,
      callbackDto.userId,
    );
  }

  @Get('verify')
  @UseGuards(AccessAuthGuard)
  verify(@Query('paymentID') paymentID: string) {
    return this.bkashService.verifyPayment(paymentID);
  }

  @Post('refund')
  @UseGuards(AccessAuthGuard)
  refund(@Body() refundDto: RefundBkashDto) {
    return this.bkashService.refundPayment(refundDto);
  }

  @Get('refund/status')
  @UseGuards(AccessAuthGuard)
  refundStatus(
    @Query('trxId') trxId: string,
    @Query('paymentId') paymentId: string,
  ) {
    return this.bkashService.refundPaymentStatus(trxId, paymentId);
  }

  @Get('query')
  @UseGuards(AccessAuthGuard)
  queryPaymentStatus(@Query('paymentID') paymentID: string) {
    return this.bkashService.queryPaymentStatus(paymentID);
  }
}
