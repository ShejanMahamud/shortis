import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsDateString,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    Min,
    MinLength,
} from 'class-validator';

export class CreateShortnerDto {
  @ApiProperty({
    description: 'The original URL to be shortened',
    example: 'https://www.example.com/very-long-url-path',
  })
  @IsUrl({}, { message: 'Original URL must be a valid URL' })
  @IsString()
  originalUrl: string;

  @ApiPropertyOptional({
    description: 'Custom slug for the shortened URL (optional)',
    example: 'my-custom-link',
    minLength: 3,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Custom slug must be at least 3 characters long' })
  @MaxLength(50, { message: 'Custom slug cannot exceed 50 characters' })
  @Transform(
    ({ value }: { value: string }) =>
      value?.toLowerCase().replace(/[^a-z0-9-]/g, '') || value,
  )
  customSlug?: string;

  @ApiPropertyOptional({
    description: 'Title for the shortened URL',
    example: 'My Awesome Website',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title?: string;

  @ApiPropertyOptional({
    description: 'Description for the shortened URL',
    example: 'This is a description of my awesome website',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Password protection for the URL',
    minLength: 4,
  })
  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'Password must be at least 4 characters long' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Expiration date for the URL (ISO string)',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Expiration date must be a valid ISO date string' },
  )
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Custom domain for the shortened URL',
    example: 'short.mydomain.com',
  })
  @IsOptional()
  @IsString()
  customDomain?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of clicks allowed',
    example: 1000,
    minimum: 1,
  })
  @IsOptional()
  @IsInt({ message: 'Click limit must be an integer' })
  @Min(1, { message: 'Click limit must be at least 1' })
  clickLimit?: number;

  @ApiPropertyOptional({
    description: 'Whether the URL is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
