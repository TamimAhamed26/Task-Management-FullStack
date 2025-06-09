// auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../entities/user.entity';       
import { Token } from '../entities/token.entity';   
import { EmailService } from '../email/email.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'mysecretkey',
      signOptions: { expiresIn: '30m' },
    }),
    TypeOrmModule.forFeature([User, Token]), 
  ],
  providers: [
    AuthService,
    JwtStrategy,
    EmailService,
    {
      provide: 'JWT_BLACKLIST',
      useValue: new Set<string>(),
    },
  ],
  controllers: [AuthController],
  exports: ['JWT_BLACKLIST', AuthService],
})
export class AuthModule {}
