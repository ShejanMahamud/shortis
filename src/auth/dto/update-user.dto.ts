import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional({
    description: 'User role in the system',
    enum: Role,
    example: Role.USER,
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    description: 'Whether the user account is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Hashed refresh token (internal use)',
    example: '$2b$10$example.hashed.refresh.token',
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Updated profile picture URL',
    example: 'https://example.com/new-profile-picture.jpg',
  })
  @IsString()
  @IsOptional()
  profilePicture?: string;

  @ApiPropertyOptional({
    description: 'Refresh token expiration date (internal use)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsDate()
  @IsOptional()
  refreshTokenExp?: Date;

  @ApiPropertyOptional({
    description: 'Access token (internal use)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'Access token expiration date (internal use)',
    example: '2024-08-23T23:59:59.000Z',
  })
  @IsDate()
  @IsOptional()
  accessTokenExp?: Date;
}
