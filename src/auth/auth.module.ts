import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessAuthGuard, RefreshAuthGuard } from './guards';
import { TokenService, UserService } from './services';
import { AccessStrategy, GoogleStrategy, RefreshStrategy } from './strategies';
import { UserManagementController } from './user-management.controller';

@Module({
  imports: [JwtModule.register({}), SubscriptionModule],
  controllers: [AuthController, UserManagementController],
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
export class AuthModule { }
