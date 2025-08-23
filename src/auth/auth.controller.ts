import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleLoginDto, RefreshTokenDto } from './dto';
import { AccessAuthGuard } from './guards/access.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  public googleAuth(@Req() req: Request, @Res() res: Response) {
    if (req.user) {
      return res.redirect(`${this.config.get('FRONTEND_URL')}/dashboard`);
    }
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
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
  public async me(@Req() req: Request) {
    return this.authService.me(req);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  public async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshTokens(body.rToken);
  }

  @UseGuards(AccessAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  public async logout(@Req() req: Request) {
    const user = req.user as { sub: string };
    return this.authService.logout(user.sub);
  }
}
