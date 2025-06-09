// src/auth/middleware.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RefreshTokenMiddleware } from './refresh-token.middleware';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Token } from '../entities/token.entity';

@Module({
  imports: [
    JwtModule.register({}), 
    TypeOrmModule.forFeature([User, Token]),
  ],
  providers: [RefreshTokenMiddleware],
  exports: [RefreshTokenMiddleware],
})
export class MiddlewareModule {}
