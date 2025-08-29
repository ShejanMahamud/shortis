import type { Request } from 'express';
import { IApiResponse } from 'src/interfaces';
import { CreateBkashPaymentDto } from '../dto/create-bkash-payment.dto';
import { RefundBkashDto } from '../dto/refund-bkash.dto';

export interface ICreatePaymentResponse {
  paymentID: string;
  statusCode: string;
  statusMessage: string;
  amount: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
  paymentCreateTime: string;
  transactionStatus: string;
  bkashURL: string;
  callbackURL: string;
  successCallbackURL: string;
  failureCallbackURL: string;
  cancelledCallbackURL: string;
}

export interface IExecutePaymentResponse {
  paymentID: string;
  statusCode: string;
  statusMessage: string;
  transactionStatus: string;
  trxID: string;
  customerMsisdn: string;
  payerReference: string;
  amount: string;
  intent: string;
  currency: string;
  paymentExecuteTime: string;
  merchantInvoiceNumber: string;
}

export interface IVerifyPaymentResponse {
  statusCode: string;
  statusMessage: string;
}

export interface IRefundPaymentResponse {
  originalTrxId: string;
  refundTrxId: string;
  refundTransactionStatus: string;
  originalTrxAmount: string;
  refundAmount: string;
  currency: string;
  completedTime: string;
  sku: string;
  reason: string;
}
export interface RefundTransaction {
  refundTrxId: string;
  refundTransactionStatus: string;
  refundAmount: string;
  completedTime: string;
}
export interface IRefundStatusResponse {
  originalTrxId: string;
  originalTrxAmount: string;
  originalTrxCompletedTime: string;
  refundTransactions: RefundTransaction[];
}

export interface IBkashService {
  createPayment(
    data: CreateBkashPaymentDto,
    req: Request,
  ): Promise<IApiResponse<ICreatePaymentResponse>>;
  bkashCallback(
    paymentID: string,
    status: string,
    planId: string,
    userId: string,
  ): Promise<IApiResponse<IExecutePaymentResponse>>;
  verifyPayment(
    trxID: string,
  ): Promise<IApiResponse<IExecutePaymentResponse | IVerifyPaymentResponse>>;

  refundPayment(
    data: RefundBkashDto,
  ): Promise<IApiResponse<IRefundPaymentResponse>>;

  refundPaymentStatus(
    trxId: string,
    paymentId: string,
  ): Promise<IApiResponse<IRefundStatusResponse>>;
}
