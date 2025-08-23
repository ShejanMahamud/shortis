import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID') as string,
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') as string,
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL') as string,
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { name, emails, photos } = profile;

    const user = {
      email: emails?.[0]?.value,
      username: this.generateSafeUsername(name?.givenName, name?.familyName),
      name: name?.givenName || name?.familyName || name?.middleName || 'User',
      profilePicture: photos?.[0]?.value,
    };

    done(null, user);
  }

  private generateSafeUsername(
    givenName?: string,
    familyName?: string,
  ): string {
    const firstName =
      givenName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
    const lastName = familyName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const timestamp = Date.now().toString().slice(-4);

    return lastName
      ? `${firstName}_${lastName}_${timestamp}`
      : `${firstName}_${timestamp}`;
  }
}
