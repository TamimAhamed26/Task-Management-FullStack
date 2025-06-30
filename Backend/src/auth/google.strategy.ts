import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: 'http://localhost:3001/auth/google/callback',
        passReqToCallback: true, // 

      scope: ['email', 'profile'],
    });
    console.log('✅ [GoogleStrategy] Initialized');
    
  }

 async validate(
  request: any, 
  accessToken: string,
  refreshToken: string,
  profile: any,
  done: VerifyCallback,
): Promise<any> {
  console.log('➡️ [GoogleStrategy] Validate method entered...');
  const { name, emails, photos, id } = profile;

  const googleUser = {
    googleId: id,
    email: emails[0].value,
    username: name?.givenName || emails[0].value.split('@')[0],
    avatarUrl: photos[0].value,
  };
  console.log('👤 [GoogleStrategy] Constructed Google User:', googleUser);

  const user = await this.authService.findOrCreateGoogleUser(googleUser);
  console.log('✅ [GoogleStrategy] Service returned user:', user);
console.log('➡️ [GoogleStrategy] Validate method entered...');
console.log('📩 Profile:', profile);
console.log('👤 Constructed googleUser:', googleUser);
console.log('✅ Returning user:', user);
  done(null, user);
}

}
