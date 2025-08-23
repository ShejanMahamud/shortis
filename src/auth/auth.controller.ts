import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleLoginDto, RefreshTokenDto, UpdateUserDto } from './dto';
import { AccessAuthGuard } from './guards/access.guard';

@ApiTags('Authentication & User Management')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Google OAuth consent screen',
  })
  @ApiExcludeEndpoint() // This is typically not shown in Swagger as it's a redirect
  public googleAuth(@Req() req: Request, @Res() res: Response) {
    if (req.user) {
      return res.redirect(`${this.config.get('FRONTEND_URL')}/dashboard`);
    }
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Google OAuth callback handler' })
  @ApiResponse({
    status: 200,
    description:
      'Successfully authenticated via Google and redirected with tokens',
  })
  @ApiResponse({
    status: 400,
    description: 'Authentication failed',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many authentication attempts',
  })
  @ApiExcludeEndpoint() // This is typically not shown in Swagger as it's handled by Google
  public async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const { data } = await this.authService.loginOrCreateUser(
      req?.user as GoogleLoginDto,
    );
    return res.redirect(
      `${this.config.get('FRONTEND_URL')}/auth/callback?accessToken=${data?.accessToken}&refreshToken=${data?.refreshToken}`,
    );
  }

  @UseGuards(AccessAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User found' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'clm1234567890' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            role: {
              type: 'string',
              enum: ['USER', 'ADMIN', 'PREMIUM'],
              example: 'USER',
            },
            profilePicture: {
              type: 'string',
              example: 'https://example.com/avatar.jpg',
            },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  public async me(@Req() req: Request) {
    return this.authService.me(req);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    description: 'Refresh token request',
    type: RefreshTokenDto,
    examples: {
      example1: {
        summary: 'Refresh token example',
        value: {
          rToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Tokens refreshed successfully' },
        data: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            refreshToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid refresh token format',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token expired or invalid',
  })
  public async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body.rToken);
  }

  @UseGuards(AccessAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and invalidate refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Logout successful' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  public async logout(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.authService.logout(user.sub);
  }

  @UseGuards(AccessAuthGuard)
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({
    description: 'User profile update data',
    type: UpdateUserDto,
    examples: {
      example1: {
        summary: 'Update profile example',
        value: {
          name: 'Updated Name',
          profilePicture: 'https://example.com/new-avatar.jpg',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN', 'PREMIUM'] },
            profilePicture: { type: 'string' },
            isActive: { type: 'boolean' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  public async updateProfile(
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request,
  ) {
    const user = req.user as { sub: string };
    return this.authService.updateUser(user.sub, updateUserDto);
  }
}
