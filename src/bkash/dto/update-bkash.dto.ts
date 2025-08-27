import { PartialType } from '@nestjs/swagger';
import { CreateBkashPaymentDto } from './create-bkash-payment.dto';

export class UpdateBkashDto extends PartialType(CreateBkashPaymentDto) {}
