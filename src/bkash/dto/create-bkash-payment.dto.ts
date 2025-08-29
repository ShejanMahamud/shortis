import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBkashPaymentDto {
  @IsString()
  @IsNotEmpty()
  planId: string;
}
