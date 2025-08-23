import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IJwtPayload } from '../interfaces/auth.interface';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'refresh') {
  constructor(private readonly config: ConfigService) {
    super({
      secretOrKey: config.get<string>('REFRESH_TOKEN_SECRET') as string,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      passReqToCallback: true,
    });
  }

  validate(payload: IJwtPayload): IJwtPayload {
    return payload;
  }
}
