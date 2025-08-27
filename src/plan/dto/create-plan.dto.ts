import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Currency, PlanInterval } from 'generated/prisma';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  stripePriceId?: string | null;

  @IsString()
  @IsOptional()
  stripeProductId?: string | null;

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

/*
model Plan {
  id              String       @id @default(uuid())
  name            String       @unique 
  description     String?
  stripePriceId   String?      @unique
  stripeProductId String?      @unique 
  price           Float        @default(0) 
  currency        Currency     @default(USD)
  interval        PlanInterval 
  features        Json
  isActive        Boolean      @default(true)
  sortOrder       Int          @default(0) 
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  subscriptions Subscription[]

  @@index([isActive])
  @@index([stripePriceId])
  @@map("plans")
}
*/
