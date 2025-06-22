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
import { FileModule } from 'src/file/file.module'; 
import { UserService } from 'src/user/user.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: 'mysecretkey',
      signOptions: { expiresIn: '30m' },
    }),
    TypeOrmModule.forFeature([User, Token]), 
    FileModule, 
  ],

  providers: [
    AuthService,
    UserService, 
    JwtStrategy,
    EmailService,
    {
      provide: 'JWT_BLACKLIST',
      useValue: new Set<string>(),
    },

  ],

  controllers: [AuthController],


  exports: ['JWT_BLACKLIST', AuthService, UserService, JwtModule, PassportModule], // Explicitly export UserService and JwtModule/PassportModule for other modules like ChatModule


})

export class AuthModule {}