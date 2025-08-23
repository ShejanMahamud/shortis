import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from 'generated/prisma';
import { InvalidTokenException } from '../exceptions';
import {
    IJwtPayload,
    ITokenPair,
    ITokenService,
} from '../interfaces/auth.interface';

@Injectable()
export class TokenService implements ITokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenSecret = this.getEnvVar('ACCESS_TOKEN_SECRET');
    this.refreshTokenSecret = this.getEnvVar('REFRESH_TOKEN_SECRET');
    this.accessTokenExpiresIn = this.getEnvVar('ACCESS_TOKEN_EXPIRES_IN');
    this.refreshTokenExpiresIn = this.getEnvVar('REFRESH_TOKEN_EXPIRES_IN');
  }

  generateTokens(user: User): ITokenPair {
    try {
      const payload: IJwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role as string,
      };

      const [accessToken, refreshToken] = [
        this.generateAccessToken(payload),
        this.generateRefreshToken(payload),
      ];

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Failed to generate tokens', error);
      throw new Error('Token generation failed');
    }
  }

  async verifyAccessToken(token: string): Promise<IJwtPayload> {
    try {
      return this.jwtService.verify(token, {
        secret: this.accessTokenSecret,
      });
    } catch (error) {
      this.logger.warn(
        'Access token verification failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new InvalidTokenException('Invalid access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<IJwtPayload> {
    try {
      return this.jwtService.verify(token, {
        secret: this.refreshTokenSecret,
      });
    } catch (error) {
      this.logger.warn(
        'Refresh token verification failed',
        error instanceof Error ? error.message : 'Unknown error',
      );
      throw new InvalidTokenException('Invalid refresh token');
    }
  }

  private generateAccessToken(payload: IJwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.accessTokenSecret,
      expiresIn: this.accessTokenExpiresIn,
    });
  }

  private generateRefreshToken(payload: IJwtPayload): string {
    return this.jwtService.sign(payload, {
      secret: this.refreshTokenSecret,
      expiresIn: this.refreshTokenExpiresIn,
    });
  }

  private getEnvVar(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Environment variable ${key} is not configured`);
    }
    return value;
  }
}
