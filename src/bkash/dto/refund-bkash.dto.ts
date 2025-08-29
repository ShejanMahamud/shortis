import { IsNotEmpty, IsString } from 'class-validator';

export class RefundBkashDto {
    @IsString()
    @IsNotEmpty()
    paymentId: string;
    @IsString()
    @IsNotEmpty()
    trxId: string;
    @IsString()
    @IsNotEmpty()
    refundAmount: string;
    @IsString()
    @IsNotEmpty()
    sku: string;
    @IsString()
    @IsNotEmpty()
    reason: string;
}
