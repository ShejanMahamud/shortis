import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'User email address from Google',
    example: 'user@gmail.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User full name from Google',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Profile picture URL from Google',
    example: 'https://lh3.googleusercontent.com/a/example-profile-image',
  })
  @IsString()
  @IsNotEmpty()
  profilePicture: string;
}
