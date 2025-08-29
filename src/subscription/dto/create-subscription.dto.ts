import {
    IsDate,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
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

    @IsString()
    @IsOptional()
    stripeSubscriptionId?: string;

    @IsString()
    @IsOptional()
    stripeCustomerId?: string;

    @IsEnum(PaymentMethod)
    @IsNotEmpty()
    paymentMethod: PaymentMethod;
}
