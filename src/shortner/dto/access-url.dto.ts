import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AccessUrlDto {
  @ApiProperty({
    description: 'Password to access the protected URL',
    example: 'mypassword123',
  })
  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;
}
