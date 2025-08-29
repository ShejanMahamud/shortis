import {
    IsDate,
    IsEnum,
    IsNotEmpty,
    IsString
} from 'class-validator';
import { PaymentMethod } from 'generated/prisma';

export class CreateSubscriptionDto {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsNotEmpty()
    planId: string;

    @IsDate()
    @IsNotEmpty()
    currentPeriodStart: Date;

    @IsDate()
    @IsNotEmpty()
    currentPeriodEnd: Date;

    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod: PaymentMethod;
}
