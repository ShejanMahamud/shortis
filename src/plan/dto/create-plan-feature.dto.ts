import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePlanFeatureDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}
