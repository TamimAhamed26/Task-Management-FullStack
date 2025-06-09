import {
  Injectable,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('JWT_BLACKLIST') private readonly jwtBlacklist: Set<string>,
  ) {
super({
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(), 
    (req: Request) => req.cookies?.accessToken || null, 
  ]),
  secretOrKey: 'mysecretkey',
  passReqToCallback: true,
});

  }

async validate(req: Request, payload: any) {

  let token = req.headers.authorization?.replace('Bearer ', '');

  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  console.log('--- [JWT STRATEGY] ---');
  console.log('Token received:', token);
  console.log('Payload:', payload);
  console.log('Token expiration (UNIX):', payload.exp);
  console.log('Token expiration (Local):', new Date(payload.exp * 1000));

  if (token && this.jwtBlacklist.has(token)) {
    console.log('❌ Token is blacklisted');
    throw new UnauthorizedException('Token is blacklisted');
  }

  console.log('✅ Token passed blacklist check');

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  };
}
}