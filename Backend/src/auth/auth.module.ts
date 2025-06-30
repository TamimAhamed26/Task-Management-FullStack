// src/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common'; 
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../entities/user.entity';
import { Token } from '../entities/token.entity';
import { EmailService } from '../email/email.service';
import { FileModule } from 'src/file/file.module';
import { UserModule } from 'src/user/user.module'; 
import { WsJwtGuard } from './ws-jwt.guard';
import { GoogleStrategy } from './google.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'mysecretkey',
      signOptions: { expiresIn: '60m' },
    }),
    TypeOrmModule.forFeature([User, Token]),
    FileModule,
    forwardRef(() => UserModule), 
  ],
  providers: [
    AuthService,
    JwtStrategy,
    EmailService,
    WsJwtGuard,
    GoogleStrategy,
    {
      provide: 'JWT_BLACKLIST',
      useValue: new Set<string>(),
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, WsJwtGuard],
})
export class AuthModule {}