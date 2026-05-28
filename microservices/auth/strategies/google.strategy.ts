import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly enabled: boolean;

  constructor() {
    const clientID = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL =
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3101/auth/google/callback';

    // `super(...)` must be the first statement (ts-node/TS restriction for derived classes).
    super({
      clientID: clientID || 'DISABLED',
      clientSecret: clientSecret || 'DISABLED',
      callbackURL,
      scope: ['email', 'profile'],
    });

    this.enabled = Boolean(clientID && clientSecret);
    if (!this.enabled) {
      this.logger.warn(
        'Google OAuth is disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.',
      );
    }
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: Function) {
    const { id, emails, name, photos } = profile;
    
    const user = {
      provider: 'google',
      providerId: id,
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      avatar: photos[0].value,
    };

    done(null, user);
  }
}
