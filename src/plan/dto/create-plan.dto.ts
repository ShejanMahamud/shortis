import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString
} from 'class-validator';
import { Currency, PlanInterval } from 'generated/prisma';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;

  @IsEnum(PlanInterval)
  @IsNotEmpty()
  interval: PlanInterval;

  @IsBoolean()
  isActive: boolean;

  @IsNumber()
  sortOrder: number;
}
