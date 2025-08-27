import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsEnum, IsOptional } from 'class-validator';
import { SubscriptionStatus } from 'generated/prisma';
import { CreateSubscriptionDto } from './create-subscription.dto';

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {
    @IsEnum(SubscriptionStatus)
    @IsOptional()
    status: SubscriptionStatus;

    @IsBoolean()
    @IsOptional()
    cancelAtPeriodEnd: boolean;

    @IsDate()
    @IsOptional()
    canceledAt?: Date;
}
