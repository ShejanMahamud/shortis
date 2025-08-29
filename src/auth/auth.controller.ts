import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Role, Roles } from './decorators';
import { GoogleLoginDto, RefreshTokenDto, UpdateUserDto } from './dto';
import { RefreshAuthGuard, RolesGuard } from './guards';
import { AccessAuthGuard } from './guards/access.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({
    summary: 'Initiate Google OAuth login',
    description: 'Redirects to Google OAuth consent screen for authentication.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Google OAuth consent screen',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many OAuth attempts',
  })
  public googleAuth(@Req() req: Request, @Res() res: Response) {
    if (req?.user as GoogleLoginDto) {
      return res.redirect(`${req.protocol}://${req.get('host')}/v1/api`);
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
  public googleAuthCallback(@Req() req: Request) {
    return this.authService.loginOrCreateUser(req?.user as GoogleLoginDto);
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

  @UseGuards(RefreshAuthGuard)
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

  @UseGuards(AccessAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('sessions/active')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all active sessions (Admin only)',
    description:
      'Retrieve a list of all currently active user sessions. This endpoint requires admin privileges.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Active sessions retrieved' },
        data: {
          type: 'array',
          items: {
            type: 'string',
            example: 'clm1234567890',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  public async getActiveSessions() {
    const sessions = await this.authService.getActiveSessions();
    return {
      success: true,
      message: 'Active sessions retrieved successfully',
      data: sessions,
    };
  }

  @UseGuards(AccessAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('sessions/force-logout/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Force logout a specific user (Admin only)',
    description:
      'Forcefully logout a user by clearing their session and refresh tokens. This endpoint requires admin privileges.',
  })
  @ApiResponse({
    status: 200,
    description: 'User forcefully logged out',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User forcefully logged out' },
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
  public async forceLogout(@Param('userId') userId: string) {
    return this.authService.forceLogout(userId);
  }
}
