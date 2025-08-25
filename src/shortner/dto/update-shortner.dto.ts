import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateShortnerDto } from './create-shortner.dto';

export class UpdateShortnerDto extends PartialType(CreateShortnerDto) {
  @IsString()
  @IsOptional()
  qrCode?: string;
}
