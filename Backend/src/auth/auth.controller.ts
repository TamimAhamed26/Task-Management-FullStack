import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UsePipes,
  ValidationPipe,
  Req, UseGuards, 
  UnauthorizedException,
  NotFoundException,
  Res
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { TokenType } from 'src/entities/token.entity';
import { Public } from './decorators/public.decorator';
import { GetUser } from './decorators/get-user.decorator';

@Controller('auth')
export class AuthController {
  tokenRepo: any;
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('signup')
  @UsePipes(ValidationPipe)
  signup(@Body() dto: CreateUserDto) {
    return this.authService.signup(dto);
  }
@Public()
@Post('login')
@UsePipes(ValidationPipe)
async login(@Body() dto: LoginDto & { rememberMe?: boolean }, @Res({ passthrough: true }) res: Response) {
  const result = await this.authService.login(dto);

  const maxAge = dto.rememberMe
    ? 1000 * 60 * 60 * 24 * 7 // 7 days
    : 1000 * 60 * 30; // 30 minutes

  res.cookie('accessToken', result.accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge,
  });

   res.cookie('rememberMe', dto.rememberMe?.toString() ?? 'false', {
    httpOnly: false,     
    secure: false,
    sameSite: 'lax',
    maxAge,
  });

  return result;
}




  @Public()
  @Get('verify/:token')
  verify(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }
  @Public()
  @Post('resend-verification')
resendVerification(@Body('email') email: string) {
  return this.authService.resendVerificationEmail(email);
}
@Public()
@Post('forgot-password')
forgotPassword(@Body() dto: ForgotPasswordDto) {
  return this.authService.forgotPassword(dto);
}
@Public()
@Get('reset-password/:token')
async getResetTokenMessage(@Param('token') token: string) {
  const isValid = await this.authService.validateResetToken(token);
  if (isValid) {
    return {
      message: 'You can now reset your password using this token.',
      token,
    };
  } else {
    return {
      message: 'Invalid or expired token.',
      token,
    };
  }
}


@Get('status')
getStatus(@Req() req: Request) {
  console.log('Token Status:', req.tokenStatus);
  console.log('New Access Token (if refreshed):', req.newAccessToken);

  return {
    tokenStatus: req.tokenStatus || 'valid',
    newAccessToken: req.newAccessToken || null,
  };
} 


@Public()
@Post('reset-password')
resetPassword(@Body() dto: ResetPasswordDto) {
  return this.authService.resetPassword(dto);
}
@Get('me')
getCurrentUser(@GetUser() user: any) {
  return user;
}

@Post('logout')
@UseGuards(AuthGuard('jwt'))
async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
  const token =
    req.cookies?.accessToken ?? req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return { message: 'No token found; already logged out?' };
  }

  const user = req.user as any;
  return await this.authService.logout(user.id, token, res);
}


}
