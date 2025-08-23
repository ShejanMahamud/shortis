import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessAuthGuard, RefreshAuthGuard } from './guards';
import { TokenService, UserService } from './services';
import { AccessStrategy } from './strategies/access.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    // Core Services
    AuthService,
    TokenService,
    UserService,

    // Strategies
    GoogleStrategy,
    AccessStrategy,
    RefreshStrategy,

    // Guards
    AccessAuthGuard,
    RefreshAuthGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    UserService,
    AccessAuthGuard,
    RefreshAuthGuard,
  ],
})
export class AuthModule {}
