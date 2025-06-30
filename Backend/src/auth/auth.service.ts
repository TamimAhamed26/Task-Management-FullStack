import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Token, TokenType } from '../entities/token.entity';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../email/email.service'; 
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto'; 
import { Public } from './decorators/public.decorator';
import { Response } from 'express';

@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Token) private readonly tokenRepo: Repository<Token>,
    @Inject('JWT_BLACKLIST')
    private readonly jwtBlacklist: Set<string>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService, 
  
  ) {}
  public isTokenBlacklisted(token: string): boolean {
    return this.jwtBlacklist.has(token);
  }

  async signup(dto: CreateUserDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new BadRequestException('Email already exists');
  
    const user = this.userRepo.create({ ...dto, isVerified: false });
    await this.userRepo.save(user);
  
    const rawToken = this.jwtService.sign({ userId: user.id, email: user.email });
    const token = this.tokenRepo.create({ token: rawToken, user, type: TokenType.VERIFICATION });
    await this.tokenRepo.save(token);
  
    const emailResult = await this.emailService.sendVerificationEmail(user.email, rawToken);
  
    return {
      message: 'Please check your email for verification.',
      emailPreview: emailResult.previewUrl,
    };
  }

 private async _createToken(user: User, rememberMe: boolean = false) {
    if (!user.role) {
      throw new UnauthorizedException('Role not assigned');
    }
  
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name.toUpperCase(),
    };
  
    const tokenExpiry = rememberMe ? '7d' : '60m';
  
    const accessToken = this.jwtService.sign(payload, {
      secret: 'mysecretkey',
      expiresIn: tokenExpiry,
    });
  
    const accessTokenEntity = this.tokenRepo.create({
      user,
      token: accessToken,
      type: TokenType.ACCESS,
    });
  
    await this.tokenRepo.save(accessTokenEntity);
  
    user.lastActiveAt = new Date();
    await this.userRepo.save(user);
  
    return { accessToken };
  }


  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['role'],
    });
  
    if (!user || user.password !== dto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
  
    if (!user.isVerified) {
      throw new UnauthorizedException('Email not verified');
    }
  
    return this._createToken(user, dto.rememberMe);
  }


  async loginSocial(user: User) {
    return this._createToken(user, true); 
  }


  async verifyEmail(token: string) {
    const found = await this.tokenRepo.findOne({
      where: { token },
      relations: ['user'],
    });
  
    if (!found) throw new NotFoundException('Invalid or expired token');
  
    const user = found.user;
    user.isVerified = true;
    await this.userRepo.save(user);
  
    await this.tokenRepo.delete({ id: found.id });
  
    return { message: 'Email successfully verified. Please wait for admin to assign your role.' };
  }
  
  async resendVerificationEmail(email: string) {
    const user = await this.userRepo.findOne({ where: { email }, relations: ['tokens'] });
  
    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new BadRequestException('Email is already verified');
  
    await this.tokenRepo.delete({ user: { id: user.id } });
  
    const rawToken = this.jwtService.sign({ userId: user.id, email: user.email });
    const token = this.tokenRepo.create({ token: rawToken, user, type: TokenType.VERIFICATION });
    await this.tokenRepo.save(token);
  
    const emailResult = await this.emailService.sendVerificationEmail(user.email, rawToken);
  
    return {
      message: 'Verification email resent. Please check your inbox.',
      previewUrl: emailResult.previewUrl,
    };
  }
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new NotFoundException('User not found');
  
    const rawToken = this.jwtService.sign({
      userId: user.id,
      email: user.email,
    }, { expiresIn: '30m' }); 
  
    const token = this.tokenRepo.create({
      token: rawToken,
      user,
      type: TokenType.RESET_PASSWORD,
    });
    await this.tokenRepo.save(token);
  
    const result = await this.emailService.sendResetPasswordEmail(user.email, rawToken);
  
    return {
      message: 'Reset password email sent. Please check your inbox.',
      previewUrl: result.previewUrl,
    };
  }
  
  async validateResetToken(token: string): Promise<boolean> {
    const foundToken = await this.tokenRepo.findOne({
      where: { token, type: TokenType.RESET_PASSWORD },
      relations: ['user'],
    });
  
    if (!foundToken) return false;
  
    try {
      this.jwtService.verify(token); 
      return true;
    } catch (e) {
      await this.tokenRepo.delete({ id: foundToken.id }); 
      return false;
    }
  }
  
  
  async resetPassword(dto: ResetPasswordDto) {
    const { token, newPassword } = dto;
  
    const found = await this.tokenRepo.findOne({
      where: { token, type: TokenType.RESET_PASSWORD },
      relations: ['user'],
    });
  
    if (!found) throw new UnauthorizedException('Invalid or expired reset password token');
  
    try {
      this.jwtService.verify(token); 
    } catch (e) {
      await this.tokenRepo.delete({ id: found.id }); 
      throw new UnauthorizedException('Reset token has expired. Please request a new one.');
    }
  
    const user = found.user;
    user.password = newPassword;
    await this.userRepo.save(user);
    await this.tokenRepo.delete({ id: found.id });
  
    return { message: 'Password has been successfully reset.' };
  }
async logout(userId: number, token: string, res?: Response) {
  const rawToken = token?.startsWith('Bearer ') ? token.slice(7) : token;

  if (!rawToken) {
    throw new BadRequestException('Token is missing or invalid');
  }

  const user = await this.userRepo.findOne({
    where: { id: userId },
    relations: ['tokens'],
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  const tokenEntity = user.tokens.find(
    t => t.token === rawToken && t.type === TokenType.ACCESS,
  );

  if (tokenEntity) {
    await this.tokenRepo.remove(tokenEntity);
    this.jwtBlacklist.add(rawToken);
  }

  if (res) {
    res.clearCookie('accessToken', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    res.clearCookie('rememberMe', {
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
    });
  }

  return { message: 'Logged out successfully' };
}


async findOrCreateGoogleUser(googleUser: {
  googleId: string;
  email: string;
  username: string;
  avatarUrl: string;
}) {
  let user = await this.userRepo.findOne({ where: { googleId: googleUser.googleId } });
  if (user) {
    return user;
  }

  user = await this.userRepo.findOne({ where: { email: googleUser.email }, relations: ['role'] });
  if (user) {
    user.googleId = googleUser.googleId;
    return await this.userRepo.save(user);
  }
  
  const crypto = await import('crypto');
  const randomPassword = crypto.randomBytes(32).toString('hex');

  const newUser = this.userRepo.create({
    googleId: googleUser.googleId,
    email: googleUser.email,
    username: googleUser.username,
    avatarUrl: googleUser.avatarUrl,
    isVerified: true,
    password: randomPassword,
  });

  return await this.userRepo.save(newUser);
}

}