import {
  Controller,
  Post,
  Body,
  Param,
  Patch,
  Get,
  UsePipes,
  ValidationPipe,
  UseGuards,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Put,   
  Request
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { IsString } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { Role } from 'src/entities/role.entity';
import { Roles } from 'src/auth/decorators/roles.decorator';


@UseGuards(AuthGuard('jwt'))
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('profile')
  @UsePipes(ValidationPipe)
  updateProfile(
    @GetUser('id') id: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(id, dto);
  }

@Patch('password')
@UsePipes(ValidationPipe)
async updatePassword(
  @GetUser('id') id: number,
  @Body() dto: UpdatePasswordDto,
) {
  const message = await this.userService.updatePassword(id, dto);
  return {
    message,              // Same string as before
    status: 'success',    // Optional: more metadata
  };
}


  @Put('avatar')
  @UseInterceptors(FileInterceptor('file'))
  async updateAvatarWithFile(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const userId = req.user.id; 
    const user = await this.userService.updateAvatar(userId, file);
    return { avatarUrl: user.avatarUrl };
  }

  // Route to update avatar with URL
  @Put('avatar/url')
  async updateAvatarWithUrl(@Request() req, @Body('avatarUrl') avatarUrl: string) {
    const userId = req.user.id; //
    const user = await this.userService.updateAvatar(userId, avatarUrl);
    return { avatarUrl: user.avatarUrl };
  }

  @Get('me')
  getProfile(@GetUser('id') id: number) {
    return this.userService.findById(id);
  }

  @Get('dashboard')
  getDashboard(@GetUser('id') id: number) {
    return this.userService.getDashboardStats(id);
  }
}