import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BkashPayment } from 'bkash-js';
import type { Request } from 'express';
import { PaymentMethod } from 'generated/prisma';
import { IJwtPayload } from 'src/auth';
import { IApiResponse } from 'src/interfaces';
import { PrismaService } from 'src/prisma/prisma.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { Util } from 'src/utils/util';
import { CreateBkashPaymentDto } from './dto/create-bkash-payment.dto';
import { RefundBkashDto } from './dto/refund-bkash.dto';
import {
  IBkashService,
  ICreatePaymentResponse,
  IExecutePaymentResponse,
  IRefundPaymentResponse,
  IRefundStatusResponse,
} from './interfaces';

@Injectable()
export class BkashService implements IBkashService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('BKASH') private readonly bkashPayment: BkashPayment,
    private readonly config: ConfigService,
    private readonly subscription: SubscriptionService,
  ) { }

  public async createPayment(
    data: CreateBkashPaymentDto,
    req: Request,
  ): Promise<IApiResponse<ICreatePaymentResponse>> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: data.planId },
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    const userId = (req.user as IJwtPayload).sub;
    const paymentData = {
      ...data,
      planId: plan.id,
      amount: plan.price.toString(),
      intent: 'sale',
      currency: 'BDT',
      payerReference: 'dev.shejanmahamud@gmail.com',
      merchantInvoiceNumber: `TX-${Util.generateRandomString(12)}`,

      callbackURL: `${this.config.get<string>('BKASH_CALLBACK_URL') as string}?planId=${plan.id}&userId=${userId}`,
    };
    const payment = await this.bkashPayment.createPayment(paymentData);

    return {
      success: true,
      message: 'Payment created successfully',
      data: payment,
    };
  }

  public async bkashCallback(
    paymentID: string,
    status: string,
    planId: string,
    userId: string,
  ): Promise<IApiResponse<IExecutePaymentResponse>> {
    if (status === 'success') {
      const res = await this.bkashPayment.executePayment(paymentID);
      const currentPeriodStart = new Date();
      const currentPeriodEnd = new Date(
        new Date().setMonth(currentPeriodStart.getMonth() + 1),
      );
      if (res.transactionStatus === 'Completed') {
        const data = {
          planId: planId,
          userId: userId,
          currentPeriodStart,
          currentPeriodEnd,
          paymentMethod: 'BKASH' as PaymentMethod,
        };
        const subscription = await this.subscription.createSubscription(data);
        console.log(
          'Payment successful and subscription created.',
          subscription,
        );

        const paymentHistory = await this.prisma.paymentHistory.create({
          data: {
            userId: userId,
            paymentMethod: 'BKASH',
            subscriptionId: subscription.data?.id,
            amount: parseFloat(res.amount),
            currency: 'BDT',
            bkashPaymentId: paymentID,
            description: 'This is a BKASH payment',
            status: 'SUCCEEDED',
            paidAt: new Date(),
          },
        });
        console.log('Payment history created successfully.', paymentHistory);
      }
    }
    if (status === 'failure') {
      console.log('Payment failed or cancelled by user.', paymentID);
    }
    if (status === 'cancel') {
      console.log('Payment cancelled by user.', paymentID);
    }
    return {
      success: true,
      message: 'Callback processed successfully',
    };
  }

  public async verifyPayment(paymentID: string): Promise<IApiResponse> {
    const res = await this.bkashPayment.verifyPayment(paymentID);
    return {
      success: true,
      message: 'Payment verified successfully',
      data: res,
    };
  }

  public async refundPayment(
    data: RefundBkashDto,
  ): Promise<IApiResponse<IRefundPaymentResponse>> {
    const res = await this.bkashPayment.refundPayment(data);
    return {
      success: true,
      message: 'Payment refunded successfully',
      data: res,
    };
  }
  async refundPaymentStatus(
    trxId: string,
    paymentId: string,
  ): Promise<IApiResponse<IRefundStatusResponse>> {
    const res = await this.bkashPayment.checkRefundStatus({
      trxId,
      paymentId,
    });
    return {
      success: true,
      message: 'Refund payment status fetched successfully',
      data: res,
    };
  }

  async queryPaymentStatus(paymentID: string): Promise<IApiResponse> {
    const res = await this.bkashPayment.queryPayment(paymentID);
    return {
      success: true,
      message: 'Payment status fetched successfully',
      data: res,
    };
  }
}
