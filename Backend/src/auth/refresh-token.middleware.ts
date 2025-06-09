import {
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Token, TokenType } from '../entities/token.entity';
import { User } from '../entities/user.entity';
import { AuthService } from './auth.service';

declare module 'express-serve-static-core' {
  interface Request {
    tokenStatus?: 'refreshed' | 'expired';
    newAccessToken?: string;
  }
}

@Injectable()
export class RefreshTokenMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(Token) private tokenRepo: Repository<Token>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private readonly authService: AuthService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    let accessToken: string | undefined;

    if (!authHeader) {
      accessToken = req.cookies?.['accessToken'];
      console.log('No Authorization header, checking accessToken in cookies:', accessToken);
    } else {
      accessToken = authHeader.split(' ')[1];
      console.log('Authorization header found, access token:', accessToken);
    }

    if (!accessToken) {
      console.log('No access token provided from header or cookies.');
      return next();
    }

    try {
      const decoded = this.jwtService.verify(accessToken, {
        secret: 'mysecretkey',
        ignoreExpiration: true,
      });

      console.log('Access token decoded:', decoded);

      const user = await this.userRepo.findOne({
        where: { id: decoded.sub },
        relations: ['role', 'tokens'],
      });

      if (!user) {
        console.log('No user found for token sub');
        return next();
      }

      const tokenInDb = user.tokens.find(
        t => t.token === accessToken && t.type === TokenType.ACCESS,
      );

      if (!tokenInDb) {
        console.log('Token not found in DB for user:', user.id);
        return next();
      }

      const now = Date.now();
      const lastActive = user.lastActiveAt?.getTime() ?? 0;
      const tokenExp = decoded.exp * 1000;

      const rememberMe = req.cookies?.rememberMe === 'true';
      const sessionExpired = !rememberMe && now - lastActive > 15 * 60 * 1000;
      const isNearExpiry = tokenExp - now <= 60 * 1000;

      console.log(`Now: ${new Date(now).toISOString()}`);
      console.log(`Token expiry: ${new Date(tokenExp).toISOString()}`);
      console.log(`Last active: ${new Date(lastActive).toISOString()}`);
      console.log('Session expired:', sessionExpired);
      console.log('Token near expiry:', isNearExpiry);

      if (sessionExpired) {
        console.log('Session expired, logging out user...');

        await this.authService.logout(user.id, accessToken, res);
        await this.tokenRepo.remove(tokenInDb);

        req.tokenStatus = 'expired';
        return next();
      }

      if (isNearExpiry) {
        console.log('Token near expiry, refreshing token...');

        const newToken = this.jwtService.sign(
          {
            sub: user.id,
            email: user.email,
            role: user.role?.name,
          },
          {
            secret: 'mysecretkey',
            expiresIn: '30m',
          },
        );

       const newTokenEntity = this.tokenRepo.create({
  token: newToken,
  type: TokenType.ACCESS,
  user: { id: user.id }, 
});
console.log('New Token Entity (before save):', newTokenEntity);
console.log('Associated User IDd', newTokenEntity.user?.id);

        await this.tokenRepo.save(newTokenEntity);
        await this.tokenRepo.remove(tokenInDb);

        res.cookie('accessToken', newToken, {
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 30 * 60 * 1000,
        });

        res.setHeader('x-access-token', newToken);
        console.log('New token set in x-access-token header');
        console.log('New token:', newToken);

        req.tokenStatus = 'refreshed';
        req.newAccessToken = newToken;
      }

      user.lastActiveAt = new Date();
      await this.userRepo.save(user);

      console.log('Updated user lastActiveAt');

      return next();
    } catch (err) {
      console.log('Error verifying or refreshing token:', err.message);
      return next();
    }
  }
}
