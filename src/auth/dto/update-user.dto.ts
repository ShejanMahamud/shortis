import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { Role } from 'generated/prisma';
import { GoogleLoginDto } from './google-login.dto';

export class UpdateUserDto extends PartialType(GoogleLoginDto) {
  @IsEnum(Role)
  @IsOptional()
  role: Role;

  @IsBoolean()
  @IsOptional()
  isActive: boolean;

  @IsString()
  @IsOptional()
  refreshToken: string;

  @IsString()
  @IsOptional()
  profilePicture: string;

  @IsDate()
  @IsOptional()
  refreshTokenExp: Date;

  @IsString()
  @IsOptional()
  accessToken: string;

  @IsDate()
  @IsOptional()
  accessTokenExp: Date;
}
